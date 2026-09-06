import { Link, useLocation } from 'react-router-dom';

/**
 * The application bar.
 *
 * This used to be a hamburger that hid every route behind a toggle, which for three
 * screens cost a click to reach anything and overlapped the wordmark when open. The
 * links are always visible now, and the toggle state is gone.
 */
export default function Header({ searchTerm, setSearchTerm, resultCount }) {
  const { pathname } = useLocation();

  const linkClass = (path) =>
    `transition-colors ${
      pathname === path
        ? 'text-[var(--ink)]'
        : 'text-[var(--ink-dim)] hover:text-[var(--ink)]'
    }`;

  return (
    <header
      className="absolute inset-x-0 top-0 z-[1000] flex flex-wrap items-center gap-x-8 gap-y-3
                 border-b border-[var(--sea-edge)] bg-[rgba(3,7,12,0.88)] px-5 py-3
                 backdrop-blur-sm"
    >
      <Link to="/" className="display text-lg tracking-tight text-[var(--ink)]">
        FloatChat
      </Link>

      <nav className="flex gap-6 text-sm">
        <Link to="/map" className={linkClass('/map')}>Map</Link>
        <Link to="/list" className={linkClass('/list')}>Floats</Link>
        <Link to="/chat" className={linkClass('/chat')}>Ask</Link>
      </nav>

      {pathname === '/map' && (
        <div className="ml-auto flex items-center gap-3">
          <input
            type="search"
            placeholder="Find a float by number"
            aria-label="Find a float by its WMO number"
            className="w-56 rounded-sm border border-[var(--sea-edge)] bg-[var(--sea-deep)]
                       px-3 py-1.5 text-sm text-[var(--ink)] outline-none transition-colors
                       focus:border-[var(--action)]"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <span className="tnum whitespace-nowrap text-sm text-[var(--ink-faint)]">
            {resultCount} shown
          </span>
        </div>
      )}
    </header>
  );
}
