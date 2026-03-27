import { useCallback, useEffect, useRef, useState } from 'react';
import { Ticket } from '../lib/types';
import { demoApi } from '../lib/fakeApi';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    if (isInitialMount.current) {
      setLoading(true);
    }
    setError(null);

    demoApi.listTickets({ signal: controller.signal })
      .then((data) => {
        // Apply filters client-side after fetch
        const filtered = data.filter((ticket) => {
          const matchesSearch = search === '' ||
            ticket.description.toLowerCase().includes(search.toLowerCase());
          const matchesAssignee = assigneeFilter === null ||
            ticket.assigneeId === assigneeFilter;
          return matchesSearch && matchesAssignee;
        });
        setTickets(filtered);
        setLoading(false);
        isInitialMount.current = false;
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
        isInitialMount.current = false;
      });

    return () => controller.abort();
  }, [search, assigneeFilter]);

  const refetch = useCallback((showLoadingState: boolean = true) => {
    const controller = new AbortController();
    controllerRef.current = controller;

    if (showLoadingState) {
      setLoading(true);
    }
    setError(null);

    demoApi.listTickets({ signal: controller.signal })
      .then((data) => {
        const filtered = data.filter((ticket) => {
          const matchesSearch = search === '' ||
            ticket.description.toLowerCase().includes(search.toLowerCase());
          const matchesAssignee = assigneeFilter === null ||
            ticket.assigneeId === assigneeFilter;
          return matchesSearch && matchesAssignee;
        });
        setTickets(filtered);
        if (showLoadingState) {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        if (showLoadingState) {
          setLoading(false);
        }
      });
  }, [search, assigneeFilter]);

  return {
    tickets,
    setTickets,
    loading,
    error,
    search,
    setSearch,
    assigneeFilter,
    setAssigneeFilter,
    refetch,
  };
}
