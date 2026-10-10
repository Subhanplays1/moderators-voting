import { WebSocket } from 'ws';
import { WSEvent } from './events';

class WebSocketManager {
  private connections: Map<string, Set<WebSocket>> = new Map();

  addConnection(workspaceId: string, socket: WebSocket) {
    if (!this.connections.has(workspaceId)) {
      this.connections.set(workspaceId, new Set());
    }
    this.connections.get(workspaceId)!.add(socket);
  }

  removeConnection(socket: WebSocket) {
    for (const [workspaceId, sockets] of this.connections.entries()) {
      if (sockets.has(socket)) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          this.connections.delete(workspaceId);
        }
        break;
      }
    }
  }

  broadcast(workspaceId: string, event: WSEvent) {
    const sockets = this.connections.get(workspaceId);
    if (sockets) {
      const message = JSON.stringify(event);
      for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(message);
        }
      }
    }
  }

  broadcastAll(event: WSEvent) {
    const message = JSON.stringify(event);
    for (const sockets of this.connections.values()) {
      for (const socket of sockets) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(message);
        }
      }
    }
  }
}

export const wsManager = new WebSocketManager();
