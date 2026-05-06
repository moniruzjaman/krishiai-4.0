
import React, { useState, useEffect, useCallback } from 'react';

export interface TourStep {
  targetId?: string;
  title: string;
  content: string;
  position: 'center' | 'bottom' | 'top' | 'left' | 'right';
}

interface GuidedTourProps {
  steps: TourStep[];
  onClose: () => void;
  tourKey: string;
}

const GuidedTour: React.FC<GuidedTourProps> = ({ steps, onClose, tourKey }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const updateSpotlight = useCallback(() => {
    const step = steps[currentStep];
    if (step.targetId) {
      const el = document.getElementById(step.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = el.getBoundingClientRect();
        setSpotlight({
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height
        });
        return;
      }
    }
    setSpotlight(null);
  }, [currentStep, steps]);

  useEffect(() => {
    const timer = setTimeout(updateSpotlight, 300);
    window.addEventListener('resize', updateSpotlight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSpotlight);
    };
  }, [updateSpotlight]);

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`agritech_tour_${tourKey}`, 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] overflow-hidden font-sans">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id={`spotlight-mask-${tourKey}`}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlight && (
              <rect
                x={spotlight.x - 8}
                y={spotlight.y - 8}
                width={spotlight.w + 16}
                height={spotlight.h + 16}
                rx="20"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.8)"
          mask={`url(#spotlight-mask-${tourKey})`}
          className="transition-all duration-500"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
        <div 
          className={`bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl pointer-events-auto transition-all duration-500 transform
            ${step.targetId ? 'absolute' : 'relative'}
          `}
          style={spotlight ? {
            top: step.position === 'bottom' ? spotlight.y + spotlight.h + 24 : 'auto',
            bottom: step.position === 'top' ? (window.innerHeight - spotlight.y) + 24 : 'auto',
            left: '50%',
            transform: 'translateX(-50%)'
          } : {}}
        >
          <div className="flex space-x-1.5 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-6 bg-[#0A8A1F]' : 'w-1.5 bg-slate-200'}`} />
            ))}
          </div>

          <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-3">
            {step.title}
          </h3>
          <p className="text-slate-500 font-medium leading-relaxed mb-8">
            {step.content}
          </p>

          <div className="flex items-center justify-between">
            <button 
              onClick={handleComplete}
              className="text-slate-400 font-black text-xs uppercase tracking-widest hover:text-rose-500 transition-colors"
            >
              Skip
            </button>
            <button 
              onClick={handleNext}
              className="bg-[#0A8A1F] text-white px-8 py-3 rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center space-x-2"
            >
              <span>{currentStep === steps.length - 1 ? 'বুঝেছি' : 'পরবর্তী'}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
