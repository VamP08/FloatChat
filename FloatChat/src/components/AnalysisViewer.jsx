import React, { useState } from 'react';
import ProfileDataViewer from './ProfileDataViewer'; // We will reuse this
import TimeSeriesViewer from './TimeSeriesViewer'; // We will create this next

const ANALYSIS_MODES = {
  PROFILE: 'Single Profile Report',
  TIMESERIES: 'Full Time Series',
};

export default function AnalysisViewer({ floatId, profileId }) {
  const [mode, setMode] = useState(ANALYSIS_MODES.PROFILE);

  return (
    <div className="h-full flex flex-col">
      {/* --- The Dropdown Menu --- */}
      <div className="p-2 border-b bg-gray-100 flex-shrink-0">
        <label htmlFor="analysis-mode" className="text-xs font-bold text-gray-600 mr-2">Analysis Mode:</label>
        <select
          id="analysis-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="p-1 border rounded-md text-sm"
        >
          <option value={ANALYSIS_MODES.PROFILE}>Single Profile Report</option>
          <option value={ANALYSIS_MODES.TIMESERIES}>Full Time Series</option>
        </select>
      </div>

      {/* --- Conditional Rendering of the Report --- */}
      <div className="flex-grow overflow-y-auto">
        {mode === ANALYSIS_MODES.PROFILE && (
          // We show the familiar profile viewer if a profile is selected
          profileId ? <ProfileDataViewer profileId={profileId} /> : <div className="p-4 text-center text-gray-500">Select a profile to view its report.</div>
        )}
        {mode === ANALYSIS_MODES.TIMESERIES && (
          // We show the new time series viewer for the whole float
          <TimeSeriesViewer floatId={floatId} />
        )}
      </div>
    </div>
  );
}