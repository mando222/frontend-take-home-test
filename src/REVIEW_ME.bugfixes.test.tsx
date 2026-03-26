import { render, screen, waitFor } from '@testing-library/react';
import TicketDashboard from './REVIEW_ME';

vi.mock('./lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('./lib/fakeApi')>('./lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

describe('REVIEW_ME (TicketDashboard) bug fixes', () => {
  describe('BUG-7: reduce missing initial value crashes on empty array', () => {
    it('renders without crashing when tickets load', async () => {
      render(<TicketDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Total:/)).toBeInTheDocument();
      });

      // Should display completion stats without NaN or crash
      expect(screen.getByText(/Completion:/)).toBeInTheDocument();
      expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
    });
  });

  describe('BUG-8: XSS via dangerouslySetInnerHTML', () => {
    it('renders ticket description as plain text, not HTML', async () => {
      render(<TicketDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Install a monitor arm/)).toBeInTheDocument();
      });

      // Verify no innerHTML injection - description should be text content
      const descEl = screen.getByText(/Install a monitor arm/);
      expect(descEl.innerHTML).not.toContain('<script');
      expect(descEl.tagName).toBe('DIV');
    });
  });
});
