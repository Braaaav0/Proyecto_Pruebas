import { Router } from 'express';
import { validarCampos } from '../validators.js';
import { conflicto, noEncontrado } from '../errores.js';

const escaparLike = (q) => q.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Router CRUD configurable para una tabla maestra.
 *
 * cfg.tabla         nombre de la tabla
 * cfg.singular      texto para mensajes ("el usuario")
 * cfg.campos        especificación de campos editables (ver validators.js)
 * cfg.consulta      SELECT base con alias `t` para la tabla (por defecto `SELECT t.*`)
 * cfg.mapear        transforma cada fila antes de responder
 * cfg.buscar        expresiones SQL sobre las que aplica ?q=
 * cfg.orden         ORDER BY
 * cfg.unicos        [{ campo, mensaje }] campos que no pueden repetirse (sin distinguir mayúsculas)
 * cfg.dependencias  [{ sql, mensaje }] consultas (con ?=id) que, si devuelven fila, impiden eliminar
 * cfg.operaciones   subconjunto de listar | obtener | crear | actualizar | eliminar
 */
export function crudRouter(ctx, cfg) {
  const { db } = ctx;
  const {
    tabla, campos, buscar: columnasBusqueda = [], orden = 't.id', unicos = [], dependencias = [],
    consulta = `SELECT t.* FROM ${tabla} t`,
    mapear = (fila) => fila,
    operaciones = ['listar', 'obtener', 'crear', 'actualizar', 'eliminar'],
  } = cfg;
  const permite = (op) => operaciones.includes(op);
  const router = Router();

  const leer = (id) => {
    const fila = db.prepare(`${consulta} WHERE t.id = ?`).get(id);
    return fila ? mapear(fila) : null;
  };

  const exigir = (idTexto) => {
    const fila = /^\d+$/.test(idTexto) ? leer(Number(idTexto)) : null;
    if (!fila) throw noEncontrado();
    return fila;
  };

  const verificarUnicos = (valores, idActual = 0) => {
    for (const { campo, mensaje } of unicos) {
      const repetido = db
        .prepare(`SELECT 1 FROM ${tabla} WHERE ${campo} = ? COLLATE NOCASE AND id != ?`)
        .get(valores[campo], idActual);
      if (repetido) throw conflicto(mensaje);
    }
  };

  if (permite('listar')) {
    router.get('/', (req, res) => {
      const q = String(req.query.q ?? '').trim();
      const params = [];
      let where = '';
      if (q && columnasBusqueda.length) {
        where = ` WHERE ${columnasBusqueda.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(' OR ')}`;
        params.push(...columnasBusqueda.map(() => `%${escaparLike(q)}%`));
      }
      const filas = db.prepare(`${consulta}${where} ORDER BY ${orden}`).all(...params);
      res.json(filas.map(mapear));
    });
  }

  if (permite('obtener')) {
    router.get('/:id', (req, res) => res.json(exigir(req.params.id)));
  }

  if (permite('crear')) {
    router.post('/', (req, res) => {
      const valores = validarCampos(ctx, campos, req.body);
      verificarUnicos(valores);
      const columnas = Object.keys(valores);
      const { lastInsertRowid } = db
        .prepare(`INSERT INTO ${tabla} (${columnas.join(', ')}) VALUES (${columnas.map(() => '?').join(', ')})`)
        .run(...Object.values(valores));
      res.status(201).json(leer(Number(lastInsertRowid)));
    });
  }

  if (permite('actualizar')) {
    router.put('/:id', (req, res) => {
      const existente = exigir(req.params.id);
      const valores = validarCampos(ctx, campos, req.body);
      verificarUnicos(valores, existente.id);
      const columnas = Object.keys(valores);
      db.prepare(`UPDATE ${tabla} SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`)
        .run(...Object.values(valores), existente.id);
      res.json(leer(existente.id));
    });
  }

  if (permite('eliminar')) {
    router.delete('/:id', (req, res) => {
      const existente = exigir(req.params.id);
      for (const { sql, mensaje } of dependencias) {
        if (db.prepare(sql).get(existente.id)) throw conflicto(mensaje);
      }
      db.prepare(`DELETE FROM ${tabla} WHERE id = ?`).run(existente.id);
      res.status(204).end();
    });
  }

  return router;
}
