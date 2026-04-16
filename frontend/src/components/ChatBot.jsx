import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

/**
 * ChatBot — Demo stub.
 * The current backend has no /api/chat endpoint. This renders
 * the UI shell but responds with a canned message instead of
 * calling a non-existent API.
 */
export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Welcome to Global Tracker AI Intelligence. I can analyze geopolitical events, explain cause-effect relationships, and provide risk assessments. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // Demo response — no backend endpoint available
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'The AI chat backend is not yet connected. This is a demo placeholder. Connect a chat API to enable live intelligence analysis.'
      }]);
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center bg-[var(--cat-political)] text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow"
            data-testid="chatbot-toggle-btn"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] glass-panel rounded-xl flex flex-col overflow-hidden"
            data-testid="chatbot-panel"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--cat-political)]" />
                <span className="text-sm font-bold tracking-tight" style={{ fontFamily: 'Chivo, sans-serif' }}>Intel Assistant</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[var(--cat-political)]/10 text-[var(--text-muted)]">Demo</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-md transition-colors"
                data-testid="chatbot-close-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chatbot-messages">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[var(--cat-political)] text-white rounded-br-sm'
                        : 'glass-light text-[var(--text-primary)] rounded-bl-sm'
                    }`}
                    data-testid={`chat-message-${idx}`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-[var(--border-default)] flex-shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about global events..."
                  className="flex-1 bg-[var(--bg-elevated)] rounded-md px-3 py-2.5 text-sm border border-[var(--border-default)] outline-none focus:border-[var(--cat-political)] transition-colors text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  data-testid="chatbot-input"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2.5 rounded-md bg-[var(--cat-political)] text-white disabled:opacity-40 hover:brightness-110 transition-all"
                  data-testid="chatbot-send-btn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
