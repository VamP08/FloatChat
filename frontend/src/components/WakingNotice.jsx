/**
 * Shown while a request is taking long enough to look like a failure.
 *
 * The API runs on a free tier that stops the container after fifteen idle minutes, so
 * the first visitor after a quiet spell waits through a cold start of roughly half a
 * minute. A bare spinner reads as broken; saying what is happening reads as a known
 * tradeoff.
 */
export default function WakingNotice() {
  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1100] max-w-md
                 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      <p className="font-semibold">Waking the server</p>
      <p className="text-slate-300">
        The API sleeps when nobody is using it. This takes about half a minute, it is
        retrying on its own, and everything after it is immediate.
      </p>
    </div>
  );
}
