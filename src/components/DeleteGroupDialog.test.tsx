import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteGroupDialog } from './DeleteGroupDialog';
import { Group } from '../lib/types';

const mockGroup: Group = { id: 101, name: 'Frontend' };

describe('DeleteGroupDialog', () => {
  it('renders group name in heading', () => {
    render(
      <DeleteGroupDialog group={mockGroup} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Frontend');
  });

  it('calls onConfirm(true) when "Delete group & tickets" is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DeleteGroupDialog group={mockGroup} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /delete group & tickets/i }));

    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('calls onConfirm(false) when "Keep tickets" is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <DeleteGroupDialog group={mockGroup} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /keep tickets/i }));

    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <DeleteGroupDialog group={mockGroup} onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <DeleteGroupDialog group={mockGroup} onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    // Click the dialog element (role=dialog) which is the backdrop
    await user.click(screen.getByRole('dialog'));

    expect(onCancel).toHaveBeenCalled();
  });
});
