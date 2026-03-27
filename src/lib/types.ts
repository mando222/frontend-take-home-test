export type User = {
  id: number;
  name: string;
};

export type Group = {
  id: number;
  name: string;
};

export type Ticket = {
  id: number;
  description: string;
  assigneeId: number | null;
  completed: boolean;
  groupId: number | null;
};

export type CreateTicketInput = {
  description: string;
};

export type CreateGroupInput = {
  name: string;
};
