import { get, post, put, del, ApiError } from '../api.js';
import {
  h, montar, toast, tabla, vacio, cabecera, campoInput, campoSelect, mostrarErrores, valoresDe, badgeDisponibilidad,
} from '../ui.js';

const opcionesDe = (url, etiqueta) => async () =>
  (await get(url)).map((r) => ({ value: r.id, label: etiqueta(r) }));

/** Configuración de las pantallas maestras (HU-003 a HU-008). */
export const MAESTRAS = {
  usuarios: {
    titulo: 'Usuarios', singular: 'usuario', api: '/api/usuarios',
    subtitulo: 'Personas que utilizan la biblioteca.',
    campos: [
      { n: 'nombre', l: 'Nombre completo' },
      { n: 'documento', l: 'Documento' },
      { n: 'correo', l: 'Correo', tipo: 'email' },
      { n: 'telefono', l: 'Teléfono', tipo: 'tel' },
    ],
    columnas: [['Nombre', 'nombre'], ['Documento', 'documento'], ['Correo', 'correo'], ['Teléfono', 'telefono']],
  },
  autores: {
    titulo: 'Autores', singular: 'autor', api: '/api/autores',
    subtitulo: 'Autores del catálogo bibliográfico.',
    campos: [{ n: 'nombre', l: 'Nombre' }, { n: 'apellido', l: 'Apellido' }],
    columnas: [['Nombre', 'nombre'], ['Apellido', 'apellido']],
  },
  categorias: {
    titulo: 'Categorías', singular: 'categoría', api: '/api/categorias',
    subtitulo: 'Clasificación del material. El nombre debe ser único.',
    campos: [{ n: 'nombre', l: 'Nombre' }, { n: 'descripcion', l: 'Descripción' }],
    columnas: [['Nombre', 'nombre'], ['Descripción', 'descripcion', true]],
  },
  editoriales: {
    titulo: 'Editoriales', singular: 'editorial', api: '/api/editoriales',
    subtitulo: 'Casas editoriales asociadas a los libros.',
    campos: [
      { n: 'nombre', l: 'Nombre' },
      { n: 'telefono', l: 'Teléfono', tipo: 'tel' },
      { n: 'correo', l: 'Correo', tipo: 'email' },
    ],
    columnas: [['Nombre', 'nombre'], ['Teléfono', 'telefono'], ['Correo', 'correo']],
  },
  libros: {
    titulo: 'Libros', singular: 'libro', api: '/api/libros', openLibrary: true,
    subtitulo: 'Catálogo bibliográfico y disponibilidad.',
    campos: [
      { n: 'titulo', l: 'Título' },
      { n: 'autor_id', l: 'Autor', opciones: opcionesDe('/api/autores', (a) => `${a.nombre} ${a.apellido}`) },
      { n: 'categoria_id', l: 'Categoría', opciones: opcionesDe('/api/categorias', (c) => c.nombre) },
      { n: 'editorial_id', l: 'Editorial', opciones: opcionesDe('/api/editoriales', (e) => e.nombre) },
      { n: 'anio_publicacion', l: 'Año de publicación', tipo: 'number', min: 1000 },
      { n: 'isbn', l: 'ISBN (opcional)', ayuda: '10 o 13 dígitos' },
    ],
    columnas: [
      ['Título', 'titulo', true], ['Autor', 'autor'], ['Categoría', 'categoria'], ['Editorial', 'editorial'],
      ['Año', 'anio_publicacion'], ['Disponibilidad', (f) => badgeDisponibilidad(f)],
    ],
  },
  'estados-prestamo': {
    titulo: 'Estados de préstamo', singular: 'estado', api: '/api/estados-prestamo',
    subtitulo: 'Estados fijos del ciclo del préstamo; solo puede cambiarse su nombre visible.',
    campos: [{ n: 'nombre', l: 'Nombre' }],
    columnas: [['Código', 'codigo'], ['Nombre', 'nombre']],
    sinCrear: true, sinEliminar: true,
  },
};

export async function vistaMaestra(contenedor, clave) {
  const cfg = MAESTRAS[clave];
  const cuerpo = h('div');
  let consulta = '';

  async function cargar() {
    const filas = await get(`${cfg.api}${consulta ? `?q=${encodeURIComponent(consulta)}` : ''}`);
    if (!filas.length) {
      montar(cuerpo, vacio(consulta ? 'Ningún registro coincide con la búsqueda.' : `Aún no hay ${cfg.titulo.toLowerCase()} registrados.`));
      return;
    }
    montar(cuerpo, tabla(
      cfg.columnas.map(([titulo, k, ancho]) => ({
        titulo,
        celda: (f) => (typeof k === 'function' ? k(f) : f[k]),
        ancho,
      })),
      filas,
      (fila) => [
        h('button', { class: 'btn small', onclick: () => abrirFormulario(fila) }, 'Editar'),
        cfg.sinEliminar ? null : h('button', { class: 'btn small danger', onclick: () => eliminar(fila) }, 'Eliminar'),
      ],
    ));
  }

  async function eliminar(fila) {
    const nombre = fila.titulo ?? fila.nombre ?? `#${fila.id}`;
    if (!confirm(`¿Eliminar ${cfg.singular} "${nombre}"?`)) return;
    try {
      await del(`${cfg.api}/${fila.id}`);
      toast(`${cfg.titulo.slice(0, -1)} eliminado`);
      await cargar();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function abrirFormulario(fila = null) {
    const opciones = {};
    await Promise.all(cfg.campos.filter((c) => c.opciones).map(async (c) => { opciones[c.n] = await c.opciones(); }));

    const controles = cfg.campos.map((c) => {
      if (c.opciones) return campoSelect(c.n, c.l, opciones[c.n], fila?.[c.n]);
      const extra = c.min ? { min: c.min } : {};
      const nodo = campoInput(c.n, c.l, { tipo: c.tipo ?? 'text', valor: fila?.[c.n], ...extra });
      if (c.ayuda) nodo.insertBefore(h('small', { class: 'hint' }, c.ayuda), nodo.querySelector('.error'));
      return nodo;
    });

    const guardar = h('button', { class: 'btn primary', type: 'submit' }, 'Guardar');
    const dialogo = h('dialog');
    const formulario = h('form', {
      novalidate: true,
      onsubmit: async (e) => {
        e.preventDefault();
        guardar.disabled = true;
        try {
          if (fila) await put(`${cfg.api}/${fila.id}`, valoresDe(formulario));
          else await post(cfg.api, valoresDe(formulario));
          dialogo.close();
          toast(fila ? 'Cambios guardados' : 'Registro creado');
          await cargar();
        } catch (err) {
          mostrarErrores(formulario, err instanceof ApiError ? err : new ApiError(0, 'Error inesperado'));
        } finally {
          guardar.disabled = false;
        }
      },
    },
    h('h2', null, `${fila ? 'Editar' : 'Nuevo'} ${cfg.singular}`),
    cfg.openLibrary ? panelOpenLibrary(() => formulario) : null,
    h('div', { class: 'form-grid' }, controles),
    h('div', { class: 'dialog-actions' },
      h('button', { class: 'btn', type: 'button', onclick: () => dialogo.close() }, 'Cancelar'),
      guardar));

    dialogo.append(formulario);
    dialogo.addEventListener('close', () => dialogo.remove());
    document.body.append(dialogo);
    dialogo.showModal();
  }

  const buscador = h('input', {
    class: 'input', type: 'search', placeholder: 'Buscar…', 'aria-label': `Buscar ${cfg.titulo.toLowerCase()}`,
    oninput: (() => {
      let t;
      return (e) => { clearTimeout(t); t = setTimeout(() => { consulta = e.target.value.trim(); cargar(); }, 250); };
    })(),
  });

  montar(contenedor, 
    cabecera(cfg.titulo, cfg.subtitulo, buscador,
      cfg.sinCrear ? null : h('button', { class: 'btn primary', onclick: () => abrirFormulario() }, `+ Nuevo ${cfg.singular}`)),
    cuerpo);
  await cargar();
}

/**
 * Panel para autocompletar un libro consultando el catálogo público de Open Library.
 * Rellena título, año e ISBN y selecciona autor/editorial si ya existen en el sistema.
 */
function panelOpenLibrary(obtenerFormulario) {
  // El formulario aún no existe cuando se crea el panel; se resuelve al usarlo.
  const formulario = { querySelector: (selector) => obtenerFormulario().querySelector(selector) };
  const lista = h('ul', { class: 'ol-list' });
  const nota = h('div');
  const entrada = h('input', { class: 'input', type: 'search', placeholder: 'Título, autor o ISBN…', id: 'ol-q' });
  const boton = h('button', { class: 'btn', type: 'button' }, 'Buscar');

  const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const seleccionarPorTexto = (nombreCampo, texto) => {
    const select = formulario.querySelector(`[name="${nombreCampo}"]`);
    const buscado = normalizar(texto);
    const opcion = [...select.options].find((o) => o.value && normalizar(o.textContent) === buscado);
    if (opcion) select.value = opcion.value;
    return Boolean(opcion);
  };
  const poner = (nombreCampo, valor) => {
    if (valor !== null && valor !== undefined) formulario.querySelector(`[name="${nombreCampo}"]`).value = valor;
  };

  function aplicar(r) {
    poner('titulo', r.titulo);
    poner('anio_publicacion', r.anio);
    poner('isbn', r.isbn);
    const faltantes = [];
    if (r.autores[0] && !seleccionarPorTexto('autor_id', r.autores[0])) faltantes.push(`autor "${r.autores[0]}"`);
    if (r.editorial && !seleccionarPorTexto('editorial_id', r.editorial)) faltantes.push(`editorial "${r.editorial}"`);
    montar(nota, faltantes.length
      ? h('div', { class: 'ol-nota' }, `No están registrados: ${faltantes.join(' y ')}. Créelos en su pantalla y luego selecciónelos aquí.`)
      : null);
    montar(lista, );
  }

  async function buscar() {
    const q = entrada.value.trim();
    if (q.length < 2) { toast('Escriba al menos 2 caracteres', 'error'); return; }
    boton.disabled = true;
    montar(lista, h('li', { class: 'hint' }, 'Buscando en Open Library…'));
    try {
      const { resultados } = await get(`/api/openlibrary/buscar?q=${encodeURIComponent(q)}`);
      montar(lista, ...(resultados.length
        ? resultados.map((r) => h('li', null,
          h('button', { type: 'button', onclick: () => aplicar(r) },
            r.titulo, h('small', null, `${r.autores.join(', ') || 'Autor desconocido'} · ${r.anio ?? 's/f'}`))))
        : [h('li', { class: 'hint' }, 'Sin resultados.')]));
    } catch (err) {
      montar(lista, h('li', { class: 'form-error' }, err.message));
    } finally {
      boton.disabled = false;
    }
  }

  boton.addEventListener('click', buscar);
  entrada.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } });

  return h('div', { class: 'ol-panel' },
    h('label', { for: 'ol-q' }, 'Autocompletar desde Open Library (opcional)'),
    h('div', { class: 'ol-row' }, entrada, boton), lista, nota);
}
