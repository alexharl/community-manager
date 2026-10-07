import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { DocumentSettingsPage } from './pages/DocumentSettingsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ErrorPage } from './pages/ErrorPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SettingsPage } from './pages/SettingsPage';

// Routen gemäß Spezifikation Kap. 7.2
const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'documents/settings', element: <DocumentSettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
