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
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-[var(--sea-edge)] bg-[var(--sea-deep)] px-4 py-2.5">
        <label htmlFor="analysis-mode" className="micro">Showing</label>
        <select
          id="analysis-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="rounded-sm border border-[var(--sea-edge)] bg-[var(--sea-abyss)] px-2 py-1 text-sm text-[var(--ink)] outline-none focus:border-[var(--action)]"
        >
          <option value={ANALYSIS_MODES.PROFILE}>Single Profile Report</option>
          <option value={ANALYSIS_MODES.TIMESERIES}>Full Time Series</option>
        </select>
      </div>

      {/* --- Conditional Rendering of the Report --- */}
      <div className="flex-grow overflow-y-auto">
        {mode === ANALYSIS_MODES.PROFILE && (
          // We show the familiar profile viewer if a profile is selected
          profileId ? <ProfileDataViewer profileId={profileId} /> : <div className="p-6 text-center text-[var(--ink-dim)]">Choose a dive to read its measurements.</div>
        )}
        {mode === ANALYSIS_MODES.TIMESERIES && (
          // We show the new time series viewer for the whole float
          <TimeSeriesViewer floatId={floatId} />
        )}
      </div>
    </div>
  );
}