import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';

describe('HU-001 Inicio de sesión', () => {
  let ctx;
  before(async () => { ctx = await createTestContext(); });
  after(() => ctx.close());

  test('credenciales correctas dan acceso y devuelven el usuario sin datos sensibles', async () => {
    const res = await ctx.raw('POST', '/api/auth/login', { body: { username: 'admin', password: 'Admin123!' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.username, 'admin');
    assert.equal(res.body.usuario.rol, 'administrador');
    assert.equal(res.body.usuario.password_hash, undefined);
    assert.doesNotMatch(res.text, /scrypt|password_hash/);
  });

  test('la cookie de sesión es HttpOnly y SameSite=Strict', async () => {
    const res = await ctx.raw('POST', '/api/auth/login', { body: { username: 'admin', password: 'Admin123!' } });
    const cookie = res.headers.getSetCookie()[0];
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
  });

  test('usuario vacío es rechazado con 400 y detalle del campo', async () => {
    const res = await ctx.raw('POST', '/api/auth/login', { body: { username: '', password: 'Admin123!' } });
    assert.equal(res.status, 400);
    assert.ok(res.body.detalles.username);
  });

  test('contraseña vacía es rechazada con 400 y detalle del campo', async () => {
    const res = await ctx.raw('POST', '/api/auth/login', { body: { username: 'admin', password: '' } });
    assert.equal(res.status, 400);
    assert.ok(res.body.detalles.password);
  });

  test('ambos campos ausentes o en blanco son rechazados', async () => {
    const a = await ctx.raw('POST', '/api/auth/login', { body: {} });
    const b = await ctx.raw('POST', '/api/auth/login', { body: { username: '   ', password: '   ' } });
    for (const res of [a, b]) {
      assert.equal(res.status, 400);
      assert.ok(res.body.detalles.username && res.body.detalles.password);
    }
  });

  test('contraseña incorrecta muestra mensaje de error y no entrega cookie', async () => {
    const res = await ctx.raw('POST', '/api/auth/login', { body: { username: 'admin', password: 'mala' } });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Usuario o contraseña incorrectos');
    assert.equal(res.headers.getSetCookie().length, 0);
  });

  test('usuario inexistente recibe el mismo mensaje (no revela qué campo falló)', async () => {
    const res = await ctx.raw('POST', '/api/auth/login', { body: { username: 'fantasma', password: 'x' } });
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Usuario o contraseña incorrectos');
  });

  test('sin sesión, /api/auth/me devuelve 401', async () => {
    const res = await ctx.get('/api/auth/me', null);
    assert.equal(res.status, 401);
  });

  test('con sesión, /api/auth/me devuelve el usuario autenticado', async () => {
    const res = await ctx.get('/api/auth/me', 'bibliotecario');
    assert.equal(res.status, 200);
    assert.equal(res.body.usuario.username, 'bibliotecario');
  });

  test('cerrar sesión invalida la cookie (no puede reutilizarse)', async () => {
    await ctx.login('admin');
    const cookie = ctx.cookies.admin;
    assert.equal((await ctx.raw('GET', '/api/auth/me', { cookie })).status, 200);
    assert.equal((await ctx.raw('POST', '/api/auth/logout', { cookie })).status, 200);
    assert.equal((await ctx.raw('GET', '/api/auth/me', { cookie })).status, 401);
  });

  test('la sesión expira a las 8 horas', async () => {
    await ctx.login('bibliotecario');
    const cookie = ctx.cookies.bibliotecario;
    ctx.clock.set('2026-03-10T19:59:00');
    assert.equal((await ctx.raw('GET', '/api/auth/me', { cookie })).status, 200);
    ctx.clock.set('2026-03-10T20:01:00');
    assert.equal((await ctx.raw('GET', '/api/auth/me', { cookie })).status, 401);
    ctx.clock.set('2026-03-10T12:00:00');
  });

  test('un token inventado no da acceso', async () => {
    const res = await ctx.raw('GET', '/api/auth/me', { cookie: 'sid=inventado' });
    assert.equal(res.status, 401);
  });
});
