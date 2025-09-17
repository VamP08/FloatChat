import { useEffect, useState, useRef } from 'react';
import { FiSend } from 'react-icons/fi';
import FloatMap from '../components/FloatMap';
// 1. Import the new chat API function
import { fetchActiveFloatLocations, sendChatMessage } from '../api/client';
// 2. Import the ChatVisualization component
import ChatVisualization from '../components/ChatVisualization';

const Message = ({ sender, text, visualization }) => {
  const isUser = sender === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : ''}`}>
      <div className={`${isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'} p-3 rounded-lg max-w-md`}>
        {!isUser && <p className="font-semibold text-sm mb-1">FloatChat AI</p>}
        <p className="text-sm whitespace-pre-line">{text}</p>
        {/* Display visualization if available */}
        {visualization && <ChatVisualization visualization={visualization} />}
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

  // --- THIS IS THE UPDATED CHAT LOGIC ---
  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (trimmedInput === '') return;

    // 1. Add user's message to the state immediately
    const newUserMessage = { id: Date.now(), sender: 'user', text: trimmedInput };
    const newHistory = [...messages, newUserMessage];
    setMessages(newHistory);
    setInputValue('');
    setIsLoading(true);

    // 2. Format the history for the backend API
    const apiHistory = newHistory.map(msg => ({
      role: msg.sender === 'ai' ? 'assistant' : 'user', // Map sender to role
      content: msg.text // Map text to content
    }));

    // 3. Call the real backend endpoint instead of setTimeout
    try {
      const aiResponse = await sendChatMessage(apiHistory);
      // The backend returns { role: 'ai', content: '...', visualization: {...} }
      const newAiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiResponse.content,
        visualization: aiResponse.visualization, // Include visualization data
      };
      setMessages(prev => [...prev, newAiMessage]);
    } catch (error) {
      console.error("Error communicating with AI backend:", error);
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: "Sorry, I'm having trouble connecting to my brain. Please check the server and try again.",
        visualization: null,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  // --- END OF UPDATED LOGIC ---

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // The rest of your component's JSX remains exactly the same...
  return (
    <div className="h-full flex">
      <div className="w-full lg:w-2/3 h-full flex flex-col border-r bg-white">
        <div className="flex-grow p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map(msg => <Message key={msg.id} sender={msg.sender} text={msg.text} visualization={msg.visualization} />)}
            {isLoading && (
              <div className="flex"><div className="bg-gray-100 p-3 rounded-lg"><p className="text-sm text-gray-500 animate-pulse">FloatChat AI is thinking...</p></div></div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="flex-shrink-0 p-4 border-t">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setInputValue("Compare salinity in the Arabian Sea")} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200">"Compare salinity..."</button>
            <button onClick={() => setInputValue("Show path of float with deepest dive")} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200">"Show deepest dive path"</button>
          </div>
        </div>
        <div className="flex-shrink-0 p-4 border-t bg-gray-50">
          <div className="relative">
            <textarea
              placeholder="Ask a question about ARGO data..."
              className="w-full p-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="2"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button onClick={handleSendMessage} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 disabled:opacity-50" disabled={isLoading || !inputValue.trim()}>
              <FiSend size={20} />
            </button>
          </div>
        </div>
      </div>
      <div className="hidden lg:block flex-grow h-full">
        {loadingMap ? (
          <div className="h-full flex items-center justify-center"><p>Loading map...</p></div>
        ) : (
          <FloatMap locations={locations} searchTerm="" />
        )}
      </div>
    </div>
  );
}
