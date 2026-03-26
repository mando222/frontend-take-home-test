import { render, screen, waitFor } from '@testing-library/react';
import { RouterProvider } from 'react-router-dom';
import { createTestRouter } from '../router';

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

describe('TicketsListPage bug fixes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('BUG-3: Polling interval never cleared', () => {
    it('does not accumulate multiple polling intervals', async () => {
      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

      const router = createTestRouter(['/']);
      const { unmount } = render(<RouterProvider router={router} />);

      await waitFor(() => {
        expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
      });

      unmount();

      // clearInterval should have been called at least once during cleanup
      expect(clearIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });
});
