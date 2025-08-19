import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell } from '../components/AppShell';

export default function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
