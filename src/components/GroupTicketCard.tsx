import { Link } from 'react-router-dom';
import { Group, Ticket, User } from '../lib/types';
import { demoApi } from '../lib/fakeApi';

type GroupTicketCardProps = {
  ticket: Ticket;
  users: User[];
  groups: Group[];
  onMoved: () => void;
};

export function GroupTicketCard({ ticket, users, groups, onMoved }: GroupTicketCardProps) {
  const assignee = users.find((u) => u.id === ticket.assigneeId);

  const handleGroupChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newGroupId = value === '' ? null : Number(value);
    await demoApi.assignTicketToGroup(ticket.id, newGroupId);
    onMoved();
  };

  return (
    <div className="group-ticket-card">
      <p>
        <strong>
          <Link to={`/tickets/${ticket.id}`}>{ticket.description}</Link>
        </strong>
      </p>
      <p>Status: {ticket.completed ? 'Completed' : 'Open'}</p>
      <p>
        Assignee:{' '}
        {assignee
          ? assignee.name
          : ticket.assigneeId != null
            ? `User ${ticket.assigneeId}`
            : 'Unassigned'}
      </p>
      <label>
        Move to…{' '}
        <select
          value={ticket.groupId ?? ''}
          onChange={handleGroupChange}
          aria-label="Move to group"
        >
          <option value="">Ungrouped</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
