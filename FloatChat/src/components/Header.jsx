import { FiMenu, FiX } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

export default function Header({ isNavVisible, setIsNavVisible, searchTerm, setSearchTerm, resultCount }) {
  const iconSize = 24;
  const isSidebarOpen = useAppStore((state) => !!state.selectedFloat);
  const location = useLocation(); 

  const isMapPage = location.pathname === '/';

  const headerStyle = isMapPage
    ? {
        container: `absolute top-0 left-0 w-full z-[1000]`,
        navBar: `fixed top-4 left-4 right-4 bg-white shadow-lg p-4 rounded-lg flex items-center justify-between gap-4 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'right-[466px]' : 'right-4'}`,
        menuButtonContainer: `absolute top-4 left-4`,
      }
    : { 
        container: `relative z-[1000]`, 
        navBar: `bg-white shadow-md p-4 flex items-center justify-between gap-4`,
        menuButtonContainer: `relative`, 
      };

  const navLinkClass = (path) => `
    hover:text-blue-600 transition-colors
    ${location.pathname === path ? 'text-blue-600 font-bold' : ''}
  `;

  return (
    <header className={headerStyle.container}>
      {isMapPage && !isNavVisible && (
        <div className={headerStyle.menuButtonContainer}>
          <button
            onClick={() => setIsNavVisible(true)}
            className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            aria-label="Open navigation"
          >
            <FiMenu size={iconSize} />
          </button>
        </div>
      )}

      {(isNavVisible || !isMapPage) && (
        <div className={headerStyle.navBar}>
           <div className="flex items-center gap-4">
              {isMapPage && (
                 <button
                  onClick={() => setIsNavVisible(false)}
                  className="p-2 rounded-full hover:bg-gray-200"
                  aria-label="Close navigation"
                >
                  <FiX size={iconSize} />
                </button>
              )}
            <h1 className="text-xl font-bold text-gray-800">FloatChat</h1>
          </div>

          {isMapPage && (
            <div className="flex-1 max-w-lg flex items-center gap-3">
              <input
                type="text"
                placeholder="Search Active Float ID..."
                className="w-full px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">
                  {resultCount} found
              </span>
            </div>
          )}

          <nav className="flex items-center gap-6 font-medium text-gray-600">
            <Link to="/" className={navLinkClass('/')}>Map</Link>
            <Link to="/list" className={navLinkClass('/list')}>Float List</Link>
            <Link to="/chat" className={navLinkClass('/chat')}>Chat</Link>
          </nav>
        </div>
      )}
    </header>
  );
}