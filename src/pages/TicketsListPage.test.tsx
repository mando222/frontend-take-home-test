import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { createTestRouter } from '../router';
import * as useTicketsModule from '../hooks/useTickets';

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
});

describe('TicketsListPage — polling error behaviour', () => {
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
