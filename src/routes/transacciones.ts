import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db'
import { transacciones, cuentas, categorias } from '../db/schema'
import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm'
import { authenticateJWT } from '../middleware/auth'
import { requireWritePermission, requireReadPermission } from '../middleware/permisos'
import { successResponse, makeError } from '../utils/responses'

const transaccionesRouter = new Hono()

transaccionesRouter.use('*', authenticateJWT)

const createTransaccionSchema = z.object({
  tipo: z.enum(['ingreso', 'gasto'], { required_error: 'Tipo de transacción requerido' }),
  monto: z.number().positive('El monto debe ser mayor a 0'),
  categoria_id: z.string().min(1, 'ID de categoría requerido'),
  cuenta_id: z.string().min(1, 'ID de cuenta requerido'),
  fecha: z.string().min(1, 'Fecha requerida'),
  notas: z.string().optional(),
  foto_comprobante_url: z.string().url().optional()
})

const updateTransaccionSchema = z.object({
  tipo: z.enum(['ingreso', 'gasto']).optional(),
  monto: z.number().positive('El monto debe ser mayor a 0').optional(),
  categoria_id: z.string().min(1).optional(),
  cuenta_id: z.string().min(1).optional(),
  fecha: z.string().min(1).optional(),
  notas: z.string().optional(),
  foto_comprobante_url: z.string().url().optional()
})

transaccionesRouter.get('/', requireReadPermission, async (c) => {
  try {
    const user = c.get('user')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const tipo = c.req.query('tipo')
    const categoriaId = c.req.query('categoria_id')
    const cuentaId = c.req.query('cuenta_id')
    const fechaInicio = c.req.query('fecha_inicio')
    const fechaFin = c.req.query('fecha_fin')
    const order = c.req.query('order') || 'desc'

    const offset = (page - 1) * limit

    let whereClause = eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id)

    if (tipo && (tipo === 'ingreso' || tipo === 'gasto')) {
      whereClause = and(whereClause, eq(transacciones.tipo, tipo))
    }

    if (categoriaId) {
      whereClause = and(whereClause, eq(transacciones.categoriaId, categoriaId))
    }

    if (cuentaId) {
      whereClause = and(whereClause, eq(transacciones.cuentaId, cuentaId))
    }

    if (fechaInicio) {
      whereClause = and(whereClause, gte(transacciones.fecha, fechaInicio))
    }

    if (fechaFin) {
      whereClause = and(whereClause, lte(transacciones.fecha, fechaFin))
    }

    const orderBy = order === 'asc' ? asc(transacciones.fecha) : desc(transacciones.fecha)

    const transaccionesList = await db
      .select({
        id: transacciones.id,
        tipo: transacciones.tipo,
        monto: transacciones.monto,
        fecha: transacciones.fecha,
        notas: transacciones.notas,
        fotoComprobanteUrl: transacciones.fotoComprobanteUrl,
        createdAt: transacciones.createdAt,
        categoria: {
          id: categorias.id,
          nombre: categorias.nombre,
          tipo: categorias.tipo,
          icono: categorias.icono,
          color: categorias.color
        },
        cuenta: {
          id: cuentas.id,
          nombre: cuentas.nombre,
          tipo: cuentas.tipo,
          color: cuentas.color,
          icono: cuentas.icono
        }
      })
      .from(transacciones)
      .innerJoin(categorias, eq(transacciones.categoriaId, categorias.id))
      .innerJoin(cuentas, eq(transacciones.cuentaId, cuentas.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(transacciones)
      .where(whereClause)

    return c.json(successResponse({
      transacciones: transaccionesList,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit)
      }
    }, 'Transacciones obtenidas correctamente'))

  } catch (error) {
    console.error('Error al obtener transacciones:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener transacciones'), 500)
  }
})

transaccionesRouter.get('/:id', requireReadPermission, async (c) => {
  try {
    const transaccionId = c.req.param('id')
    const user = c.get('user')

    const transaccion = await db
      .select({
        id: transacciones.id,
        tipo: transacciones.tipo,
        monto: transacciones.monto,
        fecha: transacciones.fecha,
        notas: transacciones.notas,
        fotoComprobanteUrl: transacciones.fotoComprobanteUrl,
        createdAt: transacciones.createdAt,
        updatedAt: transacciones.updatedAt,
        categoria: {
          id: categorias.id,
          nombre: categorias.nombre,
          tipo: categorias.tipo,
          icono: categorias.icono,
          color: categorias.color
        },
        cuenta: {
          id: cuentas.id,
          nombre: cuentas.nombre,
          tipo: cuentas.tipo,
          color: cuentas.color,
          icono: cuentas.icono
        }
      })
      .from(transacciones)
      .innerJoin(categorias, eq(transacciones.categoriaId, categorias.id))
      .innerJoin(cuentas, eq(transacciones.cuentaId, cuentas.id))
      .where(
        and(
          eq(transacciones.id, transaccionId),
          eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!transaccion.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Transacción no encontrada'), 404)
    }

    return c.json(successResponse(transaccion[0], 'Transacción obtenida correctamente'))

  } catch (error) {
    console.error('Error al obtener transacción:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener transacción'), 500)
  }
})

transaccionesRouter.post('/', requireWritePermission, async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = createTransaccionSchema.parse(body)
    const user = c.get('user')

    const categoria = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.id, validatedData.categoria_id),
          eq(categorias.cuentaMaestraId, user.cuenta_maestra_id),
          eq(categorias.activa, true)
        )
      )
      .limit(1)

    if (!categoria.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Categoría no encontrada o inactiva'), 404)
    }

    if (categoria[0].tipo !== validatedData.tipo) {
      return c.json(makeError('ERR_VALIDATION', 'El tipo de transacción no coincide con el tipo de categoría'), 400)
    }

    const cuenta = await db
      .select()
      .from(cuentas)
      .where(
        and(
          eq(cuentas.id, validatedData.cuenta_id),
          eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id),
          eq(cuentas.activa, true)
        )
      )
      .limit(1)

    if (!cuenta.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Cuenta no encontrada o inactiva'), 404)
    }

    if (validatedData.tipo === 'gasto' && cuenta[0].saldo < validatedData.monto) {
      return c.json(makeError('ERR_VALIDATION', 'Saldo insuficiente en la cuenta'), 400)
    }

    await db.transaction(async (tx) => {
      await tx.insert(transacciones).values({
        id: nanoid(),
        cuentaMaestraId: user.cuenta_maestra_id,
        usuarioId: user.id,
        tipo: validatedData.tipo,
        monto: validatedData.monto,
        categoriaId: validatedData.categoria_id,
        cuentaId: validatedData.cuenta_id,
        fecha: validatedData.fecha,
        notas: validatedData.notas,
        fotoComprobanteUrl: validatedData.foto_comprobante_url
      })

      const nuevoSaldo = validatedData.tipo === 'ingreso'
        ? cuenta[0].saldo + validatedData.monto
        : cuenta[0].saldo - validatedData.monto

      await tx
        .update(cuentas)
        .set({
          saldo: nuevoSaldo,
          updatedAt: new Date().toISOString()
        })
        .where(eq(cuentas.id, validatedData.cuenta_id))
    })

    const newTransaccion = await db
      .select({
        id: transacciones.id,
        tipo: transacciones.tipo,
        monto: transacciones.monto,
        fecha: transacciones.fecha,
        notas: transacciones.notas,
        fotoComprobanteUrl: transacciones.fotoComprobanteUrl,
        createdAt: transacciones.createdAt,
        categoria: {
          id: categorias.id,
          nombre: categorias.nombre,
          tipo: categorias.tipo,
          icono: categorias.icono,
          color: categorias.color
        },
        cuenta: {
          id: cuentas.id,
          nombre: cuentas.nombre,
          tipo: cuentas.tipo,
          color: cuentas.color,
          icono: cuentas.icono
        }
      })
      .from(transacciones)
      .innerJoin(categorias, eq(transacciones.categoriaId, categorias.id))
      .innerJoin(cuentas, eq(transacciones.cuentaId, cuentas.id))
      .where(eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id))
      .orderBy(desc(transacciones.createdAt))
      .limit(1)

    return c.json(successResponse(newTransaccion[0], 'Transacción creada correctamente'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(makeError('ERR_VALIDATION', 'Datos inválidos', error.errors), 400)
    }

    console.error('Error al crear transacción:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al crear transacción'), 500)
  }
})

transaccionesRouter.patch('/:id', requireWritePermission, async (c) => {
  try {
    const transaccionId = c.req.param('id')
    const body = await c.req.json()
    const validatedData = updateTransaccionSchema.parse(body)
    const user = c.get('user')

    const existingTransaccion = await db
      .select()
      .from(transacciones)
      .where(
        and(
          eq(transacciones.id, transaccionId),
          eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!existingTransaccion.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Transacción no encontrada'), 404)
    }

    const oldTransaccion = existingTransaccion[0]

    if (validatedData.categoria_id) {
      const categoria = await db
        .select()
        .from(categorias)
        .where(
          and(
            eq(categorias.id, validatedData.categoria_id),
            eq(categorias.cuentaMaestraId, user.cuenta_maestra_id),
            eq(categorias.activa, true)
          )
        )
        .limit(1)

      if (!categoria.length) {
        return c.json(makeError('ERR_NOT_FOUND', 'Categoría no encontrada o inactiva'), 404)
      }

      const nuevoTipo = validatedData.tipo || oldTransaccion.tipo
      if (categoria[0].tipo !== nuevoTipo) {
        return c.json(makeError('ERR_VALIDATION', 'El tipo de transacción no coincide con el tipo de categoría'), 400)
      }
    }

    if (validatedData.cuenta_id) {
      const cuenta = await db
        .select()
        .from(cuentas)
        .where(
          and(
            eq(cuentas.id, validatedData.cuenta_id),
            eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id),
            eq(cuentas.activa, true)
          )
        )
        .limit(1)

      if (!cuenta.length) {
        return c.json(makeError('ERR_NOT_FOUND', 'Cuenta no encontrada o inactiva'), 404)
      }
    }

    await db.transaction(async (tx) => {
      if (validatedData.monto || validatedData.tipo || validatedData.cuenta_id) {
        const cuentaAnterior = await tx
          .select()
          .from(cuentas)
          .where(eq(cuentas.id, oldTransaccion.cuentaId))
          .limit(1)

        if (cuentaAnterior.length) {
          const saldoRevertido = oldTransaccion.tipo === 'ingreso'
            ? cuentaAnterior[0].saldo - oldTransaccion.monto
            : cuentaAnterior[0].saldo + oldTransaccion.monto

          await tx
            .update(cuentas)
            .set({
              saldo: saldoRevertido,
              updatedAt: new Date().toISOString()
            })
            .where(eq(cuentas.id, oldTransaccion.cuentaId))
        }

        const nuevaCuentaId = validatedData.cuenta_id || oldTransaccion.cuentaId
        const nuevoMonto = validatedData.monto || oldTransaccion.monto
        const nuevoTipo = validatedData.tipo || oldTransaccion.tipo

        const cuentaNueva = await tx
          .select()
          .from(cuentas)
          .where(eq(cuentas.id, nuevaCuentaId))
          .limit(1)

        if (cuentaNueva.length) {
          const nuevoSaldo = nuevoTipo === 'ingreso'
            ? cuentaNueva[0].saldo + nuevoMonto
            : cuentaNueva[0].saldo - nuevoMonto

          if (nuevoTipo === 'gasto' && nuevoSaldo < 0) {
            throw new Error('Saldo insuficiente en la cuenta')
          }

          await tx
            .update(cuentas)
            .set({
              saldo: nuevoSaldo,
              updatedAt: new Date().toISOString()
            })
            .where(eq(cuentas.id, nuevaCuentaId))
        }
      }

      await tx
        .update(transacciones)
        .set({
          ...validatedData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(transacciones.id, transaccionId))
    })

    const updatedTransaccion = await db
      .select({
        id: transacciones.id,
        tipo: transacciones.tipo,
        monto: transacciones.monto,
        fecha: transacciones.fecha,
        notas: transacciones.notas,
        fotoComprobanteUrl: transacciones.fotoComprobanteUrl,
        updatedAt: transacciones.updatedAt,
        categoria: {
          id: categorias.id,
          nombre: categorias.nombre,
          tipo: categorias.tipo,
          icono: categorias.icono,
          color: categorias.color
        },
        cuenta: {
          id: cuentas.id,
          nombre: cuentas.nombre,
          tipo: cuentas.tipo,
          color: cuentas.color,
          icono: cuentas.icono
        }
      })
      .from(transacciones)
      .innerJoin(categorias, eq(transacciones.categoriaId, categorias.id))
      .innerJoin(cuentas, eq(transacciones.cuentaId, cuentas.id))
      .where(eq(transacciones.id, transaccionId))
      .limit(1)

    return c.json(successResponse(updatedTransaccion[0], 'Transacción actualizada correctamente'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(makeError('ERR_VALIDATION', 'Datos inválidos', error.errors), 400)
    }

    if (error.message === 'Saldo insuficiente en la cuenta') {
      return c.json(makeError('ERR_VALIDATION', 'Saldo insuficiente en la cuenta'), 400)
    }

    console.error('Error al actualizar transacción:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al actualizar transacción'), 500)
  }
})

transaccionesRouter.delete('/:id', requireWritePermission, async (c) => {
  try {
    const transaccionId = c.req.param('id')
    const user = c.get('user')

    const existingTransaccion = await db
      .select()
      .from(transacciones)
      .where(
        and(
          eq(transacciones.id, transaccionId),
          eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!existingTransaccion.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Transacción no encontrada'), 404)
    }

    const transaccion = existingTransaccion[0]

    await db.transaction(async (tx) => {
      const cuenta = await tx
        .select()
        .from(cuentas)
        .where(eq(cuentas.id, transaccion.cuentaId))
        .limit(1)

      if (cuenta.length) {
        const saldoRevertido = transaccion.tipo === 'ingreso'
          ? cuenta[0].saldo - transaccion.monto
          : cuenta[0].saldo + transaccion.monto

        await tx
          .update(cuentas)
          .set({
            saldo: saldoRevertido,
            updatedAt: new Date().toISOString()
          })
          .where(eq(cuentas.id, transaccion.cuentaId))
      }

      await tx.delete(transacciones).where(eq(transacciones.id, transaccionId))
    })

    return c.json(successResponse(null, 'Transacción eliminada correctamente'))

  } catch (error) {
    console.error('Error al eliminar transacción:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al eliminar transacción'), 500)
  }
})

export default transaccionesRouter