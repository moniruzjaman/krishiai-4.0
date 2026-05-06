
import React, { useState } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRank?: string;
}

const CATEGORIES = [
  { id: 'bug', label: 'বাগ রিপোর্ট', icon: '🐛' },
  { id: 'suggestion', label: 'পরামর্শ', icon: '💡' },
  { id: 'praise', label: 'প্রশংসা', icon: '🌟' },
  { id: 'other', label: 'অন্যান্য', icon: '📝' }
];

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, userRank }) => {
  const [rating, setRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('suggestion');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) return alert("অনুগ্রহ করে একটি রেটিং দিন।");
    if (!comment.trim()) return alert("আপনার মতামত লিখুন।");

    setIsSubmitting(true);
    // Simulating API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Save to local log for simulation
    const feedback = {
      rating,
      category,
      comment,
      timestamp: Date.now(),
      rank: userRank
    };
    const logs = JSON.parse(localStorage.getItem('agritech_feedback_logs') || '[]');
    localStorage.setItem('agritech_feedback_logs', JSON.stringify([...logs, feedback]));

    setIsSubmitting(false);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      // Reset
      setRating(0);
      setComment('');
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative border border-slate-100">
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

        {!isSuccess ? (
          <>
            <div className="p-8 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">আপনার মতামত</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Help us improve Krishi AI</p>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-rose-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Rating */}
                <div className="text-center py-4 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">অ্যাপটি আপনার কেমন লেগেছে?</p>
                  <div className="flex justify-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => setRating(star)}
                        className={`text-3xl transition-all transform active:scale-150 ${rating >= star ? 'scale-110' : 'grayscale opacity-30 hover:opacity-50'}`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center space-x-3 p-3 rounded-2xl border-2 transition-all text-xs font-black ${
                        category === cat.id 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' 
                        : 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Textarea */}
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="আপনার অভিজ্ঞতা বা পরামর্শ এখানে লিখুন..."
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all h-32 shadow-inner"
                />
              </div>
            </div>

            <div className="p-8 pt-4">
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl hover:shadow-none transition-all active:scale-95 disabled:bg-slate-300 flex items-center justify-center space-x-3 text-lg"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>ফিডব্যাক পাঠান</span>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="p-12 text-center flex flex-col items-center justify-center animate-fade-in space-y-6">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-5xl animate-bounce">
              🙏
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">ধন্যবাদ!</h3>
              <p className="text-slate-500 font-medium leading-relaxed mt-2">
                আপনার মূল্যবান মতামত আমাদের অ্যাপটিকে আরও উন্নত করতে সাহায্য করবে।
              </p>
            </div>
            <div className="w-16 h-1 bg-emerald-500 rounded-full opacity-30"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
