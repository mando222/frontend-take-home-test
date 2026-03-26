import { CreateTicketInput, Ticket, User } from './types';

type FakeApiOptions = {
  seedUsers?: User[];
  seedTickets?: Ticket[];
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
};

const defaultUsers: User[] = [{ id: 111, name: 'Victor' }, { id: 222, name: 'Priya' }];

const defaultTickets: Ticket[] = [
  {
    id: 1,
    description: 'Install a monitor arm',
    assigneeId: 111,
    completed: false,
  },
  {
    id: 2,
    description: 'Move the desk to the new location',
    assigneeId: 222,
    completed: false,
  },
  {
    id: 3,
    description: 'Replace the office keyboard',
    assigneeId: null,
    completed: true,
  },
];

function cloneTicket(ticket: Ticket): Ticket {
  return { ...ticket };
}

function cloneUser(user: User): User {
  return { ...user };
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
  delayRangeMs = [150, 1100],
  failureRate = 0.08,
  random = Math.random,
}: FakeApiOptions = {}): TicketingApi {
  const users = seedUsers.map(cloneUser);
  const tickets = seedTickets.map(cloneTicket);
  let lastId = Math.max(0, ...seedTickets.map((t) => t.id));

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
  };
}

export const demoApi = createFakeTicketingApi();
