import { useEffect, useState } from 'react';

type ToastProps = {
  message: string;
  durationMs?: number;
};

export function Toast({ message, durationMs = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), durationMs);
    return () => window.clearTimeout(timer);
  }, [message, durationMs]);

  if (!visible) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        background: '#f59e0b',
        color: '#000',
        padding: '8px 16px',
        borderRadius: 6,
        fontSize: 14,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {message}
    </div>
  );
}
