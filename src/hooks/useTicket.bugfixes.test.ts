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

describe('useTicket bug fixes', () => {
  describe('BUG-2: AbortController created outside useEffect', () => {
    it('does not abort its own request on re-render', async () => {
      const { result } = renderHook(() => useTicket(1));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should successfully load ticket without the controller
      // being recreated and aborting its own request
      expect(result.current.ticket).not.toBeNull();
      expect(result.current.ticket?.id).toBe(1);
      expect(result.current.error).toBeNull();
    });

    it('properly aborts previous request when ticketId changes rapidly', async () => {
      const { result, rerender } = renderHook(
        ({ id }) => useTicket(id),
        { initialProps: { id: 1 } },
      );

      // Rapidly change ticketId multiple times
      rerender({ id: 2 });
      rerender({ id: 3 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should show the last requested ticket, not an earlier one
      expect(result.current.ticket?.id).toBe(3);
    });
  });
});
