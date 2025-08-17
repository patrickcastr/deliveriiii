import type { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import cookie from 'cookie';
import { verifyAccess } from './auth';
import { wsConnections, wsConnectionsTotal } from './metrics';

type EventName =
  | 'package.created'
  | 'package.updated'
  | 'package.deleted'
  | 'scan.applied'
  | 'status.updated'
  | 'location.changed'
  | 'delivery.completed';

const roomAdmin = 'admin';
const roomDriver = (driverId: string) => `driver:${driverId}`;
const roomPackage = (pkgId: string) => `package:${pkgId}`;

let ioRt: ReturnType<Server['of']> | null = null;

export function initRealtime(io: Server, redisUrl: string) {
  // Redis adapter for horizontal scale
  const pub = new Redis(redisUrl);
  const sub = new Redis(redisUrl);

  ioRt = io.of('/rt');
  (ioRt as any).adapter(createAdapter(pub, sub));

  // Heartbeat and buffer limits are set at Server creation in index.ts

  ioRt.on('connection', (socket: Socket) => {
  wsConnectionsTotal.labels('/rt').inc();
  wsConnections.labels('/rt').inc();
    // Authenticate from cookies (access_token)
    try {
      const cookies = cookie.parse(socket.request.headers.cookie || '');
      const token = cookies['access_token'];
      if (!token) {
        socket.emit('error', 'unauthorized');
        socket.disconnect(true);
        return;
      }
      const user = verifyAccess(token);
      (socket.data as any).user = user;

      // Auto-join role rooms
      if (user.role === 'admin' || user.role === 'manager') {
        socket.join(roomAdmin);
      }
      if (user.role === 'driver') {
        socket.join(roomDriver(user.id));
      }
    } catch {
      socket.emit('error', 'unauthorized');
      socket.disconnect(true);
      return;
    }

    // Client-initiated joins
    socket.on('join:package', (pkgId: string) => {
      if (!pkgId) return;
      socket.join(roomPackage(pkgId));
    });

    // Heartbeat
    socket.on('client:ping', () => {
      socket.emit('server:pong', Date.now());
    });

    socket.on('disconnect', () => {
      wsConnections.labels('/rt').dec();
    });
  });
}

export function emitPackageEvent(
  packageId: string,
  event: EventName,
  payload: Record<string, unknown> = {},
  driverId?: string | null,
) {
  if (!ioRt) return;
  const targets = [roomPackage(packageId), roomAdmin];
  if (driverId) targets.push(roomDriver(driverId));

  const emitter = (ioRt as any).to(targets);
  const isHighFreq = event === 'status.updated' || event === 'location.changed' || event === 'scan.applied';
  const send = isHighFreq ? emitter.volatile.emit.bind(emitter) : emitter.emit.bind(emitter);
  send(event, { packageId, ...payload, ts: new Date().toISOString() });
}
