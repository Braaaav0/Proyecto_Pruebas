/**
 * Creador de elementos DOM. Todo el texto entra como nodo de texto (nunca como HTML),
 * lo que evita inyección de código (XSS) con datos que vienen de la base de datos.
 */
export function h(etiqueta, props, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k in el && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

export function toast(mensaje, tipo = 'ok') {
  const nodo = h('div', { class: `toast ${tipo === 'error' ? 'error' : ''}` }, mensaje);
  document.getElementById('toasts').append(nodo);
  setTimeout(() => nodo.remove(), tipo === 'error' ? 6000 : 3500);
}

/** '2026-03-10' -> '10/03/2026' */
export function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const CLASE_ESTADO = { PRESTADO: '', ATRASADO: 'bad', DEVUELTO: 'ok' };
export const badgeEstado = (p) => h('span', { class: `badge ${CLASE_ESTADO[p.estado_codigo] ?? ''}` }, p.estado);

export function badgeDisponibilidad(libro) {
  return h('span', { class: `badge ${libro.disponible ? 'ok' : 'warn'}` }, libro.disponibilidad);
}

/** Tabla genérica. `columnas`: [{ titulo, celda(fila) }]; `acciones(fila)` devuelve nodos. */
export function tabla(columnas, filas, acciones) {
  const encabezado = h('tr', null,
    columnas.map((c) => h('th', null, c.titulo)),
    acciones ? h('th', { class: 'acciones' }, 'Acciones') : null);
  const cuerpo = filas.map((fila) => h('tr', null,
    columnas.map((c) => h('td', null, c.celda(fila))),
    acciones ? h('td', null, h('div', { class: 'acciones' }, acciones(fila))) : null));
  return h('div', { class: 'table-wrap' }, h('table', null, h('thead', null, encabezado), h('tbody', null, cuerpo)));
}

export const vacio = (texto, ok = false) => h('div', { class: `vacio ${ok ? 'ok' : ''}` }, texto);

export function cabecera(titulo, subtitulo, ...acciones) {
  return h('div', { class: 'page-head' },
    h('div', null, h('h1', null, titulo), subtitulo ? h('p', null, subtitulo) : null),
    h('div', { class: 'toolbar' }, acciones));
}

export function campoSelect(nombre, etiqueta, opciones, seleccionado = '') {
  const select = h('select', { id: `f-${nombre}`, name: nombre },
    h('option', { value: '' }, 'Seleccione…'),
    opciones.map((o) => h('option', { value: String(o.value) }, o.label)));
  select.value = String(seleccionado ?? '');
  return h('div', { class: 'field', 'data-campo': nombre },
    h('label', { for: `f-${nombre}` }, etiqueta), select, h('small', { class: 'error' }));
}

export function campoInput(nombre, etiqueta, { tipo = 'text', valor = '', ...extra } = {}) {
  return h('div', { class: 'field', 'data-campo': nombre },
    h('label', { for: `f-${nombre}` }, etiqueta),
    h('input', { id: `f-${nombre}`, name: nombre, type: tipo, value: valor ?? '', autocomplete: 'off', ...extra }),
    h('small', { class: 'error' }));
}

/** Muestra los errores por campo devueltos por la API dentro de un formulario. */
export function mostrarErrores(formulario, error) {
  formulario.querySelectorAll('.field').forEach((f) => {
    f.classList.remove('invalid');
    f.querySelector('.error').textContent = '';
  });
  formulario.querySelector('.form-error')?.remove();
  const usados = new Set();
  for (const [campo, mensaje] of Object.entries(error.detalles ?? {})) {
    const nodo = formulario.querySelector(`.field[data-campo="${campo}"]`);
    if (!nodo) continue;
    nodo.classList.add('invalid');
    nodo.querySelector('.error').textContent = mensaje;
    usados.add(campo);
  }
  if (!usados.size) {
    formulario.prepend(h('div', { class: 'form-error', role: 'alert' }, error.message));
  }
}

export const valoresDe = (formulario) => Object.fromEntries(new FormData(formulario));

/**
 * Reemplaza el contenido de `el`. A diferencia de `replaceChildren`, aplana arreglos y
 * descarta null/false (que el método nativo convertiría en el texto "null").
 */
export function montar(el, ...hijos) {
  el.replaceChildren(...hijos.flat(Infinity).filter((x) => x !== null && x !== undefined && x !== false));
}
