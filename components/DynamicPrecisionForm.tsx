
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';

interface Field {
  id: string;
  label: string;
  type: 'select' | 'range' | 'text' | 'date' | 'textarea' | 'number';
  options?: string[];
  hint?: string;
  protocolBasis?: string;
}

interface DynamicPrecisionFormProps {
  fields: Field[];
  onSubmit: (data: Record<string, string>) => void;
  lang: Language;
  isLoading?: boolean;
  toolProtocol: string;
}

const DynamicPrecisionForm: React.FC<DynamicPrecisionFormProps> = ({ fields, onSubmit, lang, isLoading, toolProtocol }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [expandedInfo, setExpandedInfo] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      recognitionRef.current.onresult = (event: any) => {
        if (activeVoiceField) {
          const text = event.results[0][0].transcript;
          setFormData(prev => ({ ...prev, [activeVoiceField]: text }));
          setActiveVoiceField(null);
        }
      };
      recognitionRef.current.onerror = () => setActiveVoiceField(null);
      recognitionRef.current.onend = () => setActiveVoiceField(null);
    }
  }, [activeVoiceField, lang]);

  const toggleVoice = (id: string) => {
    if (activeVoiceField === id) recognitionRef.current?.stop();
    else { setActiveVoiceField(id); recognitionRef.current?.start(); }
  };

  const renderFieldInput = (field: Field, index: number) => {
    const fieldId = field.id || `field-${index}`;
    switch (field.type) {
      case 'select':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {field.options?.map((opt, optIndex) => (
              <button
                key={`${opt}-${optIndex}`}
                type="button"
                onClick={() => setFormData({ ...formData, [fieldId]: opt })}
                className={`py-4 px-5 rounded-2xl text-[12px] font-black uppercase transition-all border-2 flex items-center justify-between ${
                  formData[fieldId] === opt 
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl scale-[1.02]' 
                  : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:bg-slate-50'
                }`}
              >
                <span>{opt}</span>
                {formData[fieldId] === opt && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
              </button>
            ))}
          </div>
        );
      case 'date':
        return (
          <div className="relative group">
            <input
              type="date"
              value={formData[fieldId] || ''}
              onChange={(e) => setFormData({ ...formData, [fieldId]: e.target.value })}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner appearance-none"
            />
          </div>
        );
      case 'textarea':
        return (
          <div className="relative group">
            <textarea
              value={formData[fieldId] || ''}
              onChange={(e) => setFormData({ ...formData, [fieldId]: e.target.value })}
              placeholder={lang === 'bn' ? "বিস্তারিত লিখুন..." : "Write details..."}
              className="w-full bg-white border-2 border-slate-100 rounded-3xl py-5 px-6 pr-14 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner min-h-[120px] resize-none"
            />
            <button type="button" onClick={() => toggleVoice(fieldId)} className={`absolute right-4 top-5 p-3 rounded-2xl transition-all shadow-lg ${activeVoiceField === fieldId ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}>🎙️</button>
          </div>
        );
      case 'number':
        return (
          <input
            type="number"
            value={formData[fieldId] || ''}
            onChange={(e) => setFormData({ ...formData, [fieldId]: e.target.value })}
            className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner"
          />
        );
      case 'text':
      default:
        return (
          <div className="relative group">
            <input
              type="text"
              value={formData[fieldId] || ''}
              onChange={(e) => setFormData({ ...formData, [fieldId]: e.target.value })}
              placeholder={lang === 'bn' ? "এখানে লিখুন..." : "Type here..."}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl py-4 px-6 pr-14 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner"
            />
            <button type="button" onClick={() => toggleVoice(fieldId)} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all shadow-md ${activeVoiceField === fieldId ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}>🎙️</button>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up py-4">
      <div className="bg-white/60 backdrop-blur-xl rounded-[3.5rem] p-8 md:p-12 border-2 border-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
           <div className="flex items-center space-x-5">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.8rem] flex items-center justify-center text-3xl shadow-2xl">🔬</div>
              <div>
                 <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">সায়েন্টিফিক অডিট চেকলিস্ট</h3>
                 <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em]">Data Verification Protocol Active</p>
              </div>
           </div>
           <div className="bg-white px-5 py-2.5 rounded-2xl border-2 border-emerald-100 shadow-sm flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
              <div><p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Active Protocol</p><p className="text-[12px] font-black text-emerald-700">{toolProtocol}</p></div>
           </div>
        </div>

        <div className="space-y-12">
          {fields.map((field, index) => {
            const fieldId = field.id || `field-${index}`;
            return (
            <div key={fieldId} className="space-y-4 group relative border-b border-slate-50 pb-8 last:border-0 last:pb-0">
              <div className="flex justify-between items-start">
                 <div className="space-y-1.5 flex-1 pr-10">
                    <div className="flex flex-wrap items-center gap-3">
                       <label className="text-lg font-black text-slate-800 leading-tight">{field.label}</label>
                       {field.protocolBasis && (
                         <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter border border-blue-100">
                           {field.protocolBasis}
                         </span>
                       )}
                       <button type="button" onClick={() => setExpandedInfo(expandedInfo === fieldId ? null : fieldId)} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${expandedInfo === fieldId ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-300'}`}>?</button>
                    </div>
                    {field.hint && expandedInfo === fieldId && <p className="text-xs font-bold text-blue-600 mt-2 bg-blue-50 p-4 rounded-xl">{field.hint}</p>}
                 </div>
              </div>
              <div className="animate-fade-in">{renderFieldInput(field, index)}</div>
            </div>
          )})}
        </div>

        <div className="mt-16 space-y-4">
          <button 
            type="button"
            onClick={() => onSubmit(formData)}
            disabled={isLoading}
            className="w-full bg-[#0A8A1F] text-white py-6 rounded-[2.2rem] font-black text-xl shadow-[0_20px_50px_rgba(10,138,31,0.3)] active:scale-95 transition-all flex items-center justify-center space-x-4 disabled:bg-slate-300"
          >
            {isLoading ? <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <span>অডিট সম্পন্ন করুন</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DynamicPrecisionForm;
