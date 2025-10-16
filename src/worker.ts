import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { Scalar } from '@scalar/hono-api-reference'

import authRoutes from './routes/auth'
import usuariosRoutes from './routes/usuarios'
import cuentasRoutes from './routes/cuentas'
import categoriasRoutes from './routes/categorias'
import transaccionesRoutes from './routes/transacciones'
import reportesRoutes from './routes/reportes'
import { makeError } from './utils/responses'

const app = new Hono()

app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: ['*'], // En Workers permitir cualquier origen o configurar según necesidades
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

app.get('/', (c) => {
  return c.json({
    message: '🧾 Finanzas Personales API',
    version: '1.1.0',
    documentation: {
      interactive: '/docs',
      openapi_spec: '/doc'
    },
    endpoints: {
      auth: '/auth',
      usuarios: '/usuarios',
      cuentas: '/cuentas',
      categorias: '/categorias',
      transacciones: '/transacciones',
      reportes: '/reportes'
    }
  })
})

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: 0 // En Workers no tenemos process.uptime()
  })
})

app.route('/auth', authRoutes)
app.route('/usuarios', usuariosRoutes)
app.route('/cuentas', cuentasRoutes)
app.route('/categorias', categoriasRoutes)
app.route('/transacciones', transaccionesRoutes)
app.route('/reportes', reportesRoutes)

// Documentación simple en JSON
app.get('/doc', (c) => {
  return c.json({
    openapi: '3.0.0',
    info: {
      title: '🧾 Finanzas Personales API',
      version: '1.1.0',
      description: 'API REST para sistema de finanzas personales con autenticación JWT, control de permisos y reportes avanzados.',
      contact: {
        name: 'TerioDev',
        email: 'terio@example.com'
      }
    },
    servers: [
      {
        url: 'https://finanzas-personales-backend.teriodev95.workers.dev',
        description: 'Servidor de producción en Cloudflare Workers'
      }
    ],
    paths: {
      '/': {
        get: {
          summary: 'Información de la API',
          responses: {
            '200': {
              description: 'Información básica de la API'
            }
          }
        }
      },
      '/health': {
        get: {
          summary: 'Estado de salud del servidor',
          responses: {
            '200': {
              description: 'Servidor funcionando correctamente'
            }
          }
        }
      },
      '/auth/login': {
        post: {
          tags: ['Autenticación'],
          summary: 'Iniciar sesión',
          description: 'Autentica un usuario y devuelve un token JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'cuenta_maestra_id'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                    cuenta_maestra_id: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Login exitoso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      data: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' },
                          usuario: { type: 'object' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/auth/logout': {
        post: {
          tags: ['Autenticación'],
          summary: 'Cerrar sesión',
          responses: {
            '200': {
              description: 'Sesión cerrada exitosamente'
            }
          }
        }
      },
      '/usuarios': {
        get: {
          tags: ['Usuarios'],
          summary: 'Listar usuarios',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Lista de usuarios obtenida correctamente'
            }
          }
        },
        post: {
          tags: ['Usuarios'],
          summary: 'Crear usuario',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    nombre_completo: { type: 'string' },
                    tipo_permiso: { type: 'string', enum: ['lectura', 'escritura'] },
                    foto_url: { type: 'string', format: 'uri' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Usuario creado correctamente'
            }
          }
        }
      },
      '/usuarios/{id}': {
        patch: {
          tags: ['Usuarios'],
          summary: 'Actualizar usuario',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Usuario actualizado correctamente'
            }
          }
        },
        delete: {
          tags: ['Usuarios'],
          summary: 'Eliminar usuario',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Usuario eliminado correctamente'
            }
          }
        }
      },
      '/cuentas': {
        get: {
          tags: ['Cuentas'],
          summary: 'Listar cuentas financieras',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Lista de cuentas obtenida correctamente'
            }
          }
        },
        post: {
          tags: ['Cuentas'],
          summary: 'Crear cuenta financiera',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nombre'],
                  properties: {
                    nombre: { type: 'string' },
                    saldo: { type: 'number', minimum: 0 },
                    tipo: { type: 'string' },
                    color: { type: 'string' },
                    icono: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Cuenta creada correctamente'
            }
          }
        }
      },
      '/cuentas/{id}': {
        get: {
          tags: ['Cuentas'],
          summary: 'Obtener cuenta por ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Cuenta obtenida correctamente'
            }
          }
        },
        patch: {
          tags: ['Cuentas'],
          summary: 'Actualizar cuenta',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Cuenta actualizada correctamente'
            }
          }
        },
        delete: {
          tags: ['Cuentas'],
          summary: 'Eliminar cuenta',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Cuenta eliminada correctamente'
            }
          }
        }
      },
      '/categorias': {
        get: {
          tags: ['Categorías'],
          summary: 'Listar categorías',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'tipo',
              in: 'query',
              schema: { type: 'string', enum: ['ingreso', 'gasto'] }
            }
          ],
          responses: {
            '200': {
              description: 'Lista de categorías obtenida correctamente'
            }
          }
        },
        post: {
          tags: ['Categorías'],
          summary: 'Crear categoría',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nombre', 'tipo'],
                  properties: {
                    nombre: { type: 'string' },
                    tipo: { type: 'string', enum: ['ingreso', 'gasto'] },
                    icono: { type: 'string' },
                    color: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Categoría creada correctamente'
            }
          }
        }
      },
      '/categorias/{id}': {
        get: {
          tags: ['Categorías'],
          summary: 'Obtener categoría por ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Categoría obtenida correctamente'
            }
          }
        },
        patch: {
          tags: ['Categorías'],
          summary: 'Actualizar categoría',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Categoría actualizada correctamente'
            }
          }
        },
        delete: {
          tags: ['Categorías'],
          summary: 'Eliminar categoría',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Categoría eliminada correctamente'
            }
          }
        }
      },
      '/transacciones': {
        get: {
          tags: ['Transacciones'],
          summary: 'Listar transacciones',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 }
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', default: 20 }
            },
            {
              name: 'tipo',
              in: 'query',
              schema: { type: 'string', enum: ['ingreso', 'gasto'] }
            },
            {
              name: 'categoria_id',
              in: 'query',
              schema: { type: 'string' }
            },
            {
              name: 'cuenta_id',
              in: 'query',
              schema: { type: 'string' }
            },
            {
              name: 'fecha_inicio',
              in: 'query',
              schema: { type: 'string', format: 'date' }
            },
            {
              name: 'fecha_fin',
              in: 'query',
              schema: { type: 'string', format: 'date' }
            }
          ],
          responses: {
            '200': {
              description: 'Lista de transacciones obtenida correctamente'
            }
          }
        },
        post: {
          tags: ['Transacciones'],
          summary: 'Crear transacción',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tipo', 'monto', 'categoria_id', 'cuenta_id', 'fecha'],
                  properties: {
                    tipo: { type: 'string', enum: ['ingreso', 'gasto'] },
                    monto: { type: 'number', minimum: 0.01 },
                    categoria_id: { type: 'string' },
                    cuenta_id: { type: 'string' },
                    fecha: { type: 'string', format: 'date' },
                    notas: { type: 'string' },
                    foto_comprobante_url: { type: 'string', format: 'uri' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Transacción creada correctamente'
            }
          }
        }
      },
      '/transacciones/{id}': {
        get: {
          tags: ['Transacciones'],
          summary: 'Obtener transacción por ID',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Transacción obtenida correctamente'
            }
          }
        },
        patch: {
          tags: ['Transacciones'],
          summary: 'Actualizar transacción',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Transacción actualizada correctamente'
            }
          }
        },
        delete: {
          tags: ['Transacciones'],
          summary: 'Eliminar transacción',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Transacción eliminada correctamente'
            }
          }
        }
      },
      '/reportes/resumen': {
        get: {
          tags: ['Reportes'],
          summary: 'Resumen financiero',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'anio',
              in: 'query',
              schema: { type: 'integer' }
            },
            {
              name: 'mes',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 12 }
            }
          ],
          responses: {
            '200': {
              description: 'Resumen financiero obtenido correctamente'
            }
          }
        }
      },
      '/reportes/gastos-categoria': {
        get: {
          tags: ['Reportes'],
          summary: 'Gastos por categoría',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'anio',
              in: 'query',
              schema: { type: 'integer' }
            },
            {
              name: 'mes',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 12 }
            }
          ],
          responses: {
            '200': {
              description: 'Reporte de gastos por categoría obtenido correctamente'
            }
          }
        }
      },
      '/reportes/ingresos-categoria': {
        get: {
          tags: ['Reportes'],
          summary: 'Ingresos por categoría',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'anio',
              in: 'query',
              schema: { type: 'integer' }
            },
            {
              name: 'mes',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 12 }
            }
          ],
          responses: {
            '200': {
              description: 'Reporte de ingresos por categoría obtenido correctamente'
            }
          }
        }
      },
      '/reportes/saldo-cuentas': {
        get: {
          tags: ['Reportes'],
          summary: 'Saldo por cuentas',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Reporte de saldo por cuentas obtenido correctamente'
            }
          }
        }
      },
      '/reportes/evolucion-mensual': {
        get: {
          tags: ['Reportes'],
          summary: 'Evolución mensual',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'anio',
              in: 'query',
              schema: { type: 'integer' }
            }
          ],
          responses: {
            '200': {
              description: 'Evolución mensual obtenida correctamente'
            }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  })
})

// Interfaz de documentación con Scalar
app.get('/docs', Scalar({
  spec: {
    url: '/doc'
  }
}))

app.notFound((c) => {
  return c.json(makeError('ERR_NOT_FOUND', 'Endpoint no encontrado'), 404)
})

app.onError((err, c) => {
  console.error('Error no manejado:', err)
  return c.json(makeError('ERR_INTERNAL', 'Error interno del servidor'), 500)
})

export default app