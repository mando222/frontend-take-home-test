import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GroupTicketCard } from './GroupTicketCard';
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

const mockTicket: Ticket = {
  id: 1,
  description: 'Install a monitor arm',
  assigneeId: 111,
  completed: false,
  groupId: 101,
};

function renderCard(ticket: Ticket, onMoved = vi.fn()) {
  return render(
    <MemoryRouter>
      <GroupTicketCard
        ticket={ticket}
        users={mockUsers}
        groups={mockGroups}
        onMoved={onMoved}
      />
    </MemoryRouter>,
  );
}

describe('GroupTicketCard', () => {
  it('renders description, status and assignee', () => {
    renderCard(mockTicket);

    expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    expect(screen.getByText(/Open/)).toBeInTheDocument();
    expect(screen.getByText(/Victor/)).toBeInTheDocument();
  });

  it('renders a link to the ticket detail page', () => {
    renderCard(mockTicket);

    const link = screen.getByRole('link', { name: /install a monitor arm/i });
    expect(link).toHaveAttribute('href', '/tickets/1');
  });

  it('shows "Unassigned" when assigneeId is null', () => {
    renderCard({ ...mockTicket, assigneeId: null });

    expect(screen.getByText(/Unassigned/)).toBeInTheDocument();
  });

  it('renders Move to dropdown with one option per group plus Ungrouped', () => {
    renderCard(mockTicket);

    const select = screen.getByRole('combobox', { name: /move to/i });
    const options = Array.from(select.querySelectorAll('option'));
    const optionTexts = options.map((o) => o.textContent);

    expect(optionTexts).toContain('Ungrouped');
    expect(optionTexts).toContain('Frontend');
    expect(optionTexts).toContain('Backend');
  });

  it('dropdown reflects the ticket current groupId', () => {
    renderCard(mockTicket);

    const select = screen.getByRole('combobox', { name: /move to/i });
    expect((select as HTMLSelectElement).value).toBe('101');
  });

  it('dropdown shows empty value when ticket is ungrouped', () => {
    renderCard({ ...mockTicket, groupId: null });

    const select = screen.getByRole('combobox', { name: /move to/i });
    expect((select as HTMLSelectElement).value).toBe('');
  });

  it('calls assignTicketToGroup with new groupId and invokes onMoved', async () => {
    const { demoApi } = await import('../lib/fakeApi');
    const assignSpy = vi.spyOn(demoApi, 'assignTicketToGroup');
    const onMoved = vi.fn();

    renderCard(mockTicket, onMoved);

    const select = screen.getByRole('combobox', { name: /move to/i });
    await userEvent.selectOptions(select, '102');

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(1, 102);
      expect(onMoved).toHaveBeenCalled();
    });
  });

  it('calls assignTicketToGroup with null when Ungrouped is selected', async () => {
    const { demoApi } = await import('../lib/fakeApi');
    const assignSpy = vi.spyOn(demoApi, 'assignTicketToGroup');
    const onMoved = vi.fn();

    renderCard(mockTicket, onMoved);

    const select = screen.getByRole('combobox', { name: /move to/i });
    await userEvent.selectOptions(select, '');

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(1, null);
      expect(onMoved).toHaveBeenCalled();
    });
  });
});
