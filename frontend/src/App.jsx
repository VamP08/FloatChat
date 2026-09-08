import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Landing from './pages/Landing';

// Everyone arrives on the landing page, which draws a canvas and reads one static file.
// Leaflet, Recharts and the Markdown renderer belong to the app behind it, so they load
// when someone goes there rather than being paid for by every visitor.
const Explore = lazy(() => import('./pages/Explore'));

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
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <p className="text-[var(--ink-dim)]">Loading&hellip;</p>
                  </div>
                }
              >
                <Explore />
              </Suspense>
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
