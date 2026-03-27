import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RouterProvider } from 'react-router-dom';
import { createTestRouter } from '../router';
import { useTicket } from '../hooks/useTicket';
import { TicketDetailPage } from './TicketDetailPage';

// Wrap useTicket in a vi.fn() so individual tests can override its return value
// while the real implementation is used by default.
vi.mock('../hooks/useTicket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useTicket')>();
  return {
    useTicket: vi.fn().mockImplementation(actual.useTicket),
  };
});

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

afterEach(() => {
  // Clear call history; the real implementation remains in place via the mock factory
  vi.mocked(useTicket).mockClear();
});

describe('TicketDetailPage', () => {
  it('renders ticket details after loading', async () => {
    const router = createTestRouter(['/tickets/1']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/victor/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to list/i })).toBeInTheDocument();
  });

  it('shows error for non-existent ticket', async () => {
    const router = createTestRouter(['/tickets/999']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/ticket not found/i)).toBeInTheDocument();
    });
  });

  it('does not show "Ticket not found" while loading=true with a stale previous ticket', () => {
    // Simulate the in-flight state that occurs after the ticketId changes but
    // before the new API response resolves: loading=true, ticket=<previous value>.
    // This is the exact state produced by useTicket after removing setTicket(null).
    vi.mocked(useTicket).mockReturnValueOnce({
      loading: true,
      ticket: {
        id: 1,
        description: 'Install a monitor arm',
        assigneeId: 111,
        completed: false,
      },
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/tickets/2']}>
        <Routes>
          <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // While the new ticket is loading, "Ticket not found" must NEVER appear
    expect(screen.queryByText(/ticket not found/i)).not.toBeInTheDocument();
    // The loading indicator should be shown instead
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows "Ticket not found" only when loading=false and ticket is null', () => {
    vi.mocked(useTicket).mockReturnValueOnce({
      loading: false,
      ticket: null,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/tickets/999']}>
        <Routes>
          <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/ticket not found/i)).toBeInTheDocument();
  });

  it('allows assigning a ticket', async () => {
    const user = userEvent.setup();
    const router = createTestRouter(['/tickets/3']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Replace the office keyboard')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox', { name: /assign/i });
    await user.selectOptions(select, '111');

    await waitFor(() => {
      expect(screen.getAllByText(/victor/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
