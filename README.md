# Sistema de Biblioteca

➤ **Aplicación en línea: https://biblioteca-lz5p.onrender.com**
(`admin` / `Admin123!` — `bibliotecario` / `Biblio123!`)

> Servicio gratuito: la primera visita puede tardar ~30-50 s en despertar, y los datos
> vuelven al estado de ejemplo cada vez que el servicio se reinicia.

Aplicación web para gestionar el catálogo, los usuarios y los préstamos de una biblioteca, construida a partir de `Historias de usuario.md` (HU-001 a HU-012).

- **Login** con roles (HU-001) y **menú** por tipo de usuario (HU-002)
- **5 pantallas maestras**: usuarios, autores, categorías, editoriales, libros (HU-003 a HU-007) + estados de préstamo (HU-008)
- **1 transacción principal**: préstamos y devoluciones (HU-009, HU-010)
- **2 reportes**: libros prestados con filtros (HU-011) y préstamos atrasados (HU-012)
- **Open Library** para autocompletar libros (opcional)

Stack: Node.js ≥ 22.13 (probado en 24), Express 5, SQLite (`node:sqlite`), JavaScript nativo en el navegador. Justificación en [docs/ANALISIS_TECNOLOGICO.md](docs/ANALISIS_TECNOLOGICO.md).

## Ejecutar

```bash
npm install
npm run seed:demo     # opcional: datos de ejemplo (incluye un préstamo atrasado)
npm start             # http://localhost:3000
```

| Rol | Usuario | Contraseña inicial | Acceso |
|---|---|---|---|
| Administrador | `admin` | `Admin123!` | Todo |
| Bibliotecario | `bibliotecario` | `Biblio123!` | Préstamos/devoluciones y reportes |

**Cambie las contraseñas antes de usarlo fuera de un entorno de práctica**: defina `ADMIN_PASSWORD` y `BIBLIOTECARIO_PASSWORD` antes del *primer* arranque (solo se aplican cuando la base de datos aún no tiene cuentas). Otras variables: `PORT` (3000), `DB_FILE` (`data/biblioteca.db`), `NODE_ENV=production` (marca la cookie como `Secure`; requiere HTTPS).

## Documentación

| Documento | Contenido |
|---|---|
| [Manual de usuario](docs/MANUAL_USUARIO.md) | Uso del sistema pantalla por pantalla, con los resultados esperados de cada historia y un guion de prueba manual |
| [Manual de instalación y configuración](docs/MANUAL_INSTALACION.md) | Requisitos, instalación local, variables de entorno, despliegue y solución de problemas |
| [Análisis tecnológico](docs/ANALISIS_TECNOLOGICO.md) | Por qué este lenguaje, base de datos y API de libros |
| [Informe de pruebas TDD](docs/INFORME_PRUEBAS_TDD.md) | Metodología, ciclos rojo/verde, cobertura y trazabilidad |
| [Historias de usuario](Historias%20de%20usuario.md) | HU-001 a HU-012 con criterios de aceptación |

## Despliegue (Render)

La aplicación necesita un servidor que ejecute Node: GitHub Pages solo sirve archivos
estáticos y no puede levantar Express ni SQLite.

Desplegado en **Render** (plan gratuito) en https://biblioteca-lz5p.onrender.com

El servicio se creó con la opción **New → Web Service → Public Git Repository**, pegando
la URL de este repositorio. Esa vía no requiere conectar la cuenta de GitHub (útil para
quien no es dueño del repositorio), pero **no hace despliegue automático**: tras subir
cambios hay que pulsar *Manual Deploy → Deploy latest commit* en el panel de Render.

Ajustes del servicio (equivalentes al `render.yaml` incluido, que sirve si se prefiere
**New → Blueprint** con la cuenta de GitHub conectada):

| Campo | Valor |
|---|---|
| Build Command | `npm install` |
| Start Command | `npm run seed:demo && npm start` |
| Variable de entorno | `NODE_ENV=production` |

- Plan gratuito, sin disco persistente: el servicio se suspende tras ~15 min sin
  tráfico y, al reiniciarse, la base de datos vuelve a cero. `startCommand` ejecuta
  `npm run seed:demo` antes de arrancar, de modo que cada sesión de pruebas empieza
  siempre con los mismos datos de ejemplo.
- `NODE_ENV=production` marca la cookie de sesión como `Secure` (Render sirve HTTPS).
- Versión de Node fijada en `.node-version` (24.19.0); se requiere ≥ 22.13 por `node:sqlite`.

## Pruebas

```bash
npm test               # 182 pruebas
npm run test:coverage  # con cobertura
```

Resultados y método TDD: [docs/INFORME_PRUEBAS_TDD.md](docs/INFORME_PRUEBAS_TDD.md). La evidencia cruda (salidas rojo/verde de cada ciclo, cobertura, capturas y el script E2E de navegador) está en `docs/evidencia/`.

## Estructura

```
src/
  app.js, server.js, db.js        aplicación, arranque, esquema SQLite
  auth.js, sesion.js              hash scrypt, sesiones, roles
  menu.js                         opciones del menú por rol
  validators.js                   validación de campos
  routes/                         auth, crud genérico + maestras, préstamos/reportes, open library
  services/                       reglas de préstamo/devolución/reportes, cliente Open Library
public/                           front-end (index.html, css/, js/ y js/views/)
tests/                            pruebas (node:test) organizadas por historia de usuario
docs/                             análisis tecnológico, informe TDD, evidencia
```

## API (resumen)

Todas las rutas `/api/*` (salvo `POST /api/auth/login`) exigen sesión. Las consultas (`GET`) están abiertas a cualquier rol; altas, cambios y bajas de maestras son solo para administrador.

| Recurso | Métodos |
|---|---|
| `/api/auth/login`, `/logout`, `/me` | POST, POST, GET |
| `/api/menu` | GET |
| `/api/usuarios`, `/autores`, `/categorias`, `/editoriales`, `/libros` | GET (`?q=`), GET `/:id`, POST, PUT `/:id`, DELETE `/:id` |
| `/api/estados-prestamo` | GET, GET `/:id`, PUT `/:id` (solo renombrar) |
| `/api/prestamos` | GET (`?activos=1&q=`), POST `{usuario_id, libro_id, dias?}`, POST `/:id/devolucion` |
| `/api/reportes/libros-prestados` | GET (`?usuario=&libro=`) |
| `/api/reportes/prestamos-atrasados` | GET |
| `/api/openlibrary/buscar?q=` | GET |

## Decisiones y supuestos

- **«Usuarios» (HU-003) son los lectores** de la biblioteca; **no inician sesión**. Las cuentas de acceso (administrador y bibliotecario) se crean al iniciar la base de datos; no hay pantalla para gestionarlas porque ninguna historia lo pide.
- **Roles:** las historias hablan de «tipo de usuario» y de «bibliotecario» sin definirlos; se asumieron dos roles (tabla arriba).
- **Plazo de préstamo:** 14 días por defecto, ajustable de 1 a 90 al prestar (las historias no fijan el plazo).
- **Atrasado:** un préstamo activo pasa a *Atrasado* el día **siguiente** a su fecha límite; el reporte HU-012 y el estado se calculan automáticamente al consultar, sin proceso programado.
- **Estados (HU-008):** los tres estados vienen precargados y solo se puede cambiar su nombre visible; no se crean ni eliminan, porque la lógica del préstamo depende de ellos (por eso llevan un `codigo` interno inmutable).
- **Eliminaciones:** no se puede eliminar un autor, categoría o editorial con libros, ni un usuario o libro con préstamos (incluso devueltos) para conservar el historial (HU-010). La API responde 409 con el motivo.
- **Sin implementar** (fuera de las historias): bloqueo por intentos fallidos de login, cambio de contraseña, gestión de cuentas de acceso, multas, reservas.
