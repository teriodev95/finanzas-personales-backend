export interface SuccessResponse<T = any> {
  success: true
  data: T
  message: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    context?: any
  }
}

export const successResponse = <T>(data: T, message = 'Operación exitosa'): SuccessResponse<T> => ({
  success: true,
  message,
  data
})

export const makeError = (code: string, message: string, context?: any): ErrorResponse => ({
  success: false,
  error: { code, message, context }
})

export const ErrorCodes = {
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  FORBIDDEN: 'ERR_FORBIDDEN',
  VALIDATION: 'ERR_VALIDATION',
  NOT_FOUND: 'ERR_NOT_FOUND',
  INTERNAL: 'ERR_INTERNAL',
  CONFLICT: 'ERR_CONFLICT'
} as const