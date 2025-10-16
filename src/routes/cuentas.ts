import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db'
import { cuentas } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticateJWT } from '../middleware/auth'
import { requireWritePermission, requireReadPermission } from '../middleware/permisos'
import { successResponse, makeError } from '../utils/responses'

const cuentasRouter = new Hono()

cuentasRouter.use('*', authenticateJWT)

const createCuentaSchema = z.object({
  nombre: z.string().min(1, 'Nombre de cuenta requerido'),
  saldo: z.number().min(0, 'El saldo no puede ser negativo').default(0),
  tipo: z.string().default('efectivo'),
  color: z.string().default('#3B82F6'),
  icono: z.string().default('Wallet')
})

const updateCuentaSchema = z.object({
  nombre: z.string().min(1).optional(),
  saldo: z.number().min(0, 'El saldo no puede ser negativo').optional(),
  tipo: z.string().optional(),
  color: z.string().optional(),
  icono: z.string().optional(),
  activa: z.boolean().optional()
})

cuentasRouter.get('/', requireReadPermission, async (c) => {
  try {
    const user = c.get('user')

    const cuentasList = await db
      .select()
      .from(cuentas)
      .where(eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id))

    return c.json(successResponse(cuentasList, 'Cuentas obtenidas correctamente'))

  } catch (error) {
    console.error('Error al obtener cuentas:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener cuentas'), 500)
  }
})

cuentasRouter.get('/:id', requireReadPermission, async (c) => {
  try {
    const cuentaId = c.req.param('id')
    const user = c.get('user')

    const cuenta = await db
      .select()
      .from(cuentas)
      .where(
        and(
          eq(cuentas.id, cuentaId),
          eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!cuenta.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Cuenta no encontrada'), 404)
    }

    return c.json(successResponse(cuenta[0], 'Cuenta obtenida correctamente'))

  } catch (error) {
    console.error('Error al obtener cuenta:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener cuenta'), 500)
  }
})

cuentasRouter.post('/', requireWritePermission, async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = createCuentaSchema.parse(body)
    const user = c.get('user')

    const existingCuenta = await db
      .select()
      .from(cuentas)
      .where(
        and(
          eq(cuentas.nombre, validatedData.nombre),
          eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (existingCuenta.length > 0) {
      return c.json(makeError('ERR_CONFLICT', 'Ya existe una cuenta con este nombre'), 409)
    }

    const newCuenta = await db.insert(cuentas).values({
      id: nanoid(),
      cuentaMaestraId: user.cuenta_maestra_id,
      nombre: validatedData.nombre,
      saldo: validatedData.saldo,
      tipo: validatedData.tipo,
      color: validatedData.color,
      icono: validatedData.icono,
      activa: true
    }).returning()

    return c.json(successResponse(newCuenta[0], 'Cuenta creada correctamente'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(makeError('ERR_VALIDATION', 'Datos inválidos', error.errors), 400)
    }

    console.error('Error al crear cuenta:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al crear cuenta'), 500)
  }
})

cuentasRouter.patch('/:id', requireWritePermission, async (c) => {
  try {
    const cuentaId = c.req.param('id')
    const body = await c.req.json()
    const validatedData = updateCuentaSchema.parse(body)
    const user = c.get('user')

    const existingCuenta = await db
      .select()
      .from(cuentas)
      .where(
        and(
          eq(cuentas.id, cuentaId),
          eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!existingCuenta.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Cuenta no encontrada'), 404)
    }

    if (validatedData.nombre) {
      const duplicateCuenta = await db
        .select()
        .from(cuentas)
        .where(
          and(
            eq(cuentas.nombre, validatedData.nombre),
            eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id),
            eq(cuentas.id, cuentaId, false)
          )
        )
        .limit(1)

      if (duplicateCuenta.length > 0) {
        return c.json(makeError('ERR_CONFLICT', 'Ya existe una cuenta con este nombre'), 409)
      }
    }

    const updatedCuenta = await db
      .update(cuentas)
      .set({
        ...validatedData,
        updatedAt: new Date().toISOString()
      })
      .where(eq(cuentas.id, cuentaId))
      .returning()

    return c.json(successResponse(updatedCuenta[0], 'Cuenta actualizada correctamente'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(makeError('ERR_VALIDATION', 'Datos inválidos', error.errors), 400)
    }

    console.error('Error al actualizar cuenta:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al actualizar cuenta'), 500)
  }
})

cuentasRouter.delete('/:id', requireWritePermission, async (c) => {
  try {
    const cuentaId = c.req.param('id')
    const user = c.get('user')

    const existingCuenta = await db
      .select()
      .from(cuentas)
      .where(
        and(
          eq(cuentas.id, cuentaId),
          eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!existingCuenta.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Cuenta no encontrada'), 404)
    }

    await db.delete(cuentas).where(eq(cuentas.id, cuentaId))

    return c.json(successResponse(null, 'Cuenta eliminada correctamente'))

  } catch (error) {
    console.error('Error al eliminar cuenta:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al eliminar cuenta'), 500)
  }
})

export default cuentasRouter