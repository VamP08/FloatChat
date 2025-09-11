import { useEffect, useState, useRef } from 'react';
import { FiSend } from 'react-icons/fi';
import FloatMap from '../components/FloatMap';
import { fetchActiveFloatLocations } from '../api/client';

const Message = ({ sender, text }) => {
  const isUser = sender === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : ''}`}>
      <div className={`${isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'} p-3 rounded-lg max-w-md`}>
        {!isUser && <p className="font-semibold text-sm mb-1">FloatChat AI</p>}
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
};

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: 'Welcome! I can answer questions about the ARGO float data. What would you like to know?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [loadingMap, setLoadingMap] = useState(true);

  useEffect(() => {
    fetchActiveFloatLocations()
      .then(setLocations)
      .catch(console.error)
      .finally(() => setLoadingMap(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    const trimmedInput = inputValue.trim();
    if (trimmedInput === '') return;

    const newUserMessage = { id: Date.now(), sender: 'user', text: trimmedInput };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    setTimeout(() => {
      const aiResponse = { id: Date.now() + 1, sender: 'ai', text: "This is a simulated response. The AI core is not yet connected." };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex">
      {/* ===== Left Panel: Conversation Hub (Reverted Layout) ===== */}
      <div className="w-full md:w-1/2 lg:w-1/3 h-full flex flex-col border-r bg-white">
        {/* Message Area */}
        <div className="flex-grow p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map(msg => (
              <Message key={msg.id} sender={msg.sender} text={msg.text} />
            ))}
            {isLoading && (
              <div className="flex">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-sm text-gray-500 animate-pulse">FloatChat AI is thinking...</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Suggestion Buttons Area */}
        <div className="p-4 border-t">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setInputValue("Compare salinity in the Arabian Sea")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
            >
              "Compare salinity..."
            </button>
            <button
              onClick={() => setInputValue("Show path of float with deepest dive")}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
            >
              "Show deepest dive path"
            </button>
          </div>
        </div>

        {/* Input Box Area */}
        <div className="p-4 border-t bg-gray-50">
          <div className="relative">
            <textarea
              placeholder="Ask a question about ARGO data..."
              className="w-full p-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="2"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              onClick={handleSendMessage}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 disabled:opacity-50"
              disabled={isLoading || !inputValue.trim()}
            >
              <FiSend size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Right Panel: Visualization Canvas ===== */}
      <div className="hidden md:block flex-grow h-full">
        {loadingMap ? (
          <div className="h-full flex items-center justify-center"><p>Loading map...</p></div>
        ) : (
          <FloatMap locations={locations} searchTerm="" />
        )}
      </div>
    </div>
  );
}