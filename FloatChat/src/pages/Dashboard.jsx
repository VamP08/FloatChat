import FloatList from "../components/FloatList";
import ProfileList from "../components/ProfileList";
import MeasurementChart from "../components/MeasurementChart";

export default function Dashboard() {
  return (
    <div className="flex h-screen">
      <div className="w-1/4">
        <FloatList />
      </div>
      <div className="w-1/4">
        <ProfileList />
      </div>
      <div className="flex-1">
        <MeasurementChart />
      </div>
    </div>
  );
}
