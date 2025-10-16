import { hash } from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db } from './index'
import { cuentasMaestras, usuarios, categorias, cuentas } from './schema'

async function seed() {
  console.log('🌱 Iniciando seed de la base de datos...')

  try {
    const cuentaMaestraId = nanoid()

    console.log('📋 Creando cuenta maestra...')
    await db.insert(cuentasMaestras).values({
      id: cuentaMaestraId,
      nombre: 'Finanzas Familiares Demo',
      emailAdmin: 'admin@demo.com',
      configuracion: JSON.stringify({
        moneda: 'MXN',
        timezone: 'America/Mexico_City',
        notificaciones: true
      }),
      activa: true
    })

    console.log('👤 Creando usuario administrador...')
    const adminPasswordHash = await hash('admin123', 12)

    await db.insert(usuarios).values({
      id: nanoid(),
      cuentaMaestraId: cuentaMaestraId,
      email: 'admin@demo.com',
      passwordHash: adminPasswordHash,
      nombreCompleto: 'Administrador Demo',
      tipoPermiso: 'escritura',
      activo: true
    })

    console.log('👥 Creando usuario con permisos de lectura...')
    const userPasswordHash = await hash('usuario123', 12)

    await db.insert(usuarios).values({
      id: nanoid(),
      cuentaMaestraId: cuentaMaestraId,
      email: 'usuario@demo.com',
      passwordHash: userPasswordHash,
      nombreCompleto: 'Usuario Demo',
      tipoPermiso: 'lectura',
      activo: true
    })

    console.log('💰 Creando cuentas financieras...')
    await db.insert(cuentas).values([
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Efectivo',
        saldo: 5000.00,
        tipo: 'efectivo',
        color: '#10B981',
        icono: 'Wallet',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Banco Principal',
        saldo: 25000.00,
        tipo: 'banco',
        color: '#3B82F6',
        icono: 'CreditCard',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Ahorros',
        saldo: 15000.00,
        tipo: 'ahorros',
        color: '#8B5CF6',
        icono: 'PiggyBank',
        activa: true
      }
    ])

    console.log('📊 Creando categorías de ingresos...')
    await db.insert(categorias).values([
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Salario',
        tipo: 'ingreso',
        icono: 'Briefcase',
        color: 'green',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Honorarios',
        tipo: 'ingreso',
        icono: 'Users',
        color: 'emerald',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Venta por apps',
        tipo: 'ingreso',
        icono: 'Smartphone',
        color: 'teal',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Remesas',
        tipo: 'ingreso',
        icono: 'Send',
        color: 'cyan',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Bonos',
        tipo: 'ingreso',
        icono: 'Gift',
        color: 'lime',
        activa: true
      }
    ])

    console.log('📉 Creando categorías de gastos...')
    await db.insert(categorias).values([
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Despensa',
        tipo: 'gasto',
        icono: 'ShoppingCart',
        color: 'red',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Comida',
        tipo: 'gasto',
        icono: 'Coffee',
        color: 'orange',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Transporte',
        tipo: 'gasto',
        icono: 'Car',
        color: 'amber',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Gasolina',
        tipo: 'gasto',
        icono: 'Fuel',
        color: 'yellow',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Servicios',
        tipo: 'gasto',
        icono: 'Zap',
        color: 'indigo',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Internet/Telefonía',
        tipo: 'gasto',
        icono: 'Wifi',
        color: 'purple',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Renta/Hipoteca',
        tipo: 'gasto',
        icono: 'Home',
        color: 'pink',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Entretenimiento',
        tipo: 'gasto',
        icono: 'Music',
        color: 'rose',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Salud',
        tipo: 'gasto',
        icono: 'Heart',
        color: 'blue',
        activa: true
      },
      {
        id: nanoid(),
        cuentaMaestraId: cuentaMaestraId,
        nombre: 'Educación',
        tipo: 'gasto',
        icono: 'BookOpen',
        color: 'violet',
        activa: true
      }
    ])

    console.log('✅ Seed completado exitosamente!')
    console.log('\n📝 Datos de acceso:')
    console.log('🔑 Admin: admin@demo.com / admin123')
    console.log('👤 Usuario: usuario@demo.com / usuario123')
    console.log(`🆔 Cuenta Maestra ID: ${cuentaMaestraId}`)

  } catch (error) {
    console.error('❌ Error durante el seed:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

if (require.main === module) {
  seed()
}

export { seed }