import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:3100';
const OUT = new URL('.', import.meta.url).pathname.replace(/^\//, '');
const errores = [];
const pasos = [];
const ok = (nombre, cond, extra = '') => { pasos.push({ nombre, ok: !!cond, extra }); console.log(`${cond ? 'OK  ' : 'FAIL'} ${nombre} ${extra}`); };

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => errores.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  // Los 4xx de red los provocan a propósito las pruebas de validación; no son errores de la app.
  if (['error', 'warning'].includes(m.type()) && !m.text().startsWith('Failed to load resource')) errores.push(`console.${m.type()}: ${m.text()}`);
});
page.on('dialog', (d) => d.accept());

const texto = () => page.evaluate(() => document.body.innerText);
const shot = (n) => page.screenshot({ path: `${OUT}${n}.png` });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(BASE, { waitUntil: 'networkidle0' });
ok('login visible', (await texto()).includes('Inicie sesión'));
await shot('01-login');

// HU-001: campos vacíos
await page.click('button[type=submit]');
await page.waitForSelector('.field.invalid');
let t = await texto();
ok('login vacío muestra errores obligatorios', t.includes('El usuario es obligatorio') && t.includes('La contraseña es obligatoria'));

// HU-001: credenciales incorrectas
await page.type('#f-username', 'admin');
await page.type('#f-password', 'incorrecta');
await page.click('button[type=submit]');
await page.waitForSelector('.form-error');
ok('credenciales incorrectas muestran error', (await texto()).includes('Usuario o contraseña incorrectos'));
await shot('02-login-error');

// Login correcto
await page.$eval('#f-password', (e) => { e.value = ''; });
await page.type('#f-password', 'Admin123!');
await page.click('button[type=submit]');
await page.waitForSelector('.sidebar');
await page.waitForSelector('.tarjeta');
t = await texto();
ok('menú principal visible para admin', ['Usuarios', 'Autores', 'Categorías', 'Editoriales', 'Libros', 'Préstamos y devoluciones', 'Libros prestados', 'Préstamos atrasados', 'Cerrar sesión'].every((s) => t.includes(s)));
await shot('03-inicio');
errores.length = 0; // los 401/400 anteriores fueron provocados a propósito

// Recorre todas las pantallas del menú buscando errores JS
const rutas = await page.$$eval('.sidebar a[data-ruta]', (as) => as.map((a) => a.dataset.ruta));
for (const r of rutas) {
  await page.evaluate((x) => { location.hash = x; }, r);
  await esperar(500);
}
ok(`recorrió ${rutas.length} rutas sin errores JS`, errores.length === 0, errores.join(' | '));

// HU-004: crear autor por UI
await page.evaluate(() => { location.hash = '#/autores'; });
await page.waitForSelector('table');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Nuevo autor')).click());
await page.waitForSelector('dialog[open]');
await page.click('dialog button[type=submit]');
await page.waitForSelector('dialog .field.invalid');
ok('autor sin datos muestra validaciones', (await texto()).includes('El nombre es obligatorio'));
await page.type('dialog #f-nombre', 'Mario');
await page.type('dialog #f-apellido', 'Vargas Llosa <b>x</b>');
await page.click('dialog button[type=submit]');
await page.waitForFunction(() => !document.querySelector('dialog[open]'));
await esperar(400);
t = await texto();
ok('autor creado aparece en la tabla', t.includes('Mario') && t.includes('Vargas Llosa <b>x</b>'));
ok('el HTML del dato se muestra como texto (sin XSS)', await page.evaluate(() => !document.querySelector('td b')));
await shot('04-autores');

// HU-007 + Open Library
await page.evaluate(() => { location.hash = '#/libros'; });
await page.waitForSelector('table');
await shot('05-libros');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Nuevo libro')).click());
await page.waitForSelector('dialog[open] #ol-q');
await page.type('#ol-q', 'ficciones borges');
// Open Library es un servicio externo de latencia variable: hasta 3 intentos.
for (let intento = 1; intento <= 3; intento++) {
  await page.keyboard.press('Enter');
  const hayResultados = await page.waitForSelector('.ol-list button', { timeout: 15000 }).then(() => true, () => false);
  if (hayResultados) break;
  console.log(`(reintento Open Library ${intento})`);
}
await page.waitForSelector('.ol-list button', { timeout: 5000 });
await shot('06-openlibrary');
await page.click('.ol-list button');
await esperar(300);
const titulo = await page.$eval('dialog #f-titulo', (e) => e.value);
const anio = await page.$eval('dialog #f-anio_publicacion', (e) => e.value);
const autorSel = await page.$eval('dialog #f-autor_id', (e) => e.selectedOptions[0].textContent);
ok('Open Library rellena título y año', titulo.length > 0 && Number(anio) > 1000, `${titulo} / ${anio}`);
ok('Open Library selecciona el autor existente (Jorge Luis Borges)', autorSel === 'Jorge Luis Borges', autorSel);
await page.select('dialog #f-categoria_id', await page.$eval('dialog #f-categoria_id option:nth-child(2)', (o) => o.value));
await page.select('dialog #f-editorial_id', await page.$eval('dialog #f-editorial_id option:nth-child(2)', (o) => o.value));
await shot('07-libro-form');
await page.click('dialog button[type=submit]');
await page.waitForFunction(() => !document.querySelector('dialog[open]'), { timeout: 5000 }).catch(() => {});
await esperar(400);
ok('libro creado desde Open Library', (await texto()).toLowerCase().includes('ficciones'));

// HU-009 / HU-010: préstamo y devolución
await page.evaluate(() => { location.hash = '#/prestamos'; });
await page.waitForSelector('form select');
await esperar(400);
await page.select('#f-usuario_id', await page.$eval('#f-usuario_id option:nth-child(2)', (o) => o.value));
await page.select('#f-libro_id', await page.$eval('#f-libro_id option:nth-child(2)', (o) => o.value));
const libroPrestado = await page.$eval('#f-libro_id', (e) => e.selectedOptions[0].textContent);
await page.click('form button[type=submit]');
await esperar(800);
t = await texto();
ok('préstamo registrado', t.includes('Préstamo registrado'));
const sigueDisponible = await page.$$eval('#f-libro_id option', (os, n) => os.some((o) => o.textContent === n), libroPrestado);
ok('el libro prestado ya no aparece como disponible', !sigueDisponible);
await shot('08-prestamos');
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Registrar devolución').click());
await esperar(800);
ok('devolución registrada', (await texto()).includes('Devolución registrada'));

// HU-011 / HU-012
await page.evaluate(() => { location.hash = '#/reporte-prestados'; });
await page.waitForSelector('table');
await shot('09-reporte-prestados');
await page.type('input[name=usuario]', 'zzz-no-existe');
await page.click('form button[type=submit]');
await esperar(500);
ok('reporte prestados: filtro sin resultados', (await texto()).includes('coincide con los filtros'));
await page.evaluate(() => { location.hash = '#/reporte-atrasados'; });
await page.waitForSelector('table');
t = await texto();
ok('reporte atrasados muestra días de retraso', /\d+ días/.test(t) && t.includes('Luis Soto'));
await shot('10-reporte-atrasados');

// Vista móvil
await page.setViewport({ width: 390, height: 800 });
await esperar(300);
await shot('11-movil');
await page.setViewport({ width: 1280, height: 800 });

// Cerrar sesión (HU-002)
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'Cerrar sesión').click());
await page.waitForSelector('.login-card');
ok('cerrar sesión vuelve al login', true);

// Bibliotecario: menú reducido
await page.type('#f-username', 'bibliotecario');
await page.type('#f-password', 'Biblio123!');
await page.click('button[type=submit]');
await page.waitForSelector('.sidebar');
await page.waitForSelector('.tarjeta');
const items = await page.$$eval('.sidebar nav a', (as) => as.map((a) => a.textContent));
ok('bibliotecario ve solo operación y reportes', items.join('|') === 'Inicio|Préstamos y devoluciones|Libros prestados|Préstamos atrasados', items.join('|'));
await page.evaluate(() => { location.hash = '#/usuarios'; });
await esperar(400);
ok('bibliotecario no accede a maestras por URL', (await texto()).includes('No tiene acceso'));

ok('sin errores de consola/JS en todo el recorrido', errores.length === 0, errores.join(' | '));
await browser.close();
const fallos = pasos.filter((p) => !p.ok).length;
console.log(`\nRESUMEN: ${pasos.length - fallos}/${pasos.length} pasos OK`);
process.exit(fallos ? 1 : 0);
