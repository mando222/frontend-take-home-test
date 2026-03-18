import { createFakeTicketingApi } from './fakeApi';

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
});
