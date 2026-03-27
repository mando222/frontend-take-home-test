import { createBrowserRouter, createMemoryRouter, RouteObject } from 'react-router-dom';
import { App } from './App';
import { GroupsPage } from './pages/GroupsPage';
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
        {
          path: 'groups',
          element: <GroupsPage />,
        },
      ],
    },
  ];
}

export function createAppRouter() {
  return createBrowserRouter(buildAppRoutes());
}

export function createTestRouter(initialEntries: string[], initialIndex?: number) {
  return createMemoryRouter(buildAppRoutes(), {
    initialEntries,
    initialIndex,
  });
}
