import FloatDetails from '../components/FloatDetails';
import FloatList from '../components/FloatList';
import MeasurementChart from '../components/MeasurementChart';
import ProfileList from '../components/ProfileList';
import { useAppStore } from '../store/appStore';

/**
 * The float browser: every float, then one float's dives, then one dive's measurements.
 *
 * With nothing selected this used to render three separate panels each showing its own
 * "select something" message, which read as three broken regions rather than one
 * waiting screen. Everything to the right of the list is now a single empty state
 * until a float is chosen.
 */
export default function FloatListPage() {
  const selectedFloat = useAppStore((state) => state.selectedFloat);

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden md:grid-cols-4">
      <div className="col-span-1 h-full min-h-0 overflow-hidden border-r border-[var(--sea-edge)] bg-[var(--sea-deep)]">
        <FloatList />
      </div>

      {selectedFloat ? (
        <>
          <div className="col-span-1 flex h-full min-h-0 flex-col overflow-hidden border-r border-[var(--sea-edge)]">
            <FloatDetails />
            <div className="min-h-0 flex-grow overflow-y-auto border-t border-[var(--sea-edge)]">
              <ProfileList />
            </div>
          </div>
          <div className="col-span-2 h-full min-h-0 overflow-auto">
            <MeasurementChart />
          </div>
        </>
      ) : (
        <div className="col-span-3 hidden h-full flex-col items-center justify-center gap-3 px-8 text-center md:flex">
          <p className="display text-2xl text-[var(--ink)]">Pick a float</p>
          <p className="max-w-sm text-[var(--ink-dim)]">
            Each one is a robot that has been diving and surfacing on its own for years.
            Choose it to see where it went and what it measured.
          </p>
        </div>
      )}
    </div>
  );
}
