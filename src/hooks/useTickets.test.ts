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
});
