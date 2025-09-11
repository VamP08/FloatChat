import { useState, useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import MapView from './pages/MapView';
import Header from './components/Header';
import { fetchActiveFloatLocations } from './api/client';
import FloatListPage from './pages/FloatListPage';
import ChatPage from './pages/ChatPage';

export default function App() {
  const [isNavVisible, setIsNavVisible] = useState(false);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [flyToTarget, setFlyToTarget] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchActiveFloatLocations()
      .then(setAllLocations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

   const filteredLocations = useMemo(() => {
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) return allLocations;
    return allLocations.filter(loc => loc.id.toString().includes(trimmedSearch));
  }, [allLocations, searchTerm]);

  useEffect(() => {
    if (filteredLocations.length === 1) {
      setFlyToTarget(filteredLocations[0]);
    } else {
      setFlyToTarget(null);
    }
  }, [filteredLocations]);


  return (
    <div className="h-screen w-screen relative bg-white">
      <Header
        isNavVisible={isNavVisible}
        setIsNavVisible={setIsNavVisible}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        resultCount={filteredLocations.length}
      />
      <main className="h-full w-full">
        <Routes>
          <Route path="/" element={
            <MapView
              locations={filteredLocations}
              loading={loading}
              searchTerm={searchTerm}
              flyToTarget={flyToTarget}
            />
          } />
          <Route path="/list" element={<FloatListPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </main>
    </div>
  );
}