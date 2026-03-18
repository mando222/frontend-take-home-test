export type User = {
  id: number;
  name: string;
};

export type Ticket = {
  id: number;
  description: string;
  assigneeId: number | null;
  completed: boolean;
};

export type CreateTicketInput = {
  description: string;
};
