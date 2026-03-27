import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTickets } from '../hooks/useTickets';
import { useUsers } from '../hooks/useUsers';
import { useGroups } from '../hooks/useGroups';
import { useGroupedTickets } from '../hooks/useGroupedTickets';
import { SwimLane } from '../components/SwimLane';
import { CreateGroupForm } from '../components/CreateGroupForm';
import { Toast } from '../components/Toast';
import { demoApi } from '../lib/fakeApi';

export function GroupsPage() {
  const {
    tickets,
    loading: ticketsLoading,
    error: ticketsError,
    search,
    setSearch,
    refetch: refetchTickets,
    retryCount,
  } = useTickets();

  const { users } = useUsers();

  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useGroups();

  const groupedTickets = useGroupedTickets(tickets, groups);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Polling pattern identical to TicketsListPage
  const pollRef = useRef<number | undefined>(undefined);
  // Tracks the earliest timestamp at which the next poll is allowed to fire.
  const nextPollTimeRef = useRef<number>(0);
  const refetchRef = useRef(() => {
    refetchTickets(false);
    refetchGroups();
  });

  useLayoutEffect(() => {
    refetchRef.current = () => {
      refetchTickets(false);
      refetchGroups();
    };
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
        refetchRef.current();
      }
    }, 5000);
    return () => window.clearInterval(pollRef.current);
  }, []);

  const handleDeleteGroup = async (groupId: number, deleteTickets: boolean) => {
    setDeleteError(null);
    try {
      await demoApi.deleteGroup(groupId, { deleteTickets });
      refetchTickets(false);
      refetchGroups();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  const handleTicketMoved = () => {
    refetchTickets(false);
    refetchGroups();
  };

  const isInitialLoading =
    (ticketsLoading || groupsLoading) &&
    tickets.length === 0 &&
    groups.length === 0;

  const error = ticketsError ?? groupsError;
  const hasData = tickets.length > 0 || groups.length > 0;
  const showBlockingError = error !== null && !hasData && !ticketsLoading && !groupsLoading;
  const showPollingToast = error !== null && hasData;

  return (
    <section>
      <h2>Groups</h2>

      <CreateGroupForm onGroupCreated={refetchGroups} />

      <div>
        <label>
          Search{' '}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets"
          />
        </label>
      </div>

      {isInitialLoading && <p>Loading...</p>}
      {showBlockingError && <p role="alert">Error: {error}</p>}
      {deleteError && <p role="alert">Error: {deleteError}</p>}

      <div className="swim-lanes-container">
        {groupedTickets.map(({ group, tickets: groupTickets }) => (
          <SwimLane
            key={group ? group.id : 'ungrouped'}
            group={group}
            tickets={groupTickets}
            users={users}
            groups={groups}
            onDeleteGroup={handleDeleteGroup}
            onTicketMoved={handleTicketMoved}
          />
        ))}
      </div>

      {showPollingToast && <Toast message={`Sync error: ${error}`} />}
    </section>
  );
}
