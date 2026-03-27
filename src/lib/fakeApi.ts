import { CreateGroupInput, CreateTicketInput, Group, Ticket, User } from './types';

type FakeApiOptions = {
  seedUsers?: User[];
  seedTickets?: Ticket[];
  seedGroups?: Group[];
  delayRangeMs?: [number, number];
  failureRate?: number;
  random?: () => number;
};

type RequestOptions = {
  signal?: AbortSignal;
};

export type TicketingApi = {
  listUsers(options?: RequestOptions): Promise<User[]>;
  listTickets(options?: RequestOptions): Promise<Ticket[]>;
  getTicket(ticketId: number, options?: RequestOptions): Promise<Ticket>;
  createTicket(input: CreateTicketInput, options?: RequestOptions): Promise<Ticket>;
  assignTicket(ticketId: number, userId: number, options?: RequestOptions): Promise<Ticket>;
  updateTicketStatus(
    ticketId: number,
    completed: boolean,
    options?: RequestOptions,
  ): Promise<Ticket>;
  listGroups(options?: RequestOptions): Promise<Group[]>;
  createGroup(input: CreateGroupInput, options?: RequestOptions): Promise<Group>;
  deleteGroup(
    groupId: number,
    options?: RequestOptions & { deleteTickets?: boolean },
  ): Promise<void>;
  assignTicketToGroup(
    ticketId: number,
    groupId: number | null,
    options?: RequestOptions,
  ): Promise<Ticket>;
};

const defaultUsers: User[] = [{ id: 111, name: 'Victor' }, { id: 222, name: 'Priya' }];

const defaultGroups: Group[] = [
  { id: 101, name: 'Frontend' },
  { id: 102, name: 'Backend' },
  { id: 103, name: 'DevOps' },
];

const defaultTickets: Ticket[] = [
  {
    id: 1,
    description: 'Install a monitor arm',
    assigneeId: 111,
    completed: false,
    groupId: 101,
  },
  {
    id: 2,
    description: 'Move the desk to the new location',
    assigneeId: 222,
    completed: false,
    groupId: 102,
  },
  {
    id: 3,
    description: 'Replace the office keyboard',
    assigneeId: null,
    completed: true,
    groupId: null,
  },
];

function cloneTicket(ticket: Ticket): Ticket {
  return { ...ticket };
}

function cloneUser(user: User): User {
  return { ...user };
}

function cloneGroup(group: Group): Group {
  return { ...group };
}

function createError(message: string) {
  return new Error(message);
}

function createAbortError() {
  return new DOMException('The operation was aborted', 'AbortError');
}

export function createFakeTicketingApi({
  seedUsers = defaultUsers,
  seedTickets = defaultTickets,
  seedGroups = defaultGroups,
  delayRangeMs = [150, 1100],
  failureRate = 0.08,
  random = Math.random,
}: FakeApiOptions = {}): TicketingApi {
  const users = seedUsers.map(cloneUser);
  const tickets = seedTickets.map(cloneTicket);
  const groups = seedGroups.map(cloneGroup);
  let lastId = 2;
  let lastGroupId = Math.max(...seedGroups.map((g) => g.id), 100);

  const nextDelay = () => {
    const [minDelay, maxDelay] = delayRangeMs;
    return Math.round(minDelay + (maxDelay - minDelay) * random());
  };

  const shouldFail = () => random() < failureRate;

  async function withDelay<T>(
    factory: () => T,
    { signal }: RequestOptions = {},
  ): Promise<T> {
    if (signal?.aborted) {
      throw createAbortError();
    }

    await new Promise<void>((resolve, reject) => {
      const timerId = window.setTimeout(() => {
        signal?.removeEventListener('abort', handleAbort);
        resolve();
      }, nextDelay());

      const handleAbort = () => {
        window.clearTimeout(timerId);
        signal?.removeEventListener('abort', handleAbort);
        reject(createAbortError());
      };

      signal?.addEventListener('abort', handleAbort, { once: true });
    });

    if (shouldFail()) {
      throw createError('Fake API request failed');
    }

    return factory();
  }

  function requireTicket(ticketId: number): Ticket {
    const ticket = tickets.find((item) => item.id === ticketId);

    if (!ticket) {
      throw createError('Ticket not found');
    }

    return ticket;
  }

  function requireUser(userId: number): User {
    const user = users.find((item) => item.id === userId);

    if (!user) {
      throw createError('User not found');
    }

    return user;
  }

  function requireGroup(groupId: number): Group {
    const group = groups.find((item) => item.id === groupId);

    if (!group) {
      throw createError('Group not found');
    }

    return group;
  }

  return {
    listUsers: (options) => withDelay(() => users.map(cloneUser), options),
    listTickets: (options) => withDelay(() => tickets.map(cloneTicket), options),
    getTicket: (ticketId, options) =>
      withDelay(() => cloneTicket(requireTicket(ticketId)), options),
    createTicket: ({ description }, options) =>
      withDelay(() => {
        const ticket: Ticket = {
          id: ++lastId,
          description,
          assigneeId: null,
          completed: false,
          groupId: null,
        };

        tickets.push(ticket);
        return cloneTicket(ticket);
      }, options),
    assignTicket: (ticketId, userId, options) =>
      withDelay(() => {
        const ticket = requireTicket(ticketId);
        requireUser(userId);
        ticket.assigneeId = userId;
        return cloneTicket(ticket);
      }, options),
    updateTicketStatus: (ticketId, completed, options) =>
      withDelay(() => {
        const ticket = requireTicket(ticketId);
        ticket.completed = completed;
        return cloneTicket(ticket);
      }, options),
    listGroups: (options) => withDelay(() => groups.map(cloneGroup), options),
    createGroup: ({ name }, options) =>
      withDelay(() => {
        const group: Group = {
          id: ++lastGroupId,
          name,
        };

        groups.push(group);
        return cloneGroup(group);
      }, options),
    deleteGroup: (groupId, options) =>
      withDelay(() => {
        const deleteTickets = options?.deleteTickets ?? false;
        requireGroup(groupId);

        if (deleteTickets) {
          const indicesToRemove: number[] = [];
          tickets.forEach((ticket, index) => {
            if (ticket.groupId === groupId) {
              indicesToRemove.push(index);
            }
          });
          for (let i = indicesToRemove.length - 1; i >= 0; i--) {
            tickets.splice(indicesToRemove[i], 1);
          }
        } else {
          tickets.forEach((ticket) => {
            if (ticket.groupId === groupId) {
              ticket.groupId = null;
            }
          });
        }

        const groupIndex = groups.findIndex((g) => g.id === groupId);
        groups.splice(groupIndex, 1);
      }, options),
    assignTicketToGroup: (ticketId, groupId, options) =>
      withDelay(() => {
        const ticket = requireTicket(ticketId);
        if (groupId !== null) {
          requireGroup(groupId);
        }
        ticket.groupId = groupId;
        return cloneTicket(ticket);
      }, options),
  };
}

export const demoApi = createFakeTicketingApi();
