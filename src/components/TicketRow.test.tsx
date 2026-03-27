import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TicketRow } from './TicketRow';
import { Ticket, User } from '../lib/types';

const mockUsers: User[] = [
  { id: 111, name: 'Victor' },
  { id: 222, name: 'Priya' },
];

describe('TicketRow', () => {
  it('renders ticket info with assignee name', () => {
    const ticket: Ticket = {
      id: 1,
      description: 'Install a monitor arm',
      assigneeId: 111,
      completed: false,
    };

    render(
      <MemoryRouter>
        <TicketRow
          ticket={ticket}
          users={mockUsers}
          onToggleStatus={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    expect(screen.getByText(/Victor/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument();
  });

  it('shows "Unassigned" when assigneeId is null', () => {
    const ticket: Ticket = {
      id: 3,
      description: 'Replace keyboard',
      assigneeId: null,
      completed: true,
    };

    render(
      <MemoryRouter>
        <TicketRow
          ticket={ticket}
          users={mockUsers}
          onToggleStatus={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Unassigned/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reopen/i })).toBeInTheDocument();
  });

  it('calls onToggleStatus when button clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const ticket: Ticket = {
      id: 1,
      description: 'Test',
      assigneeId: null,
      completed: false,
    };

    render(
      <MemoryRouter>
        <TicketRow ticket={ticket} users={mockUsers} onToggleStatus={onToggle} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /complete/i }));
    expect(onToggle).toHaveBeenCalledWith(1, true);
  });
});
