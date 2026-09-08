import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchActiveFloatLocations, onSlowRequest } from '../api/client';
import AskPanel from '../components/AskPanel';
import Dossier from '../components/Dossier';
import FloatList from '../components/FloatList';
import FloatMap from '../components/FloatMap';
import WakingNotice from '../components/WakingNotice';
import { useAppStore } from '../store/appStore';

/**
 * One screen instead of three.
 *
 * Map, float list and chat were separate routes, each with its own idea of the task and
 * its own empty state. They are one place now: a chooser on the left, and on the right
 * either the whole ocean (when nothing is chosen) or one float's dossier. Asking is a
 * panel over whichever of those you are looking at, so a question never costs you your
 * place.
 *
 * The float id lives in the URL, so a float can be linked to and returned to.
 */
export default function Explore() {
  const { floatId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [waking, setWaking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [askOpen, setAskOpen] = useState(searchParams.has('q') || searchParams.has('ask'));

  const setFloat = useAppStore((s) => s.setFloat);
  const handedQuestion = searchParams.get('q');

  useEffect(() => onSlowRequest(setWaking), []);

  useEffect(() => {
    fetchActiveFloatLocations()
      .then((rows) => {
        setLocations(rows);
        setLoadError(null);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  // The URL is the source of truth for which float is open; the store follows it so the
  // map and the rail highlight the same one.
  useEffect(() => {
    setFloat(floatId ?? null);
  }, [floatId, setFloat]);

  // Drop the handed-over question from the URL so a reload does not re-ask it.
  useEffect(() => {
    if (searchParams.has('q') || searchParams.has('ask')) {
      const next = new URLSearchParams(searchParams);
      next.delete('q');
      next.delete('ask');
      setSearchParams(next, { replace: true });
    }
    // Intentionally runs once: the value is captured above before it is cleared.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return locations;
    return locations.filter((loc) => loc.id.toString().includes(trimmed));
  }, [locations, searchTerm]);

  const openFloat = (id) => navigate(id ? `/floats/${id}` : '/floats');

  return (
    <div className="relative flex h-full min-h-0">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-[var(--sea-edge)] bg-[var(--sea-deep)] md:flex">
        <div className="border-b border-[var(--sea-edge)] p-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Find a float by number"
            aria-label="Find a float by its number"
            className="w-full rounded-sm border border-[var(--sea-edge)] bg-[var(--sea-abyss)]
                       px-3 py-2 text-sm text-[var(--ink)] outline-none transition-colors
                       focus:border-[var(--action)]"
          />
        </div>
        <div className="min-h-0 flex-grow overflow-y-auto">
          <FloatList onSelect={openFloat} filterTerm={searchTerm} />
        </div>
      </aside>

      <main className="relative min-h-0 flex-grow overflow-y-auto">
        {!floatId && (
          <h1 className="sr-only">
            Argo floats in the northern Indian Ocean
          </h1>
        )}
        {floatId ? (
          <Dossier key={floatId} floatId={floatId} />
        ) : loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
            <p className="display text-2xl">Could not reach the API</p>
            <p className="max-w-md text-sm text-[var(--ink-dim)]">{loadError}</p>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-[var(--ink-dim)]">Finding floats&hellip;</p>
          </div>
        ) : (
          <div className="absolute inset-0">
            <FloatMap locations={filtered} searchTerm={searchTerm} onSelect={openFloat} />
            <p
              className="pointer-events-none absolute inset-x-0 bottom-6 z-[500] px-6
                         pr-48 text-center text-sm text-[var(--ink-dim)] sm:pr-56"
            >
              {filtered.length} floats. Choose one to read where it went and what it measured.
            </p>
          </div>
        )}
      </main>

      {waking && <WakingNotice />}
      <AskPanel
        open={askOpen}
        onClose={() => setAskOpen(false)}
        initialQuestion={handedQuestion}
      />
      {!askOpen && (
        <button
          type="button"
          onClick={() => setAskOpen(true)}
          className="absolute bottom-6 right-6 z-[1100] rounded-full px-5 py-3 text-sm font-semibold
                     text-[#02120d] shadow-[var(--lift-2)] transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--action)' }}
        >
          Ask a question
        </button>
      )}
    </div>
  );
}
