import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Explore from './pages/Explore';
import Landing from './pages/Landing';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/floats/:floatId?"
        element={
          <div className="relative flex h-screen w-screen flex-col bg-[var(--sea-abyss)]">
            <Header />
            <div className="min-h-0 flex-grow">
              <Explore />
            </div>
          </div>
        }
      />
      {/* The three old screens are one place now; their links still work. */}
      <Route path="/map" element={<Navigate to="/floats" replace />} />
      <Route path="/list" element={<Navigate to="/floats" replace />} />
      <Route path="/chat" element={<Navigate to="/floats?ask=1" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
