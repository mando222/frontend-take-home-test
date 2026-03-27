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
});
