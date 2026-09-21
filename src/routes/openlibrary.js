import { Router } from 'express';
import { badRequest, HttpError } from '../errores.js';
import { buscarEnOpenLibrary, OpenLibraryError } from '../services/openlibrary.js';

export function openLibraryRouter(ctx) {
  const router = Router();

  router.get('/buscar', async (req, res) => {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2 || q.length > 100) {
      throw badRequest('Escriba entre 2 y 100 caracteres para buscar', { q: 'Texto de búsqueda inválido' });
    }
    try {
      res.json({ resultados: await buscarEnOpenLibrary(ctx.openLibrary, q) });
    } catch (err) {
      if (err instanceof OpenLibraryError) throw new HttpError(502, err.message);
      throw err;
    }
  });

  return router;
}
