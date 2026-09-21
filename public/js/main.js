import { get, post, alExpirarSesion } from './api.js';
import { h, toast, montar } from './ui.js';
import { vistaLogin } from './views/login.js';
import { vistaMaestra, MAESTRAS } from './views/maestras.js';
import { vistaPrestamos } from './views/prestamos.js';
import { vistaLibrosPrestados, vistaPrestamosAtrasados } from './views/reportes.js';

const app = document.getElementById('app');

// id de opción del menú -> función que dibuja la pantalla
const VISTAS = {
  prestamos: vistaPrestamos,
  'reporte-prestados': vistaLibrosPrestados,
  'reporte-atrasados': vistaPrestamosAtrasados,
  ...Object.fromEntries(Object.keys(MAESTRAS).map((k) => [k, (c) => vistaMaestra(c, k)])),
  estados: (c) => vistaMaestra(c, 'estados-prestamo'),
};

let sesion = null; // { usuario, opciones }
let contenido = null;

async function iniciarSesionUI() {
  sesion = await get('/api/menu');
  dibujarShell();
  await navegar();
}

function dibujarShell() {
  const grupos = Map.groupBy(sesion.opciones, (o) => o.grupo);
  const nav = h('nav', { 'aria-label': 'Menú principal' },
    h('div', null, h('a', { href: '#/', 'data-ruta': '#/' }, 'Inicio')),
    [...grupos].map(([grupo, ops]) => h('div', null,
      h('div', { class: 'grupo' }, grupo),
      ops.map((o) => h('a', { href: o.ruta, 'data-ruta': o.ruta }, o.titulo)))));

  const lateral = h('aside', { class: 'sidebar' },
    h('div', { class: 'cabecera' },
      h('div', { class: 'brand' }, '📚 Biblioteca'),
      h('button', { class: 'btn small menu-toggle', 'aria-label': 'Abrir menú', onclick: () => lateral.classList.toggle('abierto') }, '☰')),
    nav,
    h('div', { class: 'usuario' },
      h('strong', null, sesion.usuario.nombre),
      h('span', null, sesion.usuario.rol === 'administrador' ? 'Administrador' : 'Bibliotecario'),
      h('button', { class: 'btn', onclick: cerrarSesion }, 'Cerrar sesión')));

  contenido = h('main', { id: 'contenido', tabindex: '-1' });
  montar(app, h('div', { class: 'shell' }, lateral, contenido));
}

function inicio() {
  const grupos = Map.groupBy(sesion.opciones, (o) => o.grupo);
  montar(contenido, 
    h('div', { class: 'page-head' }, h('div', null,
      h('h1', null, `Hola, ${sesion.usuario.nombre}`),
      h('p', null, 'Elija una opción del menú para comenzar.'))),
    [...grupos].map(([grupo, ops]) => h('section', { class: 'grupo-inicio' },
      h('h2', null, grupo),
      h('div', { class: 'tarjetas' }, ops.map((o) => h('a', { class: 'tarjeta', href: o.ruta }, o.titulo))))));
}

async function navegar() {
  if (!sesion) return;
  const ruta = location.hash || '#/';
  document.querySelectorAll('.sidebar a').forEach((a) => {
    if (a.dataset.ruta === ruta) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.querySelector('.sidebar')?.classList.remove('abierto');

  const opcion = sesion.opciones.find((o) => o.ruta === ruta);
  if (ruta === '#/' || !opcion) {
    if (ruta !== '#/' && ruta !== '') toast('No tiene acceso a esa pantalla', 'error');
    inicio();
    return;
  }
  try {
    await VISTAS[opcion.id](contenido);
  } catch (err) {
    montar(contenido, h('div', { class: 'form-error', role: 'alert' }, err.message));
  }
  contenido.focus();
}

async function cerrarSesion() {
  try { await post('/api/auth/logout'); } catch { /* ya no hay sesión */ }
  mostrarLogin();
}

function mostrarLogin() {
  sesion = null;
  location.hash = '#/';
  vistaLogin(app, () => iniciarSesionUI());
}

window.addEventListener('hashchange', navegar);
alExpirarSesion(() => {
  if (!sesion) return;
  toast('Su sesión expiró. Inicie sesión nuevamente.', 'error');
  mostrarLogin();
});

get('/api/auth/me').then(iniciarSesionUI).catch(mostrarLogin);
