/** Crea 2 usuarios y 4 libros (con su autor, categoría y editorial) a través de la API. */
export async function crearFixtures(ctx) {
  const autor = (await ctx.post('/api/autores', { nombre: 'Gabriel', apellido: 'García Márquez' })).body;
  const categoria = (await ctx.post('/api/categorias', { nombre: 'Novela', descripcion: 'Ficción' })).body;
  const editorial = (await ctx.post('/api/editoriales', { nombre: 'Sudamericana', telefono: '6011112222', correo: 's@sud.com' })).body;

  const usuarios = [];
  for (const [nombre, documento] of [['Ana Pérez', '1001'], ['Luis Soto', '1002']]) {
    usuarios.push((await ctx.post('/api/usuarios', {
      nombre, documento, correo: `${documento}@correo.com`, telefono: '3001234567',
    })).body);
  }

  const libros = [];
  for (const titulo of ['Cien años de soledad', 'El coronel no tiene quien le escriba', 'Crónica de una muerte anunciada', 'El amor en los tiempos del cólera']) {
    libros.push((await ctx.post('/api/libros', {
      titulo, anio_publicacion: 1967, autor_id: autor.id, categoria_id: categoria.id, editorial_id: editorial.id,
    })).body);
  }
  return { usuarios, libros, autor, categoria, editorial };
}

export const prestar = (ctx, usuario, libro, extra = {}, rol = 'admin') =>
  ctx.post('/api/prestamos', { usuario_id: usuario.id, libro_id: libro.id, ...extra }, rol);
