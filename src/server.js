import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';
import { createApp } from './app.js';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const archivoDb = process.env.DB_FILE ?? path.join(raiz, 'data', 'biblioteca.db');
const puerto = Number(process.env.PORT ?? 3000);

const db = openDatabase(archivoDb);
createApp({ db }).listen(puerto, () => {
  console.log(`Biblioteca en http://localhost:${puerto}  (BD: ${archivoDb})`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('Aviso: usando contraseñas iniciales por defecto; defina ADMIN_PASSWORD y BIBLIOTECARIO_PASSWORD antes del primer arranque.');
  }
});
