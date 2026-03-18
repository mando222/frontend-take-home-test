import { useState } from 'react';
import { demoApi } from '../lib/fakeApi';

type AddTicketFormProps = {
  onTicketAdded: () => void;
};

export function AddTicketForm({ onTicketAdded }: AddTicketFormProps) {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await demoApi.createTicket({ description: description.trim() });
      setDescription('');
      onTicketAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        New ticket{' '}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ticket description"
          disabled={submitting}
        />
      </label>{' '}
      <button type="submit" disabled={!description.trim() || submitting}>
        Add ticket
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
