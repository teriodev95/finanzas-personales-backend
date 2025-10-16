import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

// Variable global para la instancia de la base de datos
let db: ReturnType<typeof drizzle> | null = null

// Función para inicializar la base de datos
export function initializeDb(env?: { DATABASE_URL?: string; DATABASE_AUTH_TOKEN?: string }) {
  let databaseUrl: string
  let authToken: string

  if (env && env.DATABASE_URL && env.DATABASE_AUTH_TOKEN) {
    // Para Cloudflare Workers - usar env variables del contexto
    databaseUrl = env.DATABASE_URL
    authToken = env.DATABASE_AUTH_TOKEN
  } else if (typeof process !== 'undefined' && process.env) {
    // Para desarrollo local - usar process.env
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required')
    }
    if (!process.env.DATABASE_AUTH_TOKEN) {
      throw new Error('DATABASE_AUTH_TOKEN environment variable is required')
    }
    databaseUrl = process.env.DATABASE_URL
    authToken = process.env.DATABASE_AUTH_TOKEN
  } else {
    throw new Error('Database environment variables not available')
  }

  const client = createClient({
    url: databaseUrl,
    authToken: authToken,
  })

  db = drizzle(client, { schema })
  return db
}

// Función para obtener la instancia de la base de datos
export function getDb() {
  if (!db) {
    // Auto-inicializar para desarrollo local
    if (typeof process !== 'undefined' && process.env) {
      return initializeDb()
    }
    throw new Error('Database not initialized. Call initializeDb() first.')
  }
  return db
}

// Para compatibilidad con imports existentes - desarrollo local
if (typeof process !== 'undefined' && process.env && process.env.DATABASE_URL && process.env.DATABASE_AUTH_TOKEN) {
  try {
    initializeDb()
  } catch (error) {
    // En Workers, esto puede fallar y está bien
    console.warn('Could not initialize database automatically:', error)
  }
}

// Export para compatibilidad con código existente
export { db }