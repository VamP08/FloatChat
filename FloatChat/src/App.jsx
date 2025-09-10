// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <>
      <nav className="p-2 bg-gray-800 text-white flex gap-4">
        <Link to="/">Dashboard</Link>
        <Link to="/chat">Chat</Link>
        <Link to="/map">Map</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/chat" element={<div>Chat Page</div>} />
        <Route path="/map" element={<div>Map Page</div>} />
      </Routes>
    </>
  );
}
