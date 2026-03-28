import { useEffect, useState } from 'react';
import { Ticket } from '../lib/types';
import { demoApi } from '../lib/fakeApi';

export function useTicket(ticketId: number) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    demoApi.getTicket(ticketId, { signal: controller.signal })
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setTicket(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [ticketId]);

  const refetch = () => {
    setLoading(true);
    setError(null);
    demoApi.getTicket(ticketId)
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  return { ticket, setTicket, loading, error, refetch };
}
