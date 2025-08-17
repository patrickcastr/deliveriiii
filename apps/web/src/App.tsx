import React from 'react';
import { io } from 'socket.io-client';
import { Button } from './components/ui/button';

const socket = io(import.meta.env.VITE_API_WS || 'ws://localhost:3000');

export default function App() {
  const [message, setMessage] = React.useState('');
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('hello', (msg: string) => setMessage(msg));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('hello');
    };
  }, []);

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="mb-2 text-2xl font-bold">DeliveryApp</h1>
      <p className="mb-4 text-slate-600">Realtime delivery management — scaffolding</p>
      <div className="mb-4 rounded border bg-white p-4 shadow-sm">
        <p>Socket: {connected ? 'connected' : 'disconnected'}</p>
        <p className="mt-2">Message: {message || '—'}</p>
      </div>
      <Button onClick={() => socket.emit('ping')}>Ping server</Button>
    </div>
  );
}
