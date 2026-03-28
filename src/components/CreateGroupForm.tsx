import { useState } from 'react';
import { demoApi } from '../lib/fakeApi';

type CreateGroupFormProps = {
  onGroupCreated: () => void;
};

export function CreateGroupForm({ onGroupCreated }: CreateGroupFormProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await demoApi.createGroup({ name: name.trim() });
      setName('');
      onGroupCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        New group{' '}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          disabled={submitting}
        />
      </label>{' '}
      <button type="submit" disabled={!name.trim() || submitting}>
        Create group
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
