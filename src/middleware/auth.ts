import { Context, Next } from 'hono'
import { verify } from 'jsonwebtoken'
import { db } from '../db'
import { usuarios } from '../db/schema'
import { eq } from 'drizzle-orm'
import { UnauthorizedError } from '../utils/errors'
import { makeError } from '../utils/responses'

export interface JWTPayload {
  usuario_id: string
  cuenta_maestra_id: string
  tipo_permiso: 'lectura' | 'escritura'
  email: string
}

export const authenticateJWT = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(makeError('ERR_UNAUTHORIZED', 'Token de autorización requerido'), 401)
    }

    const token = authHeader.substring(7)

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET no configurado')
    }

    const decoded = verify(token, process.env.JWT_SECRET) as JWTPayload

    const user = await db.select().from(usuarios).where(eq(usuarios.id, decoded.usuario_id)).limit(1)

    if (!user.length || !user[0].activo) {
      return c.json(makeError('ERR_UNAUTHORIZED', 'Usuario no válido o inactivo'), 401)
    }

    c.set('user', {
      id: decoded.usuario_id,
      cuenta_maestra_id: decoded.cuenta_maestra_id,
      tipo_permiso: decoded.tipo_permiso,
      email: decoded.email
    })

    await next()
  } catch (error) {
    console.error('Error de autenticación:', error)
    return c.json(makeError('ERR_UNAUTHORIZED', 'Token inválido'), 401)
  }
}