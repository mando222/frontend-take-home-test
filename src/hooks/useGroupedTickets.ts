import { useMemo } from 'react';
import { Group, Ticket } from '../lib/types';

export type GroupedTickets = { group: Group | null; tickets: Ticket[] }[];

export function useGroupedTickets(tickets: Ticket[], groups: Group[]): GroupedTickets {
  return useMemo(() => {
    const result: GroupedTickets = groups.map((group) => ({
      group,
      tickets: tickets.filter((ticket) => ticket.groupId === group.id),
    }));

    const ungrouped = tickets.filter((ticket) => ticket.groupId === null);
    result.push({ group: null, tickets: ungrouped });

    return result;
  }, [tickets, groups]);
}
