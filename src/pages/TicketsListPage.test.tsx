import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

describe('TicketsListPage', () => {
  it('renders ticket list after loading', async () => {
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    expect(screen.getByText('Move the desk to the new location')).toBeInTheDocument();
    expect(screen.getByText('Replace the office keyboard')).toBeInTheDocument();
  });

  it('filters tickets by search text', async () => {
    const user = userEvent.setup();
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'monitor');

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
      expect(screen.queryByText('Move the desk to the new location')).not.toBeInTheDocument();
    });
  });

  it('filters tickets by assignee', async () => {
    const user = userEvent.setup();
    const router = createTestRouter(['/']);
    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox', { name: /assignee/i });
    await user.selectOptions(select, '111');

    await waitFor(() => {
      expect(screen.getByText('Install a monitor arm')).toBeInTheDocument();
      expect(screen.queryByText('Move the desk to the new location')).not.toBeInTheDocument();
    });
  });
});
