import { useEffect, useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { fetchActiveFloatLocations, onSlowRequest } from './api/client';
import Header from './components/Header';
import WakingNotice from './components/WakingNotice';
import ChatPage from './pages/ChatPage';
import FloatListPage from './pages/FloatListPage';
import Landing from './pages/Landing';
import MapView from './pages/MapView';

/**
 * The application screens: map, float list and chat.
 *
 * These share one viewport-height shell and the API's float locations. The landing
 * route sits outside it — it scrolls, carries no map chrome, and reads entirely from
 * a static file so it renders before the sleeping API has woken up.
 */
function AppShell() {
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [waking, setWaking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [flyToTarget, setFlyToTarget] = useState(null);

  useEffect(() => onSlowRequest(setWaking), []);

  useEffect(() => {
    setLoading(true);
    fetchActiveFloatLocations()
      .then((locations) => {
        setAllLocations(locations);
        setLoadError(null);
      })
      .catch((error) => setLoadError(error.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredLocations = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return allLocations;
    return allLocations.filter((loc) => loc.id.toString().includes(trimmed));
  }, [allLocations, searchTerm]);

  useEffect(() => {
    setFlyToTarget(filteredLocations.length === 1 ? filteredLocations[0] : null);
  }, [filteredLocations]);

  return (
    <div className="h-screen w-screen relative bg-[var(--sea-abyss)]">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        resultCount={filteredLocations.length}
      />
      {waking && <WakingNotice />}
      <main className="h-full w-full pt-[53px]">
        <Routes>
          <Route
            path="/map"
            element={
              <MapView
                locations={filteredLocations}
                loading={loading}
                loadError={loadError}
                searchTerm={searchTerm}
                flyToTarget={flyToTarget}
              />
            }
          />
          <Route path="/list" element={<FloatListPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<AppShell />} />
    </Routes>
  );
}
