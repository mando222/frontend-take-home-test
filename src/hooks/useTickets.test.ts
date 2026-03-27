import { renderHook, waitFor, act } from '@testing-library/react';
import { useTickets } from './useTickets';

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

describe('useTickets', () => {
  it('fetches and returns tickets', async () => {
    const { result } = renderHook(() => useTickets());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tickets).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it('filters tickets by search text', async () => {
    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSearch('monitor');
    });

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(1);
      expect(result.current.tickets[0].description).toContain('monitor');
    });
  });

  it('does not set loading state when refetch is called with showLoadingState=false', async () => {
    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.refetch(false);
    });

    expect(result.current.loading).toBe(false);

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(3);
    });

    expect(result.current.loading).toBe(false);
  });

  it('filters tickets by assigneeId', async () => {
    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setAssigneeFilter(111);
    });

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(1);
      expect(result.current.tickets[0].assigneeId).toBe(111);
    });
  });

  it('calling refetch does not immediately clear existing error', async () => {
    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Make API fail for the first refetch
    const { demoApi: api } = await import('../lib/fakeApi');
    const originalListTickets = api.listTickets.bind(api);
    api.listTickets = () => Promise.reject(new Error('Transient error'));

    // Trigger a failing refetch to set error state
    act(() => {
      result.current.refetch(false);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Transient error');
    });

    // Restore successful API, then call refetch — this refetch will succeed eventually
    api.listTickets = originalListTickets;

    act(() => {
      result.current.refetch(false);
    });

    // CRITICAL: error must NOT be cleared immediately when refetch starts —
    // it should remain until the in-flight request completes successfully
    expect(result.current.error).toBe('Transient error');

    // Eventually the successful refetch clears the error
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it('does not clear error until next request succeeds', async () => {
    const { result: hookResult } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(hookResult.current.loading).toBe(false);
    });

    // Mock a failing API by overriding demoApi temporarily
    const { demoApi: api } = await import('../lib/fakeApi');
    const originalListTickets = api.listTickets.bind(api);
    api.listTickets = () => Promise.reject(new Error('Network error'));

    // Trigger refetch (simulating a polling call)
    act(() => {
      hookResult.current.refetch(false);
    });

    // Error should appear after failure
    await waitFor(() => {
      expect(hookResult.current.error).toBe('Network error');
    });

    // Restore successful API
    api.listTickets = originalListTickets;

    // Error should NOT be cleared immediately when another refetch starts
    act(() => {
      hookResult.current.refetch(false);
    });

    // Error should only clear after success
    await waitFor(() => {
      expect(hookResult.current.error).toBeNull();
    });
  });

  it('increments retryCount on failure and resets to 0 on success', async () => {
    const { result: hookResult } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(hookResult.current.loading).toBe(false);
    });

    expect(hookResult.current.retryCount).toBe(0);

    const { demoApi: api } = await import('../lib/fakeApi');
    const originalListTickets = api.listTickets.bind(api);
    api.listTickets = () => Promise.reject(new Error('Network error'));

    act(() => {
      hookResult.current.refetch(false);
    });

    await waitFor(() => {
      expect(hookResult.current.retryCount).toBe(1);
    });

    act(() => {
      hookResult.current.refetch(false);
    });

    await waitFor(() => {
      expect(hookResult.current.retryCount).toBe(2);
    });

    // Restore and refetch successfully — retryCount should reset
    api.listTickets = originalListTickets;

    act(() => {
      hookResult.current.refetch(false);
    });

    await waitFor(() => {
      expect(hookResult.current.retryCount).toBe(0);
    });
  });

  it('exposes isInitialLoad as false after first fetch completes', async () => {
    const { result: hookResult } = renderHook(() => useTickets());

    expect(hookResult.current.isInitialLoad).toBe(true);

    await waitFor(() => {
      expect(hookResult.current.loading).toBe(false);
    });

    expect(hookResult.current.isInitialLoad).toBe(false);
  });

  it('refetch has stable identity across re-renders when search and assigneeFilter do not change', async () => {
    const { result, rerender } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const refetchBefore = result.current.refetch;

    // Re-render without changing search or assigneeFilter
    rerender();

    expect(result.current.refetch).toBe(refetchBefore);
  });

  it('does not set loading=true when filtering already-loaded tickets', async () => {
    const { result } = renderHook(() => useTickets());

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change search to a string that matches no tickets
    act(() => {
      result.current.setSearch('xyzzy-no-match-string');
    });

    // loading must never flip back to true during or after the filter change
    expect(result.current.loading).toBe(false);

    // Eventually the hook resolves to an empty ticket list
    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(0);
    });

    // loading must still be false after the filter resolves
    expect(result.current.loading).toBe(false);
  });

  // Tests from PR #27 — verify optimistic update preservation during polling
  it('preserves optimistic state for pending mutations during refetch', async () => {
    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Apply optimistic update for ticket id=1 (completed: false -> true)
    act(() => {
      result.current.setTickets((prev) =>
        prev.map((t) => (t.id === 1 ? { ...t, completed: true } : t)),
      );
      result.current.beginMutation(1);
    });

    // Confirm optimistic state is applied
    expect(result.current.tickets.find((t) => t.id === 1)?.completed).toBe(true);

    // Trigger a refetch (server still has completed: false for ticket 1)
    await act(async () => {
      result.current.refetch();
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    // Optimistic state must be preserved while mutation is pending
    expect(result.current.tickets.find((t) => t.id === 1)?.completed).toBe(true);

    // End mutation, then refetch — server value should now take effect
    act(() => {
      result.current.endMutation(1);
    });

    await act(async () => {
      result.current.refetch();
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    // After endMutation, server value (completed: false) is restored by polling
    expect(result.current.tickets.find((t) => t.id === 1)?.completed).toBe(false);
  });

  it('continues updating non-mutating tickets during refetch with pending mutation', async () => {
    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Mark ticket 1 as mutating and apply optimistic update
    act(() => {
      result.current.setTickets((prev) =>
        prev.map((t) => (t.id === 1 ? { ...t, completed: true } : t)),
      );
      result.current.beginMutation(1);
    });

    // Trigger refetch
    await act(async () => {
      result.current.refetch();
      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    // Ticket 1 keeps optimistic state
    expect(result.current.tickets.find((t) => t.id === 1)?.completed).toBe(true);
    // Other tickets receive normal server values
    expect(result.current.tickets.find((t) => t.id === 2)).toBeDefined();
    expect(result.current.tickets.find((t) => t.id === 3)).toBeDefined();

    act(() => {
      result.current.endMutation(1);
    });
  });

  // Tests from PR #26 — verify refetch uses current filter values
  it('refetch uses current filter values when called asynchronously', async () => {
    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      result.current.setSearch('monitor');
    });

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(1);
      expect(result.current.tickets[0].description).toContain('monitor');
    });

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.tickets).toHaveLength(1);
      expect(result.current.tickets[0].description).toContain('monitor');
    });
  });

  it('refetch reference updates when search changes', async () => {
    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const ref1 = result.current.refetch;

    act(() => {
      result.current.setSearch('new');
    });

    await waitFor(() => {
      expect(result.current.refetch).not.toBe(ref1);
    });
  });

  it('refetch reference updates when assigneeFilter changes', async () => {
    const { result } = renderHook(() => useTickets());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const ref1 = result.current.refetch;

    act(() => {
      result.current.setAssigneeFilter(1);
    });

    await waitFor(() => {
      expect(result.current.refetch).not.toBe(ref1);
    });
  });
});
