import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

export const CREDENCIALES = {
  admin: { username: 'admin', password: 'Admin123!' },
  bibliotecario: { username: 'bibliotecario', password: 'Biblio123!' },
};

/**
 * Levanta la aplicación real con una BD SQLite en memoria y un reloj controlable.
 * `rol` = 'admin' | 'bibliotecario' | null (sin sesión).
 */
export async function createTestContext({ ahora = '2026-03-10T12:00:00', openLibrary } = {}) {
  const db = openDatabase(':memory:');
  const clock = {
    actual: new Date(ahora),
    set(iso) { this.actual = new Date(iso); },
    now() { return this.actual; },
  };
  const app = createApp({ db, clock: () => clock.now(), openLibrary });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  server.unref(); // un fallo de prueba no debe dejar el proceso colgado
  const base = `http://127.0.0.1:${server.address().port}`;
  const cookies = {};

  async function login(rol) {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CREDENCIALES[rol]),
    });
    const setCookie = res.headers.getSetCookie()[0] ?? '';
    cookies[rol] = setCookie.split(';')[0];
    return res;
  }

  async function raw(method, path, { body, cookie } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* no es JSON */ }
    return { status: res.status, body: json, text, headers: res.headers };
  }

  async function request(method, path, body, rol = 'admin') {
    if (rol && !cookies[rol]) await login(rol);
    const res = await raw(method, path, { body, cookie: rol ? cookies[rol] : undefined });
    // Las pruebas adelantan el reloj: si la sesión caducó (8 h), el usuario vuelve a iniciar sesión.
    if (rol && res.status === 401) {
      await login(rol);
      return raw(method, path, { body, cookie: cookies[rol] });
    }
    return res;
  }

  return {
    db, clock, base, raw, request, login, cookies,
    get: (p, rol) => request('GET', p, undefined, rol),
    post: (p, b, rol) => request('POST', p, b, rol),
    put: (p, b, rol) => request('PUT', p, b, rol),
    del: (p, rol) => request('DELETE', p, undefined, rol),
    close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections?.(); }),
  };
}
