import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddTicketForm } from './AddTicketForm';

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

describe('AddTicketForm', () => {
  it('creates a ticket and calls onTicketAdded', async () => {
    const user = userEvent.setup();
    const onAdded = vi.fn();

    render(<AddTicketForm onTicketAdded={onAdded} />);

    const input = screen.getByPlaceholderText(/description/i);
    const button = screen.getByRole('button', { name: /add ticket/i });

    await user.type(input, 'New test ticket');
    await user.click(button);

    await waitFor(() => {
      expect(onAdded).toHaveBeenCalled();
    });

    // Input should be cleared after success
    expect(input).toHaveValue('');
  });

  it('disables button when input is empty', () => {
    render(<AddTicketForm onTicketAdded={vi.fn()} />);

    const button = screen.getByRole('button', { name: /add ticket/i });
    expect(button).toBeDisabled();
  });
});
