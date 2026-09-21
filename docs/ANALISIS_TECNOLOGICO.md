# Análisis tecnológico — Sistema de Biblioteca

Documento de decisión sobre lenguajes, base de datos y APIs de libros para las 12 historias de usuario (HU-001 a HU-012).

## 1. Qué exige el proyecto

| Requisito | Implicación técnica |
|---|---|
| Login, roles, menú por tipo de usuario (HU-001/002) | Sesiones seguras, hash de contraseñas, autorización por rol |
| 5 pantallas maestras + estados (HU-003 a HU-008) | CRUD con validación, unicidad e integridad referencial |
| 1 transacción principal: préstamo/devolución (HU-009/010) | Operaciones atómicas sobre varias tablas, sin doble préstamo |
| 2 reportes con filtros y cálculo de fechas (HU-011/012) | Consultas con joins y aritmética de fechas |
| Datos bibliográficos (opcional) | Consumo de una API externa de libros |

Es un sistema **transaccional pequeño y relacional** (pocas decenas de miles de filas como mucho, un puñado de usuarios concurrentes). Eso pesa más en la decisión que la moda tecnológica.

## 2. Backend

| Opción | A favor | En contra | Encaje |
|---|---|---|---|
| **Node.js + Express** | Un solo lenguaje con el front; arranque inmediato; `node:test` y `fetch` integrados; despliegue simple | Tipado débil sin TypeScript; hay que elegir librerías | **Alto** |
| Python + FastAPI / Django | Muy legible; Django trae admin, ORM y auth; FastAPI genera OpenAPI | Dos lenguajes en el equipo; Django es más pesado para 12 historias | Alto |
| Java + Spring Boot | Robusto, tipado, estándar empresarial; muy usado en educación | Más código y configuración para el alcance; arranque lento | Medio |
| C# + ASP.NET Core | Excelente rendimiento y herramientas; Entity Framework | Requiere ecosistema .NET si el equipo no lo tiene | Medio |
| PHP + Laravel | Productividad alta en CRUD; hosting barato | Menos afinidad si el equipo no lo conoce | Medio |

**Decisión: Node.js 24 + Express 5.** Motivos concretos: el equipo escribe un solo lenguaje de punta a punta, no hay compilación, y las pruebas de integración pueden levantar la app real en un puerto libre con solo la librería estándar.

**Si el equipo prefiere otro lenguaje, la arquitectura se conserva:** la lógica está separada en `services/` (reglas de préstamo y reportes), `routes/` (HTTP) y `db.js` (persistencia). Las 182 pruebas describen el contrato HTTP, así que sirven para validar una reescritura en Python o Java.

## 3. Frontend

| Opción | A favor | En contra |
|---|---|---|
| **HTML + CSS + JavaScript (módulos ES), sin build** | Cero dependencias y cero paso de compilación; fácil de entender y de evaluar | Hay que construir a mano el enrutado y el renderizado; escala peor |
| React / Vue | Componentes reutilizables, ecosistema enorme | Requiere Node + bundler (Vite); más piezas para 8 pantallas |
| Angular | Estructura completa (formularios, rutas, DI) | Curva alta para el alcance |

**Decisión: JavaScript nativo con módulos ES.** Para 9 pantallas y una sola configuración declarativa de las maestras (`views/maestras.js`), un framework añade más complejidad que valor. Todo el texto se inserta como nodos de texto (no `innerHTML`), lo que evita XSS con datos de la BD; se comprobó en navegador con un apellido que contenía `<b>`.

**Cuándo cambiar:** si el sistema crece a más de ~15 pantallas o hay que compartir componentes complejos, migrar a Vue o React. La API REST no cambia.

## 4. Base de datos

| Opción | A favor | En contra | Encaje |
|---|---|---|---|
| **SQLite** | Un archivo, cero instalación; SQL completo, transacciones, claves foráneas, índices parciales | Un solo escritor a la vez; sin servidor de red | **Alto para desarrollo, pruebas y bibliotecas pequeñas** |
| PostgreSQL | Estándar para producción; concurrencia real; tipos de fecha y restricciones ricas | Requiere instalar/administrar un servidor | **Alto para producción** |
| MySQL / MariaDB | Muy extendido, buen hosting | Equivalente a PostgreSQL para este caso | Alto |
| MongoDB | Esquema flexible | El dominio es **relacional** (libro→autor/categoría/editorial, préstamo→usuario/libro) y exige integridad; obligaría a reimplementarla | Bajo |

**Decisión: SQLite** mediante el módulo integrado `node:sqlite` (sin dependencias nativas que compilar en Windows). El modelo es relacional con integridad reforzada en la propia BD:

- Claves foráneas activadas (`PRAGMA foreign_keys = ON`).
- Índice único parcial `ux_prestamo_activo_por_libro`: **la base rechaza dos préstamos activos del mismo libro**, aunque falle la validación de la aplicación (HU-009).
- `UNIQUE … COLLATE NOCASE` en el nombre de categoría (HU-005) y en el documento del usuario.
- Préstamo y cambio de disponibilidad del libro se ejecutan en una transacción (`BEGIN IMMEDIATE`).

**Riesgos que conviene conocer**

1. `node:sqlite` **sigue marcado como experimental en Node 24** (emite `ExperimentalWarning`; los scripts lo silencian con `--disable-warning=ExperimentalWarning`). Su API podría cambiar. Alternativa estable: `better-sqlite3`, que requiere binarios precompilados o compilación nativa.
2. SQLite serializa las escrituras. Para una biblioteca con pocos bibliotecarios es suficiente; con muchas sedes o concurrencia alta, pasar a PostgreSQL. El SQL es mayormente estándar; al migrar habría que cambiar el driver, `INTEGER PRIMARY KEY` por una columna identidad, `INSERT OR IGNORE` por `ON CONFLICT DO NOTHING`, `COLLATE NOCASE` por `citext` o índices sobre `lower()`, y las fechas guardadas como texto `YYYY-MM-DD` por el tipo `DATE`. Los índices parciales y las claves foráneas existen igual en PostgreSQL.

## 5. APIs de libros

| API | Costo / acceso | Datos útiles | Observaciones |
|---|---|---|---|
| **Open Library** | Gratuita, **sin API key**; pide identificarse con `User-Agent` | Título, autores, año de primera publicación, editoriales, ISBN, temas, portadas | Datos abiertos. Latencia variable (medimos entre 1,4 s y varios segundos) y metadatos inconsistentes entre ediciones |
| Google Books API | Gratuita con cuota diaria; conviene clave de API | Buena cobertura comercial, descripción, portadas, categorías | Cuotas por proyecto; términos de uso más restrictivos que Open Library |
| ISBNdb | De pago | Metadatos por ISBN muy completos | Solo si el presupuesto lo justifica |
| WorldCat / OCLC | Requiere membresía institucional | Catálogo bibliotecario de referencia | Pensado para bibliotecas afiliadas |
| Library of Congress | Gratuita | Catalogación bibliotecaria (MARC) | Formato más técnico; menos práctico para autocompletar |

**Sí es posible y está implementado con Open Library**, porque no requiere clave ni registro:

- Endpoint del sistema: `GET /api/openlibrary/buscar?q=…` (requiere sesión).
- El servidor llama a `https://openlibrary.org/search.json` con los campos justos, límite de 8 resultados y *timeout* de 8 s, y **normaliza** la respuesta (la API real devuelve cientos de ISBN y decenas de editoriales por obra; se conserva el primer ISBN-13, la primera editorial y 5 temas).
- Pantalla **Libros → Nuevo libro → «Autocompletar desde Open Library»**: rellena título, año e ISBN, y **selecciona el autor y la editorial si ya existen** en las maestras; si no existen, avisa en pantalla (no los crea automáticamente porque dividir un nombre en nombre/apellido sin ambigüedad no es fiable).
- Si Open Library falla o no hay red, la API responde **502** con mensaje claro y el resto del sistema sigue funcionando (hay pruebas para ambos casos).

**Uso recomendado:** como *ayuda de captura*, no como fuente de verdad. El catálogo propio sigue siendo la base de datos local: así el sistema no depende de un tercero para prestar libros.

## 6. Pruebas (TDD)

| Herramienta | Motivo |
|---|---|
| `node:test` + `node:assert/strict` | Incluido en Node; sin dependencias; reportero `spec`, cobertura integrada |
| `fetch` nativo | Las pruebas son de integración: levantan la app real con SQLite en memoria y un reloj controlable |
| Open Library simulada | Se inyecta un `fetch` falso: las pruebas son deterministas y no usan la red |

Alternativas válidas: Jest o Vitest (mejor *watch* y mocks), Supertest (HTTP), Playwright (E2E). Se descartaron para mantener el proyecto sin dependencias de desarrollo. Ver `INFORME_PRUEBAS_TDD.md`.

## 7. Resumen de la decisión

| Capa | Elegido | Alternativa para producción |
|---|---|---|
| Backend | Node.js 24 + Express 5 | Python/FastAPI o Java/Spring Boot |
| Frontend | JavaScript nativo (módulos ES) | Vue o React si el sistema crece |
| Base de datos | SQLite (`node:sqlite`) | PostgreSQL |
| API de libros | Open Library | Google Books (complemento) |
| Autenticación | Sesión en BD, cookie `HttpOnly` + `SameSite=Strict`, hash `scrypt` con sal | Añadir HTTPS, bloqueo por intentos y cambio de contraseña |
| Pruebas | `node:test` | Jest/Vitest + Playwright |
