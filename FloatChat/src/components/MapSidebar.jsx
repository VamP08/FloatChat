import { useAppStore } from '../store/appStore';
import FloatDetails from './FloatDetails';
import ProfileList from './ProfileList';
import AnalysisViewer from './AnalysisViewer'; // <-- Import the new main viewer

export default function MapSidebar() {
  const { selectedFloat, selectedProfile, setFloat } = useAppStore();

  if (!selectedFloat) return null;

  return (
    <div className="absolute top-0 right-0 z-[1000] h-full w-full md:w-[450px] bg-white shadow-lg flex flex-col">
      <div className="p-2 border-b flex justify-between items-center bg-gray-50">
        <h2 className="font-bold text-gray-800">Float Details</h2>
        <button onClick={() => setFloat(null)} className="px-2 py-1 text-2xl font-bold text-gray-500 hover:text-gray-800" title="Close Panel">&times;</button>
      </div>

      <FloatDetails />

      <div className="border-t flex-grow overflow-y-auto flex flex-col">
        {/* Render the profile list on top of the analysis viewer */}
        <div className="max-h-1/2 overflow-y-auto border-b">
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