import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';
import { crearFixtures, prestar } from './fixtures.js';

describe('Robustez de la API', () => {
  let ctx;
  let f;
  before(async () => {
    ctx = await createTestContext();
    f = await crearFixtures(ctx);
  });
  after(() => ctx.close());

  test('un JSON mal formado responde 400 y no 500', async () => {
    await ctx.login('admin');
    const res = await fetch(`${ctx.base}/api/autores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: ctx.cookies.admin },
      body: '{"nombre": ',
    });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'JSON inválido');
  });

  test('un cuerpo demasiado grande responde 413', async () => {
    const res = await ctx.post('/api/autores', { nombre: 'x'.repeat(200_000), apellido: 'y' });
    assert.equal(res.status, 413);
  });

  test('una ruta de API inexistente responde 404 en JSON', async () => {
    const res = await ctx.get('/api/no-existe');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });

  test('un cuerpo que no es un objeto se trata como campos vacíos (400)', async () => {
    const res = await ctx.post('/api/autores', [1, 2, 3]);
    assert.equal(res.status, 400);
  });

  test('las respuestas incluyen cabeceras de seguridad', async () => {
    const res = await ctx.raw('GET', '/');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  test('los caracteres % y _ en la búsqueda se tratan como texto literal', async () => {
    assert.equal((await ctx.get('/api/autores?q=%25')).body.length, 0);
    assert.equal((await ctx.get('/api/autores?q=_')).body.length, 0);
  });

  test('la búsqueda de préstamos filtra por usuario o título con ?q=', async () => {
    await prestar(ctx, f.usuarios[0], f.libros[0]);
    await prestar(ctx, f.usuarios[1], f.libros[1]);
    assert.equal((await ctx.get('/api/prestamos?q=ana')).body.length, 1);
    assert.equal((await ctx.get('/api/prestamos?q=coronel')).body.length, 1);
    assert.equal((await ctx.get('/api/prestamos?q=zzz')).body.length, 0);
  });

  test('un error inesperado responde 500 genérico sin filtrar detalles internos', async () => {
    const original = console.error;
    console.error = () => {};
    try {
      ctx.db.exec('DROP TABLE sesiones');
      const res = await ctx.raw('GET', '/api/menu', { cookie: ctx.cookies.admin });
      assert.equal(res.status, 500);
      assert.equal(res.body.error, 'Error interno del servidor');
      assert.doesNotMatch(res.text, /sesiones|SQLITE|no such table/i);
    } finally {
      console.error = original;
    }
  });
});
