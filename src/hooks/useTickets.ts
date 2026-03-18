import { useEffect, useRef, useState } from 'react';
import { Ticket } from '../lib/types';
import { demoApi } from '../lib/fakeApi';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<number | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
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
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [search, assigneeFilter]);

  const refetch = () => {
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
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
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });
  };

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
