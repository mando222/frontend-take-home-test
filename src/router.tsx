import { createBrowserRouter, createMemoryRouter, RouteObject } from 'react-router-dom';
import { App } from './App';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { TicketsListPage } from './pages/TicketsListPage';
export function buildAppRoutes(): RouteObject[] {
  return [
    {
      path: '/',
      element: <App />,
      children: [
        {
          index: true,
          element: <TicketsListPage />,
        },
        {
          path: 'tickets/:ticketId',
          element: <TicketDetailPage />,
        },
      ],
    },
  ];
}

export function createAppRouter() {
  return createBrowserRouter(buildAppRoutes());
}

export function createTestRouter(initialEntries: string[]) {
  return createMemoryRouter(buildAppRoutes(), {
    initialEntries,
  });
}
