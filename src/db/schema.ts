import { sqliteTable, text, real, integer, check } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export const cuentasMaestras = sqliteTable('cuentas_maestras', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  emailAdmin: text('email_admin').notNull().unique(),
  configuracion: text('configuracion', { mode: 'json' }).default('{}'),
  activa: integer('activa', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})

export const usuarios = sqliteTable('usuarios', {
  id: text('id').primaryKey(),
  cuentaMaestraId: text('cuenta_maestra_id').notNull().references(() => cuentasMaestras.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  nombreCompleto: text('nombre_completo'),
  fotoUrl: text('foto_url'),
  tipoPermiso: text('tipo_permiso', { enum: ['lectura', 'escritura'] }).default('lectura'),
  activo: integer('activo', { mode: 'boolean' }).default(true),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  uniqueEmail: check('unique_email', sql`LENGTH(${table.email}) > 0`)
}))

export const cuentas = sqliteTable('cuentas', {
  id: text('id').primaryKey(),
  cuentaMaestraId: text('cuenta_maestra_id').notNull().references(() => cuentasMaestras.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  saldo: real('saldo').default(0.00),
  tipo: text('tipo').default('efectivo'),
  color: text('color').default('#3B82F6'),
  icono: text('icono').default('Wallet'),
  activa: integer('activa', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  saldoPositivo: check('saldo_positivo', sql`${table.saldo} >= 0`)
}))

export const categorias = sqliteTable('categorias', {
  id: text('id').primaryKey(),
  cuentaMaestraId: text('cuenta_maestra_id').notNull().references(() => cuentasMaestras.id, { onDelete: 'cascade' }),
  nombre: text('nombre').notNull(),
  tipo: text('tipo', { enum: ['ingreso', 'gasto'] }).notNull(),
  icono: text('icono').notNull().default('Tag'),
  color: text('color').notNull().default('blue'),
  activa: integer('activa', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
})

export const transacciones = sqliteTable('transacciones', {
  id: text('id').primaryKey(),
  cuentaMaestraId: text('cuenta_maestra_id').notNull().references(() => cuentasMaestras.id, { onDelete: 'cascade' }),
  usuarioId: text('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  tipo: text('tipo', { enum: ['ingreso', 'gasto'] }).notNull(),
  monto: real('monto').notNull(),
  categoriaId: text('categoria_id').notNull().references(() => categorias.id),
  cuentaId: text('cuenta_id').notNull().references(() => cuentas.id),
  fecha: text('fecha').notNull(),
  notas: text('notas'),
  fotoComprobanteUrl: text('foto_comprobante_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  montoPositivo: check('monto_positivo', sql`${table.monto} > 0`)
}))

export const cuentasMaestrasRelations = relations(cuentasMaestras, ({ many }) => ({
  usuarios: many(usuarios),
  cuentas: many(cuentas),
  categorias: many(categorias),
  transacciones: many(transacciones)
}))

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  cuentaMaestra: one(cuentasMaestras, {
    fields: [usuarios.cuentaMaestraId],
    references: [cuentasMaestras.id]
  }),
  transacciones: many(transacciones)
}))

export const cuentasRelations = relations(cuentas, ({ one, many }) => ({
  cuentaMaestra: one(cuentasMaestras, {
    fields: [cuentas.cuentaMaestraId],
    references: [cuentasMaestras.id]
  }),
  transacciones: many(transacciones)
}))

export const categoriasRelations = relations(categorias, ({ one, many }) => ({
  cuentaMaestra: one(cuentasMaestras, {
    fields: [categorias.cuentaMaestraId],
    references: [cuentasMaestras.id]
  }),
  transacciones: many(transacciones)
}))

export const transaccionesRelations = relations(transacciones, ({ one }) => ({
  cuentaMaestra: one(cuentasMaestras, {
    fields: [transacciones.cuentaMaestraId],
    references: [cuentasMaestras.id]
  }),
  usuario: one(usuarios, {
    fields: [transacciones.usuarioId],
    references: [usuarios.id]
  }),
  categoria: one(categorias, {
    fields: [transacciones.categoriaId],
    references: [categorias.id]
  }),
  cuenta: one(cuentas, {
    fields: [transacciones.cuentaId],
    references: [cuentas.id]
  })
}))

export type CuentaMaestra = typeof cuentasMaestras.$inferSelect
export type NewCuentaMaestra = typeof cuentasMaestras.$inferInsert
export type Usuario = typeof usuarios.$inferSelect
export type NewUsuario = typeof usuarios.$inferInsert
export type Cuenta = typeof cuentas.$inferSelect
export type NewCuenta = typeof cuentas.$inferInsert
export type Categoria = typeof categorias.$inferSelect
export type NewCategoria = typeof categorias.$inferInsert
export type Transaccion = typeof transacciones.$inferSelect
export type NewTransaccion = typeof transacciones.$inferInsert