import { get, post, ApiError } from '../api.js';
import {
  h, montar, toast, tabla, vacio, cabecera, campoSelect, campoInput, mostrarErrores, valoresDe, fmtFecha, badgeEstado,
} from '../ui.js';

/** Transacción principal: registrar préstamos (HU-009) y devoluciones (HU-010). */
export async function vistaPrestamos(contenedor) {
  const zonaFormulario = h('div', { class: 'card' });
  const zonaTabla = h('div');
  let verHistorial = false;

  async function cargarFormulario() {
    const [usuarios, libros] = await Promise.all([get('/api/usuarios'), get('/api/libros')]);
    const disponibles = libros.filter((l) => l.disponible);
    const boton = h('button', { class: 'btn primary', type: 'submit' }, 'Registrar préstamo');
    const formulario = h('form', {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        boton.disabled = true;
        try {
          const p = await post('/api/prestamos', valoresDe(formulario));
          toast(`Préstamo registrado. Devolver antes del ${fmtFecha(p.fecha_limite)}`);
          await Promise.all([cargarFormulario(), cargarTabla()]);
        } catch (err) {
          mostrarErrores(formulario, err instanceof ApiError ? err : new ApiError(0, 'Error inesperado'));
        } finally {
          boton.disabled = false;
        }
      },
    },
    h('div', { class: 'form-grid' },
      campoSelect('usuario_id', 'Usuario', usuarios.map((u) => ({ value: u.id, label: `${u.nombre} (${u.documento})` }))),
      campoSelect('libro_id', 'Libro disponible', disponibles.map((l) => ({ value: l.id, label: `${l.titulo} — ${l.autor}` }))),
      campoInput('dias', 'Días de préstamo', { tipo: 'number', valor: 14, min: 1, max: 90 })),
    boton);
    montar(zonaFormulario, 
      h('h2', null, 'Registrar préstamo'),
      disponibles.length ? null : vacio('No hay libros disponibles para prestar.'),
      formulario);
  }

  async function devolver(p) {
    if (!confirm(`¿Registrar la devolución de "${p.libro}" (${p.usuario})?`)) return;
    try {
      await post(`/api/prestamos/${p.id}/devolucion`);
      toast('Devolución registrada');
      await Promise.all([cargarFormulario(), cargarTabla()]);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function cargarTabla() {
    const filas = await get(`/api/prestamos${verHistorial ? '' : '?activos=1'}`);
    if (!filas.length) {
      montar(zonaTabla, vacio(verHistorial ? 'Aún no hay préstamos registrados.' : 'No hay préstamos activos.'));
      return;
    }
    montar(zonaTabla, tabla([
      { titulo: 'Usuario', celda: (p) => p.usuario },
      { titulo: 'Libro', celda: (p) => p.libro },
      { titulo: 'Prestado', celda: (p) => fmtFecha(p.fecha_prestamo) },
      { titulo: 'Fecha límite', celda: (p) => fmtFecha(p.fecha_limite) },
      { titulo: 'Devuelto', celda: (p) => fmtFecha(p.fecha_devolucion) },
      { titulo: 'Estado', celda: (p) => [badgeEstado(p), p.dias_retraso ? ` ${p.dias_retraso} d` : ''] },
    ], filas, (p) => (p.fecha_devolucion ? null
      : h('button', { class: 'btn small primary', onclick: () => devolver(p) }, 'Registrar devolución'))));
  }

  const alternar = h('label', { class: 'toolbar' },
    h('input', { type: 'checkbox', onchange: (e) => { verHistorial = e.target.checked; cargarTabla(); } }),
    'Incluir historial (devueltos)');

  montar(contenedor, 
    cabecera('Préstamos y devoluciones', 'Registre nuevos préstamos y las devoluciones de libros.'),
    zonaFormulario,
    h('div', { class: 'page-head' }, h('h2', null, 'Préstamos'), alternar),
    zonaTabla);
  await Promise.all([cargarFormulario(), cargarTabla()]);
}
