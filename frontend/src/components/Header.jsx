import { Link } from 'react-router-dom';

/** The application bar. Search lives in the float rail, so it is not repeated here. */
export default function Header() {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-[var(--sea-edge)] bg-[var(--sea-abyss)] px-5 py-3">
      <Link to="/" className="display flex items-center gap-2.5 text-lg tracking-tight text-[var(--ink)]">
        <img src="/logo.svg" alt="" width="26" height="23" />
        FloatChat
      </Link>
      <nav className="flex gap-6 text-sm text-[var(--ink-dim)]">
        <Link to="/" className="transition-colors hover:text-[var(--ink)]">
          About the data
        </Link>
        <a className="transition-colors hover:text-[var(--ink)]" href="https://github.com/VamP08/FloatChat">
          Source
        </a>
      </nav>
    </header>
  );
}
