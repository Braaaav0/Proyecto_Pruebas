# Manual de instalación y configuración — Sistema de Biblioteca

Cómo poner en marcha la aplicación, tanto en un equipo local como publicada en
internet, y cómo configurarla.

| | |
| --- | --- |
| **Aplicación publicada** | https://biblioteca-lz5p.onrender.com |
| **Repositorio** | https://github.com/Braaaav0/Proyecto_Pruebas |
| **Versión** | 1.0.0 |

> Si solo quiere **usar o probar** el sistema, no instale nada: entre a la aplicación
> publicada y siga el [Manual de usuario](MANUAL_USUARIO.md).

---

## 1. Requisitos

| Requisito | Versión | Notas |
| --- | --- | --- |
| **Node.js** | **22.13 o superior** | Probado en 24.19.0. **Es el requisito crítico** |
| npm | Viene con Node | Se usa para instalar y para los scripts |
| Git | Cualquiera | Solo para clonar el repositorio |
| Sistema operativo | Windows, macOS o Linux | Desarrollado en Windows 11 |

### ⚠️ Por qué la versión de Node es crítica

El sistema usa **`node:sqlite`**, el módulo de SQLite **integrado en Node**. No es una
dependencia que se instale con npm: o está en su versión de Node, o no está.

El número **22.13** no es arbitrario. El módulo apareció en **Node 22.5**, pero oculto
tras el flag `--experimental-sqlite`; fue en **22.13** cuando quedó disponible sin
necesidad de activarlo. Por eso el proyecto exige esa versión como mínimo.

Con una versión anterior (Node 18 o 20, todavía muy comunes) la aplicación **no
arranca** y falla con un error parecido a este:

```
Error: Cannot find module 'node:sqlite'
```

**No es un fallo de la aplicación ni de la instalación: es la versión de Node.**

Compruébelo antes de nada:

```bash
node --version
```

Si muestra menos de `v22.13.0`, actualice Node desde [nodejs.org](https://nodejs.org)
(descargue la versión LTS) o, si usa `nvm`:

```bash
nvm install 24
nvm use 24
```

No hace falta compilar nada ni instalar SQLite por separado: no hay dependencias
nativas. Por eso se eligió `node:sqlite` (ver
[ANALISIS_TECNOLOGICO.md](ANALISIS_TECNOLOGICO.md)).

---

## 2. Instalación local

### 2.1 Obtener el código

```bash
git clone https://github.com/Braaaav0/Proyecto_Pruebas.git
cd Proyecto_Pruebas
```

### 2.2 Instalar dependencias

```bash
npm install
```

Solo hay una dependencia de producción (**Express 5**) y ninguna de desarrollo: las
pruebas usan el ejecutor integrado de Node. Debe terminar con `found 0 vulnerabilities`.

### 2.3 Cargar datos de ejemplo (recomendado)

```bash
npm run seed:demo
```

Crea 4 usuarios, 4 autores, 3 categorías, 3 editoriales, 8 libros y 3 préstamos —
incluido **uno atrasado**, para poder probar el reporte HU-012 de inmediato.

Es **seguro ejecutarlo varias veces**: si la base ya tiene libros, no hace nada y
avisa con `La base de datos ya tiene libros; no se cargan datos de demostración.`

Puede omitir este paso: el sistema arranca igual, solo que con todas las pantallas
vacías (las cuentas de acceso sí se crean siempre).

### 2.4 Arrancar

```bash
npm start
```

Verá:

```
Biblioteca en http://localhost:3000  (BD: ...\data\biblioteca.db)
Aviso: usando contraseñas iniciales por defecto; defina ADMIN_PASSWORD y BIBLIOTECARIO_PASSWORD antes del primer arranque.
```

Abra **http://localhost:3000** y entre con `admin` / `Admin123!`.

Para detenerlo: **Ctrl + C**.

### 2.5 Resumen

```bash
git clone https://github.com/Braaaav0/Proyecto_Pruebas.git
cd Proyecto_Pruebas
npm install
npm run seed:demo
npm start
```

---

## 3. Cuentas de acceso

Se crean **automáticamente la primera vez** que se inicializa la base de datos:

| Rol | Usuario | Contraseña inicial | Acceso |
| --- | --- | --- | --- |
| Administrador | `admin` | `Admin123!` | Todo |
| Bibliotecario | `bibliotecario` | `Biblio123!` | Préstamos, devoluciones y reportes |

Las contraseñas se guardan con **hash `scrypt` y sal aleatoria**; nunca en claro.

> **No hay pantalla para gestionar estas cuentas ni para cambiar la contraseña**, porque
> ninguna historia de usuario lo pide. Para cambiarlas, vea §4.2.

---

## 4. Configuración

Todo se configura con **variables de entorno**. Ninguna es obligatoria.

### 4.1 Variables disponibles

| Variable | Por defecto | Para qué sirve |
| --- | --- | --- |
| `PORT` | `3000` | Puerto de escucha |
| `DB_FILE` | `data/biblioteca.db` | Ruta del archivo de base de datos |
| `NODE_ENV` | *(sin valor)* | Con `production`, marca la cookie de sesión como `Secure`. **Requiere HTTPS** |
| `ADMIN_PASSWORD` | `Admin123!` | Contraseña inicial del administrador |
| `BIBLIOTECARIO_PASSWORD` | `Biblio123!` | Contraseña inicial del bibliotecario |

### 4.2 Cambiar las contraseñas iniciales

⚠️ **`ADMIN_PASSWORD` y `BIBLIOTECARIO_PASSWORD` solo se aplican cuando la base de
datos todavía no tiene cuentas**, es decir, en el **primer arranque**. Definirlas
después no cambia nada.

Para cambiarlas en una instalación ya iniciada, borre la base de datos y vuelva a
arrancar (perderá todos los datos):

```bash
rm -rf data/            # Windows PowerShell: Remove-Item -Recurse -Force data
ADMIN_PASSWORD='OtraClaveSegura!' BIBLIOTECARIO_PASSWORD='OtraClave2!' npm start
```

En **Windows PowerShell** las variables se definen antes:

```powershell
$env:ADMIN_PASSWORD = 'OtraClaveSegura!'
$env:BIBLIOTECARIO_PASSWORD = 'OtraClave2!'
npm start
```

### 4.3 Ejemplos

Otro puerto:

```bash
PORT=8080 npm start
```

Base de datos en otra ruta:

```bash
DB_FILE=/var/lib/biblioteca/datos.db npm start
```

> ⚠️ `NODE_ENV=production` marca la cookie como `Secure`, y los navegadores **no envían
> cookies `Secure` por HTTP**. Si lo activa sin HTTPS, **el login parecerá no funcionar**:
> las credenciales se aceptan pero la sesión no se mantiene. En local, no lo defina.

---

## 5. La base de datos

- Motor: **SQLite**, mediante el módulo integrado `node:sqlite`.
- Ubicación por defecto: `data/biblioteca.db` (la carpeta se crea sola).
- El **esquema se crea solo** en el primer arranque. No hay que ejecutar migraciones.
- Los tres estados de préstamo y las cuentas de acceso también se cargan solos.
- Está en `.gitignore`: la base **no** se sube al repositorio.

**Copia de seguridad:** copie el archivo `data/biblioteca.db` con el servidor detenido.

**Empezar de cero:** borre la carpeta `data/` y vuelva a arrancar.

---

## 6. Ejecutar las pruebas

```bash
npm test               # 182 pruebas, ~3 s
npm run test:coverage  # con tabla de cobertura
```

No requieren que el servidor esté arrancado ni conexión a internet: cada archivo
levanta la aplicación en un puerto libre, con una base **en memoria** y un reloj
controlable, y Open Library se simula.

Resultados y metodología: [INFORME_PRUEBAS_TDD.md](INFORME_PRUEBAS_TDD.md).

---

## 7. Despliegue en un servidor público (Render)

La aplicación está publicada en **Render**, plan gratuito:
**https://biblioteca-lz5p.onrender.com**

> **GitHub Pages no sirve para este proyecto.** Es hosting *estático*: entrega
> archivos, pero no ejecuta Node, Express ni SQLite. La interfaz se vería, pero
> `/api/auth/login` no existiría y no se podría ni entrar. Hace falta un servidor que
> ejecute Node (Render, Railway, Fly.io, Cyclic…).

### 7.1 Opción A — Public Git Repository (la que se usó)

Sirve **aunque no se sea dueño del repositorio**, que era el caso: Render no permite
a un colaborador conceder acceso a un repositorio de otra persona.

1. Cree una cuenta en [render.com](https://render.com).
2. **New +** → **Web Service** → pestaña **Public Git Repository**.
3. Pegue `https://github.com/Braaaav0/Proyecto_Pruebas` y pulse **Connect**.
4. Configure:

   | Campo | Valor |
   | --- | --- |
   | Name | `biblioteca` |
   | Language | `Node` |
   | Branch | `main` |
   | Build Command | `npm install` |
   | Start Command | `npm run seed:demo && npm start` |
   | Instance Type | `Free` |

5. **Advanced → Add Environment Variable**: `NODE_ENV` = `production`
6. **Create Web Service**.

⚠️ **Esta vía no tiene despliegue automático.** Tras subir cambios a GitHub hay que
entrar al panel de Render y pulsar **Manual Deploy → Deploy latest commit**. Si se
olvida, GitHub tendrá el código nuevo pero la aplicación seguirá sirviendo el viejo,
**sin dar ningún error**.

### 7.2 Opción B — Blueprint (si se es dueño del repositorio)

El repositorio incluye un `render.yaml` con toda esa configuración. Si tiene la cuenta
de GitHub conectada y acceso de propietario: **New +** → **Blueprint** → elegir el
repositorio → **Apply**. Render lo configura solo y **sí** hace despliegue automático
en cada `push`.

### 7.3 Por qué el arranque incluye el seed

`npm run seed:demo && npm start` no es casual. El plan gratuito de Render **no tiene
disco persistente**: al reiniciarse el servicio, `data/biblioteca.db` desaparece. Como
el seed es idempotente, cada arranque deja el sistema con los mismos datos de ejemplo.

Para una actividad de pruebas manuales esto es una ventaja — todos parten del mismo
estado conocido —, pero implica que **lo que se registre no sobrevive a un reinicio**.

### 7.4 Limitaciones del plan gratuito

| Comportamiento | Detalle |
| --- | --- |
| **Suspensión por inactividad** | Tras ~15 min sin tráfico. La siguiente visita tarda 30-50 s en despertar |
| **Datos efímeros** | La base vuelve al estado de ejemplo en cada reinicio |
| **Sin despliegue automático** | Solo con la opción A (§7.1) |

Para conservar los datos hacen falta un plan de pago con disco persistente o una base
externa (PostgreSQL). La migración está analizada en
[ANALISIS_TECNOLOGICO.md](ANALISIS_TECNOLOGICO.md) §4.

---

## 8. Solución de problemas

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| `Cannot find module 'node:sqlite'` | Node anterior a 22.13 | Actualice Node (§1) |
| `Error: listen EADDRINUSE :::3000` | El puerto 3000 está ocupado | `PORT=3001 npm start`, o cierre el otro proceso |
| `Cannot GET /` al abrir el navegador | Falta la carpeta `public/` o está fuera de sitio | Compruebe que existe `public/index.html`. La aplicación sirve los estáticos desde `public/` |
| La página carga en blanco | Los módulos JS no se encuentran | Las vistas deben estar en `public/js/views/`, no en la raíz |
| El login acepta las credenciales pero vuelve a pedirlas | `NODE_ENV=production` sin HTTPS | No defina `NODE_ENV` en local (§4.3) |
| Las contraseñas nuevas no funcionan | Se definieron tras el primer arranque | Borre `data/` y arranque de nuevo (§4.2) |
| «No se pudo conectar con el servidor» | El servidor está caído o despertando | Espere ~50 s si es Render; en local, compruebe que `npm start` sigue activo |
| Open Library no responde | Servicio externo caído o sin red | El resto del sistema sigue funcionando; el autocompletado es opcional |
| Cambié el código y Render sigue igual | No hay despliegue automático | **Manual Deploy → Deploy latest commit** (§7.1) |
| `ExperimentalWarning` en consola | `node:sqlite` aún es experimental | Es normal; los scripts ya lo silencian |

---

## 9. Estructura del proyecto

```
src/
  app.js, server.js, db.js     aplicación Express, arranque, esquema SQLite
  auth.js, sesion.js           hash scrypt, sesiones, control de roles
  menu.js                      opciones del menú por rol
  validators.js, fechas.js     validación de campos y utilidades de fecha
  routes/                      auth, CRUD genérico, maestras, préstamos, Open Library
  services/                    reglas de préstamo/devolución/reportes
  seed-demo.js                 datos de ejemplo
public/                        front-end servido al navegador
  index.html, css/, js/, js/views/
tests/                         182 pruebas, organizadas por historia de usuario
docs/                          manuales, análisis tecnológico, informe TDD, evidencia
data/                          base de datos (se crea sola; no se versiona)
render.yaml, .node-version     configuración de despliegue
```

> La carpeta `public/` es obligatoria y su nombre no es casual: `src/app.js` sirve los
> archivos estáticos desde ahí. Si se mueven a otro sitio, la aplicación arranca pero
> responde `404 Cannot GET /`.

---

## 10. Documentación relacionada

| Documento | Contenido |
| --- | --- |
| [MANUAL_USUARIO.md](MANUAL_USUARIO.md) | Uso del sistema, pantalla por pantalla |
| [ANALISIS_TECNOLOGICO.md](ANALISIS_TECNOLOGICO.md) | Por qué este lenguaje, base de datos y API |
| [INFORME_PRUEBAS_TDD.md](INFORME_PRUEBAS_TDD.md) | Metodología TDD y resultados |
| [../Historias de usuario.md](../Historias%20de%20usuario.md) | HU-001 a HU-012 con criterios de aceptación |
| [../README.md](../README.md) | Resumen general y API |
