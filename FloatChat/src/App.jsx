import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView'; 

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');

  const navClass = (viewName) =>
    `px-4 py-2 cursor-pointer rounded-t-lg font-medium transition-colors ${
      activeView === viewName
        ? 'bg-white text-blue-600'
        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
    }`;

  return (
    <div className="flex flex-col h-screen font-sans bg-gray-100">
      <nav className="flex px-4 pt-2 bg-gray-100 border-b border-gray-200">
        <div onClick={() => setActiveView('dashboard')} className={navClass('dashboard')}>
          Dashboard
        </div>
        <div onClick={() => setActiveView('map')} className={navClass('map')}>
          Map
        </div>
      </nav>
      <main className="flex-grow bg-white shadow-inner-lg rounded-b-lg overflow-hidden">
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'map' && <MapView />} {}
      </main>
    </div>
  );
}