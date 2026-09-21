import { nuevoToken } from './auth.js';
import { noAutenticado, prohibido } from './errores.js';

export const COOKIE = 'sid';
export const DURACION_MS = 8 * 60 * 60 * 1000;

export function leerCookie(req, nombre = COOKIE) {
  const cabecera = req.headers.cookie ?? '';
  for (const parte of cabecera.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nombre) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function opcionesCookie(extra = {}) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...extra,
  };
}

export function crearSesion({ db, clock }, cuentaId) {
  const token = nuevoToken();
  const expira = clock().getTime() + DURACION_MS;
  db.prepare('INSERT INTO sesiones (token, cuenta_id, expira) VALUES (?, ?, ?)').run(token, cuentaId, expira);
  return { token, expira };
}

export function cerrarSesion({ db }, token) {
  if (token) db.prepare('DELETE FROM sesiones WHERE token = ?').run(token);
}

/** Devuelve la cuenta asociada a la cookie si la sesión existe y no expiró; si no, null. */
export function obtenerCuenta({ db, clock }, req) {
  const token = leerCookie(req);
  if (!token) return null;
  const fila = db.prepare(`
    SELECT c.id, c.username, c.nombre, c.rol, s.expira
    FROM sesiones s JOIN cuentas c ON c.id = s.cuenta_id
    WHERE s.token = ?`).get(token);
  if (!fila) return null;
  if (fila.expira <= clock().getTime()) {
    cerrarSesion({ db }, token);
    return null;
  }
  const { expira, ...cuenta } = fila;
  return cuenta;
}

/** Middleware: exige sesión válida y deja la cuenta en `req.cuenta`. */
export function requerirSesion(ctx) {
  return (req, _res, next) => {
    const cuenta = obtenerCuenta(ctx, req);
    if (!cuenta) return next(noAutenticado());
    req.cuenta = cuenta;
    next();
  };
}

/** Middleware: exige uno de los roles indicados. */
export function requerirRol(...roles) {
  return (req, _res, next) => (roles.includes(req.cuenta?.rol) ? next() : next(prohibido()));
}

/** Los métodos que modifican datos exigen rol administrador; las consultas solo sesión. */
export function soloAdminParaEscritura(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  return requerirRol('administrador')(req, _res, next);
}
