import FloatList from '../components/FloatList';
import ProfileList from '../components/ProfileList';
import MeasurementChart from '../components/MeasurementChart';
import FloatDetails from '../components/FloatDetails';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 h-full min-h-0 overflow-hidden">
      {/* Column 1: Float List */}
      <div className="col-span-1 border-r bg-gray-50 h-full min-h-0 overflow-y-auto">
        <FloatList />
      </div>

      {/* Column 2: Details & Profiles */}
      <div className="col-span-1 border-r h-full min-h-0 flex flex-col bg-white overflow-hidden">
        <FloatDetails />
        <div className="flex-grow min-h-0 overflow-y-auto border-t">
          <ProfileList />
        </div>
      </div>

      {/* Column 3 & 4: Chart */}
      <div className="col-span-2 h-full min-h-0 overflow-auto">
        <MeasurementChart />
      </div>
    </div>
  );
}