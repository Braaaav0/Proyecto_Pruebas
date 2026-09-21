import { Router } from 'express';
import {
  listarPrestamos, registrarDevolucion, registrarPrestamo,
  reporteLibrosPrestados, reportePrestamosAtrasados,
} from '../services/prestamos.js';

const texto = (v) => String(v ?? '').trim();

/** Transacción principal (HU-009 y HU-010). Accesible para administrador y bibliotecario. */
export function prestamosRouter(ctx) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(listarPrestamos(ctx, { activos: req.query.activos === '1', q: texto(req.query.q) }));
  });

  router.post('/', (req, res) => {
    res.status(201).json(registrarPrestamo(ctx, req.body));
  });

  router.post('/:id/devolucion', (req, res) => {
    res.json(registrarDevolucion(ctx, req.params.id));
  });

  return router;
}

/** Reportes (HU-011 y HU-012). */
export function reportesRouter(ctx) {
  const router = Router();

  router.get('/libros-prestados', (req, res) => {
    res.json(reporteLibrosPrestados(ctx, { usuario: texto(req.query.usuario), libro: texto(req.query.libro) }));
  });

  router.get('/prestamos-atrasados', (_req, res) => {
    res.json(reportePrestamosAtrasados(ctx));
  });

  return router;
}
