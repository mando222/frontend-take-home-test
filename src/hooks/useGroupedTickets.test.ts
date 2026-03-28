import { renderHook } from '@testing-library/react';
import { useGroupedTickets } from './useGroupedTickets';
import type { Group, Ticket } from '../lib/types';

const groups: Group[] = [
  { id: 101, name: 'Frontend' },
  { id: 102, name: 'Backend' },
  { id: 103, name: 'DevOps' },
];

const tickets: Ticket[] = [
  { id: 1, description: 'Install a monitor arm', assigneeId: 111, completed: false, groupId: 101 },
  { id: 2, description: 'Move the desk', assigneeId: 222, completed: false, groupId: 102 },
  { id: 3, description: 'Replace keyboard', assigneeId: null, completed: true, groupId: null },
  { id: 4, description: 'Setup CI', assigneeId: null, completed: false, groupId: 103 },
];

describe('useGroupedTickets', () => {
  it('returns one entry per group plus one for ungrouped', () => {
    const { result } = renderHook(() => useGroupedTickets(tickets, groups));
    // 3 named groups + 1 ungrouped bucket
    expect(result.current).toHaveLength(4);
  });

  it('places ungrouped tickets in the last bucket with group=null', () => {
    const { result } = renderHook(() => useGroupedTickets(tickets, groups));
    const last = result.current[result.current.length - 1];
    expect(last.group).toBeNull();
    expect(last.tickets).toHaveLength(1);
    expect(last.tickets[0].id).toBe(3);
  });

  it('assigns tickets to the correct named group bucket', () => {
    const { result } = renderHook(() => useGroupedTickets(tickets, groups));

    const frontendBucket = result.current.find((b) => b.group?.id === 101);
    expect(frontendBucket).toBeDefined();
    expect(frontendBucket?.tickets).toHaveLength(1);
    expect(frontendBucket?.tickets[0].id).toBe(1);

    const backendBucket = result.current.find((b) => b.group?.id === 102);
    expect(backendBucket).toBeDefined();
    expect(backendBucket?.tickets).toHaveLength(1);
    expect(backendBucket?.tickets[0].id).toBe(2);

    const devopsBucket = result.current.find((b) => b.group?.id === 103);
    expect(devopsBucket).toBeDefined();
    expect(devopsBucket?.tickets).toHaveLength(1);
    expect(devopsBucket?.tickets[0].id).toBe(4);
  });

  it('preserves original group order from the groups array', () => {
    const { result } = renderHook(() => useGroupedTickets(tickets, groups));
    const namedBuckets = result.current.filter((b) => b.group !== null);
    expect(namedBuckets.map((b) => b.group?.id)).toEqual([101, 102, 103]);
  });

  it('returns empty tickets array for groups with no assigned tickets', () => {
    const ticketsWithoutDevOps = tickets.filter((t) => t.groupId !== 103);
    const { result } = renderHook(() => useGroupedTickets(ticketsWithoutDevOps, groups));

    const devopsBucket = result.current.find((b) => b.group?.id === 103);
    expect(devopsBucket?.tickets).toHaveLength(0);
  });

  it('returns only an ungrouped bucket when groups array is empty', () => {
    const { result } = renderHook(() => useGroupedTickets(tickets, []));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].group).toBeNull();
    // All tickets appear in ungrouped bucket when no groups are defined
    // (tickets with groupId set will not match any group bucket)
    expect(result.current[0].tickets).toHaveLength(1); // only ticket 3 has groupId: null
  });

  it('returns empty arrays when both tickets and groups are empty', () => {
    const { result } = renderHook(() => useGroupedTickets([], []));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].group).toBeNull();
    expect(result.current[0].tickets).toHaveLength(0);
  });

  it('ungrouped bucket is always the last entry', () => {
    const { result } = renderHook(() => useGroupedTickets(tickets, groups));
    const lastEntry = result.current[result.current.length - 1];
    expect(lastEntry.group).toBeNull();
  });

  it('returns stable reference when tickets and groups are unchanged', () => {
    const { result, rerender } = renderHook(() => useGroupedTickets(tickets, groups));
    const firstResult = result.current;
    rerender();
    expect(result.current).toBe(firstResult);
  });

  it('recalculates when tickets change', () => {
    let currentTickets = tickets;
    const { result, rerender } = renderHook(() => useGroupedTickets(currentTickets, groups));

    const firstResult = result.current;

    const newTicket: Ticket = {
      id: 5,
      description: 'New ticket',
      assigneeId: null,
      completed: false,
      groupId: 101,
    };
    currentTickets = [...tickets, newTicket];
    rerender();

    expect(result.current).not.toBe(firstResult);
    const frontendBucket = result.current.find((b) => b.group?.id === 101);
    expect(frontendBucket?.tickets).toHaveLength(2);
  });

  it('recalculates when groups change', () => {
    let currentGroups = groups;
    const { result, rerender } = renderHook(() => useGroupedTickets(tickets, currentGroups));

    const firstResult = result.current;

    currentGroups = [...groups, { id: 104, name: 'QA' }];
    rerender();

    expect(result.current).not.toBe(firstResult);
    expect(result.current).toHaveLength(5); // 4 named + 1 ungrouped
  });
});
