type EventHandler = (data: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private workspaceId: string | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectTimer: any = null;
  private backoff = 1000;
  public isConnected = false;

  connect(workspaceId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.workspaceId = workspaceId;
    const host = window.location.hostname.includes('vercel.app')
      ? 'leeds-flavor-polls-remained.trycloudflare.com'
      : window.location.host;
    const protocol = (window.location.protocol === 'https:' || window.location.hostname.includes('vercel.app')) ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${host}/ws?workspaceId=${workspaceId}`);
    
    this.ws.onopen = () => {
      this.isConnected = true;
      this.backoff = 1000;
      this.emit('connectionChange', true);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.type, data.payload);
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    this.ws.onclose = () => {
      this.isConnected = false;
      this.emit('connectionChange', false);
      this.scheduleReconnect();
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  send(type: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: any) {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.backoff = Math.min(this.backoff * 1.5, 10000);
      if (this.workspaceId) this.connect(this.workspaceId);
    }, this.backoff);
  }
}

export const wsClient = new WebSocketClient();
