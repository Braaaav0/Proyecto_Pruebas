// Utilidades de fechas. Todas las fechas de negocio se manejan como 'YYYY-MM-DD'.

const DIA_MS = 86_400_000;

/** Fecha local del objeto Date como 'YYYY-MM-DD'. */
export function fechaISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Suma `n` días (puede ser negativo) a una fecha 'YYYY-MM-DD'. */
export function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Días transcurridos de `desde` a `hasta` (negativo si `hasta` es anterior). */
export function diasEntre(desde, hasta) {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / DIA_MS);
}
