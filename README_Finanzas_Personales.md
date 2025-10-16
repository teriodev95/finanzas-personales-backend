# 🧾 Backend – Finanzas Personales
**Stack:** Hono + Turso (SQLite) + Drizzle ORM  
**Objetivo:** Sistema ligero y seguro para registrar ingresos, gastos y balances con cuentas maestras y permisos.

---

## 🚀 Características Principales

- Autenticación por cuenta maestra (admin y usuarios con permisos).
- Control granular de permisos (`lectura` / `escritura`).
- Cuentas independientes (efectivo, banco, etc.).
- Registro de transacciones con comprobantes (foto).
- Reportes anuales y mensuales.
- Estructura uniforme de respuestas y manejo de errores.

---

## 🧱 Arquitectura General

```
/src
 ├── db/
 │   ├── schema.ts
 │   ├── seed.ts
 │   └── index.ts
 ├── routes/
 │   ├── auth.ts
 │   ├── cuentas.ts
 │   ├── categorias.ts
 │   ├── transacciones.ts
 │   ├── usuarios.ts
 │   └── reportes.ts
 ├── middleware/
 │   ├── auth.ts
 │   └── permisos.ts
 ├── utils/
 │   ├── responses.ts
 │   └── errors.ts
 ├── index.ts
 └── drizzle.config.ts
```

---

## ⚙️ Base de Datos

SQLite (Turso) con esquema definido en Drizzle.  
Incluye tablas: `cuentas_maestras`, `usuarios`, `cuentas`, `categorias`, `transacciones`.

**Relaciones clave:**
- 1:N entre `cuentas_maestras` → `usuarios`, `cuentas`, `categorias`, `transacciones`.

---

## 🔐 Autenticación

- JWT con middleware Hono.
- Tokens incluyen `cuenta_maestra_id`, `usuario_id` y `tipo_permiso`.

---

## 🧩 Convención de Respuestas

### ✅ Éxito
```json
{
  "success": true,
  "data": { "id": "cat_01", "nombre": "Salario" },
  "message": "Categoría creada correctamente"
}
```

### ❌ Error
```json
{
  "success": false,
  "error": {
    "code": "ERR_VALIDATION",
    "message": "El campo 'monto' es obligatorio",
    "context": { "field": "monto" }
  }
}
```

| Código | Descripción | HTTP |
|--------|-------------|------|
| ERR_UNAUTHORIZED | Usuario sin sesión válida | 401 |
| ERR_FORBIDDEN | Permisos insuficientes | 403 |
| ERR_VALIDATION | Error de validación | 400 |
| ERR_NOT_FOUND | Recurso no encontrado | 404 |
| ERR_INTERNAL | Error del servidor | 500 |
| ERR_CONFLICT | Conflicto lógico | 409 |

---

## 💡 Helper de Respuestas

```ts
export const successResponse = (data: any, message?: string) => ({
  success: true,
  message: message ?? 'Operación exitosa',
  data
})

export const makeError = (code: string, message: string, context?: any) => ({
  success: false,
  error: { code, message, context }
})
```

---

## 📤 Ejemplo de Endpoint

```ts
app.post('/', requireWritePermission, async (c) => {
  try {
    const body = await c.req.json()
    if (!body.monto || !body.categoria_id) {
      return c.json(makeError('ERR_VALIDATION', 'Campos requeridos faltantes', { fields: ['monto', 'categoria_id'] }), 400)
    }
    const trx = await db.insert(transacciones).values({
      ...body,
      cuenta_maestra_id: c.get('user').cuenta_maestra_id,
      usuario_id: c.get('user').id,
    }).returning()
    return c.json(successResponse(trx[0], 'Transacción registrada'))
  } catch (err) {
    return c.json(makeError('ERR_INTERNAL', 'Error al registrar transacción', { stack: err.message }), 500)
  }
})
```

---

## 🧾 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST /auth/login | Iniciar sesión |
| GET /cuentas-maestras/:id | Obtener cuenta maestra |
| POST /usuarios | Crear usuario |
| GET /usuarios | Listar usuarios |
| POST /transacciones | Crear transacción |
| GET /reportes/resumen | Resumen financiero |

---

## 🔧 Setup Local

### 1. Clonar e instalar dependencias
```bash
bun install
```

### 2. Configurar Turso + Drizzle
Crear `.env`:
```
DATABASE_URL="libsql://finanzas-personales-app-clvrt.aws-us-west-2.turso.io"
DATABASE_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjA2MjA1ODMsImlkIjoiMmVjMjFjNDktY2MzMS00MzA5LTg1ZWMtYzEwNjIzOWY5MDkxIiwicmlkIjoiODVjMDc3MjMtYTY3NC00MmMwLTlhYmQtNzMzMjU2NWQzNDJmIn0.pYeYTaW20egRr6WERLtHvKl8tOuvrCBRxmLqx1pLaZ3l8vfcO43LY3hK-W6GOfOGyTjMQUFhXfGLqn13hcPvAQ"
```

### 3. Migrar esquema
```bash
bunx drizzle-kit push
```

### 4. Ejecutar servidor
```bash
bun run dev
```

---

## 📊 Ejemplo de Resumen Financiero

```json
{
  "success": true,
  "data": {
    "anio": 2025,
    "total_ingresos": 48200.50,
    "total_gastos": 21500.75,
    "saldo_neto": 26700.75,
    "promedio_mensual": 4016.67,
    "meses_analizados": 12
  }
}
```

---

## 🧩 Estandarización

- Todas las rutas devuelven `success`, `message` y `code`.
- Los errores 5xx se registran internamente en `/logs/errors`.
- Validación uniforme de entrada y respuestas semánticas.


## Esquema de Tablas

### 1. Cuentas Maestras

```sql
CREATE TABLE cuentas_maestras (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    email_admin TEXT UNIQUE NOT NULL,
    configuracion JSON DEFAULT '{}',
    activa BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Usuarios

```sql
CREATE TABLE usuarios (
    id TEXT PRIMARY KEY,
    cuenta_maestra_id TEXT NOT NULL,
    email TEXT NOT NULL,
    nombre_completo TEXT,
    foto_url TEXT,
    tipo_permiso TEXT CHECK(tipo_permiso IN ('lectura', 'escritura')) DEFAULT 'lectura',
    activo BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cuenta_maestra_id) REFERENCES cuentas_maestras(id) ON DELETE CASCADE,
    UNIQUE(cuenta_maestra_id, email)
);
```

### 3. Cuentas Financieras

```sql
CREATE TABLE cuentas (
    id TEXT PRIMARY KEY,
    cuenta_maestra_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    saldo DECIMAL(15,2) DEFAULT 0.00,
    tipo TEXT DEFAULT 'efectivo',
    color TEXT DEFAULT '#3B82F6',
    icono TEXT DEFAULT 'Wallet',
    activa BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cuenta_maestra_id) REFERENCES cuentas_maestras(id) ON DELETE CASCADE,
    CHECK (saldo >= 0)
);
```

### 4. Categorías

```sql
CREATE TABLE categorias (
    id TEXT PRIMARY KEY,
    cuenta_maestra_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('ingreso', 'gasto')) NOT NULL,
    icono TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT 'blue',
    activa BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cuenta_maestra_id) REFERENCES cuentas_maestras(id) ON DELETE CASCADE
);
```

### 5. Transacciones

```sql
CREATE TABLE transacciones (
    id TEXT PRIMARY KEY,
    cuenta_maestra_id TEXT NOT NULL,
    usuario_id TEXT NOT NULL,
    tipo TEXT CHECK(tipo IN ('ingreso', 'gasto')) NOT NULL,
    monto DECIMAL(15,2) NOT NULL CHECK (monto > 0),
    categoria_id TEXT NOT NULL,
    cuenta_id TEXT NOT NULL,
    fecha DATE NOT NULL,
    notas TEXT,
    foto_comprobante_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cuenta_maestra_id) REFERENCES cuentas_maestras(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id)
);
```

## Datos Iniciales

### Categorías Predeterminadas (Ingresos)
- Salario
- Honorarios
- Venta por apps
- Remesas
- Bonos

### Categorías Predeterminadas (Gastos)
- Despensa
- Comida
- Transporte
- Gasolina
- Servicios
- Internet/Telefonía
- Renta/Hipoteca
- Entretenimiento
- Salud
- Educación

## Endpoints API (Hono)

### Autenticación
- `POST /auth/login` - Iniciar sesión
- `POST /auth/logout` - Cerrar sesión

### Cuentas Maestras
- `POST /cuentas-maestras` - Crear cuenta maestra
- `GET /cuentas-maestras/:id` - Obtener cuenta maestra

### Usuarios
- `POST /usuarios` - Crear usuario (solo admin)
- `GET /usuarios` - Listar usuarios de la cuenta
- `PATCH /usuarios/:id` - Actualizar permisos (solo admin)
- `DELETE /usuarios/:id` - Eliminar usuario (solo admin)

### Transacciones
- `GET /transacciones` - Listar transacciones
- `POST /transacciones` - Crear transacción (requiere permiso escritura)
- `PATCH /transacciones/:id` - Actualizar transacción (requiere permiso escritura)
- `DELETE /transacciones/:id` - Eliminar transacción (requiere permiso escritura)
- `POST /transacciones/:id/comprobante` - Subir foto comprobante

### Cuentas
- `GET /cuentas` - Listar cuentas
- `POST /cuentas` - Crear cuenta (requiere permiso escritura)
- `PATCH /cuentas/:id` - Actualizar cuenta (requiere permiso escritura)

### Categorías
- `GET /categorias` - Listar categorías
- `POST /categorias` - Crear categoría (requiere permiso escritura)
- `PATCH /categorias/:id` - Actualizar categoría (requiere permiso escritura)

### Reportes
- `GET /reportes/resumen` - Resumen financiero
- `GET /reportes/gastos-categoria` - Gastos por categoría
