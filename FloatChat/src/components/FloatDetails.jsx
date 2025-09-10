import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { fetchFloatDetails } from '../api/client';

export default function FloatDetails() {
  const floatId = useAppStore((s) => s.selectedFloat);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (floatId) {
      setLoading(true);
      setDetails(null); // Clear previous details on new selection
      fetchFloatDetails(floatId)
        .then(setDetails)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setDetails(null);
    }
  }, [floatId]);

  if (!floatId) {
    return (
      <div className="p-4 h-48 flex items-center justify-center">
        <p className="text-gray-500">Select a float to see details</p>
      </div>
    );
  }

  return (
    <div className="p-4 min-h-[12rem]"> {/* min-h prevents layout shift */}
      <h2 className="font-bold text-lg mb-2">Float {details ? details.id : '...'}</h2>
      {loading && <p className="text-gray-500">Loading details...</p>}
      {details && !loading && (
        <div className="text-sm text-gray-700 space-y-1">
          <p><strong>Project:</strong> {details.project_name}</p>
          <p><strong>WMO Type:</strong> {details.wmo_inst_type}</p>
          <p className="font-semibold mt-2">Sensors:</p>
          <p className="text-xs break-words">{details.sensors_list.split(',').join(', ')}</p>
        </div>
      )}
    </div>
  );
}