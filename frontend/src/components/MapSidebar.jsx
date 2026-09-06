import { useAppStore } from '../store/appStore';
import FloatDetails from './FloatDetails';
import ProfileList from './ProfileList';
import AnalysisViewer from './AnalysisViewer'; // <-- Import the new main viewer

export default function MapSidebar() {
  const { selectedFloat, selectedProfile, setFloat } = useAppStore();

  if (!selectedFloat) return null;

  return (
    <div className="absolute right-0 top-0 z-[900] flex h-full w-full flex-col border-l border-[var(--sea-edge)] bg-[var(--sea-abyss)] shadow-[var(--lift-2)] md:w-[26rem]">
      <div className="flex items-center justify-between border-b border-[var(--sea-edge)] bg-[var(--sea-deep)] px-4 py-3">
        <h2 className="micro">Float detail</h2>
        <button onClick={() => setFloat(null)} className="px-2 text-xl leading-none text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]" title="Close Panel">&times;</button>
      </div>

      <FloatDetails />

      <div className="flex flex-grow flex-col overflow-y-auto">
        {/* Render the profile list on top of the analysis viewer */}
        <div className="max-h-[38%] overflow-y-auto border-b border-[var(--sea-edge)]">
           <ProfileList />
        </div>
        <div className="flex-grow">
          {/* The AnalysisViewer now handles what to show */}
          <AnalysisViewer floatId={selectedFloat} profileId={selectedProfile} />
        </div>
      </div>
    </div>
  );
}