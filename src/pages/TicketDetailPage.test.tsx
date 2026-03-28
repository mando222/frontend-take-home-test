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
  // Clear call history; the real implementation remains in place via the mock factory.
  // We deliberately do NOT call vi.restoreAllMocks() here because vi.fn() mocks (like useTicket)
  // would be reset to return undefined, breaking subsequent tests.
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
        groupId: null,
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

  it('renders a group selector dropdown with the current group selected', async () => {
    // Ticket 1 has groupId: 101 (Frontend)
    const router = createTestRouter(['/tickets/1']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    const groupSelect = screen.getByRole('combobox', { name: /group/i });
    expect(groupSelect).toBeInTheDocument();
    // The select value corresponds to the ticket's groupId (101 = Frontend)
    expect(groupSelect).toHaveValue('101');
  });

  it('calls assignTicketToGroup with the selected groupId when group is changed', async () => {
    const user = userEvent.setup();
    const { demoApi: api } = await import('../lib/fakeApi');
    const assignSpy = vi.spyOn(api, 'assignTicketToGroup');

    // Ticket 3 is ungrouped (groupId: null)
    const router = createTestRouter(['/tickets/3']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Replace the office keyboard')).toBeInTheDocument();
    });

    const groupSelect = screen.getByRole('combobox', { name: /group/i });
    // Assign ticket 3 to Frontend (id 101)
    await user.selectOptions(groupSelect, '101');

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(3, 101);
    });
  });

  it('calls assignTicketToGroup with null when "Ungrouped" is selected', async () => {
    const user = userEvent.setup();
    const { demoApi: api } = await import('../lib/fakeApi');
    const assignSpy = vi.spyOn(api, 'assignTicketToGroup');

    // Ticket 1 is assigned to Frontend (groupId: 101)
    const router = createTestRouter(['/tickets/1']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    const groupSelect = screen.getByRole('combobox', { name: /group/i });
    // Select the "Ungrouped" option (empty value)
    await user.selectOptions(groupSelect, '');

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(1, null);
    });
  });

  it('applies group assignment optimistically before API resolves', async () => {
    const user = userEvent.setup();
    const { demoApi: api } = await import('../lib/fakeApi');

    // Intercept the call and resolve it manually so we can check UI state before resolution
    let resolveAssign!: (ticket: import('../lib/types').Ticket) => void;
    vi.spyOn(api, 'assignTicketToGroup').mockReturnValueOnce(
      new Promise<import('../lib/types').Ticket>((resolve) => { resolveAssign = resolve; }),
    );

    // Ticket 2 has groupId: 102 (Backend); previous tests don't mutate this ticket's group
    const router = createTestRouter(['/tickets/2']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Move the desk to the new location')).toBeInTheDocument();
    });

    const groupSelect = screen.getByRole('combobox', { name: /group/i });
    expect(groupSelect).toHaveValue('102');

    // Change group to DevOps (103) — optimistic update should apply immediately
    await user.selectOptions(groupSelect, '103');

    // Optimistic update: the select should already show the new value before the API resolves
    expect(groupSelect).toHaveValue('103');

    // Now resolve the API call
    resolveAssign({
      id: 2,
      description: 'Move the desk to the new location',
      assigneeId: 222,
      completed: false,
      groupId: 103,
    });

    // UI should remain on the new value after resolution
    await waitFor(() => {
      expect(groupSelect).toHaveValue('103');
    });
  });

  it('rolls back optimistic group assignment on API failure', async () => {
    const user = userEvent.setup();
    const { demoApi: api } = await import('../lib/fakeApi');

    // Make assignTicketToGroup reject
    vi.spyOn(api, 'assignTicketToGroup').mockRejectedValueOnce(
      new Error('Server error'),
    );

    // Ticket 2 has groupId: 102 (Backend); use it to avoid state contamination from prior tests
    const router = createTestRouter(['/tickets/2']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Move the desk to the new location')).toBeInTheDocument();
    });

    const groupSelect = screen.getByRole('combobox', { name: /group/i });
    expect(groupSelect).toHaveValue('102');

    // Attempt to change group to Frontend (101) — API will fail
    await user.selectOptions(groupSelect, '101');

    // After failure, the value should roll back to 102 (Backend)
    await waitFor(() => {
      expect(groupSelect).toHaveValue('102');
    });

    // An error message should be displayed
    expect(screen.getByRole('alert')).toHaveTextContent('Server error');
  });
});
