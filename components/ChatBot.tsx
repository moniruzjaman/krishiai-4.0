
import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, getLiveWeather } from '../services/geminiService';
import { getStoredLocation, saveStoredLocation } from '../services/locationService';
import { ChatMessage, UserCrop, WeatherData, User, View } from '../types';

interface ChatBotProps {
  user?: User;
  userRank?: string;
  userCrops?: UserCrop[];
  onAction?: () => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
}

const PERSONAS = [
  { id: 'নবিশ কৃষক', label: 'নবিশ', icon: '🌱', desc: 'সহজ ভাষায় পরামর্শ' },
  { id: 'অভিজ্ঞ কৃষক', label: 'অভিজ্ঞ', icon: '🌿', desc: 'উন্নত চাষ পদ্ধতি' },
  { id: 'মাস্টার এগ্রোনোমিস্ট', label: 'মাস্টার', icon: '🎓', desc: 'গবেষণাধর্মী তথ্য' }
];

const thinkingMessages = [
  "আপনার প্রশ্নের প্রেক্ষাপট বিশ্লেষণ করা হচ্ছে...",
  "মাঠের ভৌগোলিক অবস্থান ও স্যাটেলাইট ম্যাপ ডাটা যাচাই চলছে...",
  "নিকটস্থ ডিএই (DAE) অফিস ও উপকরণ কেন্দ্রের লোকেশন শনাক্ত করা হচ্ছে...",
  "BARC ও BARI এর সর্বশেষ নির্দেশিকা অনুযায়ী তথ্য সমন্বয় করা হচ্ছে...",
  "আপনার জন্য বিশেষজ্ঞ পরামর্শ ও ম্যাপ লিংক প্রস্তুত হচ্ছে..."
];

const initialMessage: ChatMessage = { 
  id: '1', 
  role: 'model', 
  text: 'আসসালামু আলাইকুম! আমি আপনার কৃষি সহকারী। কৃষি পদ্ধতি, বাজার দর বা আপনার এলাকার নিকটস্থ বীজ ও বালাইনাশক বিক্রেতা সম্পর্কে যেকোনো প্রশ্ন করতে পারেন।' 
};

const ChatBot: React.FC<ChatBotProps> = ({ user, userRank, userCrops = [], onAction, onBack }) => {

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [activePersona, setActivePersona] = useState<string>(userRank || 'নবিশ কৃষক');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  const fetchWeatherWithLocation = async () => {
    const stored = getStoredLocation();
    if (stored) {
      try {
        const data = await getLiveWeather(stored.lat, stored.lng);
        setWeather(data);
        return;
      } catch (_e) {
        console.error("Failed to fetch weather from stored location in ChatBot", _e);
      }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        saveStoredLocation(latitude, longitude);
        try {
          const data = await getLiveWeather(latitude, longitude);
          setWeather(data);
        } catch {
          console.error("Failed to fetch weather from geolocation in ChatBot");
        }
      }, (err) => {
        console.warn("Geolocation permission denied for ChatBot", err);
      });
    }
  };

  useEffect(() => {
    fetchWeatherWithLocation();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => setInputText(prev => prev + ' ' + event.results[0][0].transcript); // eslint-disable-line @typescript-eslint/no-explicit-any
      recognitionRef.current.onend = () => setIsListening(false);
    }
    const saved = localStorage.getItem('agritech_chat_history');
    setMessages(saved ? JSON.parse(saved) : [initialMessage]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) interval = setInterval(() => setLoadingStep(prev => (prev + 1) % thinkingMessages.length), 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    localStorage.setItem('agritech_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputText('');
    setIsLoading(true);
    setLoadingStep(0);

    try {
      const history = messages.filter(m => !m.isError).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await sendChatMessage(history, userMsg.text, activePersona, user?.role || 'farmer_entrepreneur', weather || undefined, userCrops);
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: response.text || "উত্তর দিতে পারিনি।", groundingChunks: response.groundingChunks };
      setMessages(prev => [...prev, botMsg]);
      if (onAction) onAction();
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "দুঃখিত, একটি সমস্যা হয়েছে।", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToMap = () => {
    // Dispatch custom event to navigate with context
    window.dispatchEvent(new CustomEvent('agritech_navigate', { 
        detail: View.MAPS,
        // We could pass query data here if the View supported initial state
    }));
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-xl overflow-hidden mt-4 font-sans">
      <div className="bg-[#0A8A1F] p-4 text-white flex justify-between items-center shadow-md relative z-10">
        <div className="flex items-center">
          <button onClick={onBack} className="p-2 mr-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 shadow-inner">🤖</div>
          <div><h2 className="text-lg font-black leading-none">কৃষি জিজ্ঞাসা ও সহায়তা</h2><p className="text-[9px] font-bold text-green-100 uppercase tracking-widest opacity-70">Context Aware Mapping AI</p></div>
        </div>
      </div>

      <div className="flex bg-slate-50 p-2 border-b border-slate-100 justify-center">
        <div id="chat-persona-selector" className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex space-x-1 max-w-sm w-full">
          {PERSONAS.map(persona => (
            <button key={persona.id} onClick={() => setActivePersona(persona.id)} className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all ${activePersona === persona.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>
              <span className="text-sm">{persona.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">{persona.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-5 py-3 rounded-[1.5rem] shadow-sm max-w-[85%] ${msg.role === 'user' ? 'bg-[#0A8A1F] text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</div>
              {msg.groundingChunks?.map((chunk, idx) => chunk.maps && (
                <div key={idx} className="mt-3">
                    <button 
                        onClick={() => handleNavigateToMap()}
                        className="w-full bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-emerald-700 text-xs font-black uppercase flex items-center justify-between hover:bg-emerald-100 transition-all"
                    >
                       <span>📍 {chunk.maps.title}</span>
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </button>
                </div>
              ))}
              {msg.role === 'model' && msg.text.includes('ম্যাপ') && (
                <button onClick={() => window.dispatchEvent(new CustomEvent('agritech_navigate', { detail: View.MAPS }))} className="mt-3 w-full bg-slate-900 text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">লাইভ ম্যাপে দেখুন</button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-emerald-50 p-6 rounded-[2.5rem] rounded-bl-none max-w-[85%] shadow-sm border border-emerald-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl animate-pulse"></div>
               <div className="flex items-center space-x-3 mb-4">
                  <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">AI Expert Assistant Thinking...</span>
               </div>
               <p className="text-sm font-bold text-slate-700 transition-all duration-500 mb-4">{thinkingMessages[loadingStep]}</p>
               <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex gap-1 px-0.5 py-0.5">
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= loadingStep ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-slate-300'}`}></div>
                  ))}
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100 space-y-4">
        <div className="flex overflow-x-auto space-x-2 pb-1 scrollbar-hide">
          {['নিকটস্থ সার ও বিষের দোকান কোথায়?', 'আমার এলাকার কৃষি অফিস কোথায়?', 'নিকটস্থ এনজিও বা কৃষি হাব খুঁজুন'].map(txt => (
            <button key={txt} onClick={() => handleSend(txt)} className="bg-white border border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-[11px] font-black whitespace-nowrap shadow-sm hover:bg-emerald-50">{txt}</button>
          ))}
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="জিজ্ঞাসা করুন..." className="w-full border border-gray-200 rounded-2xl px-5 py-4 pr-12 focus:ring-2 focus:ring-[#0A8A1F] outline-none text-sm font-medium" disabled={isLoading} />
            <button onClick={() => isListening ? recognitionRef.current?.stop() : recognitionRef.current?.start()} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400'}`}>🎙️</button>
          </div>
          <button onClick={() => handleSend()} disabled={isLoading || !inputText.trim()} className={`p-4 rounded-2xl text-white shadow-xl ${isLoading || !inputText.trim() ? 'bg-gray-300' : 'bg-[#0A8A1F]'}`}><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
