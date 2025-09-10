import { useEffect, useState } from "react";
import { fetchMeasurements } from "../api/client";
import { useAppStore } from "../store/appStore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function MeasurementChart() {
  const profileId = useAppStore((s) => s.selectedProfile);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (profileId) {
      fetchMeasurements(profileId).then(setData);
    }
  }, [profileId]);

  if (!profileId) return <p className="p-4">Select a profile</p>;

  return (
    <div className="p-4 flex-1">
      <h2 className="font-bold mb-2">Temperature Profile</h2>
      <LineChart width={500} height={300} data={data}>
        <CartesianGrid stroke="#ccc" />
        <XAxis dataKey="pressure" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="temp" stroke="#8884d8" />
      </LineChart>
    </div>
  );
}
