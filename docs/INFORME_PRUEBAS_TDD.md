# Informe de ejecución de pruebas TDD — Sistema de Biblioteca

|                                        |                                                                 |
| -------------------------------------- | --------------------------------------------------------------- |
| Fecha de ejecución                     | 20/09/2026                                                      |
| Entorno                                | Windows 11 Pro, Node.js v24.11.0, SQLite 3.50.4 (`node:sqlite`) |
| Herramienta                            | `node:test` + `node:assert/strict` (sin dependencias de prueba) |
| Comando                                | `npm test` / `npm run test:coverage`                            |
| **Resultado final**                    | **182 pruebas · 182 pasan · 0 fallan · 0 omitidas · 2,5 s**     |
| Cobertura (líneas / ramas / funciones) | **99,80 % / 96,15 % / 98,10 %**                                 |
| Prueba E2E en navegador (Edge)         | **20 de 20 pasos correctos**                                    |

## 1. Metodología

Se aplicó TDD en **tres ciclos**, uno por bloque de historias. En cada ciclo:

1. **Rojo:** se escribieron las pruebas del bloque _antes_ que el código y se ejecutaron; la salida se guardó como evidencia.
2. **Verde:** se implementó lo mínimo para que pasaran y se volvió a ejecutar toda la suite (incluidos los ciclos anteriores).
3. **Refactor:** ajustes menores manteniendo todo en verde (por ejemplo, un CRUD genérico configurable en lugar de cinco routers casi iguales).

Las pruebas son de **integración sobre HTTP**: cada archivo levanta la aplicación real en un puerto libre, con una base SQLite en memoria y un **reloj controlable**. Eso permite probar fechas límite y expiración de sesión sin esperar. Open Library se simula con un `fetch` inyectado, por lo que la suite no depende de la red.

## 2. Ciclos rojo → verde

| Ciclo          | Historias                                               | Rojo (pruebas / pasan / **fallan**) | Verde (pruebas / pasan / fallan) |
| -------------- | ------------------------------------------------------- | ----------------------------------- | -------------------------------- |
| 1              | HU-001 Login, HU-002 Menú, utilidades de fechas y hash  | 3 / 0 / **3** ¹                     | 26 / 26 / 0                      |
| 2              | HU-003 a HU-008 (maestras y estados), Open Library      | 134 / 43 / **91**                   | 134 / 134 / 0                    |
| 3              | HU-009 a HU-012 (préstamos, devoluciones, reportes)     | 174 / 136 / **38**                  | 174 / 174 / 0                    |
| Endurecimiento | Robustez de la API (JSON inválido, 413, 500, cabeceras) | —                                   | 182 / 182 / 0                    |

¹ En el ciclo 1 el rojo son 3 archivos que ni siquiera cargan (`ERR_MODULE_NOT_FOUND`) porque el código aún no existía; por eso solo se contabilizan 3 «pruebas».
En los ciclos 2 y 3 las pruebas que pasan en rojo son las de los ciclos previos (26 y 134 respectivamente) más unas pocas nuevas que ya se cumplían sin código nuevo: las de 401/403 (las cubre el guard de sesión y roles del ciclo 1), las de «id inexistente → 404» (respuesta 404 por defecto) y, en el ciclo 3, la del índice único de la base de datos (ya presente en el esquema).

Evidencia: `docs/evidencia/ciclo{1,2,3}-{rojo,verde}.txt`.

### Incidencias durante la ejecución (transparencia)

| #   | Qué pasó                                           | Causa                                                                                                                           | Solución                                                                                                      |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | La fase roja del ciclo 2 se colgó                  | **Defecto de mis pruebas:** si una aserción fallaba antes de cerrar el servidor auxiliar, el proceso no terminaba               | `server.unref()` en el helper de pruebas                                                                      |
| 2   | Primera corrida verde del ciclo 3: 17 fallos (401) | **Defecto de mis pruebas:** al adelantar el reloj varios días, la sesión cacheada del helper caducaba (8 h, exigido por HU-001) | El helper vuelve a iniciar sesión ante un 401, como haría un usuario real. No se tocó el código de producción |
| 3   | 1 fallo en `robustez.test.js`                      | `/` devolvía la página 404 de Express (con otra CSP) porque aún no existía `public/index.html`                                  | Se resolvió al crear el front-end                                                                             |

Esa corrida verde inicial del ciclo 3 (con los 17 fallos) no se conservó como archivo: `ciclo3-verde.txt` contiene la corrida corregida.

## 3. Resultados por historia de usuario

| Suite                                              | Pruebas | Estado    |
| -------------------------------------------------- | ------: | --------- |
| HU-001 Inicio de sesión                            |      12 | ✔         |
| HU-002 Menú principal                              |       6 | ✔         |
| HU-003 Gestión de usuarios (CRUD + reglas propias) |  20 + 4 | ✔         |
| HU-004 Gestión de autores                          |      16 | ✔         |
| HU-005 Gestión de categorías (+ nombre único)      |  16 + 2 | ✔         |
| HU-006 Gestión de editoriales (+ correo)           |  18 + 1 | ✔         |
| HU-007 Gestión de libros                           |      15 | ✔         |
| HU-008 Estados de préstamo                         |       6 | ✔         |
| HU-009 Registrar préstamo                          |      10 | ✔         |
| HU-010 Registrar devolución                        |       8 | ✔         |
| HU-011 Reporte de libros prestados                 |       8 | ✔         |
| HU-012 Reporte de préstamos atrasados              |       8 | ✔         |
| Integridad referencial de maestras                 |       3 | ✔         |
| Estado «Atrasado» automático                       |       3 | ✔         |
| Historial de préstamos protege usuarios/libros     |       3 | ✔         |
| Integración con Open Library                       |       7 | ✔         |
| Robustez de la API                                 |       8 | ✔         |
| Utilidades: fechas / auth                          |   4 + 4 | ✔         |
| **Total**                                          | **182** | **✔ 182** |

### Trazabilidad: criterios de aceptación → pruebas

| HU     | Criterios verificados                                                                                                                                                                                                                                                                                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HU-001 | Pide usuario y contraseña (ambos obligatorios; vacío, ausente o solo espacios → 400 con detalle por campo) · verifica credenciales · acceso correcto devuelve el usuario sin datos sensibles · error genérico idéntico para usuario inexistente y contraseña errónea · cookie `HttpOnly` + `SameSite=Strict` · cierre de sesión invalida la cookie · expiración a las 8 h · token inventado rechazado |
| HU-002 | Exige sesión · menú del administrador (maestras, estados, préstamos, reportes) · menú reducido del bibliotecario · cada opción con título, grupo y ruta · cerrar sesión · 403 para el bibliotecario en rutas de administración                                                                                                                                                                        |
| HU-003 | Alta con nombre, documento, correo, teléfono · campos obligatorios y en blanco · correo y teléfono con formato válido · documento único (al crear y al modificar) · consulta, modificación, eliminación · búsqueda `?q=`                                                                                                                                                                              |
| HU-004 | Alta con nombre y apellido obligatorios · consulta · modificación · eliminación · bloqueo si tiene libros                                                                                                                                                                                                                                                                                             |
| HU-005 | Nombre y descripción obligatorios · **nombre único sin distinguir mayúsculas**, también al renombrar · CRUD · bloqueo si tiene libros                                                                                                                                                                                                                                                                 |
| HU-006 | Nombre, teléfono y correo obligatorios · correo válido · CRUD · bloqueo si tiene libros                                                                                                                                                                                                                                                                                                               |
| HU-007 | Título, autor, categoría, editorial y año obligatorios · FK inexistentes rechazadas · año válido (numérico, 1000 a año actual + 1) · ISBN opcional y validado · muestra disponibilidad · la disponibilidad no se edita a mano · búsqueda por título, autor o ISBN                                                                                                                                     |
| HU-008 | Los 3 estados existen · consulta · renombrar sin alterar el código interno · nombre obligatorio y único · no se crean ni eliminan · solo administrador                                                                                                                                                                                                                                                |
| HU-009 | Fecha de préstamo = hoy · fecha límite = hoy + 14 (o 1–90 indicados) · libro pasa a Prestado · **impide prestar un libro ya prestado** (409, sin crear segundo préstamo) · usuario y libro obligatorios y existentes · rechazo también a nivel de base de datos · el bibliotecario también puede prestar                                                                                              |
| HU-010 | Lista préstamos activos · fecha de devolución = hoy · estado Devuelto · libro vuelve a Disponible · **se conserva en el historial** · no se devuelve dos veces · libro devuelto puede volver a prestarse · préstamo atrasado también puede devolverse                                                                                                                                                 |
| HU-011 | Solo préstamos activos · usuario, libro, fecha de préstamo, fecha límite · filtros por usuario (nombre o documento) y por libro, combinables · vacío cuando nada coincide · incluye atrasados · acceso desde el menú, para ambos roles                                                                                                                                                                |
| HU-012 | Detecta vencidos **automáticamente** · **límite exacto: el día del vencimiento aún no es atraso** · usuario, libro, fecha límite y días de retraso · orden por mayor retraso · mensaje «No existen préstamos atrasados» cuando no hay · los devueltos desaparecen · el estado Atrasado queda guardado                                                                                                 |

## 4. Cobertura (`npm run test:coverage`)

| Archivo                                |  Líneas % |   Ramas % | Funciones % |
| -------------------------------------- | --------: | --------: | ----------: |
| src/app.js                             |       100 |       100 |       83,33 |
| src/auth.js                            |       100 |       100 |         100 |
| src/db.js                              |       100 |     71,43 |         100 |
| src/errores.js                         |       100 |       100 |         100 |
| src/fechas.js                          |       100 |       100 |         100 |
| src/menu.js                            |       100 |       100 |         100 |
| src/sesion.js                          |       100 |       100 |         100 |
| src/validators.js                      |       100 |     89,13 |         100 |
| src/routes/auth.js                     |       100 |       100 |         100 |
| src/routes/crud.js                     |       100 |       100 |         100 |
| src/routes/maestras.js                 |       100 |       100 |         100 |
| src/routes/prestamos.js                |       100 |       100 |         100 |
| src/routes/openlibrary.js              |     90,91 |     90,00 |         100 |
| src/services/openlibrary.js            |       100 |     89,47 |         100 |
| src/services/prestamos.js              |       100 |       100 |       92,86 |
| **Todos (incluye archivos de prueba)** | **99,80** | **96,15** |   **98,10** |

Sin cubrir: `routes/openlibrary.js` líneas 17-18 (relanzar un error que no sea de Open Library) y ramas de `db.js` que dependen de variables de entorno o de crear la carpeta del archivo de BD.

**Lo que esta cifra no mide:** `server.js` y `seed-demo.js` (no los carga ninguna prueba) ni el JavaScript del navegador. La cobertura mide líneas ejecutadas, no calidad de las aserciones.

## 5. Prueba de aceptación en navegador (E2E)

Además de la suite, se ejecutó `docs/evidencia/e2e-navegador.mjs` contra el servidor real con Microsoft Edge (Puppeteer): **20 de 20 pasos correctos**. Cubre login vacío/erróneo/correcto, menú por rol, recorrido de las 10 rutas sin errores de JavaScript, alta de autor con validaciones, un apellido con HTML mostrado como texto (sin XSS), autocompletado de un libro desde **Open Library real**, préstamo y devolución, ambos reportes, vista móvil, cierre de sesión y acceso denegado por URL al bibliotecario. Salida: `docs/evidencia/e2e-navegador.txt`; capturas: `docs/evidencia/capturas/`.

Esta prueba **encontró dos defectos del front-end que las 182 pruebas de API no podían ver**, ya corregidos:

1. `replaceChildren()` recibía arreglos y `null` y los convertía en texto; el inicio no dibujaba las tarjetas del menú. Se creó `montar()` que aplana y filtra.
2. El formulario de libros lanzaba `ReferenceError` (uso de una constante dentro de su propio inicializador). Se pasó el formulario de forma diferida.

También se corrigió un hueco visual del menú en móvil.

## 6. Límites y riesgos pendientes

- **El front-end no tiene pruebas automatizadas propias** en el repositorio: el E2E es un script manual que requiere `puppeteer-core` (instalado fuera del proyecto) y Edge. Conviene incorporarlo (Playwright) si el front va a evolucionar.
- **TDD por bloques, no por prueba:** cada ciclo escribió un bloque de pruebas y luego el código, no una prueba a la vez. La suite `robustez.test.js` (8 pruebas) se escribió **después** del código, para cubrir errores de infraestructura; es endurecimiento, no diseño dirigido por pruebas.
- **Open Library real solo se probó manualmente** (API y navegador). En la suite está simulada, así que un cambio de formato del proveedor no la haría fallar. Latencia observada: de 1,4 s a varios segundos.
- **No cubierto:** concurrencia real (dos bibliotecarios prestando el mismo libro a la vez; la BD lo impide con el índice único y las transacciones `BEGIN IMMEDIATE`, pero no hay prueba de carga), rendimiento con volúmenes grandes, límite de intentos de login, HTTPS y navegadores distintos de Edge.
- **Reloj:** las fechas usan la hora local del servidor; si el servidor y la biblioteca están en zonas horarias distintas, «hoy» puede diferir.

## 7. Cómo reproducir

```bash
npm install
npm test                 # 182 pruebas, ~3 s
npm run test:coverage    # con tabla de cobertura
```

Para repetir la fase roja de un ciclo, retire temporalmente el código de `src/` correspondiente y ejecute `npm test`; las salidas originales están en `docs/evidencia/`.
