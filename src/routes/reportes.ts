import { Hono } from 'hono'
import { db } from '../db'
import { transacciones, categorias, cuentas } from '../db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { authenticateJWT } from '../middleware/auth'
import { requireReadPermission } from '../middleware/permisos'
import { successResponse, makeError } from '../utils/responses'

const reportesRouter = new Hono()

reportesRouter.use('*', authenticateJWT)

reportesRouter.get('/resumen', requireReadPermission, async (c) => {
  try {
    const user = c.get('user')
    const anio = parseInt(c.req.query('anio') || new Date().getFullYear().toString())
    const mes = c.req.query('mes') ? parseInt(c.req.query('mes')) : null

    let fechaInicio: string
    let fechaFin: string

    if (mes) {
      fechaInicio = `${anio}-${mes.toString().padStart(2, '0')}-01`
      const ultimoDiaMes = new Date(anio, mes, 0).getDate()
      fechaFin = `${anio}-${mes.toString().padStart(2, '0')}-${ultimoDiaMes}`
    } else {
      fechaInicio = `${anio}-01-01`
      fechaFin = `${anio}-12-31`
    }

    const resumenIngresos = await db
      .select({
        total: sql<number>`COALESCE(SUM(${transacciones.monto}), 0)`
      })
      .from(transacciones)
      .where(
        and(
          eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id),
          eq(transacciones.tipo, 'ingreso'),
          gte(transacciones.fecha, fechaInicio),
          lte(transacciones.fecha, fechaFin)
        )
      )

    const resumenGastos = await db
      .select({
        total: sql<number>`COALESCE(SUM(${transacciones.monto}), 0)`
      })
      .from(transacciones)
      .where(
        and(
          eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id),
          eq(transacciones.tipo, 'gasto'),
          gte(transacciones.fecha, fechaInicio),
          lte(transacciones.fecha, fechaFin)
        )
      )

    const totalIngresos = resumenIngresos[0]?.total || 0
    const totalGastos = resumenGastos[0]?.total || 0
    const saldoNeto = totalIngresos - totalGastos

    const mesesAnalizados = mes ? 1 : 12
    const promedioMensual = totalIngresos / mesesAnalizados

    const saldoTotalCuentas = await db
      .select({
        total: sql<number>`COALESCE(SUM(${cuentas.saldo}), 0)`
      })
      .from(cuentas)
      .where(
        and(
          eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id),
          eq(cuentas.activa, true)
        )
      )

    return c.json(successResponse({
      periodo: mes ? `${anio}-${mes.toString().padStart(2, '0')}` : anio.toString(),
      total_ingresos: totalIngresos,
      total_gastos: totalGastos,
      saldo_neto: saldoNeto,
      promedio_mensual: Number(promedioMensual.toFixed(2)),
      meses_analizados: mesesAnalizados,
      saldo_total_cuentas: saldoTotalCuentas[0]?.total || 0
    }, 'Resumen financiero obtenido correctamente'))

  } catch (error) {
    console.error('Error al obtener resumen financiero:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener resumen financiero'), 500)
  }
})

reportesRouter.get('/gastos-categoria', requireReadPermission, async (c) => {
  try {
    const user = c.get('user')
    const anio = parseInt(c.req.query('anio') || new Date().getFullYear().toString())
    const mes = c.req.query('mes') ? parseInt(c.req.query('mes')) : null

    let fechaInicio: string
    let fechaFin: string

    if (mes) {
      fechaInicio = `${anio}-${mes.toString().padStart(2, '0')}-01`
      const ultimoDiaMes = new Date(anio, mes, 0).getDate()
      fechaFin = `${anio}-${mes.toString().padStart(2, '0')}-${ultimoDiaMes}`
    } else {
      fechaInicio = `${anio}-01-01`
      fechaFin = `${anio}-12-31`
    }

    const gastosPorCategoria = await db
      .select({
        categoria_id: categorias.id,
        categoria_nombre: categorias.nombre,
        categoria_icono: categorias.icono,
        categoria_color: categorias.color,
        total_gastado: sql<number>`SUM(${transacciones.monto})`,
        cantidad_transacciones: sql<number>`COUNT(${transacciones.id})`
      })
      .from(transacciones)
      .innerJoin(categorias, eq(transacciones.categoriaId, categorias.id))
      .where(
        and(
          eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id),
          eq(transacciones.tipo, 'gasto'),
          gte(transacciones.fecha, fechaInicio),
          lte(transacciones.fecha, fechaFin)
        )
      )
      .groupBy(categorias.id, categorias.nombre, categorias.icono, categorias.color)
      .orderBy(sql`SUM(${transacciones.monto}) DESC`)

    const totalGastos = gastosPorCategoria.reduce((sum, item) => sum + item.total_gastado, 0)

    const gastosPorCategoriaConPorcentaje = gastosPorCategoria.map(item => ({
      ...item,
      porcentaje: totalGastos > 0 ? Number(((item.total_gastado / totalGastos) * 100).toFixed(2)) : 0
    }))

    return c.json(successResponse({
      periodo: mes ? `${anio}-${mes.toString().padStart(2, '0')}` : anio.toString(),
      total_gastos: totalGastos,
      gastos_por_categoria: gastosPorCategoriaConPorcentaje
    }, 'Reporte de gastos por categoría obtenido correctamente'))

  } catch (error) {
    console.error('Error al obtener gastos por categoría:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener gastos por categoría'), 500)
  }
})

reportesRouter.get('/ingresos-categoria', requireReadPermission, async (c) => {
  try {
    const user = c.get('user')
    const anio = parseInt(c.req.query('anio') || new Date().getFullYear().toString())
    const mes = c.req.query('mes') ? parseInt(c.req.query('mes')) : null

    let fechaInicio: string
    let fechaFin: string

    if (mes) {
      fechaInicio = `${anio}-${mes.toString().padStart(2, '0')}-01`
      const ultimoDiaMes = new Date(anio, mes, 0).getDate()
      fechaFin = `${anio}-${mes.toString().padStart(2, '0')}-${ultimoDiaMes}`
    } else {
      fechaInicio = `${anio}-01-01`
      fechaFin = `${anio}-12-31`
    }

    const ingresosPorCategoria = await db
      .select({
        categoria_id: categorias.id,
        categoria_nombre: categorias.nombre,
        categoria_icono: categorias.icono,
        categoria_color: categorias.color,
        total_ingreso: sql<number>`SUM(${transacciones.monto})`,
        cantidad_transacciones: sql<number>`COUNT(${transacciones.id})`
      })
      .from(transacciones)
      .innerJoin(categorias, eq(transacciones.categoriaId, categorias.id))
      .where(
        and(
          eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id),
          eq(transacciones.tipo, 'ingreso'),
          gte(transacciones.fecha, fechaInicio),
          lte(transacciones.fecha, fechaFin)
        )
      )
      .groupBy(categorias.id, categorias.nombre, categorias.icono, categorias.color)
      .orderBy(sql`SUM(${transacciones.monto}) DESC`)

    const totalIngresos = ingresosPorCategoria.reduce((sum, item) => sum + item.total_ingreso, 0)

    const ingresosPorCategoriaConPorcentaje = ingresosPorCategoria.map(item => ({
      ...item,
      porcentaje: totalIngresos > 0 ? Number(((item.total_ingreso / totalIngresos) * 100).toFixed(2)) : 0
    }))

    return c.json(successResponse({
      periodo: mes ? `${anio}-${mes.toString().padStart(2, '0')}` : anio.toString(),
      total_ingresos: totalIngresos,
      ingresos_por_categoria: ingresosPorCategoriaConPorcentaje
    }, 'Reporte de ingresos por categoría obtenido correctamente'))

  } catch (error) {
    console.error('Error al obtener ingresos por categoría:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener ingresos por categoría'), 500)
  }
})

reportesRouter.get('/saldo-cuentas', requireReadPermission, async (c) => {
  try {
    const user = c.get('user')

    const saldoCuentas = await db
      .select({
        cuenta_id: cuentas.id,
        cuenta_nombre: cuentas.nombre,
        cuenta_tipo: cuentas.tipo,
        cuenta_icono: cuentas.icono,
        cuenta_color: cuentas.color,
        saldo: cuentas.saldo
      })
      .from(cuentas)
      .where(
        and(
          eq(cuentas.cuentaMaestraId, user.cuenta_maestra_id),
          eq(cuentas.activa, true)
        )
      )
      .orderBy(cuentas.saldo)

    const totalSaldo = saldoCuentas.reduce((sum, cuenta) => sum + cuenta.saldo, 0)

    const saldoCuentasConPorcentaje = saldoCuentas.map(cuenta => ({
      ...cuenta,
      porcentaje: totalSaldo > 0 ? Number(((cuenta.saldo / totalSaldo) * 100).toFixed(2)) : 0
    }))

    return c.json(successResponse({
      total_saldo: totalSaldo,
      cuentas: saldoCuentasConPorcentaje
    }, 'Reporte de saldo por cuentas obtenido correctamente'))

  } catch (error) {
    console.error('Error al obtener saldo por cuentas:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener saldo por cuentas'), 500)
  }
})

reportesRouter.get('/evolucion-mensual', requireReadPermission, async (c) => {
  try {
    const user = c.get('user')
    const anio = parseInt(c.req.query('anio') || new Date().getFullYear().toString())

    const evolucionMensual = await db
      .select({
        mes: sql<string>`strftime('%m', ${transacciones.fecha})`,
        mes_nombre: sql<string>`CASE strftime('%m', ${transacciones.fecha})
          WHEN '01' THEN 'Enero'
          WHEN '02' THEN 'Febrero'
          WHEN '03' THEN 'Marzo'
          WHEN '04' THEN 'Abril'
          WHEN '05' THEN 'Mayo'
          WHEN '06' THEN 'Junio'
          WHEN '07' THEN 'Julio'
          WHEN '08' THEN 'Agosto'
          WHEN '09' THEN 'Septiembre'
          WHEN '10' THEN 'Octubre'
          WHEN '11' THEN 'Noviembre'
          WHEN '12' THEN 'Diciembre'
        END`,
        total_ingresos: sql<number>`COALESCE(SUM(CASE WHEN ${transacciones.tipo} = 'ingreso' THEN ${transacciones.monto} ELSE 0 END), 0)`,
        total_gastos: sql<number>`COALESCE(SUM(CASE WHEN ${transacciones.tipo} = 'gasto' THEN ${transacciones.monto} ELSE 0 END), 0)`,
        saldo_neto: sql<number>`COALESCE(SUM(CASE WHEN ${transacciones.tipo} = 'ingreso' THEN ${transacciones.monto} ELSE -${transacciones.monto} END), 0)`
      })
      .from(transacciones)
      .where(
        and(
          eq(transacciones.cuentaMaestraId, user.cuenta_maestra_id),
          gte(transacciones.fecha, `${anio}-01-01`),
          lte(transacciones.fecha, `${anio}-12-31`)
        )
      )
      .groupBy(sql`strftime('%m', ${transacciones.fecha})`)
      .orderBy(sql`strftime('%m', ${transacciones.fecha})`)

    return c.json(successResponse({
      anio,
      evolucion_mensual: evolucionMensual
    }, 'Evolución mensual obtenida correctamente'))

  } catch (error) {
    console.error('Error al obtener evolución mensual:', error)
    return c.json(makeError('ERR_INTERNAL', 'Error al obtener evolución mensual'), 500)
  }
})

export default reportesRouter