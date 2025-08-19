import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import AdminDashboard from './routes/admin';
import AdminRequirements from './routes/admin-requirements';
import DriverHome from './routes/driver';
import PackageDetail from './routes/package-detail';
import PackagesPage from './routes/packages';
import RootLayout from './routes/root-layout';
import AdminItems from './routes/admin-items';
import TemplatesCenter from './routes/templates';
import { registerSW } from './pwa';
import { ToastProvider } from './components/ui/toast';

registerSW();

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
  { path: 'admin', element: <AdminDashboard /> },
  { path: 'packages', element: <PackagesPage /> },
  { path: 'admin-requirements', element: <AdminRequirements /> },
  { path: 'driver', element: <DriverHome /> },
  { path: 'admin/items', element: <AdminItems /> },
  { path: 'templates', element: <TemplatesCenter /> },
      { path: 'packages/:id', element: <PackageDetail /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  </React.StrictMode>
);
