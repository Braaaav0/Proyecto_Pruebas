// Datos de demostración: npm run seed:demo  (no hace nada si ya hay libros cargados)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { registrarPrestamo, registrarDevolucion } from './services/prestamos.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const archivoDb = process.env.DB_FILE ?? path.join(raiz, 'data', 'biblioteca.db');
const db = openDatabase(archivoDb);

if (db.prepare('SELECT COUNT(*) AS n FROM libros').get().n > 0) {
  console.log('La base de datos ya tiene libros; no se cargan datos de demostración.');
  process.exit(0);
}

const insertar = (sql, filas) => filas.map((f) => Number(db.prepare(sql).run(...f).lastInsertRowid));

const [garcia, cortazar, allende, borges] = insertar(
  'INSERT INTO autores (nombre, apellido) VALUES (?, ?)',
  [['Gabriel', 'García Márquez'], ['Julio', 'Cortázar'], ['Isabel', 'Allende'], ['Jorge Luis', 'Borges']]);
const [novela, cuento, ensayo] = insertar(
  'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
  [['Novela', 'Narrativa de ficción extensa'], ['Cuento', 'Relatos breves'], ['Ensayo', 'Textos de reflexión y análisis']]);
const [sudamericana, alfaguara, planeta] = insertar(
  'INSERT INTO editoriales (nombre, telefono, correo) VALUES (?, ?, ?)',
  [['Sudamericana', '6011112222', 'contacto@sudamericana.example'], ['Alfaguara', '6013334444', 'info@alfaguara.example'], ['Planeta', '6015556666', 'info@planeta.example']]);
const [ana, luis, marta] = insertar(
  'INSERT INTO usuarios (nombre, documento, correo, telefono) VALUES (?, ?, ?, ?)',
  [['Ana Pérez', '1001', 'ana@correo.example', '3001234567'], ['Luis Soto', '1002', 'luis@correo.example', '3109876543'],
    ['Marta Rojas', '1003', 'marta@correo.example', '3205551122'], ['Pedro Gil', '1004', 'pedro@correo.example', '3151112233']]);
const libros = insertar(
  'INSERT INTO libros (titulo, isbn, anio_publicacion, autor_id, categoria_id, editorial_id) VALUES (?, ?, ?, ?, ?, ?)',
  [
    ['Cien años de soledad', '9780060883287', 1967, garcia, novela, sudamericana],
    ['El amor en los tiempos del cólera', '9780307389732', 1985, garcia, novela, alfaguara],
    ['Rayuela', '9788437604572', 1963, cortazar, novela, sudamericana],
    ['Bestiario', '9788420471334', 1951, cortazar, cuento, alfaguara],
    ['La casa de los espíritus', '9781501117015', 1982, allende, novela, planeta],
    ['Ficciones', '9780802130303', 1944, borges, cuento, sudamericana],
    ['El Aleph', '9780142437889', 1949, borges, cuento, alfaguara],
    ['Otras inquisiciones', '9788420633121', 1952, borges, ensayo, planeta],
  ]);

// Tres préstamos con fechas relativas a hoy: uno atrasado, uno vigente y uno ya devuelto.
const enDias = (n) => () => new Date(Date.now() + n * 86_400_000);
const con = (dias) => ({ db, clock: enDias(dias) });

registrarPrestamo(con(-30), { usuario_id: luis, libro_id: libros[0], dias: 14 }); // vencido hace ~16 días
registrarPrestamo(con(-3), { usuario_id: ana, libro_id: libros[2], dias: 14 });   // vigente
const devuelto = registrarPrestamo(con(-20), { usuario_id: marta, libro_id: libros[5], dias: 14 });
registrarDevolucion(con(-10), String(devuelto.id));                                // historial

console.log(`Datos de demostración cargados en ${archivoDb}`);
