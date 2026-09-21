import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestContext } from './helpers.js';

// Definición de las maestras con CRUD completo (HU-003 a HU-006).
const MAESTRAS = [
  {
    hu: 'HU-003', recurso: 'usuarios', etiqueta: 'Gestión de usuarios',
    valido: { nombre: 'Ana Pérez', documento: '1001', correo: 'ana@correo.com', telefono: '3001234567' },
    requeridos: ['nombre', 'documento', 'correo', 'telefono'],
    cambio: { nombre: 'Ana P. Gómez' },
  },
  {
    hu: 'HU-004', recurso: 'autores', etiqueta: 'Gestión de autores',
    valido: { nombre: 'Gabriel', apellido: 'García Márquez' },
    requeridos: ['nombre', 'apellido'],
    cambio: { apellido: 'Garcia Marquez' },
  },
  {
    hu: 'HU-005', recurso: 'categorias', etiqueta: 'Gestión de categorías',
    valido: { nombre: 'Novela', descripcion: 'Narrativa de ficción extensa' },
    requeridos: ['nombre', 'descripcion'],
    cambio: { descripcion: 'Narrativa de ficción' },
  },
  {
    hu: 'HU-006', recurso: 'editoriales', etiqueta: 'Gestión de editoriales',
    valido: { nombre: 'Alfaguara', telefono: '6015551234', correo: 'contacto@alfaguara.com' },
    requeridos: ['nombre', 'telefono', 'correo'],
    cambio: { telefono: '6019998888' },
  },
];

for (const m of MAESTRAS) {
  describe(`${m.hu} ${m.etiqueta}`, () => {
    let ctx;
    before(async () => { ctx = await createTestContext(); });
    after(() => ctx.close());
    const url = `/api/${m.recurso}`;

    test('registra un registro válido y responde 201 con su id', async () => {
      const res = await ctx.post(url, m.valido);
      assert.equal(res.status, 201);
      assert.ok(res.body.id > 0);
      for (const [k, v] of Object.entries(m.valido)) assert.equal(res.body[k], v);
    });

    for (const campo of m.requeridos) {
      test(`rechaza el registro si falta "${campo}" (campo obligatorio)`, async () => {
        const { [campo]: _omitido, ...incompleto } = m.valido;
        const res = await ctx.post(url, incompleto);
        assert.equal(res.status, 400);
        assert.ok(res.body.detalles[campo], `debe indicar el error de ${campo}`);
      });
      test(`rechaza "${campo}" en blanco`, async () => {
        const res = await ctx.post(url, { ...m.valido, [campo]: '   ' });
        assert.equal(res.status, 400);
        assert.ok(res.body.detalles[campo]);
      });
    }

    test('recorta espacios sobrantes al guardar', async () => {
      const otro = { ...m.valido };
      const clave = m.requeridos.includes('nombre') ? 'nombre' : m.requeridos[0];
      otro[clave] = `  ${m.valido[clave]} recorte  `;
      if (m.recurso === 'usuarios') otro.documento = '2002';
      const res = await ctx.post(url, otro);
      assert.equal(res.status, 201);
      assert.equal(res.body[clave], `${m.valido[clave]} recorte`);
    });

    test('consulta el listado y un registro por id', async () => {
      const lista = await ctx.get(url);
      assert.equal(lista.status, 200);
      assert.ok(Array.isArray(lista.body) && lista.body.length >= 1);
      const uno = await ctx.get(`${url}/${lista.body[0].id}`);
      assert.equal(uno.status, 200);
      assert.equal(uno.body.id, lista.body[0].id);
    });

    test('un id inexistente o inválido responde 404', async () => {
      assert.equal((await ctx.get(`${url}/999999`)).status, 404);
      assert.equal((await ctx.get(`${url}/abc`)).status, 404);
    });

    test('modifica un registro existente', async () => {
      const creado = (await ctx.get(url)).body[0];
      const res = await ctx.put(`${url}/${creado.id}`, { ...m.valido, ...m.cambio, ...(m.recurso === 'usuarios' && { documento: creado.documento }), ...(m.recurso === 'categorias' && { nombre: creado.nombre }) });
      assert.equal(res.status, 200);
      for (const [k, v] of Object.entries(m.cambio)) assert.equal(res.body[k], v);
      const releido = await ctx.get(`${url}/${creado.id}`);
      for (const [k, v] of Object.entries(m.cambio)) assert.equal(releido.body[k], v);
    });

    test('la modificación también valida los campos obligatorios', async () => {
      const creado = (await ctx.get(url)).body[0];
      const res = await ctx.put(`${url}/${creado.id}`, { ...m.valido, [m.requeridos[0]]: '' });
      assert.equal(res.status, 400);
    });

    test('modificar un registro inexistente responde 404', async () => {
      assert.equal((await ctx.put(`${url}/999999`, m.valido)).status, 404);
    });

    test('elimina un registro y luego ya no existe', async () => {
      const lista = (await ctx.get(url)).body;
      const objetivo = lista[lista.length - 1];
      assert.equal((await ctx.del(`${url}/${objetivo.id}`)).status, 204);
      assert.equal((await ctx.get(`${url}/${objetivo.id}`)).status, 404);
    });

    test('eliminar un registro inexistente responde 404', async () => {
      assert.equal((await ctx.del(`${url}/999999`)).status, 404);
    });

    test('filtra el listado con ?q= (búsqueda parcial, sin distinguir mayúsculas)', async () => {
      await ctx.post(url, m.valido).catch(() => {});
      const clave = m.requeridos[0];
      const fragmento = String(m.valido[clave]).slice(1, 4).toUpperCase();
      const res = await ctx.get(`${url}?q=${encodeURIComponent(fragmento)}`);
      assert.equal(res.status, 200);
      assert.ok(res.body.length >= 1);
      const sinMatch = await ctx.get(`${url}?q=zzzz-no-existe`);
      assert.equal(sinMatch.body.length, 0);
    });

    test('el bibliotecario puede consultar pero no modificar (403)', async () => {
      assert.equal((await ctx.get(url, 'bibliotecario')).status, 200);
      assert.equal((await ctx.post(url, m.valido, 'bibliotecario')).status, 403);
      assert.equal((await ctx.put(`${url}/1`, m.valido, 'bibliotecario')).status, 403);
      assert.equal((await ctx.del(`${url}/1`, 'bibliotecario')).status, 403);
    });

    test('sin sesión responde 401', async () => {
      assert.equal((await ctx.get(url, null)).status, 401);
      assert.equal((await ctx.post(url, m.valido, null)).status, 401);
    });
  });
}

describe('HU-003 reglas propias de usuarios', () => {
  let ctx;
  before(async () => { ctx = await createTestContext(); });
  after(() => ctx.close());
  const base = { nombre: 'Luis Soto', documento: '555', correo: 'luis@correo.com', telefono: '3110000000' };

  test('rechaza correos con formato inválido', async () => {
    for (const correo of ['sin-arroba', 'a@b', '@x.com', 'a b@c.com']) {
      const res = await ctx.post('/api/usuarios', { ...base, correo });
      assert.equal(res.status, 400, correo);
      assert.ok(res.body.detalles.correo);
    }
  });

  test('rechaza teléfonos con letras o demasiado cortos', async () => {
    for (const telefono of ['abc1234567', '123']) {
      const res = await ctx.post('/api/usuarios', { ...base, telefono });
      assert.equal(res.status, 400, telefono);
      assert.ok(res.body.detalles.telefono);
    }
  });

  test('no permite documentos duplicados (409), ni al crear ni al modificar', async () => {
    const a = await ctx.post('/api/usuarios', base);
    assert.equal(a.status, 201);
    const dup = await ctx.post('/api/usuarios', { ...base, nombre: 'Otro' });
    assert.equal(dup.status, 409);
    const b = await ctx.post('/api/usuarios', { ...base, documento: '556' });
    const mod = await ctx.put(`/api/usuarios/${b.body.id}`, { ...base, documento: '555' });
    assert.equal(mod.status, 409);
  });

  test('permite conservar el mismo documento al modificar el propio registro', async () => {
    const lista = (await ctx.get('/api/usuarios')).body;
    const u = lista[0];
    const res = await ctx.put(`/api/usuarios/${u.id}`, { ...base, documento: u.documento, nombre: 'Luis S.' });
    assert.equal(res.status, 200);
  });
});

describe('HU-005 el nombre de la categoría es único', () => {
  let ctx;
  before(async () => { ctx = await createTestContext(); });
  after(() => ctx.close());

  test('rechaza un nombre repetido, sin importar mayúsculas (409)', async () => {
    await ctx.post('/api/categorias', { nombre: 'Historia', descripcion: 'Libros de historia' });
    const dup = await ctx.post('/api/categorias', { nombre: 'HISTORIA', descripcion: 'otra' });
    assert.equal(dup.status, 409);
    assert.match(dup.body.error, /ya existe/i);
  });

  test('rechaza renombrar a un nombre ya usado por otra categoría', async () => {
    const a = await ctx.post('/api/categorias', { nombre: 'Ciencia', descripcion: 'x' });
    const res = await ctx.put(`/api/categorias/${a.body.id}`, { nombre: 'historia', descripcion: 'x' });
    assert.equal(res.status, 409);
  });
});

describe('HU-006 correo de editorial', () => {
  let ctx;
  before(async () => { ctx = await createTestContext(); });
  after(() => ctx.close());

  test('rechaza correos inválidos', async () => {
    const res = await ctx.post('/api/editoriales', { nombre: 'X', telefono: '6011234567', correo: 'no-es-correo' });
    assert.equal(res.status, 400);
    assert.ok(res.body.detalles.correo);
  });
});

describe('Integridad referencial de las maestras', () => {
  let ctx;
  let ids;
  before(async () => {
    ctx = await createTestContext();
    const autor = (await ctx.post('/api/autores', { nombre: 'Julio', apellido: 'Cortázar' })).body;
    const categoria = (await ctx.post('/api/categorias', { nombre: 'Cuento', descripcion: 'Relatos breves' })).body;
    const editorial = (await ctx.post('/api/editoriales', { nombre: 'Sudamericana', telefono: '6011112222', correo: 's@sud.com' })).body;
    await ctx.post('/api/libros', { titulo: 'Rayuela', anio_publicacion: 1963, autor_id: autor.id, categoria_id: categoria.id, editorial_id: editorial.id });
    ids = { autor: autor.id, categoria: categoria.id, editorial: editorial.id };
  });
  after(() => ctx.close());

  test('no se elimina un autor con libros asociados (409)', async () => {
    const res = await ctx.del(`/api/autores/${ids.autor}`);
    assert.equal(res.status, 409);
    assert.match(res.body.error, /libros/i);
  });
  test('no se elimina una categoría con libros asociados (409)', async () => {
    assert.equal((await ctx.del(`/api/categorias/${ids.categoria}`)).status, 409);
  });
  test('no se elimina una editorial con libros asociados (409)', async () => {
    assert.equal((await ctx.del(`/api/editoriales/${ids.editorial}`)).status, 409);
  });
});
