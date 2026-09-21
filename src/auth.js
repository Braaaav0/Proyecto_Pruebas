import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 64;

/** Devuelve 'scrypt$<sal>$<hash>' (ambos en hex). */
export function hashPassword(password) {
  const sal = randomBytes(16).toString('hex');
  const hash = scryptSync(password, sal, KEY_LEN).toString('hex');
  return `scrypt$${sal}$${hash}`;
}

export function verifyPassword(password, almacenado) {
  const [algoritmo, sal, hash] = String(almacenado ?? '').split('$');
  if (algoritmo !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'hex');
  const calculado = scryptSync(password, sal, KEY_LEN);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

/** Token de sesión opaco de 256 bits (43 caracteres base64url). */
export function nuevoToken() {
  return randomBytes(32).toString('base64url');
}
