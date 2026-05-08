import type { RelayClientMessage, RelayServerMessage } from '../types/relay';

interface RelayHandlers {
  onOpen: () => void;
  onClose: () => void;
  onError: (message: string) => void;
  onMessage: (message: RelayServerMessage) => void;
}

class RelayClient {
  private socket: WebSocket | null = null;
  private url: string | null = null;
  private handlers: RelayHandlers | null = null;

  async connect(url: string, handlers: RelayHandlers): Promise<void> {
    this.handlers = handlers;

    if (this.socket?.readyState === WebSocket.OPEN && this.url === url) {
      return;
    }

    if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
      this.socket.close();
    }

    this.url = url;

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      this.socket = socket;

      socket.addEventListener('open', () => {
        this.handlers?.onOpen();
        resolve();
      });

      socket.addEventListener('close', () => {
        this.handlers?.onClose();
      });

      socket.addEventListener('error', () => {
        const message = 'Could not connect to relay websocket.';
        this.handlers?.onError(message);
        reject(new Error(message));
      });

      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data) as RelayServerMessage;
          this.handlers?.onMessage(message);
        } catch {
          this.handlers?.onError('Relay sent an invalid message.');
        }
      });
    });
  }

  send(message: RelayClientMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error('Relay websocket is not connected.');
    }

    this.socket.send(JSON.stringify(message));
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const relayClient = new RelayClient();
