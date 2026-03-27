import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import { useUsers } from '../hooks/useUsers';
import { TicketRow } from '../components/TicketRow';
import { AddTicketForm } from '../components/AddTicketForm';
import { Toast } from '../components/Toast';
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
    retryCount,
  } = useTickets();
  const { users } = useUsers();
  const pollRef = useRef<number | undefined>(undefined);
  const refetchRef = useRef(refetch);
  // Tracks the earliest timestamp at which the next poll is allowed to fire.
  // Set to a future time after each failure to implement exponential backoff.
  const nextPollTimeRef = useRef<number>(0);

  useLayoutEffect(() => {
    refetchRef.current = refetch;
  });

  // Recompute the backoff window whenever the consecutive failure count changes.
  // Delay doubles with each failure: 5 s, 10 s, 20 s … capped at 40 s.
  useEffect(() => {
    if (retryCount > 0) {
      const backoffMs = Math.min(5000 * Math.pow(2, retryCount - 1), 40000);
      nextPollTimeRef.current = Date.now() + backoffMs;
    } else {
      nextPollTimeRef.current = 0;
    }
  }, [retryCount]);

  // Poll for fresh data every 5 seconds, skipping ticks that fall inside the
  // backoff window so that repeated failures don't hammer the API.
  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      const now = Date.now();
      if (now >= nextPollTimeRef.current) {
        refetchRef.current(false);
      }
    }, 5000);
    return () => window.clearInterval(pollRef.current);
  }, []);

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

  // When the initial load fails (no data yet), show a blocking error.
  // When a polling call fails but we already have data, show a non-intrusive
  // toast so the ticket list remains fully visible.
  const showBlockingError = error !== null && tickets.length === 0 && !loading;
  const showPollingToast = error !== null && tickets.length > 0;

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
      {showBlockingError && <p role="alert">Error: {error}</p>}
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

      {showPollingToast && <Toast message={`Sync error: ${error}`} />}
    </section>
  );
}
