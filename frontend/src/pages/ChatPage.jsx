import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSend } from 'react-icons/fi';
import { fetchActiveFloatLocations, fetchChatExamples, sendChatMessage } from '../api/client';
import ChatVisualization from '../components/ChatVisualization';
import FloatMap from '../components/FloatMap';

const WELCOME =
  'Ask me about Argo float measurements in the northern Indian Ocean: the Arabian Sea, ' +
  'the Bay of Bengal, the Laccadive Sea and the equatorial Indian Ocean. Temperature, ' +
  'salinity, oxygen, chlorophyll, nitrate, backscatter and pH.';

function Message({ sender, text, visualization }) {
  const isUser = sender === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : ''}`}>
      <div
        className={`${
          isUser
            ? 'bg-[var(--action)] text-[#02120d]'
            : 'border border-[var(--sea-edge)] bg-[var(--sea-panel)] text-[var(--ink)]'
        } p-3 rounded-lg max-w-md`}
      >
        {!isUser && <p className="micro mb-1.5">FloatChat</p>}
        <p className="text-sm whitespace-pre-line">{text}</p>
        {visualization && <ChatVisualization visualization={visualization} />}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: WELCOME },
  ]);
  const [examples, setExamples] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const [locations, setLocations] = useState([]);
  const [loadingMap, setLoadingMap] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const handedOver = useRef(false);

  useEffect(() => {
    fetchActiveFloatLocations()
      .then(setLocations)
      .catch(() => setLocations([]))
      .finally(() => setLoadingMap(false));
    // Served by the API so the suggestions stay in step with what the query engine
    // can actually answer.
    fetchChatExamples().then(setExamples).catch(() => setExamples([]));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // A question typed on the landing page arrives as ?q= and is asked once, then
  // dropped from the URL so a reload does not re-send it.
  useEffect(() => {
    const handed = searchParams.get('q');
    if (!handed || handedOver.current) return;
    handedOver.current = true;
    setSearchParams({}, { replace: true });
    handleSendMessage(handed);
  }, [searchParams, setSearchParams]);

  const handleSendMessage = async (override) => {
    const trimmed = (override ?? inputValue).trim();
    if (!trimmed || isLoading) return;

    const newHistory = [...messages, { id: Date.now(), sender: 'user', text: trimmed }];
    setMessages(newHistory);
    setInputValue('');
    setIsLoading(true);

    const apiHistory = newHistory.map((msg) => ({
      role: msg.sender === 'ai' ? 'assistant' : 'user',
      content: msg.text,
    }));

    try {
      const reply = await sendChatMessage(apiHistory);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: reply.content,
          visualization: reply.visualization,
        },
      ]);
    } catch (error) {
      // 429 carries a readable explanation of the limit; anything else is a failure
      // the visitor can do nothing about, so say that plainly.
      const text =
        error.status === 429
          ? error.message
          : 'I could not reach the query service. If this is the first request in a ' +
            'while, the server may still be starting up -- try again in a moment.';
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex">
      <div className="flex h-full w-full flex-col border-r border-[var(--sea-edge)] bg-[var(--sea-abyss)] lg:w-[58%]">
        <div className="flex-grow p-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.map((msg) => (
              <Message
                key={msg.id}
                sender={msg.sender}
                text={msg.text}
                visualization={msg.visualization}
              />
            ))}
            {isLoading && (
              <div className="flex">
                <div className="rounded-sm border border-[var(--sea-edge)] bg-[var(--sea-panel)] p-3">
                  <p className="animate-pulse text-sm text-[var(--ink-dim)]">
                    Querying the database&hellip;
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {examples.length > 0 && (
          <div className="flex-shrink-0 border-t border-[var(--sea-edge)] p-4">
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => handleSendMessage(example)}
                  disabled={isLoading}
                  className="rounded-full border border-[var(--sea-edge)] bg-[var(--sea-deep)] px-3.5 py-1.5
                             text-sm text-[var(--ink-dim)] transition-colors
                             hover:border-[color-mix(in_srgb,var(--action)_45%,transparent)]
                             hover:text-[var(--ink)] disabled:opacity-40"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-shrink-0 border-t border-[var(--sea-edge)] bg-[var(--sea-deep)] p-4">
          <div className="relative">
            <textarea
              placeholder="Ask a question about Argo data..."
              className="w-full resize-none rounded-sm border border-[var(--sea-edge)] bg-[var(--sea-abyss)]
                         p-3 pr-12 text-[var(--ink)] outline-none transition-colors
                         focus:border-[var(--action)]"
              rows="2"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={() => handleSendMessage()}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]
                         transition-colors hover:text-[var(--action)] disabled:opacity-40"
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send question"
            >
              <FiSend size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:block flex-grow h-full">
        {loadingMap ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[var(--ink-dim)]">Loading map&hellip;</p>
          </div>
        ) : (
          <FloatMap locations={locations} searchTerm="" />
        )}
      </div>
    </div>
  );
}
