export class ApiError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles ?? {};
  }
}

const oyentesSesionExpirada = new Set();
export const alExpirarSesion = (fn) => oyentesSesionExpirada.add(fn);

export async function api(metodo, url, cuerpo) {
  let res;
  try {
    res = await fetch(url, {
      method: metodo,
      credentials: 'same-origin',
      headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }
  if (res.status === 204) return null;
  const datos = await res.json().catch(() => null);
  if (res.status === 401 && url !== '/api/auth/login') oyentesSesionExpirada.forEach((fn) => fn());
  if (!res.ok) throw new ApiError(res.status, datos?.error ?? `Error ${res.status}`, datos?.detalles);
  return datos;
}

export const get = (url) => api('GET', url);
export const post = (url, cuerpo = {}) => api('POST', url, cuerpo);
export const put = (url, cuerpo) => api('PUT', url, cuerpo);
export const del = (url) => api('DELETE', url);
