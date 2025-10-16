import { Hono } from 'hono'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { db } from '../db'
import { categorias } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticateJWT } from '../middleware/auth'
import { requireWritePermission, requireReadPermission } from '../middleware/permisos'
import { successResponse, makeError } from '../utils/responses'

const categoriasRouter = new Hono()

categoriasRouter.use('*', authenticateJWT)

const createCategoriaSchema = z.object({
  nombre: z.string().min(1, 'Nombre de categoría requerido'),
  tipo: z.enum(['ingreso', 'gasto'], { required_error: 'Tipo de categoría requerido' }),
  icono: z.string().default('Tag'),
  color: z.string().default('blue')
})

const updateCategoriaSchema = z.object({
  nombre: z.string().min(1).optional(),
  tipo: z.enum(['ingreso', 'gasto']).optional(),
  icono: z.string().optional(),
  color: z.string().optional(),
  activa: z.boolean().optional()
})

categoriasRouter.get('/', requireReadPermission, async (c) => {
  try {
    const user = c.get('user')
    const tipo = c.req.query('tipo')

    let query = db
      .select()
      .from(categorias)
      .where(eq(categorias.cuentaMaestraId, user.cuenta_maestra_id))

    if (tipo && (tipo === 'ingreso' || tipo === 'gasto')) {
      query = query.where(and(
        eq(categorias.cuentaMaestraId, user.cuenta_maestra_id),
        eq(categorias.tipo, tipo)
      ))
    }

    const categoriasList = await query

    return c.json(successResponse(categoriasList, 'Categorías obtenidas correctamente'))

  } catch (error) {
    console.error('Error al obtener categorías:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener categorías'), 500)
  }
})

categoriasRouter.get('/:id', requireReadPermission, async (c) => {
  try {
    const categoriaId = c.req.param('id')
    const user = c.get('user')

    const categoria = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.id, categoriaId),
          eq(categorias.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!categoria.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Categoría no encontrada'), 404)
    }

    return c.json(successResponse(categoria[0], 'Categoría obtenida correctamente'))

  } catch (error) {
    console.error('Error al obtener categoría:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener categoría'), 500)
  }
})

categoriasRouter.post('/', requireWritePermission, async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = createCategoriaSchema.parse(body)
    const user = c.get('user')

    const existingCategoria = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.nombre, validatedData.nombre),
          eq(categorias.tipo, validatedData.tipo),
          eq(categorias.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (existingCategoria.length > 0) {
      return c.json(makeError('ERR_CONFLICT', 'Ya existe una categoría con este nombre y tipo'), 409)
    }

    const newCategoria = await db.insert(categorias).values({
      id: nanoid(),
      cuentaMaestraId: user.cuenta_maestra_id,
      nombre: validatedData.nombre,
      tipo: validatedData.tipo,
      icono: validatedData.icono,
      color: validatedData.color,
      activa: true
    }).returning()

    return c.json(successResponse(newCategoria[0], 'Categoría creada correctamente'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(makeError('ERR_VALIDATION', 'Datos inválidos', error.errors), 400)
    }

    console.error('Error al crear categoría:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al crear categoría'), 500)
  }
})

categoriasRouter.patch('/:id', requireWritePermission, async (c) => {
  try {
    const categoriaId = c.req.param('id')
    const body = await c.req.json()
    const validatedData = updateCategoriaSchema.parse(body)
    const user = c.get('user')

    const existingCategoria = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.id, categoriaId),
          eq(categorias.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!existingCategoria.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Categoría no encontrada'), 404)
    }

    if (validatedData.nombre && validatedData.tipo) {
      const duplicateCategoria = await db
        .select()
        .from(categorias)
        .where(
          and(
            eq(categorias.nombre, validatedData.nombre),
            eq(categorias.tipo, validatedData.tipo),
            eq(categorias.cuentaMaestraId, user.cuenta_maestra_id),
            eq(categorias.id, categoriaId, false)
          )
        )
        .limit(1)

      if (duplicateCategoria.length > 0) {
        return c.json(makeError('ERR_CONFLICT', 'Ya existe una categoría con este nombre y tipo'), 409)
      }
    }

    const updatedCategoria = await db
      .update(categorias)
      .set({
        ...validatedData,
        updatedAt: new Date().toISOString()
      })
      .where(eq(categorias.id, categoriaId))
      .returning()

    return c.json(successResponse(updatedCategoria[0], 'Categoría actualizada correctamente'))

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(makeError('ERR_VALIDATION', 'Datos inválidos', error.errors), 400)
    }

    console.error('Error al actualizar categoría:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al actualizar categoría'), 500)
  }
})

categoriasRouter.delete('/:id', requireWritePermission, async (c) => {
  try {
    const categoriaId = c.req.param('id')
    const user = c.get('user')

    const existingCategoria = await db
      .select()
      .from(categorias)
      .where(
        and(
          eq(categorias.id, categoriaId),
          eq(categorias.cuentaMaestraId, user.cuenta_maestra_id)
        )
      )
      .limit(1)

    if (!existingCategoria.length) {
      return c.json(makeError('ERR_NOT_FOUND', 'Categoría no encontrada'), 404)
    }

    await db.delete(categorias).where(eq(categorias.id, categoriaId))

    return c.json(successResponse(null, 'Categoría eliminada correctamente'))

  } catch (error) {
    console.error('Error al eliminar categoría:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al eliminar categoría'), 500)
  }
})

export default categoriasRouter