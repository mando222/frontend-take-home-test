import { useCallback, useEffect, useRef, useState } from 'react';
import { Ticket } from '../lib/types';
import { demoApi } from '../lib/fakeApi';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const controllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    if (isInitialMount.current) {
      setLoading(true);
    }

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
        setError(null);
        setRetryCount(0);
        setLoading(false);
        setIsInitialLoad(false);
        isInitialMount.current = false;
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setRetryCount((prev) => prev + 1);
        setLoading(false);
        setIsInitialLoad(false);
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
        setError(null);
        setRetryCount(0);
        if (showLoadingState) {
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setRetryCount((prev) => prev + 1);
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
    retryCount,
    isInitialLoad,
  };
}
