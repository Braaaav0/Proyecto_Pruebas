

| ID | HU-001 |
| :---- | :---- |
| **Título** | Inicio de sesión. |
| **Rol (Como)** | Usuario. |
| **Función (Quiero)** | Iniciar sesión utilizando mi usuario y contraseña. |
| **Beneficio (Para)** | Acceder de manera segura a las funcionalidades de la biblioteca. |
| **Criterio de aceptación** | El sistema debe solicitar usuario y contraseña. (Ambos campos deben ser obligatorios) El sistema debe verificar que las credenciales sean correctas. Si las credenciales son correctas, el sistema debe permitir el acceso al menú principal. Si las credenciales son incorrectas, el sistema debe mostrar un mensaje de error. El sistema no debe permitir el acceso cuando alguno de los campos esté vacío. |
| **Prioridad** | Alta. |

| ID | HU-002 |
| :---- | :---- |
| **Título** | Menú principal. |
| **Rol (Como)** | Usuario. |
| **Función (Quiero)** | Visualizar un menú principal con las diferentes funcionalidades disponibles. |
| **Beneficio (Para)** | Acceder fácilmente a las opciones de gestión, préstamos y reportes.  |
| **Criterio de aceptación** | El sistema debe mostrar las opciones disponibles según el tipo de usuario. El menú debe permitir acceder a las pantallas maestras. El usuario debe poder cerrar sesión desde el menú.  |
| **Prioridad** | Alta. |

| ID | HU-003 |
| :---- | :---- |
| **Título** | Gestión de usuarios. |
| **Rol (Como)** | Administrador. |
| **Función (Quiero)** | Registrar, consultar, actualizar y eliminar usuarios.  |
| **Beneficio (Para)** | Mantener actualizada la información de las personas que utilizan la biblioteca. |
| **Criterio de aceptación** | El sistema debe permitir registrar un nuevo usuario. Debe solicitar como mínimo nombre, documento, correo y teléfono. El sistema debe permitir consultar usuarios registrados. El sistema debe permitir modificar la información de un usuario. El sistema debe permitir eliminar un usuario. El sistema debe validar los campos obligatorios. |
| **Prioridad** | Alta. |

| ID | HU-004 |
| :---- | :---- |
| **Título** | Gestión de autores.  |
| **Rol (Como)** | Administrador. |
| **Función (Quiero)** | Registrar y administrar los autores de los libros.  |
| **Beneficio (Para)** | Mantener organizada y actualizada la información de los autores del catálogo.  |
| **Criterio de aceptación** | El sistema debe permitir registrar autores. Debe solicitar nombre y apellido del autor. El sistema debe permitir consultar autores registrados. El sistema debe permitir modificar la información de un autor. El sistema debe permitir eliminar un autor. El sistema debe validar que los campos obligatorios estén completos. |
| **Prioridad** | Media. |

| ID | HU-005 |
| :---- | :---- |
| **Título** | Gestión de categorías. |
| **Rol (Como)** | Administrador. |
| **Función (Quiero)** | Administrar las categorías de los libros  |
| **Beneficio (Para)** | Organizar el catálogo de la biblioteca y facilitar la búsqueda de material.  |
| **Criterio de aceptación** | El sistema debe permitir registrar una categoría. Cada categoría debe tener un nombre y una descripción. El nombre de la categoría debe ser único. El sistema debe permitir consultar las categorías. El sistema debe permitir modificar una categoría. El sistema debe permitir eliminar una categoría. |
| **Prioridad** | Media. |

| ID | HU-006 |
| :---- | :---- |
| **Título** | Gestión de editoriales. |
| **Rol (Como)** | Administrador. |
| **Función (Quiero)** | Administrar las editoriales asociadas a los libros.  |
| **Beneficio (Para)** | Mantener organizada la información bibliográfica del catálogo.  |
| **Criterio de aceptación** | El sistema debe permitir registrar editoriales. Debe permitir almacenar nombre, teléfono y correo de la editorial. El sistema debe permitir consultar editoriales. El sistema debe permitir modificar sus datos. El sistema debe permitir eliminar una editorial. El sistema debe validar los campos obligatorios. |
| **Prioridad** | Media. |

| ID | HU-007 |
| :---- | :---- |
| **Título** | Gestión de libros. |
| **Rol (Como)** | Administrador. |
| **Función (Quiero)** | Registrar y administrar los libros disponibles en la biblioteca.  |
| **Beneficio (Para)** | Mantener actualizado el catálogo bibliográfico.  |
| **Criterio de aceptación** | El sistema debe permitir registrar un libro. Debe solicitar título, autor, categoría, editorial y año de publicación. El sistema debe permitir consultar los libros registrados. El sistema debe permitir modificar la información de un libro. El sistema debe permitir eliminar un libro. El sistema debe mostrar el estado de disponibilidad del libro. |
| **Prioridad** | Alta. |

| ID | HU-008 |
| :---- | :---- |
| **Título** | Gestión de estados de préstamo. |
| **Rol (Como)** | Administrador. |
| **Función (Quiero)** | Administrar los estados disponibles para los préstamos.  |
| **Beneficio (Para)** | Controlar correctamente la situación de cada préstamo realizado.  |
| **Criterio de aceptación** | El sistema debe permitir registrar estados. Los estados son: "Prestado", "Devuelto" y "Atrasado". El sistema debe permitir consultar los estados. El sistema debe permitir modificar un estado. |
| **Prioridad** | Baja. |

| ID | HU-009 |
| :---- | :---- |
| **Título** | Registrar préstamo de libro. |
| **Rol (Como)** | Administrador. |
| **Función (Quiero)** | Registrar el préstamo de un libro a un usuario.  |
| **Beneficio (Para)** | Llevar un control de los libros que se encuentran prestados.  |
| **Criterio de aceptación** | El sistema debe permitir seleccionar un usuario registrado. El sistema debe permitir seleccionar un libro disponible. El sistema debe registrar la fecha del préstamo. El sistema debe establecer una fecha límite de devolución. El sistema debe cambiar el estado del libro a "Prestado". El sistema debe impedir prestar un libro que ya se encuentre prestado. El sistema debe almacenar la información del préstamo. |
| **Prioridad** | Alta. |

| ID | HU-010 |
| :---- | :---- |
| **Título** | Registrar devolución de libro. |
| **Rol (Como)** | Administrador. |
| **Función (Quiero)** | Registrar la devolución de un libro prestado.  |
| **Beneficio (Para)** | Actualizar la disponibilidad del libro y mantener el historial de préstamos.  |
| **Criterio de aceptación** | El sistema debe permitir consultar los préstamos activos. El bibliotecario debe poder seleccionar el préstamo que será devuelto. El sistema debe registrar la fecha de devolución. El sistema debe cambiar el estado del préstamo a "Devuelto". El sistema debe cambiar el estado del libro a "Disponible". El sistema debe conservar el préstamo en el historial. |
| **Prioridad** | Alta. |

| ID | HU-011 |
| :---- | :---- |
| **Título** | Reporte de libros prestados. |
| **Rol (Como)** | Administrador. |
| **Función (Quiero)** | Generar un reporte de los libros que actualmente se encuentran prestados.  |
| **Beneficio (Para)** | Conocer qué material está fuera de la biblioteca y quién lo tiene.  |
| **Criterio de aceptación** | El sistema debe mostrar únicamente los préstamos activos. El reporte debe mostrar el nombre del usuario. Debe mostrar el título del libro. Debe mostrar la fecha del préstamo. Debe mostrar la fecha límite de devolución. El reporte debe permitir filtrar la información. El usuario debe poder consultar el reporte desde el menú principal. |
| **Prioridad** | Alta. |

| ID | HU-012 |
| :---- | :---- |
| **Título** | Reporte de préstamos atrasados. |
| **Rol (Como)** | Adiministrador. |
| **Función (Quiero)** | Generar un reporte de los préstamos cuya fecha límite ya fue superada.  |
| **Beneficio (Para)** | Identificar los usuarios que tienen libros pendientes de devolución.  |
| **Criterio de aceptación** | El sistema debe identificar automáticamente los préstamos vencidos. El reporte debe mostrar al usuario responsable. Debe mostrar el libro pendiente de devolución. Debe mostrar la fecha límite. Debe mostrar los días de retraso. El reporte debe mostrar un mensaje cuando no existan préstamos atrasados. |
| **Prioridad** | Alta. |

