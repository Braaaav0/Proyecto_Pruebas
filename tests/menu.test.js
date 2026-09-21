import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';

const ids = (res) => res.body.opciones.map((o) => o.id);

describe('HU-002 Menú principal', () => {
  let ctx;
  before(async () => { ctx = await createTestContext(); });
  after(() => ctx.close());

  test('el menú exige sesión', async () => {
    assert.equal((await ctx.get('/api/menu', null)).status, 401);
  });

  test('el administrador ve las 5 pantallas maestras, estados, préstamos y reportes', async () => {
    const res = await ctx.get('/api/menu', 'admin');
    assert.equal(res.status, 200);
    for (const id of ['usuarios', 'autores', 'categorias', 'editoriales', 'libros', 'estados',
      'prestamos', 'reporte-prestados', 'reporte-atrasados']) {
      assert.ok(ids(res).includes(id), `falta la opción ${id}`);
    }
  });

  test('el bibliotecario solo ve préstamos y reportes (sin maestras)', async () => {
    const res = await ctx.get('/api/menu', 'bibliotecario');
    assert.deepEqual(ids(res).sort(), ['prestamos', 'reporte-atrasados', 'reporte-prestados']);
  });

  test('cada opción trae título, grupo y ruta para navegar', async () => {
    const res = await ctx.get('/api/menu', 'admin');
    for (const o of res.body.opciones) {
      assert.ok(o.titulo && o.grupo && o.ruta.startsWith('#/'), JSON.stringify(o));
    }
  });

  test('el menú informa el usuario y rol conectados', async () => {
    const res = await ctx.get('/api/menu', 'bibliotecario');
    assert.equal(res.body.usuario.rol, 'bibliotecario');
  });

  test('las rutas de API de administración rechazan al bibliotecario con 403', async () => {
    const res = await ctx.post('/api/autores', { nombre: 'A', apellido: 'B' }, 'bibliotecario');
    assert.equal(res.status, 403);
  });
});
