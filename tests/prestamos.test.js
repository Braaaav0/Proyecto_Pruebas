import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';
import { crearFixtures, prestar } from './fixtures.js';

describe('HU-009 Registrar préstamo de libro', () => {
  let ctx;
  let f;
  before(async () => {
    ctx = await createTestContext({ ahora: '2026-03-10T12:00:00' });
    f = await crearFixtures(ctx);
  });
  after(() => ctx.close());

  test('registra el préstamo con fecha de hoy, fecha límite a 14 días y estado Prestado', async () => {
    const res = await prestar(ctx, f.usuarios[0], f.libros[0]);
    assert.equal(res.status, 201);
    assert.equal(res.body.fecha_prestamo, '2026-03-10');
    assert.equal(res.body.fecha_limite, '2026-03-24');
    assert.equal(res.body.fecha_devolucion, null);
    assert.equal(res.body.estado, 'Prestado');
    assert.equal(res.body.estado_codigo, 'PRESTADO');
    assert.equal(res.body.usuario, 'Ana Pérez');
    assert.equal(res.body.libro, 'Cien años de soledad');
  });

  test('el libro prestado pasa a estado "Prestado" (no disponible)', async () => {
    const libro = (await ctx.get(`/api/libros/${f.libros[0].id}`)).body;
    assert.equal(libro.disponible, false);
    assert.equal(libro.disponibilidad, 'Prestado');
  });

  test('impide prestar un libro que ya está prestado (409) y no crea un segundo préstamo', async () => {
    const antes = (await ctx.get('/api/prestamos')).body.length;
    const res = await prestar(ctx, f.usuarios[1], f.libros[0]);
    assert.equal(res.status, 409);
    assert.match(res.body.error, /ya se encuentra prestado/i);
    assert.equal((await ctx.get('/api/prestamos')).body.length, antes);
  });

  test('permite indicar los días de préstamo', async () => {
    const res = await prestar(ctx, f.usuarios[1], f.libros[1], { dias: 7 });
    assert.equal(res.status, 201);
    assert.equal(res.body.fecha_limite, '2026-03-17');
  });

  test('rechaza días de préstamo fuera de 1 a 90 o no numéricos', async () => {
    for (const dias of [0, 91, -3, 'abc', 2.5]) {
      const res = await prestar(ctx, f.usuarios[1], f.libros[2], { dias });
      assert.equal(res.status, 400, String(dias));
      assert.ok(res.body.detalles.dias);
    }
    assert.equal((await ctx.get(`/api/libros/${f.libros[2].id}`)).body.disponible, true);
  });

  test('exige usuario y libro', async () => {
    const res = await ctx.post('/api/prestamos', {});
    assert.equal(res.status, 400);
    assert.ok(res.body.detalles.usuario_id && res.body.detalles.libro_id);
  });

  test('solo acepta usuarios y libros registrados', async () => {
    const a = await ctx.post('/api/prestamos', { usuario_id: 999999, libro_id: f.libros[2].id });
    assert.equal(a.status, 400);
    assert.ok(a.body.detalles.usuario_id);
    const b = await ctx.post('/api/prestamos', { usuario_id: f.usuarios[0].id, libro_id: 999999 });
    assert.equal(b.status, 400);
    assert.ok(b.body.detalles.libro_id);
  });

  test('el bibliotecario también puede registrar préstamos', async () => {
    const res = await prestar(ctx, f.usuarios[0], f.libros[2], {}, 'bibliotecario');
    assert.equal(res.status, 201);
  });

  test('sin sesión no se puede prestar (401)', async () => {
    const res = await ctx.post('/api/prestamos', { usuario_id: 1, libro_id: 1 }, null);
    assert.equal(res.status, 401);
  });

  test('la base de datos rechaza dos préstamos activos del mismo libro (red de seguridad)', () => {
    const insertar = () => ctx.db.prepare(
      `INSERT INTO prestamos (usuario_id, libro_id, estado_id, fecha_prestamo, fecha_limite)
       VALUES (?, ?, 1, '2026-03-10', '2026-03-24')`,
    ).run(f.usuarios[1].id, f.libros[0].id);
    assert.throws(insertar, /UNIQUE/i);
  });
});

describe('HU-010 Registrar devolución de libro', () => {
  let ctx;
  let f;
  let prestamo;
  before(async () => {
    ctx = await createTestContext({ ahora: '2026-03-10T12:00:00' });
    f = await crearFixtures(ctx);
    prestamo = (await prestar(ctx, f.usuarios[0], f.libros[0])).body;
    await prestar(ctx, f.usuarios[1], f.libros[1]);
  });
  after(() => ctx.close());

  test('consulta los préstamos activos', async () => {
    const res = await ctx.get('/api/prestamos?activos=1');
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 2);
    assert.ok(res.body.every((p) => p.fecha_devolucion === null));
  });

  test('registra la devolución: fecha de hoy y estado Devuelto', async () => {
    ctx.clock.set('2026-03-15T09:00:00');
    const res = await ctx.post(`/api/prestamos/${prestamo.id}/devolucion`, {});
    assert.equal(res.status, 200);
    assert.equal(res.body.fecha_devolucion, '2026-03-15');
    assert.equal(res.body.estado, 'Devuelto');
    assert.equal(res.body.estado_codigo, 'DEVUELTO');
  });

  test('el libro vuelve a estar Disponible', async () => {
    const libro = (await ctx.get(`/api/libros/${f.libros[0].id}`)).body;
    assert.equal(libro.disponible, true);
    assert.equal(libro.disponibilidad, 'Disponible');
  });

  test('el préstamo devuelto se conserva en el historial pero sale de los activos', async () => {
    const historial = (await ctx.get('/api/prestamos')).body;
    assert.ok(historial.some((p) => p.id === prestamo.id && p.estado === 'Devuelto'));
    const activos = (await ctx.get('/api/prestamos?activos=1')).body;
    assert.ok(!activos.some((p) => p.id === prestamo.id));
  });

  test('no se puede devolver dos veces el mismo préstamo (409)', async () => {
    const res = await ctx.post(`/api/prestamos/${prestamo.id}/devolucion`, {});
    assert.equal(res.status, 409);
  });

  test('devolver un préstamo inexistente responde 404', async () => {
    assert.equal((await ctx.post('/api/prestamos/999999/devolucion', {})).status, 404);
    assert.equal((await ctx.post('/api/prestamos/abc/devolucion', {})).status, 404);
  });

  test('un libro devuelto puede volver a prestarse', async () => {
    const res = await prestar(ctx, f.usuarios[1], f.libros[0]);
    assert.equal(res.status, 201);
  });

  test('el bibliotecario puede registrar devoluciones', async () => {
    const activo = (await ctx.get('/api/prestamos?activos=1')).body[0];
    const res = await ctx.post(`/api/prestamos/${activo.id}/devolucion`, {}, 'bibliotecario');
    assert.equal(res.status, 200);
  });
});

describe('Estado "Atrasado" automático en los préstamos', () => {
  let ctx;
  let f;
  let prestamo;
  before(async () => {
    ctx = await createTestContext({ ahora: '2026-03-10T12:00:00' });
    f = await crearFixtures(ctx);
    prestamo = (await prestar(ctx, f.usuarios[0], f.libros[0], { dias: 7 })).body; // vence 2026-03-17
  });
  after(() => ctx.close());

  test('el día del vencimiento todavía está Prestado', async () => {
    ctx.clock.set('2026-03-17T23:00:00');
    const p = (await ctx.get('/api/prestamos?activos=1')).body[0];
    assert.equal(p.estado, 'Prestado');
    assert.equal(p.dias_retraso, 0);
  });

  test('al día siguiente pasa a Atrasado y muestra los días de retraso', async () => {
    ctx.clock.set('2026-03-20T08:00:00');
    const p = (await ctx.get('/api/prestamos?activos=1')).body[0];
    assert.equal(p.estado, 'Atrasado');
    assert.equal(p.estado_codigo, 'ATRASADO');
    assert.equal(p.dias_retraso, 3);
  });

  test('un préstamo atrasado puede devolverse y queda como Devuelto', async () => {
    const res = await ctx.post(`/api/prestamos/${prestamo.id}/devolucion`, {});
    assert.equal(res.status, 200);
    assert.equal(res.body.estado, 'Devuelto');
    assert.equal(res.body.fecha_devolucion, '2026-03-20');
    assert.equal((await ctx.get(`/api/libros/${f.libros[0].id}`)).body.disponible, true);
  });
});

describe('El historial de préstamos protege a usuarios y libros', () => {
  let ctx;
  let f;
  before(async () => {
    ctx = await createTestContext();
    f = await crearFixtures(ctx);
    const p = (await prestar(ctx, f.usuarios[0], f.libros[0])).body;
    await ctx.post(`/api/prestamos/${p.id}/devolucion`, {}); // incluso devuelto queda en el historial
  });
  after(() => ctx.close());

  test('no se elimina un usuario que tiene préstamos (409)', async () => {
    const res = await ctx.del(`/api/usuarios/${f.usuarios[0].id}`);
    assert.equal(res.status, 409);
    assert.match(res.body.error, /préstamos/i);
  });

  test('no se elimina un libro que tiene préstamos (409)', async () => {
    const res = await ctx.del(`/api/libros/${f.libros[0].id}`);
    assert.equal(res.status, 409);
    assert.match(res.body.error, /préstamos/i);
  });

  test('sí se elimina un usuario sin préstamos', async () => {
    assert.equal((await ctx.del(`/api/usuarios/${f.usuarios[1].id}`)).status, 204);
  });
});
