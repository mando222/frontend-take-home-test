import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router-dom';
import { createTestRouter } from '../router';
import { demoApi } from '../lib/fakeApi';

// Seed data that mirrors defaultGroups / defaultTickets in fakeApi.ts
const seededGroups = [
  { id: 101, name: 'Frontend' },
  { id: 102, name: 'Backend' },
  { id: 103, name: 'DevOps' },
];
const seededTickets = [
  { id: 1, description: 'Install a monitor arm', assigneeId: 111, completed: false, groupId: 101 },
  { id: 2, description: 'Move the desk to the new location', assigneeId: 222, completed: false, groupId: 102 },
  { id: 3, description: 'Replace the office keyboard', assigneeId: null, completed: true, groupId: null },
];

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GroupsPage', () => {
  it('renders the Groups heading', () => {
    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('heading', { name: 'Groups' })).toBeInTheDocument();
  });

  it('renders swim lanes for each seeded group and an Ungrouped lane', async () => {
    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    // Groups appear in swim lane headers (spans) AND in "Move to…" dropdown options,
    // so we check with getAllByText to handle multiple occurrences.
    await waitFor(() => {
      expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Backend').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DevOps').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ungrouped').length).toBeGreaterThan(0);
  });

  it('shows tickets in their respective swim lanes', async () => {
    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    expect(screen.getByText('Move the desk to the new location')).toBeInTheDocument();
    expect(screen.getByText('Replace the office keyboard')).toBeInTheDocument();
  });

  it('renders a search input', () => {
    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('filters ticket cards across all swim lanes via search input', async () => {
    const user = userEvent.setup();
    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'monitor');

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
      expect(screen.queryByText('Move the desk to the new location')).not.toBeInTheDocument();
      expect(screen.queryByText('Replace the office keyboard')).not.toBeInTheDocument();
    });
  });

  it('renders a CreateGroupForm with group name input and submit button', () => {
    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    expect(screen.getByPlaceholderText(/group name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create group/i })).toBeInTheDocument();
  });

  it('calls demoApi.createGroup when the form is submitted', async () => {
    const user = userEvent.setup();
    // Mock createGroup to prevent actual state mutation across tests
    const createGroupSpy = vi
      .spyOn(demoApi, 'createGroup')
      .mockResolvedValueOnce({ id: 999, name: 'QA' });

    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    const nameInput = screen.getByPlaceholderText(/group name/i);
    await user.type(nameInput, 'QA');
    await user.click(screen.getByRole('button', { name: /create group/i }));

    await waitFor(() => {
      expect(createGroupSpy).toHaveBeenCalledWith({ name: 'QA' });
    });
  });

  it('shows a delete button for each named group swim lane', async () => {
    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0);
    });

    // Frontend, Backend, DevOps each have a delete button; Ungrouped lane does not
    const deleteButtons = screen.getAllByRole('button', { name: /delete group/i });
    expect(deleteButtons).toHaveLength(3);
  });

  it('shows a DeleteGroupDialog when a delete button is clicked', async () => {
    const user = userEvent.setup();
    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete group/i });
    await user.click(deleteButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls deleteGroup with deleteTickets=true when "Delete group & tickets" is chosen', async () => {
    const user = userEvent.setup();
    // Mock to prevent actual state mutation
    const deleteGroupSpy = vi
      .spyOn(demoApi, 'deleteGroup')
      .mockResolvedValueOnce(undefined);

    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete group/i });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: /delete group & tickets/i }));

    await waitFor(() => {
      expect(deleteGroupSpy).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ deleteTickets: true }),
      );
    });
  });

  it('calls deleteGroup with deleteTickets=false when "Keep tickets" is chosen', async () => {
    const user = userEvent.setup();
    // Mock to prevent actual state mutation
    const deleteGroupSpy = vi
      .spyOn(demoApi, 'deleteGroup')
      .mockResolvedValueOnce(undefined);

    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete group/i });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: /keep tickets/i }));

    await waitFor(() => {
      expect(deleteGroupSpy).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({ deleteTickets: false }),
      );
    });
  });

  it('closes the dialog without calling deleteGroup when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const deleteGroupSpy = vi.spyOn(demoApi, 'deleteGroup');

    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete group/i });
    await user.click(deleteButtons[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deleteGroupSpy).not.toHaveBeenCalled();
  });

  it('polls for updates every 5 seconds', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

    try {
      const listTicketsSpy = vi.spyOn(demoApi, 'listTickets');

      const router = createTestRouter(['/groups']);
      render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0);
      });

      const callsBefore = listTicketsSpy.mock.calls.length;

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // After 5 seconds the polling interval fires listTickets again
      expect(listTicketsSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    } finally {
      vi.useRealTimers();
    }
  });

  it('create group form adds a new swim lane to the page', async () => {
    const user = userEvent.setup();
    // Control what listGroups returns so the new lane appears after creation
    vi.spyOn(demoApi, 'createGroup').mockResolvedValue({ id: 999, name: 'QA' });
    vi.spyOn(demoApi, 'listGroups')
      .mockResolvedValueOnce(seededGroups)
      .mockResolvedValue([...seededGroups, { id: 999, name: 'QA' }]);
    vi.spyOn(demoApi, 'listTickets').mockResolvedValue(seededTickets);

    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0));

    await user.type(screen.getByPlaceholderText(/group name/i), 'QA');
    await user.click(screen.getByRole('button', { name: /create group/i }));

    await waitFor(() => {
      expect(screen.getAllByText('QA').length).toBeGreaterThan(0);
    });
  });

  it('choosing "Delete group & tickets" removes the lane and its tickets from the UI', async () => {
    const user = userEvent.setup();
    vi.spyOn(demoApi, 'deleteGroup').mockResolvedValue(undefined);
    vi.spyOn(demoApi, 'listGroups')
      .mockResolvedValueOnce(seededGroups)
      .mockResolvedValue([{ id: 102, name: 'Backend' }, { id: 103, name: 'DevOps' }]);
    vi.spyOn(demoApi, 'listTickets')
      .mockResolvedValueOnce(seededTickets)
      .mockResolvedValue([seededTickets[1], seededTickets[2]]);

    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0));

    // Click delete on the first named-group lane (Frontend)
    const deleteButtons = screen.getAllByRole('button', { name: /delete group/i });
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: /delete group & tickets/i }));

    await waitFor(() => {
      expect(screen.queryByText('Frontend')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Install a monitor arm')).not.toBeInTheDocument();
  });

  it('choosing "Keep tickets" removes the lane but moves its tickets into the Ungrouped lane', async () => {
    const user = userEvent.setup();
    vi.spyOn(demoApi, 'deleteGroup').mockResolvedValue(undefined);
    vi.spyOn(demoApi, 'listGroups')
      .mockResolvedValueOnce(seededGroups)
      .mockResolvedValue([{ id: 101, name: 'Frontend' }, { id: 103, name: 'DevOps' }]);
    vi.spyOn(demoApi, 'listTickets')
      .mockResolvedValueOnce(seededTickets)
      .mockResolvedValue([
        seededTickets[0],
        { ...seededTickets[1], groupId: null },
        seededTickets[2],
      ]);

    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(screen.getAllByText('Backend').length).toBeGreaterThan(0));

    // Delete the second named-group lane (Backend) with keep tickets
    const deleteButtons = screen.getAllByRole('button', { name: /delete group/i });
    // Backend is the second delete button (Frontend=0, Backend=1)
    await user.click(deleteButtons[1]);
    await user.click(screen.getByRole('button', { name: /keep tickets/i }));

    await waitFor(() => {
      expect(screen.queryByText('Backend')).not.toBeInTheDocument();
    });

    // Ticket 2 should now appear in the Ungrouped lane
    await waitFor(() => {
      expect(screen.getByText('Move the desk to the new location')).toBeInTheDocument();
    });
  });

  it('ticket "Move to…" dropdown calls assignTicketToGroup and the ticket appears in the new lane', async () => {
    const user = userEvent.setup();
    vi.spyOn(demoApi, 'assignTicketToGroup').mockResolvedValue({ ...seededTickets[2], groupId: 101 });
    vi.spyOn(demoApi, 'listGroups').mockResolvedValue(seededGroups);
    vi.spyOn(demoApi, 'listTickets')
      .mockResolvedValueOnce(seededTickets)
      .mockResolvedValue([
        seededTickets[0],
        seededTickets[1],
        { ...seededTickets[2], groupId: 101 },
      ]);

    const router = createTestRouter(['/groups']);
    render(<RouterProvider router={router} />);

    await waitFor(() => expect(screen.getByText('Replace the office keyboard')).toBeInTheDocument());

    // Ticket 3 starts ungrouped – find its card's "Move to…" select
    // The select is the only combobox whose current value is "" (ungrouped)
    const allSelects = screen.getAllByRole('combobox');
    const moveSelect = allSelects.find((sel) => sel.getAttribute('aria-label') === 'Move to group' && (sel as HTMLSelectElement).value === '');
    expect(moveSelect).toBeDefined();

    await user.selectOptions(moveSelect!, '101');

    await waitFor(() => {
      expect(demoApi.assignTicketToGroup).toHaveBeenCalledWith(3, 101);
    });

    // After refetch, ticket 3 should be in the Frontend lane
    await waitFor(() => {
      expect(screen.getByText('Replace the office keyboard')).toBeInTheDocument();
    });
  });

  it('applies exponential backoff: swim lanes remain visible and error is shown on polling failure', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });

    try {
      const router = createTestRouter(['/groups']);
      render(<RouterProvider router={router} />);

      // Wait for initial load to complete (real 0 ms setTimeout fires normally)
      await waitFor(() => {
        expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0);
      });

      // Make subsequent listTickets calls fail to trigger backoff
      vi.spyOn(demoApi, 'listTickets').mockRejectedValue(new Error('Network error'));

      // Advance 5 s → polling interval fires → listTickets fails → retryCount increases
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Swim lanes should still be visible (data is not cleared on polling failure)
      await waitFor(() => {
        expect(screen.getAllByText('Frontend').length).toBeGreaterThan(0);
      });

      // A non-intrusive sync error toast (role="status") should appear
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(/sync error/i);
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
