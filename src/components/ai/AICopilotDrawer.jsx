import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ShieldCheck,
  Award,
  ArrowRight,
  HelpCircle,
  Zap
} from 'lucide-react';
import { getAICopilotResponse, classifyServiceQuery } from '../../services/aiEngine';

export const AICopilotDrawer = () => {
  const { isCopilotOpen, setIsCopilotOpen, currentUser, setSelectedProviderForBooking, providers } = useApp();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'ai',
      text: "Namaste! I'm Zolve's AI Assistant. How can I help you today? You can describe any household issue, inquire about transparent pricing, or ask about our cooperative member model.",
      time: 'Just now'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  if (!isCopilotOpen) return null;

  const handleSend = (textToSend = null) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const aiReplyText = getAICopilotResponse(query, currentUser?.role || 'customer');
      const classification = classifyServiceQuery(query);

      const aiMsg = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        classification,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between">
          {/* Header */}
          <div className="px-6 py-4 bg-brand-950 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-coop-500 flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display">Zolve AI Copilot</h3>
                <p className="text-[10px] text-coop-300">Natural Language Service Intelligence</p>
              </div>
            </div>

            <button
              onClick={() => setIsCopilotOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto text-[11px] shrink-0">
            {[
              "My kitchen sink is leaking",
              "How does cooperative dividend work?",
              "How is Razorpay payment verified?",
              "4-step verification standards"
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-brand-300 text-slate-700 font-medium whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {messages.map((m) => {
              const isMe = m.sender === 'user';
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[90%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-brand-900 text-white rounded-br-none'
                        : 'bg-slate-100 text-slate-900 rounded-bl-none'
                    }`}
                  >
                    <p>{m.text}</p>

                    {/* If classification matched, show quick booking chip */}
                    {m.classification && m.classification.confidence > 0.8 && (
                      <div className="mt-3 p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-900 space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-coop-700">{m.classification.serviceName}</span>
                          <span className="text-slate-500">₹{m.classification.estimatedPriceRange.min} - ₹{m.classification.estimatedPriceRange.max}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">{m.classification.explanation}</p>
                        <button
                          onClick={() => {
                            const topProvider = providers.find(p => p.serviceCategories?.some(c => c.includes(m.classification.subcategory))) || providers[0];
                            setSelectedProviderForBooking(topProvider);
                            setIsCopilotOpen(false);
                          }}
                          className="w-full py-1.5 rounded-lg bg-brand-900 text-white text-[11px] font-bold flex items-center justify-center gap-1 mt-1 hover:bg-brand-800"
                        >
                          <span>Book Top Matched Provider</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">{m.time}</span>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                <Sparkles className="w-3.5 h-3.5 text-coop-600 animate-spin" />
                <span>Zolve AI analyzing requirements...</span>
              </div>
            )}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask anything or describe your issue..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-brand-900 hover:bg-brand-800 text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
