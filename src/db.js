import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword } from './auth.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cuentas (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  nombre        TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN ('administrador', 'bibliotecario'))
);

CREATE TABLE IF NOT EXISTS sesiones (
  token     TEXT PRIMARY KEY,
  cuenta_id INTEGER NOT NULL REFERENCES cuentas(id) ON DELETE CASCADE,
  expira    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
  id        INTEGER PRIMARY KEY,
  nombre    TEXT NOT NULL,
  documento TEXT NOT NULL UNIQUE,
  correo    TEXT NOT NULL,
  telefono  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS autores (
  id       INTEGER PRIMARY KEY,
  nombre   TEXT NOT NULL,
  apellido TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categorias (
  id          INTEGER PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS editoriales (
  id       INTEGER PRIMARY KEY,
  nombre   TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS libros (
  id               INTEGER PRIMARY KEY,
  titulo           TEXT NOT NULL,
  isbn             TEXT,
  anio_publicacion INTEGER NOT NULL,
  autor_id         INTEGER NOT NULL REFERENCES autores(id),
  categoria_id     INTEGER NOT NULL REFERENCES categorias(id),
  editorial_id     INTEGER NOT NULL REFERENCES editoriales(id),
  disponible       INTEGER NOT NULL DEFAULT 1 CHECK (disponible IN (0, 1))
);

CREATE TABLE IF NOT EXISTS estados_prestamo (
  id     INTEGER PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS prestamos (
  id               INTEGER PRIMARY KEY,
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id),
  libro_id         INTEGER NOT NULL REFERENCES libros(id),
  estado_id        INTEGER NOT NULL REFERENCES estados_prestamo(id),
  fecha_prestamo   TEXT NOT NULL,
  fecha_limite     TEXT NOT NULL,
  fecha_devolucion TEXT
);

-- Red de seguridad: un libro no puede tener dos préstamos activos a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS ux_prestamo_activo_por_libro
  ON prestamos(libro_id) WHERE fecha_devolucion IS NULL;
`;

const ESTADOS_BASE = [
  ['PRESTADO', 'Prestado'],
  ['DEVUELTO', 'Devuelto'],
  ['ATRASADO', 'Atrasado'],
];

/**
 * Abre (o crea) la base de datos, aplica el esquema y siembra los datos base:
 * los tres estados de préstamo y, si no existen cuentas, las cuentas iniciales.
 */
export function openDatabase(file = ':memory:') {
  if (file !== ':memory:') mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec(SCHEMA);

  const insEstado = db.prepare('INSERT OR IGNORE INTO estados_prestamo (codigo, nombre) VALUES (?, ?)');
  for (const [codigo, nombre] of ESTADOS_BASE) insEstado.run(codigo, nombre);

  const { total } = db.prepare('SELECT COUNT(*) AS total FROM cuentas').get();
  if (total === 0) {
    const ins = db.prepare('INSERT INTO cuentas (username, password_hash, nombre, rol) VALUES (?, ?, ?, ?)');
    ins.run('admin', hashPassword(process.env.ADMIN_PASSWORD ?? 'Admin123!'), 'Administrador', 'administrador');
    ins.run('bibliotecario', hashPassword(process.env.BIBLIOTECARIO_PASSWORD ?? 'Biblio123!'), 'Bibliotecario', 'bibliotecario');
  }
  return db;
}

/** Ejecuta `fn` dentro de una transacción; revierte si lanza una excepción. */
export function enTransaccion(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const resultado = fn();
    db.exec('COMMIT');
    return resultado;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
