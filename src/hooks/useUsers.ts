import { useEffect, useState } from 'react';
import { User } from '../lib/types';
import { demoApi } from '../lib/fakeApi';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    demoApi.listUsers({ signal: controller.signal })
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { users, loading, error };
}
