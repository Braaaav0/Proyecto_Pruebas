import { get } from '../api.js';
import { h, montar, tabla, vacio, cabecera, fmtFecha, badgeEstado } from '../ui.js';

const botonImprimir = () => h('button', { class: 'btn', type: 'button', onclick: () => window.print() }, 'Imprimir');

/** HU-011: libros que se encuentran actualmente prestados, con filtros. */
export async function vistaLibrosPrestados(contenedor) {
  const zona = h('div');

  async function cargar(filtros = {}) {
    const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v));
    const { items, total } = await get(`/api/reportes/libros-prestados?${params}`);
    if (!total) {
      montar(zona, vacio(params.size ? 'Ningún préstamo activo coincide con los filtros.' : 'No hay libros prestados actualmente.'));
      return;
    }
    montar(zona, 
      tabla([
        { titulo: 'Usuario', celda: (p) => p.usuario },
        { titulo: 'Libro', celda: (p) => p.libro },
        { titulo: 'Fecha de préstamo', celda: (p) => fmtFecha(p.fecha_prestamo) },
        { titulo: 'Fecha límite', celda: (p) => fmtFecha(p.fecha_limite) },
        { titulo: 'Estado', celda: (p) => badgeEstado(p) },
      ], items),
      h('p', { class: 'resumen' }, `${total} libro${total === 1 ? '' : 's'} fuera de la biblioteca.`));
  }

  const formulario = h('form', {
    class: 'toolbar',
    onsubmit: (e) => {
      e.preventDefault();
      cargar({ usuario: formulario.usuario.value.trim(), libro: formulario.libro.value.trim() });
    },
    onreset: () => setTimeout(() => cargar(), 0),
  },
  h('input', { class: 'input', name: 'usuario', placeholder: 'Usuario (nombre o documento)', 'aria-label': 'Filtrar por usuario' }),
  h('input', { class: 'input', name: 'libro', placeholder: 'Título del libro', 'aria-label': 'Filtrar por libro' }),
  h('button', { class: 'btn primary', type: 'submit' }, 'Filtrar'),
  h('button', { class: 'btn', type: 'reset' }, 'Limpiar'),
  botonImprimir());

  montar(contenedor, 
    cabecera('Libros prestados', 'Préstamos activos: qué material está fuera y quién lo tiene.'),
    h('div', { class: 'card' }, formulario),
    zona);
  await cargar();
}

/** HU-012: préstamos cuya fecha límite ya fue superada. */
export async function vistaPrestamosAtrasados(contenedor) {
  const { items, total, mensaje } = await get('/api/reportes/prestamos-atrasados');
  montar(contenedor, 
    cabecera('Préstamos atrasados', 'Usuarios con libros pendientes de devolución pasada la fecha límite.', botonImprimir()),
    total
      ? h('div', null,
        tabla([
          { titulo: 'Usuario responsable', celda: (p) => p.usuario },
          { titulo: 'Libro pendiente', celda: (p) => p.libro },
          { titulo: 'Fecha límite', celda: (p) => fmtFecha(p.fecha_limite) },
          { titulo: 'Días de retraso', celda: (p) => h('span', { class: 'badge bad' }, `${p.dias_retraso} día${p.dias_retraso === 1 ? '' : 's'}`) },
        ], items),
        h('p', { class: 'resumen' }, `${total} préstamo${total === 1 ? '' : 's'} atrasado${total === 1 ? '' : 's'}.`))
      : vacio(mensaje, true));
}
