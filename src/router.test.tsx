import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { createTestRouter } from './router';

vi.mock('./lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('./lib/fakeApi')>('./lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

describe('app routing', () => {
  it('renders the ticket list route with data', async () => {
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('heading', { name: 'Ticket list' })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });
  });

  it('renders the ticket detail route', async () => {
    const router = createTestRouter(['/tickets/1']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ticket details' })).toBeInTheDocument();
    });
  });

  it('renders the groups route with a Groups heading', async () => {
    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Groups' })).toBeInTheDocument();
    });
  });

  it('renders a Groups navigation link in the app header', () => {
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('link', { name: 'Groups' })).toBeInTheDocument();
  });
});
