import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';

const RESPUESTA_OL = {
  numFound: 2,
  docs: [
    {
      title: 'Cien años de soledad',
      author_name: ['Gabriel García Márquez'],
      first_publish_year: 1967,
      publisher: ['Sudamericana', 'Alfaguara'],
      isbn: ['0060883286', '9780060883287', '8439720564'],
      subject: ['Fiction', 'Magic realism', 'a', 'b', 'c', 'd', 'e'],
    },
    { title: 'Libro mínimo' },
  ],
};

function fetchFalso({ ok = true, status = 200, json = RESPUESTA_OL, lanza } = {}) {
  const llamadas = [];
  const fn = async (url, opciones) => {
    llamadas.push({ url: String(url), opciones });
    if (lanza) throw lanza;
    return { ok, status, json: async () => json };
  };
  fn.llamadas = llamadas;
  return fn;
}

describe('Integración con Open Library (catálogo externo de libros)', () => {
  let ctx;
  let falso;
  before(async () => {
    falso = fetchFalso();
    ctx = await createTestContext({ openLibrary: falso });
  });
  after(() => ctx.close());

  test('exige sesión', async () => {
    assert.equal((await ctx.get('/api/openlibrary/buscar?q=borges', null)).status, 401);
  });

  test('exige un texto de búsqueda de al menos 2 caracteres', async () => {
    assert.equal((await ctx.get('/api/openlibrary/buscar')).status, 400);
    assert.equal((await ctx.get('/api/openlibrary/buscar?q=a')).status, 400);
  });

  test('consulta search.json de Open Library con el texto codificado y un límite', async () => {
    await ctx.get('/api/openlibrary/buscar?q=cien%20a%C3%B1os');
    const { url, opciones } = falso.llamadas.at(-1);
    const u = new URL(url);
    assert.equal(u.origin + u.pathname, 'https://openlibrary.org/search.json');
    assert.equal(u.searchParams.get('q'), 'cien años');
    assert.ok(Number(u.searchParams.get('limit')) <= 10);
    assert.match(opciones.headers['User-Agent'], /Biblioteca/);
  });

  test('normaliza los resultados: título, autores, año, editorial, ISBN-13 y temas', async () => {
    const res = await ctx.get('/api/openlibrary/buscar?q=cien');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.resultados[0], {
      titulo: 'Cien años de soledad',
      autores: ['Gabriel García Márquez'],
      anio: 1967,
      editorial: 'Sudamericana',
      isbn: '9780060883287',
      temas: ['Fiction', 'Magic realism', 'a', 'b', 'c'],
    });
  });

  test('tolera resultados con datos faltantes', async () => {
    const res = await ctx.get('/api/openlibrary/buscar?q=minimo');
    assert.deepEqual(res.body.resultados[1], {
      titulo: 'Libro mínimo', autores: [], anio: null, editorial: null, isbn: null, temas: [],
    });
  });

  test('si Open Library responde con error devuelve 502 con mensaje claro', async () => {
    const c = await createTestContext({ openLibrary: fetchFalso({ ok: false, status: 503 }) });
    const res = await c.get('/api/openlibrary/buscar?q=borges');
    assert.equal(res.status, 502);
    assert.match(res.body.error, /Open Library/);
    await c.close();
  });

  test('si no hay red devuelve 502 (el resto de la app sigue funcionando)', async () => {
    const c = await createTestContext({ openLibrary: fetchFalso({ lanza: new Error('ECONNREFUSED') }) });
    const res = await c.get('/api/openlibrary/buscar?q=borges');
    assert.equal(res.status, 502);
    assert.equal((await c.get('/api/libros')).status, 200);
    await c.close();
  });
});
