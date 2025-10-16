import { Context, Next } from 'hono'
import { makeError } from '../utils/responses'

export const requireWritePermission = async (c: Context, next: Next) => {
  const user = c.get('user')

  if (!user) {
    return c.json(makeError('ERR_UNAUTHORIZED', 'Usuario no autenticado'), 401)
  }

  if (user.tipo_permiso !== 'escritura') {
    return c.json(makeError('ERR_FORBIDDEN', 'Permisos de escritura requeridos'), 403)
  }

  await next()
}

export const requireReadPermission = async (c: Context, next: Next) => {
  const user = c.get('user')

  if (!user) {
    return c.json(makeError('ERR_UNAUTHORIZED', 'Usuario no autenticado'), 401)
  }

  await next()
}