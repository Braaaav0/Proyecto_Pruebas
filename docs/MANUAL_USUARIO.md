# Manual de usuario — Sistema de Biblioteca

Guía de uso de la aplicación, pantalla por pantalla. Está escrita para dos públicos:

- **Quien use el sistema**: encontrará cómo hacer cada tarea.
- **Quien haga las pruebas manuales**: cada sección termina con un bloque
  **«Qué debe ocurrir»** con los resultados esperados, tomados de los criterios de
  aceptación de `Historias de usuario.md`. Sirve como lista de verificación.

| | |
| --- | --- |
| **Aplicación** | https://biblioteca-lz5p.onrender.com |
| **Versión** | 1.0.0 |
| **Historias cubiertas** | HU-001 a HU-012 |

---

## 1. Antes de empezar

### 1.1 Acceso

| Rol | Usuario | Contraseña | Qué puede hacer |
| --- | --- | --- | --- |
| Administrador | `admin` | `Admin123!` | Todo |
| Bibliotecario | `bibliotecario` | `Biblio123!` | Solo préstamos, devoluciones y reportes |

Son credenciales de práctica y son públicas a propósito, para que cualquiera pueda
probar el sistema. **No las use en un entorno real.**

### 1.2 Dos comportamientos normales que parecen fallos

El sistema está publicado en un servidor gratuito. Esto **no son defectos**:

1. **La primera visita tarda entre 30 y 50 segundos.** El servidor se suspende tras
   ~15 minutos sin uso y necesita despertar. Las siguientes pantallas van rápido.
2. **Los datos vuelven al estado inicial cuando el servidor se reinicia.** Lo que
   registre puede no seguir ahí al día siguiente. Para probar es una ventaja: todos
   empiezan desde el mismo punto.

### 1.3 Navegador y pantalla

Funciona en cualquier navegador moderno (probado en Edge) y se adapta a móvil. En
pantallas estrechas el menú lateral se oculta detrás del botón **☰** de la esquina
superior derecha.

### 1.4 Datos de ejemplo

Al arrancar, el sistema carga: **4 usuarios**, **4 autores**, **3 categorías**,
**3 editoriales**, **8 libros** y **3 préstamos** — uno atrasado (Luis Soto con
*Cien años de soledad*), uno vigente (Ana Pérez con *Rayuela*) y uno ya devuelto.
Esto permite probar los reportes sin tener que construir el escenario a mano.

---

## 2. Inicio de sesión · HU-001

Es la primera pantalla. Muestra una tarjeta con **Usuario**, **Contraseña** y el
botón **Ingresar**.

**Para entrar:** escriba usuario y contraseña de la tabla anterior y pulse
**Ingresar**.

Si algo falla, el mensaje aparece **debajo del campo correspondiente**, en rojo:

| Situación | Mensaje |
| --- | --- |
| Usuario vacío | `El usuario es obligatorio` |
| Contraseña vacía | `La contraseña es obligatoria` |
| Usuario o contraseña incorrectos | `Usuario o contraseña incorrectos` |

> El mensaje de credenciales es **el mismo** tanto si el usuario no existe como si la
> contraseña está mal. Es intencional: no revela a un atacante qué usuarios existen.

**Qué debe ocurrir**

- [ ] Los dos campos se piden y ambos son obligatorios
- [ ] Dejar uno vacío (o con solo espacios) **no** permite entrar y muestra el error del campo
- [ ] Con credenciales correctas entra al menú principal
- [ ] Con credenciales incorrectas muestra error y **no** entra
- [ ] La sesión dura 8 horas; después pide entrar de nuevo

---

## 3. Menú principal · HU-002

Tras entrar verá la pantalla de inicio con el saludo **«Hola, {nombre}»** y el menú
lateral, agrupado por secciones:

| Grupo | Opciones |
| --- | --- |
| Operación | Préstamos y devoluciones |
| Maestras | Usuarios · Autores · Categorías · Editoriales · Libros |
| Configuración | Estados de préstamo |
| Reportes | Libros prestados · Préstamos atrasados |

**El menú cambia según con quién entre:**

- **Administrador** → las **9** opciones.
- **Bibliotecario** → solo **3**: Préstamos y devoluciones, Libros prestados y
  Préstamos atrasados. Las maestras no aparecen.

Abajo del menú están su nombre, su rol y el botón **Cerrar sesión**.

**Qué debe ocurrir**

- [ ] El menú muestra opciones distintas según el rol
- [ ] Desde el menú se llega a todas las pantallas maestras
- [ ] El botón **Cerrar sesión** funciona y devuelve a la pantalla de acceso
- [ ] Entrando como bibliotecario y escribiendo a mano una dirección de maestras
      (por ejemplo `.../#/autores`), el sistema **no** deja gestionarlas

---

## 4. Las pantallas maestras: cómo funcionan todas

Las seis pantallas maestras (Usuarios, Autores, Categorías, Editoriales, Libros y
Estados) se manejan **igual**. Léalo una vez y sabrá usarlas todas.

Cada pantalla tiene:

- Un **título** y una descripción corta.
- Un buscador **«Buscar…»** que filtra mientras escribe (espera ~¼ de segundo tras
  dejar de teclear).
- Un botón **+ Nuevo …** arriba a la derecha.
- Una **tabla** con los registros y, en cada fila, los botones **Editar** y **Eliminar**.

### Registrar

1. Pulse **+ Nuevo …**. Se abre una ventana emergente.
2. Rellene los campos.
3. Pulse **Guardar**.

Si falta algo o hay un dato inválido, la ventana **permanece abierta** y cada campo
con problema se marca en rojo con su mensaje. Si todo está bien, la ventana se cierra,
aparece el aviso **«Registro creado»** y la tabla se actualiza.

### Consultar

Escriba en el buscador. Si nada coincide verá **«Ningún registro coincide con la
búsqueda.»**. Cada pantalla busca por sus campos principales (se indica más abajo).

### Modificar

Pulse **Editar** en la fila. Se abre la misma ventana con los datos cargados. Al
guardar aparece **«Cambios guardados»**.

### Eliminar

Pulse **Eliminar**. El navegador pide confirmación: *¿Eliminar {tipo} "{nombre}"?*

**Importante:** el sistema **protege el historial**. Si el registro está en uso, no se
elimina y aparece un aviso explicando por qué. Esto **no es un error**, es una regla
de negocio (ver §9).

---

### 4.1 Usuarios · HU-003

Las personas que usan la biblioteca (los lectores). **No inician sesión**: son datos,
no cuentas de acceso.

| Campo | Obligatorio | Validación |
| --- | --- | --- |
| Nombre completo | Sí | — |
| Documento | Sí | **Único**, máximo 30 caracteres |
| Correo | Sí | Formato de correo válido |
| Teléfono | Sí | Entre 7 y 20 caracteres; dígitos, `+`, `-`, espacios y paréntesis |

Busca por: nombre, documento y correo.

**Qué debe ocurrir**

- [ ] Permite registrar pidiendo, como mínimo, nombre, documento, correo y teléfono
- [ ] Valida los campos obligatorios (ninguno puede quedar vacío)
- [ ] Rechaza un correo sin formato válido (`ana@`) y un teléfono inválido (`abc`)
- [ ] **No** permite dos usuarios con el mismo documento → `Ya existe un usuario con ese documento`
- [ ] Permite consultar, modificar y eliminar

### 4.2 Autores · HU-004

| Campo | Obligatorio |
| --- | --- |
| Nombre | Sí |
| Apellido | Sí |

Busca por: nombre y apellido. Se ordenan por apellido.

**Qué debe ocurrir**

- [ ] Pide nombre y apellido, ambos obligatorios
- [ ] Permite consultar, modificar y eliminar
- [ ] **No** deja eliminar un autor con libros → `No se puede eliminar el autor porque tiene libros asociados`

### 4.3 Categorías · HU-005

| Campo | Obligatorio | Validación |
| --- | --- | --- |
| Nombre | Sí | **Único**, sin distinguir mayúsculas |
| Descripción | Sí | Máximo 500 caracteres |

**Qué debe ocurrir**

- [ ] Pide nombre y descripción
- [ ] El nombre es único: crear `novela` existiendo `Novela` → `Ya existe una categoría con ese nombre`
- [ ] La regla también se aplica al **renombrar**
- [ ] Permite consultar, modificar y eliminar
- [ ] **No** deja eliminar una categoría con libros

### 4.4 Editoriales · HU-006

| Campo | Obligatorio | Validación |
| --- | --- | --- |
| Nombre | Sí | — |
| Teléfono | Sí | Igual que en Usuarios |
| Correo | Sí | Formato válido |

Busca por: nombre y correo.

**Qué debe ocurrir**

- [ ] Almacena nombre, teléfono y correo
- [ ] Valida los obligatorios y el formato del correo
- [ ] Permite consultar, modificar y eliminar
- [ ] **No** deja eliminar una editorial con libros

### 4.5 Libros · HU-007

La pantalla más completa.

| Campo | Obligatorio | Validación |
| --- | --- | --- |
| Título | Sí | — |
| Autor | Sí | Lista desplegable de autores registrados |
| Categoría | Sí | Lista desplegable |
| Editorial | Sí | Lista desplegable |
| Año de publicación | Sí | Entre 1000 y el año próximo |
| ISBN | **No** | Si lo escribe: 10 o 13 dígitos (admite guiones) |

La tabla muestra una columna **Disponibilidad** con una etiqueta de color:
**Disponible** (verde) o **Prestado** (ámbar).

> La disponibilidad **no se edita a mano**. La calcula el sistema según los préstamos.

Busca por: título, ISBN, autor, categoría y editorial.

#### Autocompletar desde Open Library (opcional)

Dentro de la ventana de **Nuevo libro** hay un panel **«Autocompletar desde Open
Library (opcional)»**:

1. Escriba título, autor o ISBN (mínimo 2 caracteres) y pulse **Buscar**.
2. Verá una lista de resultados del catálogo público de Open Library.
3. Pulse uno: rellena **título**, **año** e **ISBN**, y selecciona **autor** y
   **editorial** si ya existen en el sistema.
4. Si no existen, avisa: *«No están registrados: autor "…" y editorial "…". Créelos en
   su pantalla y luego selecciónelos aquí.»* No los crea solo, a propósito.

Es una **ayuda de captura**, no obligatoria. Puede tardar unos segundos, y si Open
Library no responde verá un mensaje de error en el panel — el resto de la pantalla
sigue funcionando con normalidad.

**Qué debe ocurrir**

- [ ] Pide título, autor, categoría, editorial y año
- [ ] Rechaza un año fuera de rango (`99`, `3000`) y un ISBN mal formado (`123`)
- [ ] Deja guardar **sin** ISBN
- [ ] Muestra el estado de disponibilidad de cada libro
- [ ] Permite consultar, modificar y eliminar
- [ ] **No** deja eliminar un libro con préstamos, ni siquiera devueltos

### 4.6 Estados de préstamo · HU-008

Pantalla de solo configuración. Los tres estados vienen precargados:

| Código | Nombre |
| --- | --- |
| `PRESTADO` | Prestado |
| `DEVUELTO` | Devuelto |
| `ATRASADO` | Atrasado |

**Solo se puede cambiar el nombre visible.** No hay botón **+ Nuevo** ni **Eliminar**,
y el código interno no cambia nunca: la lógica del préstamo depende de él.

**Qué debe ocurrir**

- [ ] Los tres estados existen y se pueden consultar
- [ ] Se puede renombrar un estado (por ejemplo «Prestado» → «En préstamo»)
- [ ] El **Código** no cambia al renombrar
- [ ] **No** aparecen las opciones de crear ni eliminar
- [ ] El nombre es obligatorio y único

---

## 5. Préstamos y devoluciones · HU-009 y HU-010

La transacción principal. Tiene dos partes en la misma pantalla.

### 5.1 Registrar un préstamo · HU-009

Arriba, la tarjeta **«Registrar préstamo»**:

| Campo | Detalle |
| --- | --- |
| **Usuario** | Lista de usuarios registrados, con su documento entre paréntesis |
| **Libro disponible** | **Solo libros disponibles**; los prestados no aparecen |
| **Días de préstamo** | Por defecto **14**; admite de 1 a 90 |

Pulse **Registrar préstamo**. Aparece el aviso **«Préstamo registrado. Devolver antes
del DD/MM/AAAA»**, y a la vez:

- La fecha del préstamo se guarda como **hoy**.
- La fecha límite se calcula como **hoy + los días indicados**.
- El libro pasa a **Prestado** y **desaparece** de la lista de disponibles.

> Si no hay ningún libro libre, verá **«No hay libros disponibles para prestar.»**

### 5.2 Registrar una devolución · HU-010

Abajo, la tabla **«Préstamos»**, que por defecto muestra solo los **activos**. Marque
la casilla **«Incluir historial (devueltos)»** para ver también los cerrados.

Columnas: Usuario · Libro · Prestado · Fecha límite · Devuelto · Estado.

En cada préstamo activo hay un botón **Registrar devolución**. Al pulsarlo se pide
confirmación: *¿Registrar la devolución de "{libro}" ({usuario})?*

Al confirmar: se guarda la fecha de devolución (hoy), el préstamo pasa a **Devuelto**,
el libro vuelve a **Disponible** y el préstamo **permanece en el historial**.

**Qué debe ocurrir**

- [ ] Permite seleccionar un usuario registrado y un libro disponible
- [ ] Registra la fecha del préstamo y calcula la fecha límite
- [ ] El libro cambia a «Prestado»
- [ ] **Impide prestar un libro ya prestado** (no aparece en la lista; forzarlo da
      `El libro ya se encuentra prestado`)
- [ ] Permite consultar los préstamos activos
- [ ] Al devolver: registra la fecha, el estado pasa a «Devuelto» y el libro a «Disponible»
- [ ] El préstamo se conserva en el historial
- [ ] Un préstamo devuelto **no** se puede devolver dos veces
- [ ] Un libro devuelto se puede volver a prestar
- [ ] El bibliotecario también puede prestar y devolver

---

## 6. Reporte: libros prestados · HU-011

Muestra **únicamente los préstamos activos** (incluidos los atrasados).

Columnas: Usuario · Libro · Fecha de préstamo · Fecha límite · Estado.

Arriba, una barra con filtros:

| Control | Qué hace |
| --- | --- |
| **Usuario (nombre o documento)** | Filtra por cualquiera de los dos |
| **Título del libro** | Filtra por título |
| **Filtrar** | Aplica los filtros (se combinan entre sí) |
| **Limpiar** | Los quita y vuelve a mostrar todo |
| **Imprimir** | Abre el diálogo de impresión del navegador |

Al pie: **«N libros fuera de la biblioteca.»**. Si ningún préstamo coincide:
**«Ningún préstamo activo coincide con los filtros.»**

**Qué debe ocurrir**

- [ ] Muestra solo préstamos activos (los devueltos no aparecen)
- [ ] Muestra nombre del usuario, título del libro, fecha del préstamo y fecha límite
- [ ] Los filtros funcionan por separado y combinados
- [ ] Se llega desde el menú principal, con ambos roles

---

## 7. Reporte: préstamos atrasados · HU-012

Muestra los préstamos activos cuya fecha límite **ya pasó**. El sistema los detecta
**solo**, al consultar: no hay que ejecutar nada.

Columnas: Usuario responsable · Libro pendiente · Fecha límite · **Días de retraso**
(etiqueta roja). Se ordenan del más atrasado al menos. Al pie: **«N préstamos
atrasados.»**

Si no hay ninguno, muestra el mensaje **«No existen préstamos atrasados»**.

> **Cuándo se considera atrasado:** el día de la fecha límite **todavía no** cuenta
> como retraso. Un préstamo con límite hoy está *Prestado*; mañana pasará a *Atrasado*
> con 1 día. Con los datos de ejemplo verá a **Luis Soto** con *Cien años de soledad*.

**Qué debe ocurrir**

- [ ] Identifica automáticamente los préstamos vencidos
- [ ] Muestra usuario, libro, fecha límite y días de retraso
- [ ] El día exacto del vencimiento aún **no** se cuenta como atraso
- [ ] Al devolver un préstamo atrasado, desaparece del reporte
- [ ] Sin atrasados, muestra «No existen préstamos atrasados»

---

## 8. Cerrar sesión

Botón **Cerrar sesión**, al final del menú lateral. Vuelve a la pantalla de acceso e
invalida la sesión: el botón «atrás» del navegador **no** devuelve al sistema.

La sesión también caduca **sola a las 8 horas**.

---

## 9. Reglas de negocio que conviene conocer antes de probar

Estas decisiones son **intencionales**. Si no se conocen, es fácil reportarlas como
defectos por error.

1. **Los «Usuarios» no inician sesión.** Son los lectores. Las cuentas de acceso
   (`admin` y `bibliotecario`) se crean solas y **no tienen pantalla de gestión**,
   porque ninguna historia de usuario lo pide.
2. **No se puede eliminar lo que está en uso.** Autor, categoría o editorial con
   libros; usuario o libro con préstamos, **incluso devueltos**. Es para conservar el
   historial que exige HU-010.
3. **Un libro solo puede estar prestado una vez a la vez.** Está garantizado por la
   propia base de datos, no solo por la pantalla.
4. **El plazo por defecto es de 14 días.** Las historias no fijan uno; se eligió ese y
   se puede ajustar entre 1 y 90 al prestar.
5. **«Atrasado» se calcula al consultar**, sin procesos programados.
6. **Los estados no se crean ni se eliminan**, solo se renombran (ver §4.6).
7. **No están implementados** (y no los pide ninguna historia): bloqueo por intentos
   fallidos de acceso, cambio de contraseña, gestión de cuentas, multas y reservas.

---

## 10. Mensajes frecuentes y qué significan

| Mensaje | Significado |
| --- | --- |
| `Usuario o contraseña incorrectos` | Credenciales mal escritas |
| `{Campo} es obligatorio` | Falta un campo requerido |
| `{Campo} no tiene un formato válido` | Correo o teléfono mal formados |
| `El ISBN no tiene un formato válido (10 o 13 dígitos)` | ISBN incorrecto |
| `Ya existe un usuario con ese documento` | Documento duplicado |
| `Ya existe una categoría con ese nombre` | Nombre de categoría duplicado |
| `No se puede eliminar … porque tiene … asociados` | Protección del historial (§9.2) |
| `El libro ya se encuentra prestado` | Doble préstamo del mismo ejemplar |
| `El préstamo ya fue devuelto` | Devolución duplicada |
| `No existen préstamos atrasados` | Informativo: no hay retrasos |
| `No se pudo conectar con el servidor` | Sin red, o el servidor está despertando (§1.2) |

---

## 11. Guion sugerido de prueba manual

Recorrido completo en ~15 minutos que toca las 12 historias. Hágalo en orden: cada
paso deja el sistema listo para el siguiente.

| # | Acción | Resultado esperado | HU |
| --- | --- | --- | --- |
| 1 | Abrir la aplicación y pulsar **Ingresar** con los campos vacíos | Dos errores bajo los campos | 001 |
| 2 | Entrar con `admin` / `incorrecta` | `Usuario o contraseña incorrectos` | 001 |
| 3 | Entrar con `admin` / `Admin123!` | Entra al menú principal | 001 |
| 4 | Revisar el menú lateral | 9 opciones en 4 grupos | 002 |
| 5 | **Usuarios** → **+ Nuevo usuario**, dejar todo vacío, **Guardar** | 4 errores, la ventana sigue abierta | 003 |
| 6 | Rellenar con documento `1001` (ya existe) | `Ya existe un usuario con ese documento` | 003 |
| 7 | Cambiar el documento a `2001` y guardar | «Registro creado» y aparece en la tabla | 003 |
| 8 | Buscar `2001` en el buscador | Solo esa fila | 003 |
| 9 | **Autores** → crear uno; luego **Eliminar** un autor con libros | Se crea; el borrado se bloquea con mensaje | 004 |
| 10 | **Categorías** → crear una llamada `novela` | `Ya existe una categoría con ese nombre` | 005 |
| 11 | **Editoriales** → crear una con correo `abc` | Error de formato en el correo | 006 |
| 12 | **Libros** → **+ Nuevo libro**, autocompletar desde Open Library | Rellena título, año e ISBN | 007 |
| 13 | Completar y guardar; mirar la columna **Disponibilidad** | Se crea, marcado **Disponible** | 007 |
| 14 | **Estados de préstamo** | 3 estados; sin botones de crear/eliminar | 008 |
| 15 | Renombrar «Prestado» a «En préstamo» y **volver a dejarlo como estaba** | Cambia el nombre, **no** el código | 008 |
| 16 | **Préstamos** → prestar el libro nuevo al usuario nuevo, 14 días | «Devolver antes del …», fecha correcta | 009 |
| 17 | Abrir de nuevo la lista **Libro disponible** | El libro prestado ya **no** está | 009 |
| 18 | **Libros prestados** → filtrar por el nombre del usuario | Aparece solo su préstamo | 011 |
| 19 | **Préstamos atrasados** | Luis Soto, *Cien años de soledad*, con días de retraso | 012 |
| 20 | **Préstamos** → **Registrar devolución** del préstamo nuevo | Pasa a «Devuelto»; el libro vuelve a Disponible | 010 |
| 21 | Marcar **Incluir historial (devueltos)** | El préstamo devuelto sigue listado | 010 |
| 22 | Intentar **Eliminar** ese libro en **Libros** | Se bloquea: tiene préstamos en su historial | 007 |
| 23 | **Cerrar sesión** y entrar con `bibliotecario` / `Biblio123!` | Menú de **3** opciones, sin maestras | 002 |
| 24 | Escribir a mano la dirección `.../#/autores` | No permite gestionar autores | 002 |
| 25 | **Cerrar sesión** y pulsar «atrás» en el navegador | No vuelve a entrar; pide credenciales | 001 |

### Cómo reportar un defecto

Indique: **qué pantalla**, **qué hizo paso a paso**, **qué esperaba**, **qué ocurrió**,
el **usuario con el que entró** y, si puede, una **captura**. Compruebe antes la §9:
puede ser una regla de negocio y no un fallo.

---

## 12. Trazabilidad: historia de usuario → sección

| HU | Título | Sección |
| --- | --- | --- |
| HU-001 | Inicio de sesión | §2 |
| HU-002 | Menú principal | §3 |
| HU-003 | Gestión de usuarios | §4.1 |
| HU-004 | Gestión de autores | §4.2 |
| HU-005 | Gestión de categorías | §4.3 |
| HU-006 | Gestión de editoriales | §4.4 |
| HU-007 | Gestión de libros | §4.5 |
| HU-008 | Gestión de estados de préstamo | §4.6 |
| HU-009 | Registrar préstamo | §5.1 |
| HU-010 | Registrar devolución | §5.2 |
| HU-011 | Reporte de libros prestados | §6 |
| HU-012 | Reporte de préstamos atrasados | §7 |
