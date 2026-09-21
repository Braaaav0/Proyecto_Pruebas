import { post, ApiError } from '../api.js';
import { h, montar, campoInput, mostrarErrores, valoresDe } from '../ui.js';

export function vistaLogin(contenedor, alIngresar) {
  const boton = h('button', { class: 'btn primary', type: 'submit' }, 'Ingresar');
  const formulario = h('form', {
    novalidate: true,
    onsubmit: async (e) => {
      e.preventDefault();
      boton.disabled = true;
      try {
        const { usuario } = await post('/api/auth/login', valoresDe(formulario));
        alIngresar(usuario);
      } catch (err) {
        mostrarErrores(formulario, err instanceof ApiError ? err : new ApiError(0, 'Error inesperado'));
      } finally {
        boton.disabled = false;
      }
    },
  },
  campoInput('username', 'Usuario', { autocomplete: 'username', autofocus: true }),
  campoInput('password', 'Contraseña', { tipo: 'password', autocomplete: 'current-password' }),
  boton);

  montar(contenedor, 
    h('div', { class: 'login-wrap' },
      h('div', { class: 'login-card' },
        h('div', { class: 'brand' }, '📚'),
        h('h1', null, 'Biblioteca'),
        h('p', { class: 'sub' }, 'Inicie sesión para acceder al sistema.'),
        formulario)));
}
