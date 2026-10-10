import { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '@moderators/database';

declare module 'fastify' {
  interface FastifyRequest {
    user?: any;
  }
}

export const authenticate = async (req: FastifyRequest, reply: FastifyReply) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
    const user = await db.user.findUnique({ where: { id: decoded.id } });
    
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token' });
    }
    
    req.user = user;
  } catch (error) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token' });
  }
};
