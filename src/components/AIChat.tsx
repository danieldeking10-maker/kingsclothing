// src/components/AIChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, X } from 'lucide-react';
import { chatWithAI } from '../services/aiAgentService';

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isTyping) return;

    // Add user message
    const userMessage = { role: 'user' as const, content: inputText };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const systemPrompt = `You are a helpful AI shopping assistant for Kings Clothing, a premium streetwear brand based in Ghana. Answer questions about products, sizing, shipping, and the brand. Keep responses friendly and concise.`;
      
      const response = await chatWithAI(
        messages.concat(userMessage).map(m => ({ role: m.role, content: m.content })),
        systemPrompt
      );

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble responding right now. Please try again later.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-accent text-black p-4 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-[#1a1a1b] border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/30">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-accent" />
          <h3 className="font-display font-bold tracking-tight uppercase text-sm">Kings AI Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm uppercase tracking-widest font-bold">How can I help you today?</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent text-black rounded-tr-sm'
                  : 'bg-white/5 text-white rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 p-3 rounded-2xl rounded-tl-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about our products..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-accent placeholder-white/20"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="bg-accent text-black p-2 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
