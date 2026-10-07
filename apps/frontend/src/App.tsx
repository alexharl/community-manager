import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { DocumentEditPage } from './pages/DocumentEditPage';
import { DocumentFinalizePage } from './pages/DocumentFinalizePage';
import { DocumentSettingsPage } from './pages/DocumentSettingsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentViewPage } from './pages/DocumentViewPage';
import { ErrorPage } from './pages/ErrorPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { SettingsPage } from './pages/SettingsPage';
import { TemplatePage } from './pages/TemplatePage';

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
      { path: 'documents/templates/:id', element: <TemplatePage /> },
      { path: 'documents/:id', element: <DocumentViewPage /> },
      { path: 'documents/:id/edit', element: <DocumentEditPage /> },
      { path: 'documents/:id/finalize', element: <DocumentFinalizePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
