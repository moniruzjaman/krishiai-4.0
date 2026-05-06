import React, { useState, useRef, useEffect } from 'react';
import { identifyPlantSpecimen, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { GroundingChunk } from '../types';
import ShareDialog from './ShareDialog';

interface StudentHubProps {
  onAction: (xp: number) => void;
}

const StudentHub: React.FC<StudentHubProps> = ({ onAction }) => {
  const [activeMode, setActiveMode] = useState<'scan' | 'quiz' | 'flashcards' | 'dictionary'>('scan');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<{ text: string, groundingChunks: GroundingChunk[] } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setIsLoading(true); setReport(null);

        // Warm up AudioContext
        if (!audioContextRef.current) { 
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); 
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        try {
          const res = await identifyPlantSpecimen(base64, file.type);
          setReport(res); 
          
          // Eager parallel TTS initiation
          if (res.text) {
            playTTS(res.text);
          }
          onAction(30);
        } catch (err) { alert("শনাক্তকরণ ব্যর্থ হয়েছে।"); }
        finally { setIsLoading(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const playTTS = async (text: string) => {
    if (isPlaying) { stopTTS(); return; }
    try {
      setIsPlaying(true);
      if (!audioContextRef.current) { 
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); 
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const base64 = await generateSpeech(text.replace(/[*#_~]/g, ''));
      const audioBuffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch (e) { setIsPlaying(false); }
  };

  const stopTTS = () => { if (currentSourceRef.current) { currentSourceRef.current.stop(); currentSourceRef.current = null; } setIsPlaying(false); };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      {isShareOpen && <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="উদ্ভিদ বিজ্ঞান রিপোর্ট" content={report?.text || ""} />}
      
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => { window.history.back(); stopTTS(); }} className="p-3 bg-white rounded-2xl shadow-sm border"><svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
        <div><h1 className="text-3xl font-black text-gray-800 tracking-tight">বিজ্ঞান ও ছাত্র কর্নার</h1></div>
      </div>

      <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm mb-8 border border-slate-200 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveMode('scan')} className={`flex-none px-8 py-3 text-xs font-black rounded-[1.5rem] transition-all ${activeMode === 'scan' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>উদ্ভিদ শনাক্তকরণ</button>
      </div>

      {activeMode === 'scan' && (
        <div className="space-y-8 animate-fade-in">
           {!isLoading && (
             <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 text-center relative overflow-hidden group">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl mb-4">নমুনা ছবি আপলোড করুন</button>
             </div>
           )}
           
           {isLoading && (
             <div className="flex flex-col items-center justify-center py-24 space-y-8 bg-white rounded-[3rem] border">
               <div className="relative">
                 <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-spin border-t-blue-600"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-2xl">🌱</div>
               </div>
               <p className="font-black text-slate-400 uppercase tracking-widest text-xs">উদ্ভিদ বিশ্লেষণ চলছে...</p>
             </div>
           )}

           {report && !isLoading && (
             <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl animate-fade-in border-t-[14px] border-blue-600 relative overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start mb-10 pb-8 border-b border-slate-100 gap-6 relative z-10">
                   <div className="flex items-center space-x-5">
                     <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-3xl shadow-xl">🎓</div>
                     <div><h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">উদ্ভিদ বিজ্ঞান রিপোর্ট</h3></div>
                   </div>
                   <div className="flex items-center space-x-2">
                      <button onClick={() => setIsShareOpen(true)} className="p-5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-90" title="শেয়ার করুন">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      </button>
                      <button onClick={() => playTTS(report.text)} className={`p-5 rounded-full shadow-2xl transition-all active:scale-90 ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>{isPlaying ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>}</button>
                   </div>
                </div>
                <div className="prose prose-slate max-w-none text-slate-800 leading-[1.8] font-medium text-lg whitespace-pre-wrap">{report.text}</div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default StudentHub;