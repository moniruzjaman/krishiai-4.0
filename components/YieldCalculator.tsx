import React, { useState, useEffect, useRef, useMemo } from 'react';

interface YieldCalculatorProps {
  onAction?: () => void;
  // Fix: Added missing onBack prop
  onBack?: () => void;
}

const YieldCalculator: React.FC<YieldCalculatorProps> = ({ onAction, onBack }) => {
  const [activeTab, setActiveTab] = useState<'sample' | 'factors'>('sample');
  const [isListening, setIsListening] = useState(false);
  const [activeListeningId, setActiveListeningId] = useState<string | null>(null);
  
  // Sample Cutting State
  const [sampleArea, setSampleArea] = useState<number>(25); 
  const [sampleWeight, setSampleWeight] = useState<number>(10); 
  const [moisture, setMoisture] = useState<number>(14); 
  
  // Yield Factors State 
  const [plantsPerSqm, setPlantsPerSqm] = useState<number>(25);
  const [paniclesPerPlant, setPaniclesPerPlant] = useState<number>(10);
  const [grainsPerPanicle, setGrainsPerPanicle] = useState<number>(120);
  const [thousandGrainWeight, setThousandGrainWeight] = useState<number>(24);

  const results = useMemo(() => {
    if (activeTab === 'sample') {
      const yieldPerSqm = sampleWeight / sampleArea;
      const yieldBigha = yieldPerSqm * 1337.8; 
      const yieldHectare = yieldPerSqm * 10000 / 1000; 

      return {
        perBigha: yieldBigha.toFixed(1),
        perHectare: yieldHectare.toFixed(2),
        perDecimal: (yieldBigha / 33).toFixed(1)
      };
    } else {
      const paniclesPerSqm = plantsPerSqm * paniclesPerPlant;
      const yieldTha = (paniclesPerSqm * grainsPerPanicle * thousandGrainWeight) / 100000;
      const yieldBigha = (yieldTha * 1000) * (1337.8 / 10000); 

      return {
        perBigha: yieldBigha.toFixed(1),
        perHectare: yieldTha.toFixed(2),
        perDecimal: (yieldBigha / 33).toFixed(1)
      };
    }
  }, [activeTab, sampleArea, sampleWeight, plantsPerSqm, paniclesPerPlant, grainsPerPanicle, thousandGrainWeight]);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const num = parseFloat(transcript.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          switch(activeListeningId) {
            case 'sampleArea': setSampleArea(num); break;
            case 'sampleWeight': setSampleWeight(num); break;
            case 'moisture': setMoisture(num); break;
            case 'plantsPerSqm': setPlantsPerSqm(num); break;
            case 'paniclesPerPlant': setPaniclesPerPlant(num); break;
            case 'grainsPerPanicle': setGrainsPerPanicle(num); break;
            case 'thousandGrainWeight': setThousandGrainWeight(num); break;
          }
        }
      };
      recognitionRef.current.onerror = () => {
        setIsListening(false);
        setActiveListeningId(null);
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
        setActiveListeningId(null);
      };
    }
  }, [activeListeningId]);

  const toggleListening = (id: string) => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListening && activeListeningId === id) {
      recognitionRef.current.stop();
    } else {
      setActiveListeningId(id);
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    if (onAction) onAction();
  }, [results, onAction]);

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 font-sans text-slate-900 animate-fade-in">
      <div className="flex items-center space-x-4 mb-8">
        {/* Fix: Changed to use onBack prop */}
        <button onClick={() => onBack?.()} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-100 transition-all active:scale-90">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">ফলন ক্যালকুলেটর</h1>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full inline-block border border-emerald-100">Yield Management Tool</p>
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm mb-8 border border-slate-200 sticky top-4 z-40">
        <button onClick={() => setActiveTab('sample')} className={`flex-1 py-3 text-xs font-black rounded-[1.5rem] transition-all ${activeTab === 'sample' ? 'bg-emerald-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}>নমুনা শস্য কর্তন</button>
        <button onClick={() => setActiveTab('factors')} className={`flex-1 py-3 text-xs font-black rounded-[1.5rem] transition-all ${activeTab === 'factors' ? 'bg-emerald-600 text-white shadow-xl scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'}`}>ফলন উপাদান (বায়োলজিক্যাল)</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100">
          <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
            <span className="mr-3 p-2 bg-emerald-100 rounded-xl">📊</span> 
            {activeTab === 'sample' ? 'কর্তন তথ্য' : 'জৈবিক উপাদান'}
          </h2>

          <div className="space-y-6">
            {activeTab === 'sample' ? (
              <>
                <InputField id="sampleArea" label="নমুনা প্লটের আকার (বর্গ মিটার)" value={sampleArea} onChange={setSampleArea} min={1} max={100} unit="m²" onVoice={() => toggleListening('sampleArea')} isListening={activeListeningId === 'sampleArea'} />
                <InputField id="sampleWeight" label="নমুনা থেকে প্রাপ্ত ধান/শস্যের ওজন" value={sampleWeight} onChange={setSampleWeight} min={0} max={200} unit="Kg" onVoice={() => toggleListening('sampleWeight')} isListening={activeListeningId === 'sampleWeight'} />
                <InputField id="moisture" label="আর্দ্রতার পরিমাণ (%)" value={moisture} onChange={setMoisture} min={5} max={30} unit="%" onVoice={() => toggleListening('moisture')} isListening={activeListeningId === 'moisture'} />
              </>
            ) : (
              <>
                <InputField id="plantsPerSqm" label="প্রতি বর্গ মিটারে গাছের সংখ্যা" value={plantsPerSqm} onChange={setPlantsPerSqm} min={1} max={100} unit="Plants" onVoice={() => toggleListening('plantsPerSqm')} isListening={activeListeningId === 'plantsPerSqm'} />
                <InputField id="paniclesPerPlant" label="প্রতি গাছে ছড়া/শীষের সংখ্যা" value={paniclesPerPlant} onChange={setPaniclesPerPlant} min={1} max={50} unit="Panicles" onVoice={() => toggleListening('paniclesPerPlant')} isListening={activeListeningId === 'paniclesPerPlant'} />
                <InputField id="grainsPerPanicle" label="প্রতি ছড়ায় পুষ্ট দানার সংখ্যা" value={grainsPerPanicle} onChange={setGrainsPerPanicle} min={10} max={300} unit="Grains" onVoice={() => toggleListening('grainsPerPanicle')} isListening={activeListeningId === 'grainsPerPanicle'} />
                <InputField id="thousandGrainWeight" label="১০০০ দানার ওজন (গ্রাম)" value={thousandGrainWeight} onChange={setThousandGrainWeight} min={10} max={50} unit="g" onVoice={() => toggleListening('thousandGrainWeight')} isListening={activeListeningId === 'thousandGrainWeight'} />
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden h-full flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            
            <div className="relative z-10 text-center space-y-8">
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">সম্ভাব্য মোট ফলন</p>
                <h3 className="text-6xl font-black tracking-tighter text-white">{results?.perBigha} <span className="text-xl font-bold opacity-50">কেজি</span></h3>
                <p className="text-sm font-bold text-slate-400 mt-2">প্রতি বিঘা (৩৩ শতাংশে)</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/10">
                <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10">
                   <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">হেক্টর প্রতি</p>
                   <p className="text-xl font-black">{results?.perHectare} <span className="text-[10px] font-normal opacity-50">টন</span></p>
                </div>
                <div className="bg-white/5 p-5 rounded-[2rem] border border-white/10">
                   <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">শতাংশ প্রতি</p>
                   <p className="text-xl font-black">{results?.perDecimal} <span className="text-[10px] font-normal opacity-50">কেজি</span></p>
                </div>
              </div>

              <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-[10px] font-bold text-emerald-400 italic">
                * মনে রাখবেন: এটি একটি গাণিতিক ধারণা। প্রকৃত ফলন আবহাওয়া ও ব্যবস্থাপনার ওপর নির্ভর করে।
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InputFieldProps {
  id?: string;
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  unit: string;
  onVoice: () => void;
  isListening: boolean;
}

const InputField = ({ id, label, value, onChange, min, max, unit, onVoice, isListening }: InputFieldProps) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <button 
          onClick={onVoice}
          className={`p-1 rounded-md transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-300 hover:text-emerald-600'}`}
          title="ভয়েস ইনপুট"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </button>
      </div>
      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{value} {unit}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={activeStep(label)}
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-600"
    />
  </div>
);

const activeStep = (label: string) => {
  if (label.includes('ওজন')) return 0.5;
  if (label.includes('হেক্টর')) return 0.01;
  return 1;
};

export default YieldCalculator;