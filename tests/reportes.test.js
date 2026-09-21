import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';
import { crearFixtures, prestar } from './fixtures.js';

describe('HU-011 Reporte de libros prestados', () => {
  let ctx;
  let f;
  let devuelto;
  before(async () => {
    ctx = await createTestContext({ ahora: '2026-03-10T12:00:00' });
    f = await crearFixtures(ctx);
    await prestar(ctx, f.usuarios[0], f.libros[0]);            // Ana - Cien años (14 días)
    await prestar(ctx, f.usuarios[1], f.libros[1], { dias: 7 }); // Luis - Coronel (7 días)
    devuelto = (await prestar(ctx, f.usuarios[0], f.libros[2])).body;
    await ctx.post(`/api/prestamos/${devuelto.id}/devolucion`, {});
  });
  after(() => ctx.close());

  test('muestra únicamente los préstamos activos', async () => {
    const res = await ctx.get('/api/reportes/libros-prestados');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
    assert.equal(res.body.items.length, 2);
    assert.ok(!res.body.items.some((i) => i.libro === 'Crónica de una muerte anunciada'));
  });

  test('cada fila trae usuario, título, fecha de préstamo y fecha límite', async () => {
    const { items } = (await ctx.get('/api/reportes/libros-prestados')).body;
    const ana = items.find((i) => i.usuario === 'Ana Pérez');
    assert.equal(ana.libro, 'Cien años de soledad');
    assert.equal(ana.fecha_prestamo, '2026-03-10');
    assert.equal(ana.fecha_limite, '2026-03-24');
  });

  test('filtra por usuario (nombre o documento, parcial)', async () => {
    const porNombre = (await ctx.get('/api/reportes/libros-prestados?usuario=luis')).body;
    assert.equal(porNombre.total, 1);
    assert.equal(porNombre.items[0].usuario, 'Luis Soto');
    const porDoc = (await ctx.get('/api/reportes/libros-prestados?usuario=1001')).body;
    assert.equal(porDoc.items[0].usuario, 'Ana Pérez');
  });

  test('filtra por título del libro', async () => {
    const res = (await ctx.get('/api/reportes/libros-prestados?libro=coronel')).body;
    assert.equal(res.total, 1);
    assert.equal(res.items[0].libro, 'El coronel no tiene quien le escriba');
  });

  test('combina filtros y devuelve vacío cuando nada coincide', async () => {
    const res = (await ctx.get('/api/reportes/libros-prestados?usuario=ana&libro=coronel')).body;
    assert.equal(res.total, 0);
    assert.deepEqual(res.items, []);
  });

  test('incluye también los préstamos atrasados, porque el libro sigue fuera', async () => {
    ctx.clock.set('2026-03-20T09:00:00'); // Luis vencía el 17
    const { items } = (await ctx.get('/api/reportes/libros-prestados')).body;
    assert.equal(items.length, 2);
    assert.equal(items.find((i) => i.usuario === 'Luis Soto').estado, 'Atrasado');
    ctx.clock.set('2026-03-10T12:00:00');
  });

  test('está disponible para el bibliotecario y exige sesión', async () => {
    assert.equal((await ctx.get('/api/reportes/libros-prestados', 'bibliotecario')).status, 200);
    assert.equal((await ctx.get('/api/reportes/libros-prestados', null)).status, 401);
  });

  test('sin préstamos activos devuelve lista vacía', async () => {
    const c = await createTestContext();
    const res = await c.get('/api/reportes/libros-prestados');
    assert.deepEqual(res.body, { items: [], total: 0 });
    await c.close();
  });
});

describe('HU-012 Reporte de préstamos atrasados', () => {
  let ctx;
  let f;
  before(async () => {
    ctx = await createTestContext({ ahora: '2026-03-10T12:00:00' });
    f = await crearFixtures(ctx);
  });
  after(() => ctx.close());

  test('cuando no hay préstamos atrasados muestra un mensaje', async () => {
    const res = await ctx.get('/api/reportes/prestamos-atrasados');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items, []);
    assert.equal(res.body.total, 0);
    assert.equal(res.body.mensaje, 'No existen préstamos atrasados');
  });

  test('un préstamo no está atrasado hasta que pasa su fecha límite', async () => {
    await prestar(ctx, f.usuarios[0], f.libros[0], { dias: 7 }); // vence 2026-03-17
    ctx.clock.set('2026-03-17T20:00:00');
    const res = await ctx.get('/api/reportes/prestamos-atrasados');
    assert.equal(res.body.total, 0);
  });

  test('identifica automáticamente los vencidos, sin acción manual', async () => {
    ctx.clock.set('2026-03-20T08:00:00');
    const res = await ctx.get('/api/reportes/prestamos-atrasados');
    assert.equal(res.body.total, 1);
    assert.equal(res.body.mensaje, null);
  });

  test('muestra usuario responsable, libro pendiente, fecha límite y días de retraso', async () => {
    const [fila] = (await ctx.get('/api/reportes/prestamos-atrasados')).body.items;
    assert.equal(fila.usuario, 'Ana Pérez');
    assert.equal(fila.libro, 'Cien años de soledad');
    assert.equal(fila.fecha_limite, '2026-03-17');
    assert.equal(fila.dias_retraso, 3);
  });

  test('el estado Atrasado queda guardado en el préstamo', async () => {
    const [p] = (await ctx.get('/api/prestamos?activos=1')).body;
    assert.equal(p.estado, 'Atrasado');
  });

  test('ordena de mayor a menor retraso', async () => {
    await ctx.post('/api/prestamos/1/devolucion', {}); // libera libro 0
    ctx.clock.set('2026-03-01T08:00:00');
    await prestar(ctx, f.usuarios[1], f.libros[1], { dias: 1 });  // vence 03-02
    ctx.clock.set('2026-03-05T08:00:00');
    await prestar(ctx, f.usuarios[0], f.libros[2], { dias: 1 });  // vence 03-06
    ctx.clock.set('2026-03-20T08:00:00');
    const { items } = (await ctx.get('/api/reportes/prestamos-atrasados')).body;
    assert.deepEqual(items.map((i) => i.dias_retraso), [18, 14]);
  });

  test('los préstamos devueltos desaparecen del reporte', async () => {
    const { items } = (await ctx.get('/api/reportes/prestamos-atrasados')).body;
    await ctx.post(`/api/prestamos/${items[0].id}/devolucion`, {});
    const despues = (await ctx.get('/api/reportes/prestamos-atrasados')).body;
    assert.equal(despues.total, 1);
  });

  test('está disponible para el bibliotecario y exige sesión', async () => {
    assert.equal((await ctx.get('/api/reportes/prestamos-atrasados', 'bibliotecario')).status, 200);
    assert.equal((await ctx.get('/api/reportes/prestamos-atrasados', null)).status, 401);
  });
});
