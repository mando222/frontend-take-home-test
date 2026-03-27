import { Link } from 'react-router-dom';
import { Ticket, User } from '../lib/types';

type TicketRowProps = {
  ticket: Ticket;
  users: User[];
  onToggleStatus: (ticketId: number, completed: boolean) => void;
};

export function TicketRow({ ticket, users, onToggleStatus }: TicketRowProps) {
  const assignee = users.find((u) => u.id === ticket.assigneeId);

  return (
    <li>
      <p>
        <strong>{ticket.description}</strong>
      </p>
      <p>Status: {ticket.completed ? 'Completed' : 'Open'}</p>
      <p>Assignee: {assignee ? assignee.name : ticket.assigneeId != null ? `User ${ticket.assigneeId}` : 'Unassigned'}</p>
      <p>
        <button
          type="button"
          onClick={() => onToggleStatus(ticket.id, !ticket.completed)}
        >
          {ticket.completed ? 'Reopen' : 'Complete'}
        </button>{' '}
        <Link to={`/tickets/${ticket.id}`}>View details</Link>
      </p>
    </li>
  );
}
