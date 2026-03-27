import { useEffect, useRef, useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import { useUsers } from '../hooks/useUsers';
import { TicketRow } from '../components/TicketRow';
import { AddTicketForm } from '../components/AddTicketForm';
import { demoApi } from '../lib/fakeApi';

export function TicketsListPage() {
  const {
    tickets,
    setTickets,
    loading,
    error,
    search,
    setSearch,
    assigneeFilter,
    setAssigneeFilter,
    refetch,
  } = useTickets();
  const { users } = useUsers();
  const pollRef = useRef<number | undefined>(undefined);

  // Poll for fresh data every 5 seconds
  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      refetch();
    }, 5000);
    return () => window.clearInterval(pollRef.current);
  }, [refetch]);

  const [toggleError, setToggleError] = useState<string | null>(null);

  const handleToggleStatus = (ticketId: number, completed: boolean) => {
    // Optimistically update the UI immediately
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, completed } : t)),
    );
    setToggleError(null);
    demoApi.updateTicketStatus(ticketId, completed).catch(() => {
      // Rollback on failure
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, completed: !completed } : t)),
      );
      setToggleError(`Failed to update ticket #${ticketId}. Please try again.`);
    });
  };

  return (
    <section>
      <h2>Ticket list</h2>

      <AddTicketForm onTicketAdded={refetch} />

      <div>
        <label>
          Search{' '}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets"
          />
        </label>{' '}
        <label>
          Assignee{' '}
          <select
            value={assigneeFilter ?? ''}
            onChange={(e) =>
              setAssigneeFilter(
                e.target.value ? Number(e.target.value) : null,
              )
            }
          >
            <option value="">All assignees</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && tickets.length === 0 && <p>Loading tickets...</p>}
      {error && <p role="alert">Error: {error}</p>}
      {toggleError && <p role="alert">Error: {toggleError}</p>}

      {!loading && tickets.length === 0 && (
        <p>No tickets match your filters.</p>
      )}

      <ul>
        {tickets.map((ticket) => (
          <TicketRow
            key={ticket.id}
            ticket={ticket}
            users={users}
            onToggleStatus={handleToggleStatus}
          />
        ))}
      </ul>
    </section>
  );
}
