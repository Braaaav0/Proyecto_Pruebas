/** Error con código HTTP; el manejador global lo convierte en JSON `{ error, detalles? }`. */
export class HttpError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

export const badRequest = (mensaje, detalles) => new HttpError(400, mensaje, detalles);
export const noAutenticado = (mensaje = 'Debe iniciar sesión') => new HttpError(401, mensaje);
export const prohibido = (mensaje = 'No tiene permisos para esta operación') => new HttpError(403, mensaje);
export const noEncontrado = (mensaje = 'Registro no encontrado') => new HttpError(404, mensaje);
export const conflicto = (mensaje) => new HttpError(409, mensaje);
