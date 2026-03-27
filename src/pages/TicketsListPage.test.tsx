import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { createTestRouter } from '../router';
import * as useTicketsModule from '../hooks/useTickets';
import { demoApi } from '../lib/fakeApi';

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});


describe('TicketsListPage', () => {
  it('renders ticket list after loading', async () => {
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    expect(screen.getByText('Move the desk to the new location')).toBeInTheDocument();
    expect(screen.getByText('Replace the office keyboard')).toBeInTheDocument();
  });

  it('filters tickets by search text', async () => {
    const user = userEvent.setup();
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'monitor');

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
      expect(screen.queryByText('Move the desk to the new location')).not.toBeInTheDocument();
    });
  });

  it('filters tickets by assignee', async () => {
    const user = userEvent.setup();
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox', { name: /assignee/i });
    await user.selectOptions(select, '111');

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
      expect(screen.queryByText('Move the desk to the new location')).not.toBeInTheDocument();
    });
  });

  it('does not show loading state when filtering to no results', async () => {
    const user = userEvent.setup();
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'nonexistent-keyword-xyz');

    await waitFor(() => {
      expect(screen.getByText('No tickets match your filters.')).toBeInTheDocument();
    });

    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('does not revert optimistic status update when a polling refetch fires during a pending mutation', async () => {
    // Only fake setInterval/clearInterval so the polling interval is controllable
    // while the fakeApi's setTimeout-based delays fire naturally with real timers.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

    try {
      // Keep the mutation in-flight indefinitely so we can verify state during the window
      vi.spyOn(demoApi, 'updateTicketStatus').mockReturnValueOnce(new Promise(() => {}));

      const user = userEvent.setup();
      const router = createTestRouter(['/']);
      render(<RouterProvider router={router} />);

      // Wait for initial ticket data to load (fakeApi uses real 0ms setTimeout)
      await waitFor(() => {
        expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
      });

      // Ticket 1 ("Install a monitor arm") is open — its button reads "Complete"
      const monitorLi = screen.getByText('Install a monitor arm').closest('li')!;
      await user.click(within(monitorLi).getByRole('button', { name: /^complete$/i }));

      // Optimistic update applied immediately — button should now read "Reopen"
      expect(within(monitorLi).getByRole('button', { name: /^reopen$/i })).toBeInTheDocument();

      // Advance the fake interval clock by 5 seconds to fire the polling setInterval callback.
      // This triggers refetch() → demoApi.listTickets(), which returns stale data
      // (completed: false for ticket 1) via a real 0ms setTimeout.
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Wait for the polling refetch to complete and React to re-render.
      // With the fix, the functional setTickets updater detects ticket 1 has a pending
      // mutation and preserves its optimistic value instead of applying the stale response.
      await waitFor(() => {
        expect(within(monitorLi).getByRole('button', { name: /^reopen$/i })).toBeInTheDocument();
      });

      // Unaffected tickets (no pending mutation) still receive the latest poll data
      expect(screen.getByText('Move the desk to the new location')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('TicketsListPage ��� polling error behaviour', () => {
  const mockTickets = [
    { id: 1, description: 'Install a monitor arm', assigneeId: 111, completed: false },
    { id: 2, description: 'Move the desk to the new location', assigneeId: 222, completed: false },
  ];

  beforeEach(() => {
    vi.spyOn(useTicketsModule, 'useTickets').mockReturnValue({
      tickets: mockTickets,
      setTickets: vi.fn(),
      loading: false,
      error: 'Fake API request failed',
      search: '',
      setSearch: vi.fn(),
      assigneeFilter: null,
      setAssigneeFilter: vi.fn(),
      refetch: vi.fn(),
      retryCount: 1,
      isInitialLoad: false,
      beginMutation: vi.fn(),
      endMutation: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ticket list remains visible when error occurs during polling', () => {
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    // The ticket list (<ul>) must still be in the document
    expect(screen.getByRole('list')).toBeInTheDocument();

    // Individual ticket rows must still be visible
    expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    expect(screen.getByText('Move the desk to the new location')).toBeInTheDocument();

    // A transient polling error must NOT replace the list with a blocking alert paragraph
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
