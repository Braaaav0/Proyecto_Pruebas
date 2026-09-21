import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';

describe('HU-008 Gestión de estados de préstamo', () => {
  let ctx;
  before(async () => { ctx = await createTestContext(); });
  after(() => ctx.close());

  test('el sistema trae registrados los estados Prestado, Devuelto y Atrasado', async () => {
    const res = await ctx.get('/api/estados-prestamo');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((e) => e.nombre).sort(), ['Atrasado', 'Devuelto', 'Prestado']);
    assert.deepEqual(res.body.map((e) => e.codigo).sort(), ['ATRASADO', 'DEVUELTO', 'PRESTADO']);
  });

  test('consulta un estado por id', async () => {
    const [primero] = (await ctx.get('/api/estados-prestamo')).body;
    const res = await ctx.get(`/api/estados-prestamo/${primero.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.codigo, primero.codigo);
  });

  test('modifica el nombre visible sin alterar el código interno', async () => {
    const prestado = (await ctx.get('/api/estados-prestamo')).body.find((e) => e.codigo === 'PRESTADO');
    const res = await ctx.put(`/api/estados-prestamo/${prestado.id}`, { nombre: 'En préstamo', codigo: 'HACK' });
    assert.equal(res.status, 200);
    assert.equal(res.body.nombre, 'En préstamo');
    assert.equal(res.body.codigo, 'PRESTADO');
    await ctx.put(`/api/estados-prestamo/${prestado.id}`, { nombre: 'Prestado' });
  });

  test('exige nombre y rechaza nombres repetidos', async () => {
    const [a, b] = (await ctx.get('/api/estados-prestamo')).body;
    assert.equal((await ctx.put(`/api/estados-prestamo/${a.id}`, { nombre: ' ' })).status, 400);
    assert.equal((await ctx.put(`/api/estados-prestamo/${a.id}`, { nombre: b.nombre.toLowerCase() })).status, 409);
  });

  test('no se pueden crear ni eliminar estados (son parte de la lógica del préstamo)', async () => {
    assert.equal((await ctx.post('/api/estados-prestamo', { nombre: 'Perdido' })).status, 404);
    const [a] = (await ctx.get('/api/estados-prestamo')).body;
    assert.equal((await ctx.del(`/api/estados-prestamo/${a.id}`)).status, 404);
  });

  test('solo el administrador puede modificar', async () => {
    const [a] = (await ctx.get('/api/estados-prestamo')).body;
    assert.equal((await ctx.put(`/api/estados-prestamo/${a.id}`, { nombre: 'Nuevo' }, 'bibliotecario')).status, 403);
  });
});
