import { Hono } from 'hono'
import { compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import { z } from 'zod'
import { db, getDb } from '../db'
import { usuarios, cuentasMaestras } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { successResponse, makeError } from '../utils/responses'

const auth = new Hono()

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida')
})

auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = loginSchema.parse(body)

    const database = getDb()
    const user = await database
      .select({
        id: usuarios.id,
        email: usuarios.email,
        nombreCompleto: usuarios.nombreCompleto,
        tipoPermiso: usuarios.tipoPermiso,
        passwordHash: usuarios.passwordHash,
        activo: usuarios.activo,
        cuentaMaestraId: usuarios.cuentaMaestraId,
        cuentaMaestraNombre: cuentasMaestras.nombre,
        cuentaMaestraActiva: cuentasMaestras.activa
      })
      .from(usuarios)
      .innerJoin(cuentasMaestras, eq(usuarios.cuentaMaestraId, cuentasMaestras.id))
      .where(
        and(
          eq(usuarios.email, validatedData.email),
          eq(usuarios.activo, true),
          eq(cuentasMaestras.activa, true)
        )
      )
      .limit(1)

    if (!user.length) {
      return c.json(makeError('ERR_UNAUTHORIZED', 'Credenciales inválidas'), 401)
    }

    const userData = user[0]
    const isValidPassword = await compare(validatedData.password, userData.passwordHash)

    if (!isValidPassword) {
      return c.json(makeError('ERR_UNAUTHORIZED', 'Credenciales inválidas'), 401)
    }

    const jwtSecret = process.env.JWT_SECRET || c.env?.JWT_SECRET
    if (!jwtSecret) {
      throw new Error('JWT_SECRET no configurado')
    }

    const token = sign(
      {
        usuario_id: userData.id,
        cuenta_maestra_id: userData.cuentaMaestraId,
        tipo_permiso: userData.tipoPermiso,
        email: userData.email
      },
      jwtSecret,
      { expiresIn: '24h' }
    )

    return c.json(successResponse({
      token,
      usuario: {
        id: userData.id,
        email: userData.email,
        nombre_completo: userData.nombreCompleto,
        tipo_permiso: userData.tipoPermiso,
        cuenta_maestra: {
          id: userData.cuentaMaestraId,
          nombre: userData.cuentaMaestraNombre
        }
      }
    }, 'Inicio de sesión exitoso'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(makeError('ERR_VALIDATION', 'Datos inválidos', error.errors), 400)
    }

    console.error('Error en login:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error interno del servidor'), 500)
  }
})

auth.post('/logout', async (c) => {
  return c.json(successResponse(null, 'Sesión cerrada exitosamente'))
})

export default auth