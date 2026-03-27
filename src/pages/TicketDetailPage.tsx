import { Link, useParams } from 'react-router-dom';
import { useTicket } from '../hooks/useTicket';
import { useUsers } from '../hooks/useUsers';
import { useGroups } from '../hooks/useGroups';
import { demoApi } from '../lib/fakeApi';
import { useState } from 'react';

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const numericId = Number(ticketId);
  const { ticket, setTicket, loading, error, refetch } = useTicket(numericId);
  const { users } = useUsers();
  const { groups } = useGroups();
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  if (isNaN(numericId)) {
    throw new Error('Invalid ticket ID');
  }

  if (loading) {
    return (
      <section>
        <h2>Ticket details</h2>
        <p>Loading...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h2>Ticket details</h2>
        <p role="alert">Error: {error}</p>
        <p><Link to="/">Back to list</Link></p>
      </section>
    );
  }

  if (!ticket) {
    return (
      <section>
        <h2>Ticket details</h2>
        <p>Ticket not found</p>
        <p><Link to="/">Back to list</Link></p>
      </section>
    );
  }

  const assignee = ticket.assigneeId !== null
    ? users.find((u) => u.id === ticket.assigneeId)
    : null;

  const handleAssign = async (userId: number) => {
    setMutating(true);
    setMutationError(null);
    try {
      await demoApi.assignTicket(ticket.id, userId);
      refetch();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to assign');
    } finally {
      setMutating(false);
    }
  };

  const handleAssignGroup = (groupId: number | null) => {
    const previousGroupId = ticket.groupId;
    // Optimistically update the UI immediately
    setTicket((prev) => prev ? { ...prev, groupId } : prev);
    setMutating(true);
    setMutationError(null);
    demoApi.assignTicketToGroup(ticket.id, groupId)
      .then(() => {
        setMutating(false);
      })
      .catch((err) => {
        // Rollback on failure
        setTicket((prev) => prev ? { ...prev, groupId: previousGroupId } : prev);
        setMutationError(err instanceof Error ? err.message : 'Failed to assign group');
        setMutating(false);
      });
  };

  const handleToggleStatus = async () => {
    setMutating(true);
    setMutationError(null);
    try {
      await demoApi.updateTicketStatus(ticket.id, !ticket.completed);
      refetch();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setMutating(false);
    }
  };

  return (
    <section>
      <h2>Ticket details</h2>
      <dl>
        <dt>Description</dt>
        <dd>{ticket.description}</dd>
        <dt>Status</dt>
        <dd>{ticket.completed ? 'Completed' : 'Open'}</dd>
        <dt>Assignee</dt>
        <dd>{assignee ? assignee.name : 'Unassigned'}</dd>
      </dl>

      <div>
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={mutating}
        >
          {ticket.completed ? 'Reopen' : 'Complete'}
        </button>{' '}
        <label>
          Assign to{' '}
          <select
            value={ticket.assigneeId ?? ''}
            onChange={(e) => {
              if (e.target.value) handleAssign(Number(e.target.value));
            }}
            disabled={mutating}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>{' '}
        <label>
          Group{' '}
          <select
            value={ticket.groupId ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              handleAssignGroup(val ? Number(val) : null);
            }}
            disabled={mutating}
          >
            <option value="">Ungrouped</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {mutationError && <p role="alert">{mutationError}</p>}

      <p><Link to="/">Back to list</Link></p>
    </section>
  );
}
