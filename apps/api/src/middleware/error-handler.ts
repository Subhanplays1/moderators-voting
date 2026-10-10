import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: 'Bad Request',
      message: 'Validation failed',
      details: error.errors
    });
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return reply.code(error.statusCode).send({
      error: error.name || 'Bad Request',
      message: error.message
    });
  }
  
  if (error.code === 'P2025') {
    return reply.code(404).send({
      error: 'Not Found',
      message: 'Record not found'
    });
  }
  
  if (error.code === 'P2002') {
    return reply.code(409).send({
      error: 'Conflict',
      message: 'Unique constraint failed'
    });
  }
  
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
  
  console.error(error);
  
  return reply.code(500).send({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
};
