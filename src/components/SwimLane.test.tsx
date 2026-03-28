import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SwimLane } from './SwimLane';
import { Group, Ticket, User } from '../lib/types';

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

const mockUsers: User[] = [
  { id: 111, name: 'Victor' },
  { id: 222, name: 'Priya' },
];

const mockGroups: Group[] = [
  { id: 101, name: 'Frontend' },
  { id: 102, name: 'Backend' },
];

const mockGroup: Group = { id: 101, name: 'Frontend' };

const mockTickets: Ticket[] = [
  {
    id: 1,
    description: 'Install a monitor arm',
    assigneeId: 111,
    completed: false,
    groupId: 101,
  },
  {
    id: 2,
    description: 'Move the desk',
    assigneeId: 222,
    completed: true,
    groupId: 101,
  },
];

function renderLane(
  group: Group | null,
  tickets: Ticket[] = [],
  onDeleteGroup = vi.fn(),
) {
  return render(
    <MemoryRouter>
      <SwimLane
        group={group}
        tickets={tickets}
        users={mockUsers}
        groups={mockGroups}
        onDeleteGroup={onDeleteGroup}
        onTicketMoved={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe('SwimLane', () => {
  it('renders group name header for a named group', () => {
    renderLane(mockGroup);

    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('renders "Ungrouped" header when group is null', () => {
    renderLane(null);

    expect(screen.getByText('Ungrouped')).toBeInTheDocument();
  });

  it('shows delete button for a named group', () => {
    renderLane(mockGroup);

    expect(screen.getByRole('button', { name: /delete group/i })).toBeInTheDocument();
  });

  it('does not show delete button for the ungrouped lane', () => {
    renderLane(null);

    expect(
      screen.queryByRole('button', { name: /delete group/i }),
    ).not.toBeInTheDocument();
  });

  it('renders all ticket descriptions', () => {
    renderLane(mockGroup, mockTickets);

    expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    expect(screen.getByText('Move the desk')).toBeInTheDocument();
  });

  it('clicking delete button shows DeleteGroupDialog', async () => {
    const user = userEvent.setup();
    renderLane(mockGroup, []);

    await user.click(screen.getByRole('button', { name: /delete group/i }));

    // Dialog heading should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Frontend');
  });

  it('calls onDeleteGroup with deleteTickets=true when confirmed', async () => {
    const user = userEvent.setup();
    const onDeleteGroup = vi.fn();

    renderLane(mockGroup, [], onDeleteGroup);

    await user.click(screen.getByRole('button', { name: /delete group/i }));
    await user.click(screen.getByRole('button', { name: /delete group & tickets/i }));

    expect(onDeleteGroup).toHaveBeenCalledWith(101, true);
  });

  it('calls onDeleteGroup with deleteTickets=false when keep tickets is chosen', async () => {
    const user = userEvent.setup();
    const onDeleteGroup = vi.fn();

    renderLane(mockGroup, [], onDeleteGroup);

    await user.click(screen.getByRole('button', { name: /delete group/i }));
    await user.click(screen.getByRole('button', { name: /keep tickets/i }));

    expect(onDeleteGroup).toHaveBeenCalledWith(101, false);
  });

  it('closes dialog when cancel is clicked', async () => {
    const user = userEvent.setup();

    renderLane(mockGroup, []);

    await user.click(screen.getByRole('button', { name: /delete group/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
