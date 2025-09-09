import { useState, useEffect } from 'react';

// The base URL of your FastAPI backend
const API_BASE_URL = 'http://127.0.0.1:8000';

function HomePage() {
  const [floats, setFloats] = useState([]);
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch the list of all floats when the component first loads
  useEffect(() => {
    const fetchFloats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/floats`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setFloats(data);
      } catch (err) {
        setError('Failed to fetch floats. Is the backend running?');
        console.error(err);
      }
    };

    fetchFloats();
  }, []);

  // Handle the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');
    setAiResponse(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to get a response from the AI.');
      }

      const data = await response.json();
      setAiResponse(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <header className="text-center border-b border-gray-200 pb-6 mb-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-sky-900">FloatChat</h1>
        <p className="text-gray-600 mt-2">An AI-Powered Interface for ARGO Ocean Data</p>
      </header>

      <main>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Ask a Question</h2>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Show chlorophyll in the Arabian Sea"
              className="flex-grow w-full px-4 py-3 text-base text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 font-semibold text-white bg-sky-900 rounded-md shadow-sm hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Thinking...' : 'Ask'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {aiResponse && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">AI Response</h3>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
              <div>
                <strong className="text-gray-600">Your Question:</strong>
                <p className="text-gray-800 italic">{aiResponse.query_text}</p>
              </div>
              <div>
                <strong className="text-gray-600">Generated SQL:</strong>
                <pre className="bg-gray-200 text-gray-800 p-3 mt-1 rounded-md text-sm overflow-x-auto">
                  <code>{aiResponse.sql_query}</code>
                </pre>
              </div>
              <div>
                <strong className="text-gray-600">Result Data:</strong>
                <pre className="bg-gray-200 text-gray-800 p-3 mt-1 rounded-md text-sm overflow-x-auto">
                  <code>{JSON.stringify(aiResponse.data, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-semibold text-gray-800 border-t border-gray-200 pt-6 mb-4">Available ARGO Floats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {floats.length > 0 ? (
              floats.map((float) => (
                <div key={float.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-1 transition-transform duration-200">
                  <h4 className="text-lg font-bold text-sky-800">Float ID: {float.id}</h4>
                  <p className="text-sm text-gray-600">{float.project}</p>
                  <p className="text-sm text-gray-500 mt-2">Location: ({float.lat}, {float.lon})</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-full">{error ? 'Could not load floats.' : 'Loading floats...'}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default HomePage;