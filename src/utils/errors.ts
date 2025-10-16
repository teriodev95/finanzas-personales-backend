export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public context?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: any) {
    super('ERR_VALIDATION', message, 400, context)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Usuario sin sesión válida') {
    super('ERR_UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Permisos insuficientes') {
    super('ERR_FORBIDDEN', message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super('ERR_NOT_FOUND', message, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: any) {
    super('ERR_CONFLICT', message, 409, context)
  }
}