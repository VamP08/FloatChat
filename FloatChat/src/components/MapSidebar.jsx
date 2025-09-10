import { useAppStore } from '../store/appStore';
import FloatDetails from './FloatDetails';
import ProfileList from './ProfileList';
import ProfileDataViewer from './ProfileDataViewer';

export default function MapSidebar() {
  // This is the key: we select the state variables directly.
  // This creates a subscription. When these values change, the component re-renders.
  const selectedFloat = useAppStore((state) => state.selectedFloat);
  const selectedProfile = useAppStore((state) => state.selectedProfile);
  const setFloat = useAppStore((state) => state.setFloat);
  const setProfile = useAppStore((state) => state.setProfile);

  // The rest of your component logic remains the same.
  if (!selectedFloat) {
    return null;
  }

  return (
    <div className="absolute top-0 right-0 z-[1000] h-full w-full md:w-[450px] bg-white shadow-lg flex flex-col transition-transform duration-300">
      <div className="p-2 border-b flex justify-between items-center bg-gray-50">
        <h2 className="font-bold text-gray-800">Float Details</h2>
        <button
          onClick={() => setFloat(null)}
          className="px-2 py-1 text-2xl font-bold text-gray-500 hover:text-gray-800"
          title="Close Panel"
        >
          &times;
        </button>
      </div>

      <FloatDetails />

      <div className="border-t flex-grow overflow-y-auto flex flex-col">
        {selectedProfile ? (
          <div className="h-full flex flex-col">
            <button
              onClick={() => setProfile(null)}
              className="p-2 text-left font-semibold text-blue-600 hover:bg-gray-100 border-b sticky top-0 bg-white z-10"
            >
              &larr; Back to Profiles
            </button>
            <div className="flex-grow">
              <ProfileDataViewer profileId={selectedProfile} />
            </div>
          </div>
        ) : (
          <ProfileList />
        )}
      </div>
    </div>
  );
}