import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getDb } from './db';

const subscriptions = new Map<string, Set<WebSocket>>();

export type SessionWsEvent =
  | { type: 'chunk'; messageId: string; data: string }
  | { type: 'status'; status: string }
  | { type: 'title'; title: string };

export function broadcastSessionEvent(sessionId: string, event: SessionWsEvent): void {
  const subs = subscriptions.get(sessionId);
  if (!subs || subs.size === 0) return;
  const payload = JSON.stringify(event);
  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function extractCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function isAuthenticated(cookie: string | undefined): boolean {
  const token = extractCookie(cookie, 'flowy_session');
  if (!token) return false;
  const row = getDb()
    .prepare("SELECT token FROM user_sessions WHERE token = ? AND expires_at > datetime('now')")
    .get(token);
  return !!row;
}

export function attachSessionWs(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const match = url.pathname.match(/^\/ws\/sessions\/([^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    if (!isAuthenticated(req.headers.cookie)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const sessionId = match[1];

    wss.handleUpgrade(req, socket, head, (ws) => {
      let subs = subscriptions.get(sessionId);
      if (!subs) {
        subs = new Set();
        subscriptions.set(sessionId, subs);
      }
      subs.add(ws);

      ws.on('close', () => {
        subs!.delete(ws);
        if (subs!.size === 0) subscriptions.delete(sessionId);
      });

      ws.on('error', () => {
        subs!.delete(ws);
        if (subs!.size === 0) subscriptions.delete(sessionId);
      });
    });
  });
}
