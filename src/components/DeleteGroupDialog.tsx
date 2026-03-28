import { Group } from '../lib/types';

type DeleteGroupDialogProps = {
  group: Group;
  onConfirm: (deleteTickets: boolean) => void;
  onCancel: () => void;
};

export function DeleteGroupDialog({ group, onConfirm, onCancel }: DeleteGroupDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-group-dialog-title"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '4px',
          padding: '1.5rem',
          minWidth: '320px',
          maxWidth: '480px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-group-dialog-title" style={{ marginTop: 0 }}>
          Delete group &ldquo;{group.name}&rdquo;?
        </h3>
        <p>What should happen to tickets in this group?</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button type="button" onClick={() => onConfirm(true)}>
            Delete group &amp; tickets
          </button>
          <button type="button" onClick={() => onConfirm(false)}>
            Keep tickets (move to ungrouped)
          </button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
