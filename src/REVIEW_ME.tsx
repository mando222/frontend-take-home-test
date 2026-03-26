import { useState, useEffect, useCallback } from 'react';
import { Ticket } from './lib/types';
import { demoApi } from './lib/fakeApi';

// ---------------------------------------------------------------------------
// Event bus for decoupled component communication
// ---------------------------------------------------------------------------

class TicketEventBus {
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((cb) => cb(...args));
  }
}

const ticketBus = new TicketEventBus();

// ---------------------------------------------------------------------------
// Custom hook — centralises ticket data and related UI state
// ---------------------------------------------------------------------------

function useTicketData() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'completed'>('all');

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
      if (e.key === 'n' && e.metaKey) setModalOpen(true);
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  return { tickets, setTickets, isModalOpen, setModalOpen, activeTab, setActiveTab };
}

// ---------------------------------------------------------------------------
// TicketCard — renders a single ticket row
// ---------------------------------------------------------------------------

interface TicketCardProps {
  ticket: Ticket;
}

function TicketCard({ ticket }: TicketCardProps) {
  const handleToggle = useCallback(() => {
    ticketBus.emit('toggle-status', ticket.id, !ticket.completed);
  }, [ticket.id, ticket.completed]);

  return (
    <div className="ticket-card" style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>#{ticket.id}</strong>
          <div>{ticket.description}</div>
        </div>
        <button onClick={handleToggle}>
          {ticket.completed ? 'Reopen' : 'Complete'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TicketDashboard — main dashboard view
// ---------------------------------------------------------------------------

export default function TicketDashboard() {
  const { tickets, setTickets, isModalOpen, setModalOpen, activeTab, setActiveTab } =
    useTicketData();
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch and filter tickets whenever filters change
  useEffect(() => {
    setLoading(true);
    demoApi.listTickets().then((data) => {
      const filtered = data.filter((t) => {
        if (statusFilter === 'open' && t.completed) return false;
        if (statusFilter === 'completed' && !t.completed) return false;
        if (assigneeFilter !== null && t.assigneeId !== assigneeFilter) return false;
        return true;
      });
      setTickets(filtered);
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load tickets:', err);
      setLoading(false);
    });
  }, [statusFilter, assigneeFilter, setTickets]);

  // Listen for status-toggle events from child cards
  useEffect(() => {
    const handleToggle = (id: unknown, completed: unknown) => {
      demoApi.updateTicketStatus(id as number, completed as boolean).then((updated) => {
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      });
    };
    ticketBus.on('toggle-status', handleToggle);
    return () => ticketBus.off('toggle-status', handleToggle);
  }, [setTickets]);

  // Compute summary statistics
  const completedCount = tickets.filter((t) => t.completed).length;
  const completionRate = tickets.length > 0 ? completedCount / tickets.length : 0;
  const openCount = tickets.length - completedCount;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>Ticket Dashboard</h2>
        <button onClick={() => setModalOpen(true)}>+ New Ticket</button>
      </header>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <span>Total: {tickets.length}</span>
        <span>Open: {openCount}</span>
        <span>Completion: {(completionRate * 100).toFixed(1)}%</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'completed')}
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="completed">Completed</option>
        </select>

        <select
          value={assigneeFilter ?? ''}
          onChange={(e) => setAssigneeFilter(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Any assignee</option>
          <option value="111">Victor</option>
          <option value="222">Priya</option>
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['all', 'open', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ fontWeight: activeTab === tab ? 700 : 400 }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {loading ? (
        <p>Loading tickets...</p>
      ) : (
        tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
      )}

      {isModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 320 }}>
            <h3>Create Ticket</h3>
            <p>Modal content goes here.</p>
            <button onClick={() => setModalOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
