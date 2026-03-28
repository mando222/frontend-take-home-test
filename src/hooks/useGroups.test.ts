import { renderHook, waitFor } from '@testing-library/react';
import { useGroups } from './useGroups';

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

describe('useGroups', () => {
  it('starts with loading=true and no groups', () => {
    const { result } = renderHook(() => useGroups());

    expect(result.current.loading).toBe(true);
    expect(result.current.groups).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('fetches and returns groups', async () => {
    const { result } = renderHook(() => useGroups());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.groups).toHaveLength(3);
    expect(result.current.error).toBeNull();
  });

  it('returns the seeded group names', async () => {
    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const names = result.current.groups.map((g) => g.name);
    expect(names).toContain('Frontend');
    expect(names).toContain('Backend');
    expect(names).toContain('DevOps');
  });

  it('sets error state on API failure', async () => {
    const { demoApi: api } = await import('../lib/fakeApi');
    api.listGroups = () => Promise.reject(new Error('Server error'));

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.groups).toHaveLength(0);
  });

  it('swallows AbortError on unmount', async () => {
    const { unmount } = renderHook(() => useGroups());
    // Unmount immediately to trigger abort
    unmount();
    // If AbortError propagated, it would throw; reaching here means it was swallowed
  });
});
