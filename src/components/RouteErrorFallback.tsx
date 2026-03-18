import { useRouteError, Link } from 'react-router-dom';

export function RouteErrorFallback() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <p>{message}</p>
      <p><Link to="/">Back to list</Link></p>
    </div>
  );
}
