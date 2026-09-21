import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';

describe('HU-007 Gestión de libros', () => {
  let ctx;
  let fk;
  let libro;
  before(async () => {
    ctx = await createTestContext();
    const autor = (await ctx.post('/api/autores', { nombre: 'Gabriel', apellido: 'García Márquez' })).body;
    const categoria = (await ctx.post('/api/categorias', { nombre: 'Novela', descripcion: 'Ficción' })).body;
    const editorial = (await ctx.post('/api/editoriales', { nombre: 'Sudamericana', telefono: '6011112222', correo: 's@sud.com' })).body;
    fk = { autor_id: autor.id, categoria_id: categoria.id, editorial_id: editorial.id };
    libro = { titulo: 'Cien años de soledad', anio_publicacion: 1967, isbn: '9780060883287', ...fk };
  });
  after(() => ctx.close());

  test('registra un libro y lo muestra como Disponible con los nombres de autor, categoría y editorial', async () => {
    const res = await ctx.post('/api/libros', libro);
    assert.equal(res.status, 201);
    assert.equal(res.body.titulo, 'Cien años de soledad');
    assert.equal(res.body.autor, 'Gabriel García Márquez');
    assert.equal(res.body.categoria, 'Novela');
    assert.equal(res.body.editorial, 'Sudamericana');
    assert.equal(res.body.disponible, true);
    assert.equal(res.body.disponibilidad, 'Disponible');
  });

  for (const campo of ['titulo', 'anio_publicacion', 'autor_id', 'categoria_id', 'editorial_id']) {
    test(`exige "${campo}"`, async () => {
      const { [campo]: _x, ...incompleto } = libro;
      const res = await ctx.post('/api/libros', incompleto);
      assert.equal(res.status, 400);
      assert.ok(res.body.detalles[campo]);
    });
  }

  test('el ISBN es opcional', async () => {
    const { isbn: _i, ...sinIsbn } = libro;
    const res = await ctx.post('/api/libros', { ...sinIsbn, titulo: 'Sin ISBN' });
    assert.equal(res.status, 201);
  });

  test('rechaza un ISBN con formato inválido', async () => {
    const res = await ctx.post('/api/libros', { ...libro, isbn: 'abc' });
    assert.equal(res.status, 400);
    assert.ok(res.body.detalles.isbn);
  });

  test('rechaza años no numéricos, muy antiguos o futuros lejanos', async () => {
    for (const anio of ['dos mil', 999, 2500, 1.5]) {
      const res = await ctx.post('/api/libros', { ...libro, anio_publicacion: anio });
      assert.equal(res.status, 400, String(anio));
      assert.ok(res.body.detalles.anio_publicacion);
    }
  });

  test('acepta el año como texto numérico (formularios HTML)', async () => {
    const res = await ctx.post('/api/libros', { ...libro, titulo: 'Año texto', anio_publicacion: '1990' });
    assert.equal(res.status, 201);
    assert.equal(res.body.anio_publicacion, 1990);
  });

  test('rechaza referencias a autor, categoría o editorial inexistentes', async () => {
    for (const campo of ['autor_id', 'categoria_id', 'editorial_id']) {
      const res = await ctx.post('/api/libros', { ...libro, [campo]: 999999 });
      assert.equal(res.status, 400, campo);
      assert.ok(res.body.detalles[campo]);
    }
  });

  test('lista y consulta libros con su disponibilidad', async () => {
    const lista = await ctx.get('/api/libros');
    assert.equal(lista.status, 200);
    assert.ok(lista.body.length >= 1);
    assert.ok(['Disponible', 'Prestado'].includes(lista.body[0].disponibilidad));
    const uno = await ctx.get(`/api/libros/${lista.body[0].id}`);
    assert.equal(uno.body.autor, 'Gabriel García Márquez');
  });

  test('busca por título, autor o ISBN con ?q=', async () => {
    assert.ok((await ctx.get('/api/libros?q=soledad')).body.length >= 1);
    assert.ok((await ctx.get('/api/libros?q=m%C3%A1rquez')).body.length >= 1);
    assert.ok((await ctx.get('/api/libros?q=9780060883287')).body.length >= 1);
    assert.equal((await ctx.get('/api/libros?q=inexistente-zzz')).body.length, 0);
  });

  test('modifica un libro, pero no permite cambiar la disponibilidad a mano', async () => {
    const id = (await ctx.get('/api/libros')).body[0].id;
    const res = await ctx.put(`/api/libros/${id}`, { ...libro, titulo: 'Título corregido', disponible: false });
    assert.equal(res.status, 200);
    assert.equal(res.body.titulo, 'Título corregido');
    assert.equal(res.body.disponible, true);
  });

  test('elimina un libro que no tiene préstamos', async () => {
    const creado = (await ctx.post('/api/libros', { ...libro, titulo: 'Para borrar' })).body;
    assert.equal((await ctx.del(`/api/libros/${creado.id}`)).status, 204);
    assert.equal((await ctx.get(`/api/libros/${creado.id}`)).status, 404);
  });
});
