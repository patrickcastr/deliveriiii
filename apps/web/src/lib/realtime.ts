import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useSyncExternalStore } from 'react';

let socket: Socket | null = null;
let subscribers = new Set<() => void>();
const state = {
  connected: false,
  lastPong: 0,
  packages: new Map<string, any>(),
};

function emitChange() {
  subscribers.forEach((fn) => fn());
}

export function getSocket(baseUrl = '') {
  if (socket) return socket;
  socket = io(`${baseUrl}/rt`, {
    withCredentials: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });

  socket.on('connect', () => {
    state.connected = true;
    emitChange();
  });
  socket.on('disconnect', () => {
    state.connected = false;
    emitChange();
  });
  socket.on('server:pong', (ts: number) => {
    state.lastPong = ts;
    emitChange();
  });

  const applyPkg = (pkgId: string, patch: any) => {
    const curr = state.packages.get(pkgId) || {};
    state.packages.set(pkgId, { ...curr, ...patch });
    emitChange();
  };
  socket.on('package.created', (e: any) => applyPkg(e.packageId, e));
  socket.on('package.updated', (e: any) => applyPkg(e.packageId, e));
  socket.on('package.deleted', (e: any) => {
    state.packages.delete(e.packageId);
    emitChange();
  });
  socket.on('scan.applied', (e: any) => applyPkg(e.packageId, { lastScan: e }));
  socket.on('status.updated', (e: any) => applyPkg(e.packageId, { status: e.status }));
  socket.on('location.changed', (e: any) => applyPkg(e.packageId, { location: e.gps }));
  socket.on('delivery.completed', (e: any) => applyPkg(e.packageId, { delivered: true }));

  // heartbeat
  setInterval(() => {
    if (socket?.connected) socket.emit('client:ping');
  }, 15000);

  return socket;
}

export function useRealtimePackage(packageId: string, baseUrl = '') {
  const s = useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      const sock = getSocket(baseUrl);
      sock.emit('join:package', packageId);
      return () => subscribers.delete(cb);
    },
    () => ({
      connected: state.connected,
      lastPong: state.lastPong,
      data: state.packages.get(packageId),
    }),
  );
  return s;
}

export function useRealtimeRoleRoom(role: 'admin' | 'manager' | 'driver' | 'viewer', id?: string, baseUrl = '') {
  const ref = useRef<{ joined: boolean }>({ joined: false });
  useEffect(() => {
    const sock = getSocket(baseUrl);
    if (role === 'driver' && id && !ref.current.joined) {
      // driver joins own implicit room via server auto-join after auth; no action needed
      ref.current.joined = true;
    }
  }, [role, id, baseUrl]);
  const s = useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    () => ({ connected: state.connected, lastPong: state.lastPong }),
  );
  return s;
}
