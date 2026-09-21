const ADMIN = 'administrador';
const BIBLIO = 'bibliotecario';

// Fuente única de las opciones del menú y de qué rol puede verlas.
const OPCIONES = [
  { id: 'prestamos', titulo: 'Préstamos y devoluciones', grupo: 'Operación', ruta: '#/prestamos', roles: [ADMIN, BIBLIO] },
  { id: 'usuarios', titulo: 'Usuarios', grupo: 'Maestras', ruta: '#/usuarios', roles: [ADMIN] },
  { id: 'autores', titulo: 'Autores', grupo: 'Maestras', ruta: '#/autores', roles: [ADMIN] },
  { id: 'categorias', titulo: 'Categorías', grupo: 'Maestras', ruta: '#/categorias', roles: [ADMIN] },
  { id: 'editoriales', titulo: 'Editoriales', grupo: 'Maestras', ruta: '#/editoriales', roles: [ADMIN] },
  { id: 'libros', titulo: 'Libros', grupo: 'Maestras', ruta: '#/libros', roles: [ADMIN] },
  { id: 'estados', titulo: 'Estados de préstamo', grupo: 'Configuración', ruta: '#/estados', roles: [ADMIN] },
  { id: 'reporte-prestados', titulo: 'Libros prestados', grupo: 'Reportes', ruta: '#/reporte-prestados', roles: [ADMIN, BIBLIO] },
  { id: 'reporte-atrasados', titulo: 'Préstamos atrasados', grupo: 'Reportes', ruta: '#/reporte-atrasados', roles: [ADMIN, BIBLIO] },
];

export function menuParaRol(rol) {
  return OPCIONES.filter((o) => o.roles.includes(rol)).map(({ roles, ...opcion }) => opcion);
}
