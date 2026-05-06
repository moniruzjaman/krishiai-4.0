import React, { useState, useEffect, useRef } from 'react';

interface QRGeneratorProps {
  onAction?: () => void;
  // Fix: Added missing onBack prop
  onBack?: () => void;
}

const QRGenerator: React.FC<QRGeneratorProps> = ({ onAction, onBack }) => {
  const [product, setProduct] = useState('ধান (বিআর-২৮)');
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('ধামরাই, ঢাকা');
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [isListeningField, setIsListeningField] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => {};
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (isListeningField === 'product') setProduct(transcript);
        if (isListeningField === 'location') setLocation(transcript);
      };
      recognitionRef.current.onerror = () => setIsListeningField(null);
      recognitionRef.current.onend = () => setIsListeningField(null);
    }
  }, [isListeningField]);

  const toggleListening = (field: string) => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListeningField === field) {
      recognitionRef.current.stop();
    } else {
      setIsListeningField(field);
      recognitionRef.current.start();
    }
  };

  const handleGenerate = () => {
    const data = `AgriTech: ${product} | Harvested: ${harvestDate} | Source: ${location} | Status: Verified`;
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
    setQrUrl(url);
    setTrackingId(Math.random().toString(36).substring(2, 11).toUpperCase());
    if (onAction) onAction();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 font-sans animate-fade-in">
      <div className="flex items-center space-x-4 mb-8">
        {/* Fix: Changed to use onBack prop */}
        <button onClick={() => onBack?.()} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-90 text-slate-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-800">QR কোড জেনারেটর</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Traceability & Labelling Tool</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 space-y-6">
          <h2 className="text-lg font-black text-gray-700">পণ্যের তথ্য দিন</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">ফসলের নাম ও জাত</label>
                <button onClick={() => toggleListening('product')} className={`p-1 rounded-lg transition-all ${isListeningField === 'product' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
              </div>
              <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-green-600 focus:outline-none font-bold shadow-inner" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">কর্তনের তারিখ</label>
              <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-green-600 focus:outline-none font-bold shadow-inner" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">এলাকা/উৎস</label>
                <button onClick={() => toggleListening('location')} className={`p-1 rounded-lg transition-all ${isListeningField === 'location' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                </button>
              </div>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-green-600 focus:outline-none font-bold shadow-inner" />
            </div>
            <button onClick={handleGenerate} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 text-sm uppercase tracking-widest">জেনারেট করুন</button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-6">
          {qrUrl ? (
            <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-4 border-gray-900 flex flex-col items-center animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-[#0A8A1F]"></div>
              <img src={qrUrl} alt="QR Code" className="w-64 h-64 mb-6 shadow-sm" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Generated Tracking ID</p>
              <p className="font-bold text-gray-800">#{trackingId}</p>
              <button onClick={() => window.print()} className="mt-6 text-green-600 font-black text-xs uppercase tracking-widest border-b-2 border-green-600 pb-1 hover:text-green-700">ডাউনলোড ও প্রিন্ট</button>
            </div>
          ) : (
            <div className="w-full aspect-square bg-gray-100 rounded-[3rem] border-4 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
               <span className="text-6xl mb-4">📲</span>
               <p className="font-bold text-sm">তথ্য দিয়ে কিউআর কোড তৈরি করুন</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;