# 🧾 API Testing - Finanzas Personales

## 🔐 Credenciales de Acceso

### Administrador (Permisos de escritura)
- **Email**: `admin@demo.com`
- **Password**: `admin123`

### Usuario (Permisos de lectura)
- **Email**: `usuario@demo.com`
- **Password**: `usuario123`

## 🚀 Endpoints de Autenticación

### 1. Login
```bash
# Administrador
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "admin123"
  }'

# Usuario
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@demo.com",
    "password": "usuario123"
  }'
```

### 2. Logout
```bash
curl -X POST http://localhost:8080/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📋 Endpoints Principales

### Información de la API
```bash
curl http://localhost:8080/
```

### Estado de salud
```bash
curl http://localhost:8080/health
```

### Documentación interactiva
```bash
# Abrir en navegador
open http://localhost:8080/docs

# OpenAPI spec JSON
curl http://localhost:8080/doc
```

## 💡 Notas

1. **Login simplificado**: Solo necesitas email y password, el sistema automáticamente identifica la cuenta maestra
2. **JWT Token**: Guarda el token del login para usar en requests autenticados
3. **Servidor local**: Asegúrate de que el servidor esté corriendo en `http://localhost:8080`
4. **Permisos automáticos**: Todos los endpoints respetan automáticamente los permisos del usuario autenticado

## 📚 Inicializar datos de prueba

```bash
# Ejecutar seed de la base de datos para crear usuarios de prueba
bun run db:seed
```

## ⚠️ Variables de Entorno Requeridas

Asegúrate de tener configurado el archivo `.env`:
```env
DATABASE_URL="libsql://..."
DATABASE_AUTH_TOKEN="..."
JWT_SECRET="finanzas-personales-secret-key-2025-production-ready"
PORT=8080
```