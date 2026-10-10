import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { db } from '@moderators/database';
import { wsManager } from './manager';

export default async function setupWebSocket(app: FastifyInstance) {
  app.get('/', { websocket: true }, async (socket, req) => {
    const token = (req.query as any).token;
    
    if (!token) {
      socket.close(1008, 'Unauthorized');
      return;
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as { id: string };
      const user = await db.user.findUnique({ where: { id: decoded.id }, include: { workspaces: true } });
      
      if (!user || user.workspaces.length === 0) {
        socket.close(1008, 'Unauthorized');
        return;
      }

      const workspaceId = user.workspaces[0].workspaceId; // Simplification, normally provided via query
      wsManager.addConnection(workspaceId, socket);

      socket.on('message', (message) => {
        if (message.toString() === 'ping') {
          socket.send('pong');
        }
      });

      socket.on('close', () => {
        wsManager.removeConnection(socket);
      });
      
    } catch (err) {
      socket.close(1008, 'Unauthorized');
    }
  });
}
