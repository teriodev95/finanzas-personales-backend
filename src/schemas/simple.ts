import { z } from 'zod'

// Schemas base para responses
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema
  })

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    context: z.any().optional()
  })
})

// Schema para autenticación
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  cuenta_maestra_id: z.string().min(1)
})

export const LoginResponseSchema = SuccessResponseSchema(
  z.object({
    token: z.string(),
    usuario: z.object({
      id: z.string(),
      email: z.string(),
      nombre_completo: z.string().nullable(),
      tipo_permiso: z.enum(['lectura', 'escritura']),
      cuenta_maestra: z.object({
        id: z.string(),
        nombre: z.string()
      })
    })
  })
)

// Tags para organizar la documentación
export const ApiTags = {
  auth: 'Autenticación',
  usuarios: 'Usuarios',
  cuentas: 'Cuentas',
  categorias: 'Categorías',
  transacciones: 'Transacciones',
  reportes: 'Reportes'
}