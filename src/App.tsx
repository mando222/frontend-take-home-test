import { NavLink, Outlet } from 'react-router-dom';

export function App() {
  return (
    <div>
      <header>
        <h1>Ticketing App Starter</h1>
        <nav aria-label="Primary">
          <NavLink to="/">Tickets</NavLink>
          <NavLink to="/groups">Groups</NavLink>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
