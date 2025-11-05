# VAMPYR Assistant - Backend de Autenticación

Backend Express + TypeScript para autenticación, gestión de usuarios e historial de conversaciones del asistente The Vampyr.

## Instalación

```bash
# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env

# Configurar DATABASE_URL en .env (SQLite por defecto)
DATABASE_URL="file:./dev.db"

# Generar cliente de Prisma
npm run generate

# Crear base de datos y tablas
npm run migrate

# Iniciar en modo desarrollo
npm run dev
```

##  Base de Datos

### SQLite (Desarrollo - Por defecto)
```env
DATABASE_URL="file:./dev.db"
```

### PostgreSQL (Producción)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/kof_assistant?schema=public"
```

### Migraciones
```bash
# Crear nueva migración
npm run migrate

# Ver base de datos con Prisma Studio
npm run studio
```


##  Autenticación

Usa JWT (JSON Web Tokens). Incluye el token en el header:
```
Authorization: Bearer <token>
```

## 🌐 Variables de Entorno

```env
PORT=3000
DATABASE_URL="file:./dev.db"
JWT_SECRET=tu_secreto_super_seguro
JWT_EXPIRES_IN=7d
RAG_API_URL=http://localhost:8000
CORS_ORIGIN=*
```

