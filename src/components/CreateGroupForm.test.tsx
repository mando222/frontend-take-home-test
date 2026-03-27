import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateGroupForm } from './CreateGroupForm';

vi.mock('../lib/fakeApi', async () => {
  const actual = await vi.importActual<typeof import('../lib/fakeApi')>('../lib/fakeApi');
  const api = actual.createFakeTicketingApi({
    delayRangeMs: [0, 0],
    failureRate: 0,
  });
  return { ...actual, demoApi: api };
});

describe('CreateGroupForm', () => {
  it('disables submit button when input is empty', () => {
    render(<CreateGroupForm onGroupCreated={vi.fn()} />);

    expect(screen.getByRole('button', { name: /create group/i })).toBeDisabled();
  });

  it('enables submit button when input has text', async () => {
    const user = userEvent.setup();
    render(<CreateGroupForm onGroupCreated={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/group name/i), 'QA');

    expect(screen.getByRole('button', { name: /create group/i })).not.toBeDisabled();
  });

  it('calls onGroupCreated and clears input on successful submit', async () => {
    const user = userEvent.setup();
    const onGroupCreated = vi.fn();

    render(<CreateGroupForm onGroupCreated={onGroupCreated} />);

    const input = screen.getByPlaceholderText(/group name/i);
    await user.type(input, 'QA');
    await user.click(screen.getByRole('button', { name: /create group/i }));

    await waitFor(() => {
      expect(onGroupCreated).toHaveBeenCalled();
    });

    expect(input).toHaveValue('');
  });

  it('shows error message on API failure', async () => {
    const { demoApi } = await import('../lib/fakeApi');
    vi.spyOn(demoApi, 'createGroup').mockRejectedValueOnce(new Error('Failed to create group'));

    const user = userEvent.setup();
    render(<CreateGroupForm onGroupCreated={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/group name/i), 'Broken');
    await user.click(screen.getByRole('button', { name: /create group/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to create group');
    });
  });
});
