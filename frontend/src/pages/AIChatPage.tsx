import React, { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import { Bot, Send, User, Sparkles, Database, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  contextUsed?: any[];
  model?: string;
  timestamp: string;
}

export const AIChatPage: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello, Operator. I am your autonomous SOC AI Analyst assistant. You can ask me natural-language queries about live security events, active incidents, attacker IP reputations, and threat postures. All responses are strictly grounded in verified database telemetry.",
      timestamp: new Date().toLocaleTimeString(),
      model: 'gemini-2.5-flash'
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await api.sendAIChat(textToSend.trim());
      const aiMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: res.reply,
        contextUsed: res.context_used,
        model: res.model_name,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: `Error contacting SOC AI assistant: ${err.message || 'Service offline.'}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const sampleQueries = [
    "Show critical incidents today",
    "Which IP generated the most alerts?",
    "Summarize current SOC security posture",
    "What attacks have been detected recently?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              SOC ASSISTANT CHAT
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Live Data Retrieval
              </span>
            </h2>
            <p className="text-xs text-slate-400">Safe controlled telemetry queries without direct SQL execution</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Zero Execution Sandbox</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-mono font-bold ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-cyan-400 border border-slate-700'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-2xl rounded-2xl p-4 text-xs font-mono space-y-2 ${
                msg.sender === 'user'
                  ? 'bg-cyan-600/20 border border-cyan-500/30 text-slate-100'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-200 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-bold text-slate-400 uppercase">
                  {msg.sender === 'user' ? user?.username || 'Operator' : msg.model || 'AI SOC Analyst'}
                </span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="whitespace-pre-line leading-relaxed font-sans text-xs">
                {msg.text}
              </div>

              {msg.contextUsed && msg.contextUsed.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-cyan-400">
                  <Database className="w-3 h-3" />
                  <span>Retrieved {msg.contextUsed.length} verified SOC telemetry contexts</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-400 flex items-center gap-2">
              <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>Querying database telemetry and synthesizing answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono">
        <span className="text-slate-500 text-[11px] shrink-0">Quick Queries:</span>
        {sampleQueries.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={sending}
            className="px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] shrink-0 transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about live incidents, alerts, top attackers, or system risk..."
          disabled={sending}
          className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
