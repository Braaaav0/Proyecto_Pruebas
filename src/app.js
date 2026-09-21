import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRouter } from './routes/auth.js';
import { montarMaestras, MAESTRAS } from './routes/maestras.js';
import { openLibraryRouter } from './routes/openlibrary.js';
import { prestamosRouter, reportesRouter } from './routes/prestamos.js';
import { menuParaRol } from './menu.js';
import { requerirSesion, soloAdminParaEscritura } from './sesion.js';
import { HttpError } from './errores.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

/**
 * Construye la aplicación Express. Todo lo externo se inyecta (BD, reloj, cliente de
 * Open Library) para poder probarla de forma aislada y determinista.
 */
export function createApp({ db, clock = () => new Date(), openLibrary = globalThis.fetch } = {}) {
  const ctx = { db, clock, openLibrary };
  const app = express();
  app.disable('x-powered-by');

  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
    });
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(PUBLIC_DIR));

  app.use('/api/auth', authRouter(ctx));
  app.use('/api', requerirSesion(ctx));

  app.get('/api/menu', (req, res) => {
    res.json({ usuario: req.cuenta, opciones: menuParaRol(req.cuenta.rol) });
  });

  // Consultas: cualquier sesión. Altas, cambios y bajas: solo administrador.
  for (const recurso of Object.keys(MAESTRAS)) {
    app.use(`/api/${recurso}`, soloAdminParaEscritura);
  }

  montarMaestras(app, ctx);
  app.use('/api/openlibrary', openLibraryRouter(ctx));
  app.use('/api/prestamos', prestamosRouter(ctx));
  app.use('/api/reportes', reportesRouter(ctx));

  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Ruta no encontrada')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, ...(err.detalles && { detalles: err.detalles }) });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Solicitud demasiado grande' });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
