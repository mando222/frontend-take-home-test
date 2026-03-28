import { useState } from 'react';
import { Group, Ticket, User } from '../lib/types';
import { DeleteGroupDialog } from './DeleteGroupDialog';
import { GroupTicketCard } from './GroupTicketCard';

type SwimLaneProps = {
  group: Group | null;
  tickets: Ticket[];
  users: User[];
  groups: Group[];
  onDeleteGroup?: (groupId: number, deleteTickets: boolean) => void;
  onTicketMoved?: () => void;
};

export function SwimLane({
  group,
  tickets,
  users,
  groups,
  onDeleteGroup,
  onTicketMoved,
}: SwimLaneProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteConfirm = (deleteTickets: boolean) => {
    setShowDeleteDialog(false);
    if (group && onDeleteGroup) {
      onDeleteGroup(group.id, deleteTickets);
    }
  };

  return (
    <div className="swim-lane">
      <div className="swim-lane-header">
        <span>{group ? group.name : 'Ungrouped'}</span>
        {group && (
          <button type="button" onClick={() => setShowDeleteDialog(true)}>
            Delete group
          </button>
        )}
      </div>

      {showDeleteDialog && group && (
        <DeleteGroupDialog
          group={group}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteDialog(false)}
        />
      )}

      <div className="swim-lane-tickets">
        {tickets.map((ticket) => (
          <GroupTicketCard
            key={ticket.id}
            ticket={ticket}
            users={users}
            groups={groups}
            onMoved={onTicketMoved ?? (() => {})}
          />
        ))}
      </div>
    </div>
  );
}
