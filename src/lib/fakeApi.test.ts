import { createFakeTicketingApi } from './fakeApi';

const baseOptions = {
  delayRangeMs: [0, 0] as [number, number],
  failureRate: 0,
  random: () => 0.5,
};

describe('fake ticketing api', () => {
  it('returns seeded tickets after the configured delay', async () => {
    vi.useFakeTimers();

    const api = createFakeTicketingApi({
      delayRangeMs: [25, 25],
      failureRate: 0,
      random: () => 0.5,
    });

    const response = api.listTickets();

    await vi.advanceTimersByTimeAsync(25);

    await expect(response).resolves.toHaveLength(3);
    vi.useRealTimers();
  });

  it('can be configured to fail deterministically', async () => {
    vi.useFakeTimers();

    const api = createFakeTicketingApi({
      delayRangeMs: [10, 10],
      failureRate: 1,
      random: () => 0,
    });

    const response = api.listUsers();
    const expectation = expect(response).rejects.toThrow('Fake API request failed');

    await vi.advanceTimersByTimeAsync(10);

    await expectation;
    vi.useRealTimers();
  });

  it('supports request cancellation via abort signals', async () => {
    vi.useFakeTimers();

    const api = createFakeTicketingApi({
      delayRangeMs: [50, 50],
      failureRate: 0,
      random: () => 0.5,
    });

    const abortController = new AbortController();
    const response = api.listTickets({ signal: abortController.signal });
    const expectation = expect(response).rejects.toMatchObject({ name: 'AbortError' });

    abortController.abort();
    await vi.runAllTimersAsync();

    await expectation;
    vi.useRealTimers();
  });

  describe('groups', () => {
    it('listGroups returns the 3 seeded groups', async () => {
      const api = createFakeTicketingApi(baseOptions);
      const groups = await api.listGroups();
      expect(groups).toHaveLength(3);
      expect(groups.map((g) => g.name)).toEqual(['Frontend', 'Backend', 'DevOps']);
    });

    it('createGroup persists and returns the new group', async () => {
      const api = createFakeTicketingApi(baseOptions);
      const created = await api.createGroup({ name: 'QA' });
      expect(created.name).toBe('QA');
      expect(typeof created.id).toBe('number');

      const groups = await api.listGroups();
      expect(groups).toHaveLength(4);
      expect(groups.find((g) => g.name === 'QA')).toBeDefined();
    });

    it('deleteGroup with deleteTickets: true removes the group and its tickets', async () => {
      const api = createFakeTicketingApi(baseOptions);

      // Ticket 1 has groupId: 101 (Frontend)
      await api.deleteGroup(101, { deleteTickets: true });

      const groups = await api.listGroups();
      expect(groups.find((g) => g.id === 101)).toBeUndefined();

      const tickets = await api.listTickets();
      expect(tickets.find((t) => t.id === 1)).toBeUndefined();
      // Other tickets remain
      expect(tickets.find((t) => t.id === 2)).toBeDefined();
      expect(tickets.find((t) => t.id === 3)).toBeDefined();
    });

    it('deleteGroup with deleteTickets: false removes the group but ungroups its tickets', async () => {
      const api = createFakeTicketingApi(baseOptions);

      // Ticket 1 has groupId: 101 (Frontend)
      await api.deleteGroup(101, { deleteTickets: false });

      const groups = await api.listGroups();
      expect(groups.find((g) => g.id === 101)).toBeUndefined();

      const tickets = await api.listTickets();
      const ticket1 = tickets.find((t) => t.id === 1);
      expect(ticket1).toBeDefined();
      expect(ticket1?.groupId).toBeNull();
    });

    it('deleteGroup defaults to keeping tickets when deleteTickets is not specified', async () => {
      const api = createFakeTicketingApi(baseOptions);

      await api.deleteGroup(101);

      const tickets = await api.listTickets();
      const ticket1 = tickets.find((t) => t.id === 1);
      expect(ticket1?.groupId).toBeNull();
    });

    it('deleteGroup throws for a non-existent group', async () => {
      const api = createFakeTicketingApi(baseOptions);
      await expect(api.deleteGroup(999)).rejects.toThrow('Group not found');
    });

    it('assignTicketToGroup sets the groupId on the ticket and returns updated ticket', async () => {
      const api = createFakeTicketingApi(baseOptions);

      // Ticket 3 is ungrouped, assign to group 103 (DevOps)
      const updated = await api.assignTicketToGroup(3, 103);
      expect(updated.id).toBe(3);
      expect(updated.groupId).toBe(103);

      const tickets = await api.listTickets();
      expect(tickets.find((t) => t.id === 3)?.groupId).toBe(103);
    });

    it('assignTicketToGroup with null clears the groupId', async () => {
      const api = createFakeTicketingApi(baseOptions);

      // Ticket 1 is in group 101, unassign it
      const updated = await api.assignTicketToGroup(1, null);
      expect(updated.groupId).toBeNull();

      const tickets = await api.listTickets();
      expect(tickets.find((t) => t.id === 1)?.groupId).toBeNull();
    });

    it('assignTicketToGroup throws for a non-existent ticket', async () => {
      const api = createFakeTicketingApi(baseOptions);
      await expect(api.assignTicketToGroup(999, 101)).rejects.toThrow('Ticket not found');
    });

    it('assignTicketToGroup throws for a non-existent groupId', async () => {
      const api = createFakeTicketingApi(baseOptions);
      await expect(api.assignTicketToGroup(1, 999)).rejects.toThrow('Group not found');
    });
  });
});
