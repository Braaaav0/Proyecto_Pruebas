import { enTransaccion } from '../db.js';
import { conflicto, noEncontrado } from '../errores.js';
import { diasEntre, fechaISO, sumarDias } from '../fechas.js';
import { validarCampos } from '../validators.js';

export const DIAS_PRESTAMO_POR_DEFECTO = 14;

const CAMPOS_PRESTAMO = {
  usuario_id: { etiqueta: 'El usuario', tipo: 'ref', tabla: 'usuarios' },
  libro_id: { etiqueta: 'El libro', tipo: 'ref', tabla: 'libros' },
  dias: { etiqueta: 'Los días de préstamo', tipo: 'entero', min: 1, max: 90, opcional: true },
};

const SELECT_PRESTAMOS = `
  SELECT p.id, p.usuario_id, u.nombre AS usuario, u.documento,
         p.libro_id, l.titulo AS libro,
         p.fecha_prestamo, p.fecha_limite, p.fecha_devolucion,
         e.codigo AS estado_codigo, e.nombre AS estado
  FROM prestamos p
  JOIN usuarios u ON u.id = p.usuario_id
  JOIN libros l ON l.id = p.libro_id
  JOIN estados_prestamo e ON e.id = p.estado_id`;

const escaparLike = (q) => q.replace(/[\\%_]/g, (c) => `\\${c}`);
export const hoy = ({ clock }) => fechaISO(clock());

const conRetraso = (fecha) => (fila) => ({
  ...fila,
  dias_retraso: fila.fecha_devolucion === null ? Math.max(0, diasEntre(fila.fecha_limite, fecha)) : 0,
});

/** Pasa a "Atrasado" los préstamos activos cuya fecha límite ya fue superada. */
export function marcarAtrasados(ctx) {
  ctx.db.prepare(`
    UPDATE prestamos
       SET estado_id = (SELECT id FROM estados_prestamo WHERE codigo = 'ATRASADO')
     WHERE fecha_devolucion IS NULL
       AND fecha_limite < ?
       AND estado_id = (SELECT id FROM estados_prestamo WHERE codigo = 'PRESTADO')`).run(hoy(ctx));
}

function leerPrestamo(ctx, id) {
  const fila = ctx.db.prepare(`${SELECT_PRESTAMOS} WHERE p.id = ?`).get(id);
  return fila ? conRetraso(hoy(ctx))(fila) : null;
}

export function listarPrestamos(ctx, { activos = false, q = '' } = {}) {
  marcarAtrasados(ctx);
  const condiciones = [];
  const params = [];
  if (activos) condiciones.push('p.fecha_devolucion IS NULL');
  if (q) {
    condiciones.push("(u.nombre LIKE ? ESCAPE '\\' OR l.titulo LIKE ? ESCAPE '\\')");
    params.push(`%${escaparLike(q)}%`, `%${escaparLike(q)}%`);
  }
  const where = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
  return ctx.db.prepare(`${SELECT_PRESTAMOS}${where} ORDER BY p.fecha_prestamo DESC, p.id DESC`)
    .all(...params)
    .map(conRetraso(hoy(ctx)));
}

export function registrarPrestamo(ctx, body) {
  const { usuario_id, libro_id, dias } = validarCampos(ctx, CAMPOS_PRESTAMO, body);
  const fechaPrestamo = hoy(ctx);
  const fechaLimite = sumarDias(fechaPrestamo, dias ?? DIAS_PRESTAMO_POR_DEFECTO);

  return enTransaccion(ctx.db, () => {
    const libro = ctx.db.prepare('SELECT disponible FROM libros WHERE id = ?').get(libro_id);
    if (libro.disponible !== 1) throw conflicto('El libro ya se encuentra prestado');

    const { lastInsertRowid } = ctx.db.prepare(`
      INSERT INTO prestamos (usuario_id, libro_id, estado_id, fecha_prestamo, fecha_limite)
      VALUES (?, ?, (SELECT id FROM estados_prestamo WHERE codigo = 'PRESTADO'), ?, ?)`)
      .run(usuario_id, libro_id, fechaPrestamo, fechaLimite);
    ctx.db.prepare('UPDATE libros SET disponible = 0 WHERE id = ?').run(libro_id);
    return leerPrestamo(ctx, Number(lastInsertRowid));
  });
}

export function registrarDevolucion(ctx, idTexto) {
  const existente = /^\d+$/.test(idTexto) ? leerPrestamo(ctx, Number(idTexto)) : null;
  if (!existente) throw noEncontrado('Préstamo no encontrado');
  if (existente.fecha_devolucion !== null) throw conflicto('El préstamo ya fue devuelto');

  return enTransaccion(ctx.db, () => {
    ctx.db.prepare(`
      UPDATE prestamos
         SET fecha_devolucion = ?,
             estado_id = (SELECT id FROM estados_prestamo WHERE codigo = 'DEVUELTO')
       WHERE id = ?`).run(hoy(ctx), existente.id);
    ctx.db.prepare('UPDATE libros SET disponible = 1 WHERE id = ?').run(existente.libro_id);
    return leerPrestamo(ctx, existente.id);
  });
}

/** HU-011: préstamos activos (incluye atrasados), con filtros opcionales. */
export function reporteLibrosPrestados(ctx, { usuario = '', libro = '' } = {}) {
  marcarAtrasados(ctx);
  const condiciones = ['p.fecha_devolucion IS NULL'];
  const params = [];
  if (usuario) {
    condiciones.push("(u.nombre LIKE ? ESCAPE '\\' OR u.documento LIKE ? ESCAPE '\\')");
    params.push(`%${escaparLike(usuario)}%`, `%${escaparLike(usuario)}%`);
  }
  if (libro) {
    condiciones.push("l.titulo LIKE ? ESCAPE '\\'");
    params.push(`%${escaparLike(libro)}%`);
  }
  const items = ctx.db
    .prepare(`${SELECT_PRESTAMOS} WHERE ${condiciones.join(' AND ')} ORDER BY p.fecha_limite, p.id`)
    .all(...params)
    .map(conRetraso(hoy(ctx)));
  return { items, total: items.length };
}

/** HU-012: préstamos activos con fecha límite anterior a hoy, del más atrasado al menos. */
export function reportePrestamosAtrasados(ctx) {
  marcarAtrasados(ctx);
  const fecha = hoy(ctx);
  const items = ctx.db
    .prepare(`${SELECT_PRESTAMOS} WHERE p.fecha_devolucion IS NULL AND p.fecha_limite < ? ORDER BY p.fecha_limite, p.id`)
    .all(fecha)
    .map(conRetraso(fecha));
  return {
    items,
    total: items.length,
    mensaje: items.length ? null : 'No existen préstamos atrasados',
  };
}
