import { badRequest } from './errores.js';

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_TELEFONO = /^[0-9+\-\s()]{7,20}$/;
const RE_ISBN = /^(\d{9}[\dXx]|\d{13})$/;

const vacio = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * Valida y normaliza `body` según la especificación de campos.
 * Tipos: texto | correo | telefono | isbn | entero | ref (clave foránea).
 * Devuelve los valores limpios o lanza 400 con el detalle por campo.
 */
export function validarCampos(ctx, campos, body) {
  const origen = body && typeof body === 'object' ? body : {};
  const valores = {};
  const detalles = {};

  for (const [nombre, spec] of Object.entries(campos)) {
    const etiqueta = spec.etiqueta ?? nombre;
    const bruto = origen[nombre];

    if (vacio(bruto)) {
      if (spec.opcional) valores[nombre] = null;
      else detalles[nombre] = `${etiqueta} es obligatorio`;
      continue;
    }

    const error = validarValor(ctx, spec, etiqueta, bruto);
    if (error.mensaje) detalles[nombre] = error.mensaje;
    else valores[nombre] = error.valor;
  }

  if (Object.keys(detalles).length) throw badRequest('Hay campos obligatorios o inválidos', detalles);
  return valores;
}

function validarValor(ctx, spec, etiqueta, bruto) {
  switch (spec.tipo) {
    case 'entero':
    case 'ref': {
      const texto = String(bruto).trim();
      if (!/^-?\d+$/.test(texto)) return { mensaje: `${etiqueta} debe ser un número entero` };
      const n = Number(texto);
      const min = spec.min ?? Number.MIN_SAFE_INTEGER;
      const max = typeof spec.max === 'function' ? spec.max(ctx) : (spec.max ?? Number.MAX_SAFE_INTEGER);
      if (n < min || n > max) return { mensaje: `${etiqueta} debe estar entre ${min} y ${max}` };
      if (spec.tipo === 'ref') {
        const existe = ctx.db.prepare(`SELECT 1 FROM ${spec.tabla} WHERE id = ?`).get(n);
        if (!existe) return { mensaje: `${etiqueta} no existe` };
      }
      return { valor: n };
    }
    default: {
      if (typeof bruto !== 'string' && typeof bruto !== 'number') return { mensaje: `${etiqueta} no es válido` };
      const texto = String(bruto).trim();
      if (texto.length > (spec.max ?? 200)) return { mensaje: `${etiqueta} es demasiado largo` };
      if (spec.tipo === 'correo' && !RE_CORREO.test(texto)) return { mensaje: `${etiqueta} no tiene un formato válido` };
      if (spec.tipo === 'telefono' && !RE_TELEFONO.test(texto)) return { mensaje: `${etiqueta} no tiene un formato válido` };
      if (spec.tipo === 'isbn' && !RE_ISBN.test(texto.replaceAll('-', ''))) return { mensaje: `${etiqueta} no tiene un formato válido (10 o 13 dígitos)` };
      return { valor: texto };
    }
  }
}
