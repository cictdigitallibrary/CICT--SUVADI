import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// Generate a random string for simple session tracking
const generateSessionId = () => Math.random().toString(36).substring(2, 15);

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);

  // Initialize session and restore messages from sessionStorage
  useEffect(() => {
    const savedMessages = sessionStorage.getItem('suvadi_chat_messages');
    const savedSession = sessionStorage.getItem('suvadi_chat_session');
    
    if (savedMessages && savedSession) {
      setMessages(JSON.parse(savedMessages));
      setSessionId(savedSession);
    } else {
      const newSessionId = generateSessionId();
      setSessionId(newSessionId);
      const initialMessage = { text: "Welcome to SUVADI! You can ask me questions about our classical texts, editions, publishers, or the number of books in a category.", source: 'System' };
      setMessages([initialMessage]);
      sessionStorage.setItem('suvadi_chat_session', newSessionId);
      sessionStorage.setItem('suvadi_chat_messages', JSON.stringify([initialMessage]));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // Save to session storage whenever messages change
    if (messages.length > 0) {
      sessionStorage.setItem('suvadi_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const handleNewChat = () => {
    const newSessionId = generateSessionId();
    setSessionId(newSessionId);
    const initialMessage = { text: "Welcome to SUVADI! You can ask me questions about our classical texts, editions, publishers, or the number of books in a category.", source: 'System' };
    setMessages([initialMessage]);
    sessionStorage.setItem('suvadi_chat_session', newSessionId);
    sessionStorage.setItem('suvadi_chat_messages', JSON.stringify([initialMessage]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { text: input, source: 'user', role: 'user' };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:3001/api/chat', {
        query: userMessage.text,
        history: newMessages.filter(m => m.source !== 'System'),
        sessionId: sessionId // pass sessionId to keep dynamic backend context isolated
      });

      setMessages(prev => [...prev, { text: response.data.text, source: 'LLM', role: 'model' }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { text: "Sorry, I am having trouble connecting to the server.", source: 'System', role: 'model' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        className={`fixed bottom-6 right-6 w-14 h-14 bg-maroon text-ivory rounded-full flex items-center justify-center shadow-lg hover:bg-maroon-dark transition-colors z-50 ${isOpen ? 'hidden' : 'flex'}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        aria-label="Open Chat"
      >
        <MessageCircle size={24} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className={`fixed bg-white shadow-2xl flex flex-col overflow-hidden z-50 border border-stone/10 transition-all duration-300 ease-in-out ${
              isMaximized 
                ? 'top-[5vh] left-[5vw] w-[90vw] h-[90vh] md:top-[10vh] md:left-[15vw] md:w-[70vw] md:h-[80vh] rounded-3xl' 
                : 'bottom-6 right-6 w-[350px] sm:w-[400px] h-[550px] rounded-2xl'
            }`}
          >
            {/* Header */}
            <div className="bg-maroon text-ivory p-4 flex items-center justify-between shadow-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center text-gold">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-gold tracking-wide leading-tight">SUVADI Assistant</h3>
                  <p className="text-[10px] text-ivory/70 uppercase tracking-widest">Ask about our texts & editions</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleNewChat}
                  title="New Chat"
                  className="p-2 text-ivory/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <RefreshCw size={18} />
                </button>
                <button 
                  onClick={() => setIsMaximized(!isMaximized)}
                  title={isMaximized ? "Minimize" : "Maximize"}
                  className="p-2 text-ivory/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  title="Close Chat"
                  className="p-2 text-ivory/70 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-stone/[0.02]">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 max-w-[85%] ${
                    msg.source === 'user' ? 'ml-auto flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                    msg.source === 'user' ? 'bg-maroon text-ivory' : 'bg-gold/20 text-maroon border border-gold/30'
                  }`}>
                    {msg.source === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div
                    className={`p-3.5 text-[15px] leading-relaxed ${
                      msg.source === 'user'
                        ? 'bg-maroon text-ivory rounded-2xl rounded-tr-sm shadow-md'
                        : 'bg-white text-stone-800 rounded-2xl rounded-tl-sm shadow-md border border-stone/10 prose prose-stone max-w-none'
                    }`}
                  >
                    {msg.source === 'user' ? (
                      msg.text
                    ) : (
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-3 text-stone-400 text-sm">
                  <div className="w-8 h-8 rounded-full bg-gold/10 text-maroon/50 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="animate-pulse" />
                  </div>
                  <span className="animate-pulse font-medium">Analysing SUVADI texts...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-stone/10">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question (English or Tamil)..."
                  className="flex-1 bg-stone/5 border border-stone/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-maroon/20 focus:border-maroon/30 transition-all font-medium text-stone-800"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-12 h-12 bg-maroon text-ivory rounded-xl flex items-center justify-center hover:bg-maroon-dark shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex-shrink-0"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Chatbot;
