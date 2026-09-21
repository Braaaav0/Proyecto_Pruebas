import { crudRouter } from './crud.js';

const anioMaximo = ({ clock }) => clock().getFullYear() + 1;

/** Configuración de cada pantalla maestra (HU-003 a HU-008). */
export const MAESTRAS = {
  usuarios: {
    tabla: 'usuarios',
    campos: {
      nombre: { etiqueta: 'El nombre', tipo: 'texto' },
      documento: { etiqueta: 'El documento', tipo: 'texto', max: 30 },
      correo: { etiqueta: 'El correo', tipo: 'correo' },
      telefono: { etiqueta: 'El teléfono', tipo: 'telefono' },
    },
    buscar: ['t.nombre', 't.documento', 't.correo'],
    orden: 't.nombre',
    unicos: [{ campo: 'documento', mensaje: 'Ya existe un usuario con ese documento' }],
    dependencias: [{
      sql: 'SELECT 1 FROM prestamos WHERE usuario_id = ? LIMIT 1',
      mensaje: 'No se puede eliminar el usuario porque tiene préstamos registrados',
    }],
  },

  autores: {
    tabla: 'autores',
    campos: {
      nombre: { etiqueta: 'El nombre', tipo: 'texto' },
      apellido: { etiqueta: 'El apellido', tipo: 'texto' },
    },
    buscar: ['t.nombre', 't.apellido'],
    orden: 't.apellido, t.nombre',
    dependencias: [{
      sql: 'SELECT 1 FROM libros WHERE autor_id = ? LIMIT 1',
      mensaje: 'No se puede eliminar el autor porque tiene libros asociados',
    }],
  },

  categorias: {
    tabla: 'categorias',
    campos: {
      nombre: { etiqueta: 'El nombre', tipo: 'texto' },
      descripcion: { etiqueta: 'La descripción', tipo: 'texto', max: 500 },
    },
    buscar: ['t.nombre', 't.descripcion'],
    orden: 't.nombre',
    unicos: [{ campo: 'nombre', mensaje: 'Ya existe una categoría con ese nombre' }],
    dependencias: [{
      sql: 'SELECT 1 FROM libros WHERE categoria_id = ? LIMIT 1',
      mensaje: 'No se puede eliminar la categoría porque tiene libros asociados',
    }],
  },

  editoriales: {
    tabla: 'editoriales',
    campos: {
      nombre: { etiqueta: 'El nombre', tipo: 'texto' },
      telefono: { etiqueta: 'El teléfono', tipo: 'telefono' },
      correo: { etiqueta: 'El correo', tipo: 'correo' },
    },
    buscar: ['t.nombre', 't.correo'],
    orden: 't.nombre',
    dependencias: [{
      sql: 'SELECT 1 FROM libros WHERE editorial_id = ? LIMIT 1',
      mensaje: 'No se puede eliminar la editorial porque tiene libros asociados',
    }],
  },

  libros: {
    tabla: 'libros',
    campos: {
      titulo: { etiqueta: 'El título', tipo: 'texto' },
      isbn: { etiqueta: 'El ISBN', tipo: 'isbn', opcional: true },
      anio_publicacion: { etiqueta: 'El año de publicación', tipo: 'entero', min: 1000, max: anioMaximo },
      autor_id: { etiqueta: 'El autor', tipo: 'ref', tabla: 'autores' },
      categoria_id: { etiqueta: 'La categoría', tipo: 'ref', tabla: 'categorias' },
      editorial_id: { etiqueta: 'La editorial', tipo: 'ref', tabla: 'editoriales' },
    },
    consulta: `
      SELECT t.id, t.titulo, t.isbn, t.anio_publicacion,
             t.autor_id, a.nombre || ' ' || a.apellido AS autor,
             t.categoria_id, c.nombre AS categoria,
             t.editorial_id, e.nombre AS editorial,
             t.disponible
      FROM libros t
      JOIN autores a ON a.id = t.autor_id
      JOIN categorias c ON c.id = t.categoria_id
      JOIN editoriales e ON e.id = t.editorial_id`,
    mapear: (fila) => ({
      ...fila,
      disponible: fila.disponible === 1,
      disponibilidad: fila.disponible === 1 ? 'Disponible' : 'Prestado',
    }),
    buscar: ['t.titulo', 't.isbn', "a.nombre || ' ' || a.apellido", 'c.nombre', 'e.nombre'],
    orden: 't.titulo',
    dependencias: [{
      sql: 'SELECT 1 FROM prestamos WHERE libro_id = ? LIMIT 1',
      mensaje: 'No se puede eliminar el libro porque tiene préstamos en su historial',
    }],
  },

  // Los estados forman parte de la lógica del préstamo: solo se consultan y se renombra su etiqueta.
  'estados-prestamo': {
    tabla: 'estados_prestamo',
    campos: { nombre: { etiqueta: 'El nombre', tipo: 'texto', max: 50 } },
    unicos: [{ campo: 'nombre', mensaje: 'Ya existe un estado con ese nombre' }],
    operaciones: ['listar', 'obtener', 'actualizar'],
  },
};

export function montarMaestras(app, ctx) {
  for (const [recurso, cfg] of Object.entries(MAESTRAS)) {
    app.use(`/api/${recurso}`, crudRouter(ctx, cfg));
  }
}
