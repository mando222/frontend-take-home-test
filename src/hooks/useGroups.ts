import { useCallback, useEffect, useState } from 'react';
import { Group } from '../lib/types';
import { demoApi } from '../lib/fakeApi';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    demoApi.listGroups({ signal: controller.signal })
      .then((data) => {
        setGroups(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    demoApi.listGroups({ signal: controller.signal })
      .then((data) => {
        setGroups(data);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
      });
  }, []);

  return { groups, loading, error, refetch };
}
