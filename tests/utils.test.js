import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fechaISO, sumarDias, diasEntre } from '../src/fechas.js';
import { hashPassword, verifyPassword, nuevoToken } from '../src/auth.js';

describe('fechas (base de HU-009 y HU-012)', () => {
  test('fechaISO devuelve YYYY-MM-DD en hora local', () => {
    assert.equal(fechaISO(new Date('2026-03-10T12:00:00')), '2026-03-10');
  });
  test('sumarDias suma días dentro del mes', () => {
    assert.equal(sumarDias('2026-03-10', 14), '2026-03-24');
  });
  test('sumarDias cruza fin de mes y de año', () => {
    assert.equal(sumarDias('2026-01-25', 10), '2026-02-04');
    assert.equal(sumarDias('2026-12-30', 5), '2027-01-04');
  });
  test('diasEntre calcula la diferencia en días (con signo)', () => {
    assert.equal(diasEntre('2026-03-10', '2026-03-15'), 5);
    assert.equal(diasEntre('2026-03-15', '2026-03-10'), -5);
    assert.equal(diasEntre('2026-03-10', '2026-03-10'), 0);
  });
});

describe('auth (base de HU-001)', () => {
  test('hashPassword no guarda la contraseña en claro y usa sal distinta', () => {
    const a = hashPassword('secreto');
    const b = hashPassword('secreto');
    assert.notEqual(a, 'secreto');
    assert.notEqual(a, b);
  });
  test('verifyPassword acepta la correcta y rechaza la incorrecta', () => {
    const h = hashPassword('secreto');
    assert.equal(verifyPassword('secreto', h), true);
    assert.equal(verifyPassword('otra', h), false);
  });
  test('verifyPassword tolera hashes mal formados', () => {
    assert.equal(verifyPassword('x', ''), false);
    assert.equal(verifyPassword('x', 'sin-separador'), false);
  });
  test('nuevoToken genera valores únicos y largos', () => {
    const t1 = nuevoToken();
    assert.ok(t1.length >= 43);
    assert.notEqual(t1, nuevoToken());
  });
});
