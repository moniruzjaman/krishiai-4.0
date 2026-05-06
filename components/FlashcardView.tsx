
import React, { useState, useEffect, useRef } from 'react';
import { getAgriFlashCards } from '../services/geminiService';
import { FlashCard } from '../types';

interface FlashcardViewProps {
  onAction: (xp: number) => void;
  onBack: () => void;
}

const FlashcardView: React.FC<FlashcardViewProps> = ({ onAction, onBack }) => {
  const [topicInput, setTopicInput] = useState('');
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'input' | 'learning'>('input');
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTopicInput(transcript);
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

  const handleGenerateCards = async () => {
    if (!topicInput.trim()) {
      alert("অনুগ্রহ করে একটি বিষয় লিখুন।");
      return;
    }
    setIsLoading(true);
    setHasCompleted(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    try {
      const data = await getAgriFlashCards(topicInput);
      if (data && data.length > 0) {
        setCards(data);
        setViewMode('learning');
      } else {
        alert("কোনো কার্ড তৈরি করা সম্ভব হয়নি। অন্য বিষয় চেষ্টা করুন।");
      }
    } catch (error) {
      console.error("Failed to fetch flashcards", error);
      alert("কার্ড তৈরিতে সমস্যা হয়েছে।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else if (!hasCompleted) {
      setHasCompleted(true);
      onAction(50); // Reward XP for completing the deck
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const resetDeck = () => {
    setViewMode('input');
    setTopicInput('');
    setCards([]);
    setHasCompleted(false);
  };

  if (viewMode === 'input') {
    return (
      <div className="max-w-xl mx-auto p-4 animate-fade-in font-sans">
        <div className="flex items-center space-x-4 mb-10">
          <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-90 text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 leading-none">কৃষি ফ্ল্যাশকার্ড</h1>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Smart Learning Deck</p>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 opacity-40"></div>
          <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center mx-auto text-4xl shadow-inner border border-amber-100">🎴</div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">শিখতে চান এমন একটি বিষয় লিখুন</h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              যেমন: ধান চাষ, সারের প্রয়োগ, জৈবিক বালাইনাশক অথবা মাটির উর্বরতা। AI আপনার জন্য কার্ড সেট তৈরি করবে।
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative">
                <input 
                  type="text" 
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="বিষয় লিখুন (যেমন: ধান চাষের ধাপসমূহ)"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 pr-12 font-bold text-slate-700 outline-none focus:border-amber-500 shadow-inner transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateCards()}
                />
                <button 
                  onClick={toggleListening}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-amber-600'}`}
                  title="Voice Input"
                >
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
            </div>
            <button 
              onClick={handleGenerateCards}
              disabled={isLoading}
              className="w-full bg-amber-600 text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl active:scale-95 flex items-center justify-center space-x-3 disabled:bg-slate-300"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>কার্ড তৈরি করুন</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={resetDeck} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-90">
            <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-slate-800 leading-none truncate">ফ্ল্যাশকার্ড</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1 truncate">বিষয়: {topicInput}</p>
          </div>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black shrink-0">
          {currentIndex + 1} / {cards.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full mb-12 overflow-hidden shadow-inner">
        <div 
          className="h-full bg-emerald-500 transition-all duration-500 ease-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Card Container with Flip Logic */}
      <div className="perspective-1000">
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative w-full aspect-[4/5] cursor-pointer transition-all duration-700 preserve-3d shadow-2xl rounded-[3rem] ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front Side */}
          <div className="absolute inset-0 backface-hidden bg-white border border-slate-100 rounded-[3rem] p-10 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-4xl mb-8 shadow-inner">💡</div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
              {currentCard.front}
            </h3>
            <p className="mt-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">উত্তর দেখতে এখানে ক্লিক করুন</p>
          </div>

          {/* Back Side */}
          <div className="absolute inset-0 backface-hidden bg-slate-900 text-white rounded-[3rem] p-10 flex flex-col items-center justify-center text-center rotate-y-180 border-4 border-emerald-500/30">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl mb-6">✅</div>
            <div className="overflow-y-auto max-h-[60%] scrollbar-hide w-full px-4">
              <p className="text-lg md:text-xl font-medium leading-relaxed">
                {currentCard.back}
              </p>
            </div>
            {currentCard.hint && (
              <div className="mt-8 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-xs font-bold text-emerald-400 italic">
                ইঙ্গিত: {currentCard.hint}
              </div>
            )}
            <p className="mt-8 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">প্রশ্ন দেখতে আবার ক্লিক করুন</p>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center space-x-6 mt-12">
        <button 
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`p-6 rounded-3xl transition-all shadow-xl active:scale-90 ${currentIndex === 0 ? 'bg-slate-100 text-slate-300' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <button 
          onClick={handleNext}
          className="flex-1 bg-slate-900 text-white font-black py-6 rounded-3xl shadow-2xl active:scale-95 transition-all text-lg flex items-center justify-center space-x-3"
        >
          <span>{currentIndex === cards.length - 1 ? 'সম্পন্ন করুন' : 'পরবর্তী কার্ড'}</span>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {hasCompleted && (
        <div className="mt-8 p-8 bg-emerald-600 text-white rounded-[3rem] shadow-2xl animate-fade-in flex flex-col items-center text-center space-y-6">
           <div className="text-6xl">🏆</div>
           <div>
              <h4 className="text-2xl font-black leading-none mb-2">চমৎকার!</h4>
              <p className="text-sm font-bold opacity-80">আপনি &quot;{topicInput}&quot; সম্পর্কিত কার্ড ডেকটি সম্পন্ন করেছেন।</p>
           </div>
           <div className="bg-white/20 px-6 py-2 rounded-full font-black">+৫০ XP অর্জিত</div>
           <button 
             onClick={resetDeck}
             className="bg-white text-emerald-700 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-50 transition-all active:scale-95"
           >
             নতুন বিষয় শিখুন
           </button>
        </div>
      )}

      {/* Styles for flip effect */}
      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}} />
    </div>
  );
};

export default FlashcardView;
