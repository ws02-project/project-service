interface ApiErrorType extends Error {
  statusCode: number;
  isOperational: boolean;
}

const createApiError = (
  statusCode: number,
  message: string,
  isOperational = true,
  stack = '',
): ApiErrorType => {
  const error = new Error(message) as ApiErrorType;
  error.statusCode = statusCode;
  error.isOperational = isOperational;

  if (stack) {
    error.stack = stack;
  } else {
    Error.captureStackTrace(error, createApiError);
  }

  return error;
};

export type { ApiErrorType };
export default createApiError;
