
import React, { useState, useRef, useEffect } from 'react';
import { getAgriPodcastSummary, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { GroundingChunk } from '../types';
import ShareDialog from './ShareDialog';

interface AgriPodcastProps {
  onAction?: (xp: number) => void;
  onShowFeedback?: () => void;
  // Fix: Added missing onBack prop
  onBack?: () => void;
}

const podcastThemes = [
  { id: 'news', title: 'আজকের কৃষি সংবাদ', icon: '📰', prompt: 'বাংলাদেশের আজকের প্রধান কৃষি খবর এবং বাজার দর।' },
  { id: 'rice', title: 'ধান চাষের লাভজনক টিপস', icon: '🌾', prompt: 'উন্নত ফলন ও মুনাফার জন্য ধান চাষের বৈজ্ঞানিক ও লাভজনক পদ্ধতি।' },
  { id: 'soil', title: 'মাটির স্বাস্থ্য রক্ষা', icon: '🏺', prompt: 'দীর্ঘমেয়াদী উর্বরতা ধরে রাখতে মাটির জৈব ব্যবস্থাপনা।' },
  { id: 'tech', title: 'স্মার্ট কৃষি প্রযুক্তি', icon: '🛰️', prompt: 'চাষাবাদে এআই এবং ড্রোন প্রযুক্তির ব্যবহার।' },
  { id: 'pest', title: 'জৈবিক বালাই দমন', icon: '🐞', prompt: 'পরিবেশবান্ধব উপায়ে পোকা ও রোগ নিয়ন্ত্রণ।' }
];

const thinkingMessages = [
  "গবেষণা তথ্য বিশ্লেষণ করা হচ্ছে...",
  "পডকাস্ট স্ক্রিপ্ট তৈরি হচ্ছে...",
  "বিশেষজ্ঞ মতামত সমন্বয় করা হচ্ছে...",
  "অডিও জেনারেট করার জন্য প্রস্তুত হচ্ছে...",
  "স্টুডিও রেন্ডারিং শেষ পর্যায়ে..."
];

const AgriPodcast: React.FC<AgriPodcastProps> = ({ onAction, onShowFeedback, onBack }) => {
  const [customTopic, setCustomTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [podcastData, setPodcastData] = useState<{ text: string, groundingChunks: GroundingChunk[] } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % thinkingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        setCustomTopic(event.results[0][0].transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const generatePodcast = async (topic: string) => {
    setIsLoading(true);
    setPodcastData(null);
    setPlaybackProgress(0);
    stopPlayback();

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    try {
      const data = await getAgriPodcastSummary(topic);
      setPodcastData(data);
      
      if (data.text) {
        await startPlayback(data.text);
      }
      if (onAction) onAction(40);
      if (onShowFeedback) onShowFeedback();
    } catch {
      alert("পডকাস্ট তৈরি করা সম্ভব হয়নি।");
    } finally {
      setIsLoading(false);
    }
  };

  const startPlayback = async (text: string) => {
    try {
      setIsPlaying(true);
      const ctx = audioContextRef.current!;
      if (ctx.state === 'suspended') await ctx.resume();
      
      const cleanText = text.replace(/[*#_~]/g, '');
      const base64Audio = await generateSpeech(cleanText);
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      const duration = audioBuffer.duration;
      let elapsed = 0;
      
      playbackIntervalRef.current = setInterval(() => {
        elapsed += 0.5;
        setPlaybackProgress(Math.min(100, (elapsed / duration) * 100));
        if (elapsed >= duration) stopPlayback();
      }, 500);

      source.onended = () => stopPlayback();
      currentSourceRef.current = source;
      source.start(0);
    } catch {
      setIsPlaying(false);
    }
  };

  const stopPlayback = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in font-sans min-h-screen">
      {isShareOpen && <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="কৃষি পডকাস্ট সারাংশ" content={podcastData?.text || ""} />}
      
      <div className="flex items-center space-x-4 mb-8">
        {/* Fix: Use onBack prop if available */}
        <button onClick={() => { if (onBack) { onBack(); } else { window.history.back(); } stopPlayback(); }} className="p-3 bg-white rounded-2xl shadow-sm border hover:bg-slate-50 transition-all active:scale-90 text-slate-400">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">এআই পডকাস্ট স্টুডিও</h1>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">AI-Powered Audio Summaries</p>
        </div>
      </div>

      {!podcastData && !isLoading ? (
        <div className="space-y-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
             <div className="w-24 h-24 bg-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto text-5xl shadow-xl text-white mb-6">🎙️</div>
             <h2 className="text-2xl font-black text-slate-800 mb-4">আপনার পডকাস্ট টপিক বেছে নিন</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                {podcastThemes.map(theme => (
                  <button 
                    key={theme.id}
                    onClick={() => { generatePodcast(theme.prompt); }}
                    className="p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl hover:border-emerald-500 hover:bg-emerald-50 transition-all active:scale-95 text-left group"
                  >
                     <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{theme.icon}</div>
                     <h4 className="font-black text-sm text-slate-700">{theme.title}</h4>
                  </button>
                ))}
             </div>
             <div className="border-t border-slate-100 pt-8">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">অথবা আপনার নিজস্ব বিষয় লিখুন</p>
                <div className="flex gap-2">
                   <div className="flex-1 relative">
                      <input 
                        type="text" 
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder="যেমন: টমেটো চাষের সমস্যা ও সমাধান..."
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-12 font-bold text-slate-700 outline-none focus:border-emerald-500"
                        onKeyDown={(e) => e.key === 'Enter' && generatePodcast(customTopic)}
                      />
                      <button onClick={toggleListening} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400'}`}>
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </button>
                   </div>
                   <button onClick={() => generatePodcast(customTopic)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95">জেনারেট</button>
                </div>
             </div>
          </div>
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-[3rem] p-16 md:p-24 shadow-2xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-10 animate-fade-in">
           <div className="relative w-32 h-32">
              <div className="absolute inset-0 border-[10px] border-emerald-50 rounded-full"></div>
              <div className="absolute inset-0 border-[10px] border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl">🎧</div>
           </div>
           <div className="max-w-md mx-auto">
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-4">{thinkingMessages[loadingStep]}</h3>
              <p className="text-sm text-slate-400 font-bold leading-relaxed">Harvesting Audio Wisdom</p>
           </div>
           <div className="w-full max-w-xs h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all duration-700" style={{ width: `${((loadingStep + 1) / thinkingMessages.length) * 100}%` }}></div>
           </div>
        </div>
      ) : (
        <div className="animate-fade-in space-y-8">
           <div className="bg-slate-900 rounded-[4rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border-b-[20px] border-emerald-500">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-48 h-48 bg-white/10 rounded-[3rem] p-6 mb-10 shadow-2xl relative group overflow-hidden border border-white/20">
                    <img src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&q=80&w=400" className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all duration-1000" alt="Podcast Art" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       {isPlaying ? (
                          <div className="flex items-end space-x-1 h-12">
                             {[1,2,3,4,5,6].map(i => <div key={i} className="w-2 bg-emerald-400 rounded-full animate-[bounce_1s_infinite]" style={{animationDelay: `${i*0.1}s`, height: `${20+Math.random()*80}%`}}></div>)}
                          </div>
                       ) : (
                          <button onClick={() => startPlayback(podcastData!.text)} className="w-20 h-20 bg-white text-emerald-700 rounded-full flex items-center justify-center shadow-2xl transform hover:scale-110 active:scale-95 transition-all">
                             <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 20 20"><path d="M4.516 7.548c.436-1.146 1.344-2.054 2.49-2.49l7.994-4a2 2 0 012.83 1.789v14.306a2 2 0 01-2.83 1.789l-7.994-4c-1.146-.436-2.054-1.344-2.49-2.49A2.015 2.015 0 014 10c0-.68.342-1.303.916-1.687L4.516 7.548z" /></svg>
                          </button>
                       )}
                    </div>
                 </div>

                 <div className="mb-10">
                    <div className="inline-flex items-center space-x-2 bg-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mb-4 border border-white/20">
                       <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                       <span>Now Playing: Daily Briefing</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight mb-2">কৃষি এআই পডকাস্ট</h2>
                    <p className="text-sm font-bold text-emerald-400 uppercase tracking-[0.2em]">Episode: AI Summary</p>
                 </div>

                 <div className="w-full max-w-lg space-y-4">
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${playbackProgress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                       <span>{Math.floor(playbackProgress)}%</span>
                       <span>Auto-Generated Summary</span>
                    </div>
                 </div>

                 <div className="flex items-center space-x-6 mt-12">
                    <button onClick={() => setPodcastData(null)} className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-all">
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                    <button onClick={() => isPlaying ? stopPlayback() : startPlayback(podcastData!.text)} className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95">
                       {isPlaying ? (
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                       ) : (
                          <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                       )}
                    </button>
                    <button onClick={() => setIsShareOpen(true)} className="p-4 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-all">
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center">
                 <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-3"></span>
                 পডকাস্ট স্ক্রিপ্ট (Transcript)
              </h3>
              <div className="prose prose-slate max-w-none text-slate-700 font-medium leading-relaxed whitespace-pre-wrap text-lg">
                 {podcastData?.text}
              </div>
              
              {podcastData?.groundingChunks && podcastData.groundingChunks.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-50">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">তথ্যসূত্র (Grounding):</h4>
                   <div className="flex flex-wrap gap-2">
                      {podcastData.groundingChunks.map((chunk, idx) => chunk.web ? (
                        <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black border border-blue-100 hover:bg-blue-100 transition-all">
                           {chunk.web.title}
                        </a>
                      ) : null)}
                   </div>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default AgriPodcast;
