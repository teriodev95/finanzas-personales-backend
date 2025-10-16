import { Hono } from 'hono'
import { hash } from 'bcryptjs'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db'
import { usuarios } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticateJWT } from '../middleware/auth'
import { requireWritePermission, requireReadPermission } from '../middleware/permisos'
import { successResponse, makeError } from '../utils/responses'

const usuariosRouter = new Hono()

usuariosRouter.use('*', authenticateJWT)

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  nombre_completo: z.string().optional(),
  tipo_permiso: z.enum(['lectura', 'escritura']).default('lectura'),
  foto_url: z.string().url().optional()
})

const updateUserSchema = z.object({
  nombre_completo: z.string().optional(),
  tipo_permiso: z.enum(['lectura', 'escritura']).optional(),
  foto_url: z.string().url().optional(),
  activo: z.boolean().optional()
})

usuariosRouter.get('/', requireReadPermission, async (c) => {
  try {
    const user = c.get('user')

    const usersList = await db
      .select({
        id: usuarios.id,
        email: usuarios.email,
        nombreCompleto: usuarios.nombreCompleto,
        fotoUrl: usuarios.fotoUrl,
        tipoPermiso: usuarios.tipoPermiso,
        activo: usuarios.activo,
        createdAt: usuarios.createdAt,
        updatedAt: usuarios.updatedAt
      })
      .from(usuarios)
      .where(eq(usuarios.cuentaMaestraId, user.cuenta_maestra_id))

    return c.json(successResponse(usersList, 'Usuarios obtenidos correctamente'))

  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener usuarios'), 500)
  }
})

usuariosRouter.post('/', requireWritePermission, async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = createUserSchema.parse(body)
    const user = c.get('user')

    const existingUser = await db
      .select()
      .from(usuarios)
      .where(
        and(
          eq(usuarios.email, validatedData.email),
          eq(usuarios.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (existingUser.length > 0) {
      return c.json(makeError('ERR_CONFLICT', 'Ya existe un usuario con este email'), 409)
    }

    const hashedPassword = await hash(validatedData.password, 12)

    const newUser = await db.insert(usuarios).values({
      id: nanoid(),
      cuentaMaestraId: user.cuenta_maestra_id,
      email: validatedData.email,
      passwordHash: hashedPassword,
      nombreCompleto: validatedData.nombre_completo,
      tipoPermiso: validatedData.tipo_permiso,
      fotoUrl: validatedData.foto_url,
      activo: true
    }).returning({
      id: usuarios.id,
      email: usuarios.email,
      nombreCompleto: usuarios.nombreCompleto,
      fotoUrl: usuarios.fotoUrl,
      tipoPermiso: usuarios.tipoPermiso,
      activo: usuarios.activo,
      createdAt: usuarios.createdAt
    })

    return c.json(successResponse(newUser[0], 'Usuario creado correctamente'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(makeError('ERR_VALIDATION', 'Datos inválidos', error.errors), 400)
    }

    console.error('Error al crear usuario:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al crear usuario'), 500)
  }
})

usuariosRouter.patch('/:id', requireWritePermission, async (c) => {
  try {
    const userId = c.req.param('id')
    const body = await c.req.json()
    const validatedData = updateUserSchema.parse(body)
    const user = c.get('user')

    const existingUser = await db
      .select()
      .from(usuarios)
      .where(
        and(
          eq(usuarios.id, userId),
          eq(usuarios.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!existingUser.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Usuario no encontrado'), 404)
    }

    const updatedUser = await db
      .update(usuarios)
      .set({
        ...validatedData,
        updatedAt: new Date().toISOString()
      })
      .where(eq(usuarios.id, userId))
      .returning({
        id: usuarios.id,
        email: usuarios.email,
        nombreCompleto: usuarios.nombreCompleto,
        fotoUrl: usuarios.fotoUrl,
        tipoPermiso: usuarios.tipoPermiso,
        activo: usuarios.activo,
        updatedAt: usuarios.updatedAt
      })

    return c.json(successResponse(updatedUser[0], 'Usuario actualizado correctamente'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(makeError('ERR_VALIDATION', 'Datos inválidos', error.errors), 400)
    }

    console.error('Error al actualizar usuario:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al actualizar usuario'), 500)
  }
})

usuariosRouter.delete('/:id', requireWritePermission, async (c) => {
  try {
    const userId = c.req.param('id')
    const user = c.get('user')

    if (userId === user.id) {
      return c.json(makeError('ERR_FORBIDDEN', 'No puedes eliminar tu propia cuenta'), 403)
    }

    const existingUser = await db
      .select()
      .from(usuarios)
      .where(
        and(
          eq(usuarios.id, userId),
          eq(usuarios.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!existingUser.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Usuario no encontrado'), 404)
    }

    await db.delete(usuarios).where(eq(usuarios.id, userId))

    return c.json(successResponse(null, 'Usuario eliminado correctamente'))

  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al eliminar usuario'), 500)
  }
})

export default usuariosRouter