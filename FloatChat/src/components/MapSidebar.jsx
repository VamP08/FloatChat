import { useAppStore } from '../store/appStore';
import FloatDetails from './FloatDetails';
import ProfileList from './ProfileList';

export default function MapSidebar() {
  const selectedFloat = useAppStore((s) => s.selectedFloat);
  const setFloat = useAppStore((s) => s.setFloat); // To be able to close it

  if (!selectedFloat) {
    return null; // Don't render anything if no float is selected
  }

  return (
    <div className="absolute top-0 right-0 z-[1000] h-full w-full md:w-1/3 lg:w-1/4 bg-white shadow-lg flex flex-col transition-transform duration-300">
       <div className="p-2 border-b flex justify-between items-center">
        <h2 className="font-bold text-gray-700">Float Details</h2>
        <button
          onClick={() => setFloat(null)} // Clear the selection to close
          className="px-2 py-1 text-xl font-bold text-gray-500 hover:text-gray-800"
        >
          &times;
        </button>
      </div>
      {/* Reuse the components you've already built! */}
      <FloatDetails />
      <div className="border-t flex-grow overflow-y-auto">
        <ProfileList />
      </div>
    </div>
  );
}