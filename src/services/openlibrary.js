const URL_BASE = 'https://openlibrary.org/search.json';
const CAMPOS = 'title,author_name,first_publish_year,publisher,isbn,subject';
const LIMITE = 8;
const TIMEOUT_MS = 8000;

export class OpenLibraryError extends Error {}

/** Toma el primer ISBN-13 disponible; si no hay, el primero que exista. */
function elegirIsbn(isbns = []) {
  return isbns.find((i) => /^\d{13}$/.test(i)) ?? isbns[0] ?? null;
}

function normalizar(doc) {
  return {
    titulo: doc.title ?? '',
    autores: doc.author_name ?? [],
    anio: doc.first_publish_year ?? null,
    editorial: doc.publisher?.[0]?.trim() || null,
    isbn: elegirIsbn(doc.isbn),
    temas: (doc.subject ?? []).slice(0, 5),
  };
}

/**
 * Busca libros en Open Library (https://openlibrary.org/dev/docs/api/search).
 * `fetchFn` se inyecta para poder probar sin red. No requiere API key.
 */
export async function buscarEnOpenLibrary(fetchFn, texto) {
  const url = new URL(URL_BASE);
  url.searchParams.set('q', texto);
  url.searchParams.set('fields', CAMPOS);
  url.searchParams.set('limit', String(LIMITE));

  let respuesta;
  try {
    respuesta = await fetchFn(url, {
      headers: { 'User-Agent': 'BibliotecaApp/1.0 (proyecto academico)', Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new OpenLibraryError('No se pudo conectar con Open Library. Intente nuevamente más tarde.');
  }
  if (!respuesta.ok) {
    throw new OpenLibraryError(`Open Library respondió con error (${respuesta.status}). Intente nuevamente más tarde.`);
  }
  const datos = await respuesta.json();
  return (datos.docs ?? []).map(normalizar);
}
