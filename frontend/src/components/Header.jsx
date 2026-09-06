import { Link } from 'react-router-dom';

/** The application bar. Search lives in the float rail, so it is not repeated here. */
export default function Header() {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-[var(--sea-edge)] bg-[var(--sea-abyss)] px-5 py-3">
      <Link to="/" className="display text-lg tracking-tight text-[var(--ink)]">
        FloatChat
      </Link>
      <Link
        to="/"
        className="text-sm text-[var(--ink-dim)] transition-colors hover:text-[var(--ink)]"
      >
        About the data
      </Link>
    </header>
  );
}
