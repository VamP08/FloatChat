import { useEffect, useRef, useState } from 'react';
import { FiSend, FiX } from 'react-icons/fi';
import { fetchChatExamples, sendChatMessage } from '../api/client';
import ChatVisualization from './ChatVisualization';

const WELCOME =
  'Ask about the northern Indian Ocean: the Arabian Sea, the Bay of Bengal, the ' +
  'Laccadive Sea and the equatorial Indian Ocean. Temperature, salinity, oxygen, ' +
  'chlorophyll, nitrate, backscatter and pH.';

function Message({ sender, text, visualization }) {
  const isUser = sender === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : ''}`}>
      <div
        className={`max-w-[92%] rounded-sm p-3 ${
          isUser
            ? 'bg-[var(--action)] text-[#02120d]'
            : 'border border-[var(--sea-edge)] bg-[var(--sea-panel)] text-[var(--ink)]'
        }`}
      >
        {!isUser && <p className="micro mb-1.5">FloatChat</p>}
        <p className="whitespace-pre-line text-sm leading-relaxed">{text}</p>
        {visualization && <ChatVisualization visualization={visualization} />}
      </div>
    </div>
  );
}

/**
 * Asking, as a panel over whatever you are already looking at.
 *
 * It used to be its own route with a decorative map filling the other half of the
 * screen. A question is something you ask about the thing in front of you, so it now
 * opens over the dossier or the map instead of replacing them.
 */
export default function AskPanel({ open, onClose, initialQuestion }) {
  const [messages, setMessages] = useState([{ id: 1, sender: 'ai', text: WELCOME }]);
  const [examples, setExamples] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);
  const asked = useRef(false);

  useEffect(() => {
    fetchChatExamples().then(setExamples).catch(() => setExamples([]));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const send = async (override) => {
    const trimmed = (override ?? inputValue).trim();
    if (!trimmed || isLoading) return;

    const history = [...messages, { id: Date.now(), sender: 'user', text: trimmed }];
    setMessages(history);
    setInputValue('');
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(
        history.map((m) => ({
          role: m.sender === 'ai' ? 'assistant' : 'user',
          content: m.text,
        })),
      );
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'ai', text: reply.content, visualization: reply.visualization },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text:
            error.status === 429
              ? error.message
              : 'I could not reach the query service. If this is the first request in a ' +
                'while the server may still be starting up — try again in a moment.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // A question typed on the landing page is asked once, when the panel first opens.
  useEffect(() => {
    if (!open || !initialQuestion || asked.current) return;
    asked.current = true;
    send(initialQuestion);
  }, [open, initialQuestion]);

  if (!open) return null;

  return (
    <aside
      className="absolute inset-y-0 right-0 z-[1200] flex w-full max-w-lg flex-col
                 border-l border-[var(--sea-edge)] bg-[var(--sea-abyss)] shadow-[var(--lift-2)]"
      aria-label="Ask about the data"
    >
      <div className="flex items-center justify-between border-b border-[var(--sea-edge)] px-5 py-3">
        <h2 className="micro">Ask</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
        >
          <FiX size={18} />
        </button>
      </div>

      <div className="flex-grow space-y-4 overflow-y-auto p-5">
        {messages.map((m) => (
          <Message key={m.id} sender={m.sender} text={m.text} visualization={m.visualization} />
        ))}
        {isLoading && (
          <div className="rounded-sm border border-[var(--sea-edge)] bg-[var(--sea-panel)] p-3">
            <p className="animate-pulse text-sm text-[var(--ink-dim)]">
              Querying the database&hellip;
            </p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && examples.length > 0 && (
        <div className="border-t border-[var(--sea-edge)] p-4">
          <div className="flex flex-wrap gap-2">
            {examples.slice(0, 3).map((example) => (
              <button
                key={example}
                onClick={() => send(example)}
                disabled={isLoading}
                className="rounded-full border border-[var(--sea-edge)] bg-[var(--sea-deep)]
                           px-3 py-1.5 text-left text-xs text-[var(--ink-dim)] transition-colors
                           hover:text-[var(--ink)] disabled:opacity-40"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--sea-edge)] bg-[var(--sea-deep)] p-4">
        <div className="relative">
          <textarea
            rows="2"
            placeholder="Ask a question…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="w-full resize-none rounded-sm border border-[var(--sea-edge)]
                       bg-[var(--sea-abyss)] p-3 pr-11 text-sm text-[var(--ink)] outline-none
                       transition-colors focus:border-[var(--action)]"
          />
          <button
            onClick={() => send()}
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send question"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]
                       transition-colors hover:text-[var(--action)] disabled:opacity-40"
          >
            <FiSend size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
