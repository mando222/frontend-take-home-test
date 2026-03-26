import { createFakeTicketingApi } from './fakeApi';

describe('fakeApi bug fixes', () => {
  describe('BUG-1: lastId off-by-one causing ID collisions', () => {
    it('creates tickets with IDs that do not collide with seed data', async () => {
      vi.useFakeTimers();

      const api = createFakeTicketingApi({
        delayRangeMs: [0, 0],
        failureRate: 0,
      });

      const createPromise = api.createTicket({ description: 'New ticket' });
      await vi.advanceTimersByTimeAsync(0);
      const newTicket = await createPromise;

      // New ticket ID must be greater than max seed ID (3)
      expect(newTicket.id).toBeGreaterThan(3);

      const listPromise = api.listTickets();
      await vi.advanceTimersByTimeAsync(0);
      const allTickets = await listPromise;

      // All IDs must be unique
      const ids = allTickets.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);

      // Should have 4 tickets total (3 seed + 1 new)
      expect(allTickets).toHaveLength(4);

      vi.useRealTimers();
    });

    it('handles custom seed data with non-sequential IDs', async () => {
      vi.useFakeTimers();

      const api = createFakeTicketingApi({
        seedTickets: [
          { id: 10, description: 'A', assigneeId: null, completed: false },
          { id: 50, description: 'B', assigneeId: null, completed: false },
        ],
        delayRangeMs: [0, 0],
        failureRate: 0,
      });

      const createPromise = api.createTicket({ description: 'C' });
      await vi.advanceTimersByTimeAsync(0);
      const newTicket = await createPromise;

      // Must be > 50 (the max seed ID)
      expect(newTicket.id).toBeGreaterThan(50);

      vi.useRealTimers();
    });
  });
});
