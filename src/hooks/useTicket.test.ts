import { renderHook, waitFor } from '@testing-library/react';
import { useTicket } from './useTicket';

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

describe('useTicket', () => {
  it('fetches a single ticket by ID', async () => {
    const { result } = renderHook(() => useTicket(1));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.ticket?.id).toBe(1);
    expect(result.current.ticket?.description).toBe('Install a monitor arm');
    expect(result.current.error).toBeNull();
  });

  it('sets error for non-existent ticket', async () => {
    const { result } = renderHook(() => useTicket(999));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.ticket).toBeNull();
    expect(result.current.error).toBe('Ticket not found');
  });

  it('aborts previous request when ticketId changes', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useTicket(id),
      { initialProps: { id: 1 } },
    );

    // Wait for ticket 1 to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    rerender({ id: 2 });

    // Immediately after ticketId changes, ticket should still hold the previous value (not null)
    expect(result.current.ticket?.id).toBe(1);
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should show ticket 2, not ticket 1
    expect(result.current.ticket?.id).toBe(2);
  });

  it('retains previous ticket while new ticket is loading', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useTicket(id),
      { initialProps: { id: 1 } },
    );

    await waitFor(() => {
      expect(result.current.ticket?.id).toBe(1);
    });

    rerender({ id: 2 });

    // ticket should not be null during the in-flight period
    expect(result.current.ticket).not.toBeNull();
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.ticket?.id).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('clears stale ticket and shows error when new ticket request fails', async () => {
    const { result, rerender } = renderHook(
      ({ id }) => useTicket(id),
      { initialProps: { id: 1 } },
    );

    await waitFor(() => {
      expect(result.current.ticket?.id).toBe(1);
    });

    // Navigate to a non-existent ticket
    rerender({ id: 999 });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Ticket not found');
    expect(result.current.ticket).toBeNull();
  });
});
