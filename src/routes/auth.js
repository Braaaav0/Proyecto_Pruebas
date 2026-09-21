import { Router } from 'express';
import { verifyPassword } from '../auth.js';
import { badRequest, noAutenticado } from '../errores.js';
import {
  COOKIE, DURACION_MS, crearSesion, cerrarSesion, leerCookie, obtenerCuenta, opcionesCookie,
} from '../sesion.js';

const MENSAJE_CREDENCIALES = 'Usuario o contraseña incorrectos';

export function authRouter(ctx) {
  const router = Router();

  router.post('/login', (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    const detalles = {};
    if (!username) detalles.username = 'El usuario es obligatorio';
    if (!password.trim()) detalles.password = 'La contraseña es obligatoria';
    if (Object.keys(detalles).length) throw badRequest('Usuario y contraseña son obligatorios', detalles);

    const cuenta = ctx.db.prepare('SELECT * FROM cuentas WHERE username = ?').get(username);
    // Se verifica siempre contra un hash para no revelar por tiempo si el usuario existe.
    const valido = verifyPassword(password, cuenta?.password_hash);
    if (!cuenta || !valido) throw noAutenticado(MENSAJE_CREDENCIALES);

    const { token } = crearSesion(ctx, cuenta.id);
    res.cookie(COOKIE, token, opcionesCookie({ maxAge: DURACION_MS }));
    res.json({ usuario: { id: cuenta.id, username: cuenta.username, nombre: cuenta.nombre, rol: cuenta.rol } });
  });

  router.post('/logout', (req, res) => {
    cerrarSesion(ctx, leerCookie(req));
    res.clearCookie(COOKIE, opcionesCookie());
    res.json({ ok: true });
  });

  router.get('/me', (req, res) => {
    const cuenta = obtenerCuenta(ctx, req);
    if (!cuenta) throw noAutenticado();
    res.json({ usuario: cuenta });
  });

  return router;
}
