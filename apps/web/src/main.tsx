import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import AdminDashboard from './routes/admin';
import DriverHome from './routes/driver';
import PackageDetail from './routes/package-detail';
import RootLayout from './routes/root-layout';
import { registerSW } from './pwa';

registerSW();

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'admin', element: <AdminDashboard /> },
      { path: 'driver', element: <DriverHome /> },
      { path: 'packages/:id', element: <PackageDetail /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
  <RouterProvider router={router} />
  </React.StrictMode>
);
