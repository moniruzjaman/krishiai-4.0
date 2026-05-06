
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, UserCrop, UserRole, GroundingChunk, Language, SavedReport } from '../types';
import { CROPS_BY_CATEGORY, DISTRICT_UPAZILA_MAP } from '../constants';
import { searchNearbySellers } from '../services/geminiService';
import { detectCurrentAEZDetails, getStoredLocation, saveStoredLocation } from '../services/locationService';
import ShareDialog from './ShareDialog';
import FeedbackModal from './FeedbackModal';
import { useSpeech } from '../App';
import { FarmerAvatar } from './FarmerAvatar';

type DashboardTab = 'dashboard' | 'map' | 'activity' | 'fields' | 'settings';

interface UserProfileProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onToggleSpeech?: () => void;
  speechEnabled?: boolean;
  onBack?: () => void;
  lang: Language;
}

const T = {
  bn: {
    commandCenter: "কমান্ড সেন্টার",
    streak: "দিন স্ট্রিক",
    dashboard: "ড্যাশবোর্ড",
    map: "ফিল্ড ও হাব",
    activity: "অ্যাক্টিভিটি",
    fields: "আমার শস্য",
    settings: "সেটিংস",
    xpProgress: "XP প্রগতি",
    level: "লেভেল",
    nextGoal: "পরবর্তী লক্ষ্য",
    maxLevel: "সর্বোচ্চ স্তর",
    xpRemaining: "XP বাকি",
    totalCrops: "মোট শস্য",
    totalReports: "মোট রিপোর্ট",
    skillsProfile: "আপনার দক্ষতা প্রোফাইল",
    skillSoil: "মৃত্তিকা ও সার ব্যবস্থাপনা",
    skillProtection: "শস্য সুরক্ষা ও রোগ নির্ণয়",
    skillTech: "আধুনিক কৃষি প্রযুক্তি",
    masteryScore: "এগ্রো-মাস্টারি স্কোর",
    aiSmartTips: "এআই স্মার্ট টিপস",
    notDetected: "শনাক্ত করা হয়নি",
    update: "আপডেট করুন",
    myFarmAndCrops: "আমার খামার ও শস্য",
    noCrops: "কোনো শস্য যোগ করা হয়নি",
    nearbyHubResults: "নিকটস্থ হাব ফলাফল",
    viewDetail: "View Detail",
    activityHistory: "অ্যাক্টিভিটি ইতিহাস",
    totalReportsCount: (n: string) => `মোট ${n}টি রিপোর্ট`,
    noReports: "এখনো কোনো রিপোর্ট সংরক্ষিত নেই",
    farmProfile: "আমার খামার ও শস্য প্রোফাইল",
    manageCrops: "আপনার চাষকৃত শস্যগুলো এখানে পরিচালনা করুন",
    addNewCrop: "+ নতুন শস্য যোগ করুন",
    personalProfile: "ব্যক্তিগত প্রোফাইল ও সেটিংস",
    yourName: "আপনার নাম",
    district: "জেলা",
    upazila: "উপজেলা",
    myRole: "আমার ভূমিকা",
    saveInfo: "তথ্য সংরক্ষণ করুন",
    newCropProfile: "নতুন শস্য প্রোফাইল",
    selectCrop: "শস্য নির্বাচন করুন",
    variety: "জাত (Variety)",
    sowingDate: "রোপণের তারিখ",
    fieldLocation: "ক্ষেতের অবস্থান (Field GPS)",
    addToProfile: "শস্য প্রোফাইলে যোগ করুন",
    detecting: "শনাক্ত করা হচ্ছে...",
    detectBtn: "লোকেশন বাটন চাপুন",
    locNotFound: "লোকেশন পাওয়া যায়নি।",
    selectDistrict: "জেলা নির্বাচন করুন",
    selectUpazila: "উপজেলা নির্বাচন করুন",
    planting: "রোপণ",
    days: "দিন",
    seedStore: "বীজ ভাণ্ডার",
    pesticideStore: "বালাইনাশক শপ",
    fertilizerStore: "সার বিক্রেতা",
    agriOffice: "কৃষি অফিস",
    openInApp: "Open in App",
    clickToFocus: "Click to focus",
    noHubs: "নিকটস্থ কোনো কেন্দ্র পাওয়া যায়নি। অন্য কিছু লিখে খুঁজুন।"
  },
  en: {
    commandCenter: "Command Center",
    streak: "Day Streak",
    dashboard: "Dashboard",
    map: "Field & Hub",
    activity: "Activity",
    fields: "My Crops",
    settings: "Settings",
    xpProgress: "XP Progress",
    level: "Level",
    nextGoal: "Next Goal",
    maxLevel: "Max Level",
    xpRemaining: "XP Remaining",
    totalCrops: "Total Crops",
    totalReports: "Total Reports",
    skillsProfile: "Your Skills Profile",
    skillSoil: "Soil & Fertilizer",
    skillProtection: "Crop Protection",
    skillTech: "Modern Agri Tech",
    masteryScore: "Agro-Mastery Score",
    aiSmartTips: "AI Smart Tips",
    notDetected: "Not Detected",
    update: "Update",
    myFarmAndCrops: "My Farm & Crops",
    noCrops: "No crops added",
    nearbyHubResults: "Nearby Hub Results",
    viewDetail: "View Detail",
    activityHistory: "Activity History",
    totalReportsCount: (n: string) => `Total ${n} Reports`,
    noReports: "No reports saved yet",
    farmProfile: "My Farm & Crop Profile",
    manageCrops: "Manage your cultivated crops here",
    addNewCrop: "+ Add New Crop",
    personalProfile: "Personal Profile & Settings",
    yourName: "Your Name",
    district: "District",
    upazila: "Upazila",
    myRole: "My Role",
    saveInfo: "Save Information",
    newCropProfile: "New Crop Profile",
    selectCrop: "Select Crop",
    variety: "Variety",
    sowingDate: "Sowing Date",
    fieldLocation: "Field Location (GPS)",
    addToProfile: "Add to Crop Profile",
    detecting: "Detecting...",
    detectBtn: "Press location button",
    locNotFound: "Location not found.",
    selectDistrict: "Select District",
    selectUpazila: "Select Upazila",
    planting: "Planting",
    days: "Days",
    seedStore: "Seed Store",
    pesticideStore: "Pesticide Store",
    fertilizerStore: "Fertilizer Retailer",
    agriOffice: "Agri Office",
    openInApp: "Open in App",
    clickToFocus: "Click to focus",
    noHubs: "No nearby hubs found. Try searching for something else."
  }
};

const toBanglaNumber = (val: string | number) => {
  if (val === null || val === undefined) return '';
  const banglaNumbers: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯', '.': '.'
  };
  return val.toString().replace(/[0-9.]/g, (w: string) => banglaNumbers[w]);
};

const formatNumber = (val: string | number, lang: Language) => {
  return lang === 'bn' ? toBanglaNumber(val) : val.toString();
};

const rankTranslations: Record<string, Record<Language, string>> = {
  'নবিশ কৃষক': { bn: 'নবিশ কৃষক', en: 'Novice Farmer' },
  'উন্নয়নশীল কৃষক': { bn: 'উন্নয়নশীল কৃষক', en: 'Developing Farmer' },
  'অভিজ্ঞ কৃষক': { bn: 'অভিজ্ঞ কৃষক', en: 'Expert Farmer' },
  'মাস্টার এগ্রোনোমিস্ট': { bn: 'মাস্টার এগ্রোনোমিস্ট', en: 'Master Agronomist' },
};

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateUser, onBack, lang }) => {
  const { progress, myCrops = [], savedReports = [], settings } = user;
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'map' | 'activity' | 'fields' | 'settings'>('dashboard');
  
  const t = T[lang];

  const ROLES: { id: UserRole, label: string, icon: string }[] = [
    { id: 'farmer_entrepreneur', label: lang === 'bn' ? 'কৃষক / উদ্যোক্তা' : 'Farmer / Entrepreneur', icon: '👨‍🌾' },
    { id: 'policy_maker', label: lang === 'bn' ? 'কৃষি নীতি নির্ধারক' : 'Policy Maker', icon: '🏛️' },
    { id: 'extension_provider', label: lang === 'bn' ? 'সম্প্রসারণ কর্মী' : 'Extension Provider', icon: '📋' },
    { id: 'input_seller', label: lang === 'bn' ? 'উপকরণ বিক্রেতা' : 'Input Seller', icon: '🛍️' },
    { id: 'others', label: lang === 'bn' ? 'অন্যান্য' : 'Others', icon: '👥' },
  ];

  const RANKS = useMemo(() => [
    { level: 0, title: rankTranslations['নবিশ কৃষক'][lang], xp: 0, icon: '🌱' },
    { level: 5, title: rankTranslations['উন্নয়নশীল কৃষক'][lang], xp: 500, icon: '🌿' },
    { level: 10, title: rankTranslations['অভিজ্ঞ কৃষক'][lang], xp: 2000, icon: '🌳' },
    { level: 20, title: rankTranslations['মাস্টার এগ্রোনোমিস্ট'][lang], xp: 10000, icon: '👑' },
  ], [lang]);

  const DISTRICTS = Object.keys(DISTRICT_UPAZILA_MAP).sort();

  // Map States
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyResults, setNearbyResults] = useState<{ text: string; groundingChunks: GroundingChunk[] } | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(false);
  const [isMapPanning, setIsMapPanning] = useState(false);
  const [mapQuery, setMapQuery] = useState('Agri input seller');
  const [selectedFieldId, setSelectedFieldId] = useState<string | 'current'>('current');
  const [mapZoom, setMapZoom] = useState(16);

  const [showAddCropModal, setShowAddCropModal] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [newCropVariety, setNewCropVariety] = useState('');
  const [newCropDate, setNewCropDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCropLocation, setNewCropLocation] = useState('');
  const [newCropCoords, setNewCropCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isListeningField, setIsListeningField] = useState<string | null>(null);
  
  const [nameInput, setNameInput] = useState(user.displayName || '');
  const [mobileInput, setMobileInput] = useState(user.mobile || '');
  const [districtInput, setDistrictInput] = useState(user.farmLocation?.district || '');
  const [upazilaInput, setUpazilaInput] = useState(user.farmLocation?.upazila || '');
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role || 'farmer_entrepreneur');
  const [hasChanges, setHasChanges] = useState(false);

  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const { playSpeech, stopSpeech, isSpeaking } = useSpeech();
  const recognitionRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  // Real-time tracking logic
  useEffect(() => {
    const loc = getStoredLocation();
    if (loc) setCoords({ lat: loc.lat, lng: loc.lng });
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
    }

    let watchId: number;
    if (navigator.geolocation && activeSubTab === 'map') {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (selectedFieldId === 'current') {
            setCoords(newCoords);
          }
          saveStoredLocation(newCoords.lat, newCoords.lng);
        },
        (err) => console.error("Tracking error:", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeSubTab, selectedFieldId, lang]);

  const toggleListening = (field: string) => {
    if (!recognitionRef.current) return alert(lang === 'bn' ? "ভয়েস ইনপুট সমর্থিত নয়।" : "Voice input not supported.");
    if (isListeningField === field) {
      recognitionRef.current.stop();
    } else {
      setIsListeningField(field);
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const transcript = event.results[0][0].transcript;
        if (isListeningField === 'name') setNameInput(prev => prev + transcript);
        if (isListeningField === 'cropVariety') setNewCropVariety(prev => prev + transcript);
        setHasChanges(true);
      };
      recognitionRef.current.onend = () => setIsListeningField(null);
    }
  }, [isListeningField]);

  const handleNearbySearch = async (type: string) => {
    let targetCoords = activeMapCoords;
    if (!targetCoords) return;
    
    setMapQuery(type);
    setIsMapLoading(true);
    try {
      const data = await searchNearbySellers(targetCoords.lat, targetCoords.lng, type, lang);
      setNearbyResults(data);
      setMapZoom(15);
    } catch {
      alert(lang === 'bn' ? "অনুসন্ধান ব্যর্থ হয়েছে।" : "Search failed.");
    } finally {
      setIsMapLoading(false);
    }
  };

  const handleDetectLocationForCrop = async () => {
    setIsDetectingLocation(true);
    try {
      const aez = await detectCurrentAEZDetails(true);
      setNewCropLocation(`${aez.name} (AEZ ${aez.id})`);
      setNewCropCoords({ lat: aez.lat, lng: aez.lng });
    } catch { alert(lang === 'bn' ? 'লোকেশন পাওয়া যায়নি।' : 'Location not found.'); } finally { setIsDetectingLocation(false); }
  };

  const handleAddCrop = () => {
    if (!newCropName) return alert(lang === 'bn' ? 'অনুগ্রহ করে ফসল নির্বাচন করুন।' : 'Please select a crop.');
    const newCrop: UserCrop = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCropName,
      variety: newCropVariety || (lang === 'bn' ? 'অজানা' : 'Unknown'),
      sowingDate: newCropDate,
      location: newCropLocation || (lang === 'bn' ? 'অজানা' : 'Unknown'),
      lat: newCropCoords?.lat,
      lng: newCropCoords?.lng
    };
    onUpdateUser({ myCrops: [...myCrops, newCrop] });
    setShowAddCropModal(false);
    setNewCropName('');
    setNewCropVariety('');
    setNewCropLocation('');
    setNewCropCoords(null);
  };

  const handleUpdateSettings = () => {
    onUpdateUser({
      displayName: nameInput,
      mobile: mobileInput,
      role: selectedRole,
      farmLocation: {
        district: districtInput,
        upazila: upazilaInput
      }
    });
    setHasChanges(false);
    alert(lang === 'bn' ? "আপনার প্রোফাইল আপডেট করা হয়েছে।" : "Profile updated.");
  };

  const rankProgress = useMemo(() => {
    const currentRankTitle = rankTranslations[progress.rank]?.[lang] || RANKS[0].title;
    const currentRank = RANKS.find(r => r.title === currentRankTitle) || RANKS[0];
    const currentIndex = RANKS.indexOf(currentRank);
    const nextRank = RANKS[currentIndex + 1];
    if (!nextRank) return { percent: 100, remaining: 0, nextTitle: t.maxLevel };
    const range = nextRank.xp - currentRank.xp;
    const currentXPInRange = progress.xp - currentRank.xp;
    return { percent: Math.min(100, Math.max(0, (currentXPInRange / range) * 100)), remaining: nextRank.xp - progress.xp, nextTitle: nextRank.title };
  }, [progress.xp, progress.rank, lang, RANKS, t.maxLevel]);

  const activeMapCoords = useMemo(() => {
    if (selectedFieldId === 'current') return coords;
    const crop = myCrops.find(c => c.id === selectedFieldId);
    if (crop?.lat && crop?.lng) return { lat: crop.lat, lng: crop.lng };
    return coords;
  }, [selectedFieldId, myCrops, coords]);

  const mapEmbedUrl = useMemo(() => {
    if (!activeMapCoords) return '';
    const focusCrop = myCrops.find(c => c.id === selectedFieldId);
    const finalQuery = focusCrop ? focusCrop.name : mapQuery;
    
    return `https://maps.google.com/maps?q=${activeMapCoords.lat},${activeMapCoords.lng}&z=${mapZoom}&output=embed`;
  }, [activeMapCoords, mapQuery, mapZoom, selectedFieldId, myCrops]);

  const upazilas = districtInput ? DISTRICT_UPAZILA_MAP[districtInput] || [] : [];

  const handleFieldFocus = (id: string) => {
    setIsMapPanning(true);
    setSelectedFieldId(id);
    setMapZoom(17);
    setTimeout(() => setIsMapPanning(false), 800);
  };

  return (
    <div className={`max-w-7xl mx-auto p-4 pb-32 animate-fade-in font-sans transition-all duration-500 ${settings?.theme === 'dark' ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
      {isShareOpen && <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title={lang === 'bn' ? "কৃষি প্রোফাইল" : "Agri Profile"} content={`Farmer Rank: ${progress.rank}`} />}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} userRank={progress.rank} />
      
      {/* Brand Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6 px-2">
        <div className="flex items-center space-x-6">
          <button onClick={() => { 
            stopSpeech(); 
            if (onBack) onBack(); 
            else window.history.back(); 
          }} className="p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 hover:bg-emerald-50 transition-all active:scale-90 text-slate-400 group">
            <svg className="h-6 w-6 group-hover:text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter leading-none">{t.commandCenter}</h1>
            <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] mt-2">Krishi AI Official Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center space-x-3 border-b-4 border-emerald-800 active:scale-95 transition-all cursor-default">
              <span className="text-xl">🔥</span>
              <span className="text-sm font-black uppercase tracking-widest">{formatNumber(progress.streak, lang)} {t.streak}</span>
            </div>
        </div>
      </div>

      {/* Modern Navigation Pills */}
      <div className="flex bg-white dark:bg-slate-900 p-2 rounded-[2.5rem] shadow-xl mb-12 max-w-3xl overflow-x-auto scrollbar-hide border border-slate-100 dark:border-slate-800 mx-auto">
        <NavPill id="dashboard" label={t.dashboard} icon="📊" active={activeSubTab} onClick={setActiveSubTab} />
        <NavPill id="map" label={t.map} icon="📍" active={activeSubTab} onClick={setActiveSubTab} />
        <NavPill id="activity" label={t.activity} icon="📜" active={activeSubTab} onClick={setActiveSubTab} />
        <NavPill id="fields" label={t.fields} icon="🌾" active={activeSubTab} onClick={setActiveSubTab} />
        <NavPill id="settings" label={t.settings} icon="⚙️" active={activeSubTab} onClick={setActiveSubTab} />
      </div>

      {/* Dashboard Tab Content */}
      {activeSubTab === 'dashboard' && (
        <div className="animate-fade-in space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Profile Overview Card */}
              <div className="lg:col-span-4">
                 <div className="bg-white dark:bg-slate-800 rounded-[4rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-[#0A8A1F] to-emerald-400 opacity-10 group-hover:opacity-20 transition-opacity"></div>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                    
                    <FarmerAvatar user={user} size="xl" showProgress={true} className="relative z-10" />
                    
                    <div className="mt-8 relative z-10">
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{user.displayName}</h2>
                      <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mt-2">{rankTranslations[progress.rank]?.[lang] || progress.rank}</p>
                    </div>

                    <div className="w-full mt-10 space-y-4 relative z-10">
                      <div className="flex justify-between items-end mb-1 px-1">
                         <span className="text-[10px] font-black text-slate-400 uppercase">{t.xpProgress} ({formatNumber(progress.xp, lang)})</span>
                         <span className="text-[10px] font-black text-emerald-600 uppercase">{t.level} {formatNumber(progress.level, lang)}</span>
                      </div>
                      <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-1 shadow-inner">
                        <div className="h-full bg-gradient-to-r from-[#0A8A1F] to-emerald-400 rounded-full shadow-[0_0_10px_rgba(10,138,31,0.5)] transition-all duration-1000" style={{ width: `${rankProgress.percent}%` }}></div>
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center mt-2">{t.nextGoal}: {rankProgress.nextTitle} ({formatNumber(rankProgress.remaining, lang)} {t.xpRemaining})</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full mt-10">
                       <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{t.totalCrops}</p>
                          <p className="text-2xl font-black text-slate-800 dark:text-white">{formatNumber(myCrops.length, lang)}</p>
                       </div>
                       <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-700">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{t.totalReports}</p>
                          <p className="text-2xl font-black text-slate-800 dark:text-white">{formatNumber(savedReports.length, lang)}</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Skills Integration */}
              <div className="lg:col-span-8 space-y-8">
                 <div className="bg-slate-900 rounded-[4rem] p-10 md:p-14 text-white shadow-2xl relative overflow-hidden border-b-[20px] border-emerald-600">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    <div className="relative z-10">
                       <div className="flex items-center space-x-4 mb-10">
                          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl">💪</div>
                          <div>
                             <h3 className="text-3xl font-black tracking-tight">{t.skillsProfile}</h3>
                             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Skill Mastery Sync</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <SkillBar label={t.skillSoil} val={progress.skills.soil} color="emerald" icon="🏺" lang={lang} />
                          <SkillBar label={t.skillProtection} val={progress.skills.protection} color="rose" icon="🛡️" lang={lang} />
                          <SkillBar label={t.skillTech} val={progress.skills.technology} color="blue" icon="🛰️" lang={lang} />
                          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 flex flex-col justify-center items-center text-center">
                             <p className="text-xs font-black text-emerald-400 uppercase mb-3">{t.masteryScore}</p>
                             <h4 className="text-5xl font-black tracking-tighter">
                                {formatNumber(Math.round((progress.skills.soil + progress.skills.protection + progress.skills.technology) / 3), lang)}%
                             </h4>
                             <p className="text-[9px] font-medium text-slate-400 mt-3 italic">{lang === 'bn' ? '"নিয়মিত ডায়াগনোসিস করে আপনার সুরক্ষা দক্ষতা বাড়ান"' : '"Improve your protection skills with regular diagnosis"'}</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Recent Insight Summary */}
                 <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 shadow-xl border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-24 h-24 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-5xl shadow-inner shrink-0">✨</div>
                    <div className="text-center md:text-left flex-1">
                       <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">{t.aiSmartTips}</h4>
                       <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                          {myCrops.length > 0 
                            ? (lang === 'bn' ? `আপনার ${myCrops[0].name} ক্ষেতের জন্য বর্তমান আবহাওয়া অনুযায়ী ইউরিয়া প্রয়োগের এখনই উপযুক্ত সময়।` : `Now is the ideal time to apply urea to your ${myCrops[0].name} field based on current weather.`)
                            : (lang === 'bn' ? "আপনার খামারের প্রথম শস্য যোগ করুন এবং বিশেষায়িত এআই পরামর্শ পেতে শুরু করুন।" : "Add your farm's first crop and start receiving specialized AI advice.")}
                       </p>
                    </div>
                    <button 
                      onClick={() => setActiveSubTab('fields')}
                      className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl"
                    >
                      {t.fields}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Field & Hub (Maps) Tab */}
      {activeSubTab === 'map' && (
        <div className="animate-fade-in space-y-8 px-2">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                 <div 
                   className={`bg-white dark:bg-slate-800 rounded-[3.5rem] p-5 shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden aspect-video relative group transition-all duration-700 transform ${isMapPanning ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'}`}
                 >
                    {activeMapCoords ? (
                      <iframe 
                        title="Farmer Hub Map" 
                        width="100%" 
                        height="100%" 
                        frameBorder="0" 
                        style={{ border: 0, borderRadius: '2.5rem' }} 
                        src={mapEmbedUrl} 
                        allowFullScreen
                        onLoad={() => setIsMapPanning(false)}
                      ></iframe>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-400">
                         <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                         <p className="font-black uppercase text-xs">Locating Field...</p>
                      </div>
                    )}
                    
                    {/* Panning Overlay */}
                    {isMapPanning && (
                      <div className="absolute inset-5 rounded-[2.5rem] bg-emerald-900/10 backdrop-blur-[2px] z-20 flex items-center justify-center animate-fade-in">
                        <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-emerald-500/20">
                            <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Focusing Field...</span>
                        </div>
                      </div>
                    )}

                    <div className="absolute top-8 right-8 flex flex-col space-y-3 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => window.open(`geo:${activeMapCoords?.lat},${activeMapCoords?.lng}?q=${activeMapCoords?.lat},${activeMapCoords?.lng}(${encodeURIComponent(mapQuery)})`, '_self')} className="p-3 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white text-emerald-600 font-bold" title={lang === 'bn' ? "ডিভাইস ম্যাপে খুলুন" : "Open in Device Map"}>🗺️</button>
                       <button onClick={() => setMapZoom(prev => Math.min(prev + 1, 20))} className="p-3 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white text-slate-800 font-bold">+</button>
                       <button onClick={() => setMapZoom(prev => Math.max(prev - 1, 10))} className="p-3 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white text-slate-800 font-bold">-</button>
                       <button onClick={() => handleFieldFocus('current')} className={`p-3 rounded-xl shadow-lg border transition-all ${selectedFieldId === 'current' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white/90 text-slate-800 border-white'}`}>📍</button>
                    </div>
                    <div className="absolute bottom-8 right-8 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl border border-white flex items-center space-x-3 pointer-events-none">
                       <span className="relative flex h-3 w-3">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${selectedFieldId === 'current' ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${selectedFieldId === 'current' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
                       </span>
                       <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                         {selectedFieldId === 'current' ? 'Live GPS Location' : 'Field View Focused'}
                       </span>
                    </div>
                 </div>
                 <div className="flex flex-wrap gap-4 mt-8">
                    <MapQuickAction active={mapQuery === 'Agri Seed Store'} label={t.seedStore} icon="🌱" onClick={() => handleNearbySearch('Agri Seed Store')} />
                    <MapQuickAction active={mapQuery === 'Pesticide Store'} label={t.pesticideStore} icon="🧪" onClick={() => handleNearbySearch('Pesticide Store')} />
                    <MapQuickAction active={mapQuery === 'Fertilizer Retailer'} label={t.fertilizerStore} icon="⚖️" onClick={() => handleNearbySearch('Fertilizer Retailer')} />
                    <MapQuickAction active={mapQuery === 'Upazila Agriculture Office'} label={t.agriOffice} icon="🏛️" onClick={() => handleNearbySearch('Upazila Agriculture Office')} />
                 </div>
              </div>
              <div className="lg:col-span-4">
                 <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-2xl h-full flex flex-col border-b-[16px] border-emerald-600">
                    <h3 className="text-xl font-black mb-8 flex items-center"><span className="w-2 h-8 bg-emerald-500 rounded-full mr-4"></span>{t.myFarmAndCrops}</h3>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                       {myCrops.length > 0 ? (
                         myCrops.map(crop => (
                           <button 
                             key={crop.id}
                             onClick={() => handleFieldFocus(crop.id)}
                             className={`w-full text-left p-6 rounded-[2.5rem] border transition-all flex items-center justify-between group ${selectedFieldId === crop.id ? 'bg-emerald-600 border-emerald-500 shadow-xl' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                           >
                              <div className="flex items-center space-x-4">
                                 <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl ${selectedFieldId === crop.id ? 'bg-white text-emerald-600' : 'bg-white/10 text-white'}`}>🌾</div>
                                 <div>
                                    <h4 className="font-black text-sm mb-1">{crop.name}</h4>
                                    <p className="text-[9px] font-bold text-slate-400 group-hover:text-emerald-100 uppercase tracking-widest">📍 {crop.location}</p>
                                 </div>
                              </div>
                              {selectedFieldId === crop.id && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
                           </button>
                         ))
                       ) : (
                         <div className="text-center py-10 opacity-30">
                            <p className="text-xs italic">{t.noCrops}</p>
                         </div>
                       )}

                       <div className="h-px bg-white/10 my-6"></div>
                       
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                          {t.nearbyHubResults}
                       </h3>

                       {isMapLoading ? (
                         <div className="flex flex-col items-center justify-center py-20 opacity-50"><div className="w-8 h-8 border-2 border-emerald-50 border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-[10px] font-black uppercase">Syncing Maps...</p></div>
                       ) : nearbyResults?.groundingChunks?.length ? (
                         nearbyResults.groundingChunks.map((chunk, idx) => chunk.maps ? (
                           <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] hover:bg-white/10 transition-all cursor-pointer group" onClick={() => window.open(chunk.maps!.uri, '_blank')}>
                              <h4 className="font-black text-sm mb-1 leading-tight group-hover:text-emerald-400 transition-colors">{chunk.maps.title}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center">
                                 {t.viewDetail} <svg className="w-3 h-3 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                              </p>
                           </div>
                         ) : null)
                       ) : (
                         <p className="text-center py-16 opacity-30 text-xs italic font-medium leading-relaxed">{lang === 'bn' ? 'ক্যাটাগরি বেছে নিয়ে নিকটস্থ কেন্দ্রগুলো খুঁজুন।' : 'Select a category to find nearby centers.'}</p>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Activity & Reports Tab */}
      {activeSubTab === 'activity' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in px-2">
           <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t.activityHistory}</h3>
              <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400">{t.totalReportsCount(formatNumber(savedReports.length, lang))}</div>
           </div>
           
           {savedReports.length > 0 ? (
             <div className="grid grid-cols-1 gap-6">
                {savedReports.map(report => (
                  <div key={report.id} className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden transition-all hover:shadow-2xl group flex flex-col md:flex-row">
                     {report.imageUrl && (
                        <div className="md:w-64 h-64 md:h-auto overflow-hidden shrink-0">
                           <img src={report.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={report.title} />
                        </div>
                     )}
                     <div className="p-10 flex-1 relative">
                        <div className="flex justify-between items-start mb-6">
                           <div>
                              <div className="flex items-center space-x-3 mb-2">
                                 <span className="text-3xl">{report.icon || '📝'}</span>
                                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">{report.type}</span>
                              </div>
                              <h4 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">{report.title}</h4>
                              <p className="text-[9px] font-black text-slate-400 uppercase mt-2 bg-slate-50 dark:bg-slate-900 inline-block px-2 py-0.5 rounded">
                                 {new Date(report.timestamp).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                           </div>
                           <div className="flex items-center space-x-2">
                              {report.audioBase64 && (
                                <button 
                                  onClick={() => playSpeech(report.content)}
                                  className={`p-4 rounded-2xl transition-all ${isSpeaking ? 'bg-rose-500 text-white animate-pulse shadow-rose-200' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white shadow-emerald-100'}`}
                                >
                                   🔊
                                </button>
                              )}
                              <button 
                                onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                                className={`p-4 rounded-2xl transition-all ${expandedReportId === report.id ? 'bg-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-900 text-slate-400'}`}
                              >
                                 <svg className={`w-5 h-5 transform transition-transform ${expandedReportId === report.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                           </div>
                        </div>
                        
                        <div className={`overflow-hidden transition-all duration-500 ${expandedReportId === report.id ? 'max-h-[1000px] opacity-100' : 'max-h-[60px] opacity-60'}`}>
                           <p className="text-base font-medium leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                             {report.content}
                           </p>
                        </div>
                        {expandedReportId !== report.id && (
                           <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-800 to-transparent pointer-events-none"></div>
                        )}
                     </div>
                  </div>
                ))}
             </div>
           ) : (
             <div className="bg-white dark:bg-slate-800 rounded-[4rem] p-24 text-center border-4 border-dashed border-slate-100 dark:border-slate-700 opacity-40">
                <div className="text-8xl mb-8">📂</div>
                <p className="font-black text-slate-400 uppercase tracking-widest">{t.noReports}</p>
             </div>
           )}
        </div>
      )}

      {/* Field Management Tab */}
      {activeSubTab === 'fields' && (
        <div className="animate-fade-in space-y-8 px-2">
           <div className="bg-white dark:bg-slate-800 rounded-[4rem] p-10 md:p-14 shadow-2xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
                <div>
                   <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{t.farmProfile}</h3>
                   <p className="text-xs font-medium text-slate-400 mt-2">{t.manageCrops}</p>
                </div>
                <button onClick={() => setShowAddCropModal(true)} className="bg-[#0A8A1F] text-white px-10 py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-3">
                   <span>{t.addNewCrop}</span>
                </button>
              </div>
              
              {myCrops.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {myCrops.map(c => (
                    <div key={c.id} className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 flex items-start gap-6 group hover:border-emerald-500 transition-all shadow-sm hover:shadow-xl">
                       <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[1.8rem] flex items-center justify-center text-4xl shadow-lg transform group-hover:rotate-12 transition-transform">🌾</div>
                       <div className="flex-1">
                          <div className="flex justify-between items-start">
                             <h4 className="font-black text-2xl text-slate-800 dark:text-white leading-none mb-1">{c.name}</h4>
                             <button className="text-slate-300 hover:text-rose-500 transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                          </div>
                          <p className="text-[11px] font-black uppercase text-emerald-600 mb-3 tracking-widest">{c.variety}</p>
                          <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                             <p className="text-[10px] font-bold text-slate-400 flex items-center uppercase tracking-tighter">
                                <span className="mr-2">📍</span> {c.location}
                             </p>
                             <p className="text-[10px] font-bold text-slate-400 flex items-center uppercase tracking-tighter">
                                <span className="mr-2">🗓️</span> {t.planting}: {new Date(c.sowingDate).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}
                             </p>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-700 opacity-40">
                  <div className="text-7xl mb-6">🏜️</div>
                  <p className="font-black text-slate-400 uppercase tracking-widest">{t.noCrops}</p>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Settings Tab Content (Simplified) */}
      {activeSubTab === 'settings' && (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in px-2">
           <div className="bg-white dark:bg-slate-800 rounded-[4rem] p-10 md:p-14 shadow-2xl border border-slate-100 dark:border-slate-700">
              <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-10">{t.personalProfile}</h3>
              
              <div className="space-y-10">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">{t.yourName}</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={nameInput} 
                        onChange={(e) => { setNameInput(e.target.value); setHasChanges(true); }} 
                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl py-5 px-8 font-black text-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500 shadow-inner"
                      />
                      <button onClick={() => toggleListening('name')} className={`absolute right-5 top-1/2 -translate-y-1/2 p-3 rounded-2xl ${isListeningField === 'name' ? 'bg-red-500 text-white animate-pulse' : 'bg-white shadow-md text-slate-400'}`}>🎙️</button>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">{lang === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}</label>
                    <div className="relative">
                      <input 
                        type="tel" 
                        value={mobileInput} 
                        onChange={(e) => { setMobileInput(e.target.value); setHasChanges(true); }} 
                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl py-5 px-8 font-black text-xl text-slate-800 dark:text-white outline-none focus:border-emerald-500 shadow-inner"
                      />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">{t.district}</label>
                       <select 
                         value={districtInput} 
                         onChange={(e) => { setDistrictInput(e.target.value); setUpazilaInput(''); setHasChanges(true); }} 
                         className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[1.8rem] py-4 px-6 font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 shadow-inner appearance-none"
                       >
                         <option value="">{t.selectDistrict}</option>
                         {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">{t.upazila}</label>
                       <select 
                         value={upazilaInput} 
                         disabled={!districtInput}
                         onChange={(e) => { setUpazilaInput(e.target.value); setHasChanges(true); }} 
                         className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[1.8rem] py-4 px-6 font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 shadow-inner disabled:opacity-50 appearance-none"
                       >
                         <option value="">{t.selectUpazila}</option>
                         {upazilas.map(u => <option key={u} value={u}>{u}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">{t.myRole}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                       {ROLES.map(role => (
                         <button 
                           key={role.id}
                           onClick={() => { setSelectedRole(role.id); setHasChanges(true); }}
                           className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-3 ${selectedRole === role.id ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-lg scale-105' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'}`}
                         >
                            <span className="text-3xl">{role.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-tighter">{role.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="pt-10">
                    <button 
                      onClick={handleUpdateSettings}
                      disabled={!hasChanges}
                      className={`w-full py-6 rounded-[2.2rem] font-black text-lg uppercase tracking-widest shadow-2xl transition-all active:scale-95 ${hasChanges ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                    >
                      {t.saveInfo}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modern Add Crop Modal */}
      {showAddCropModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/10 max-h-[90vh]">
            <div className="bg-emerald-600 p-10 text-white flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex items-center space-x-5 relative z-10">
                <span className="text-4xl">🌾</span>
                <h3 className="text-3xl font-black tracking-tight leading-none">{t.newCropProfile}</h3>
              </div>
              <button onClick={() => setShowAddCropModal(false)} className="p-4 bg-white/20 rounded-2xl hover:bg-white/30 transition-all text-white relative z-10 shadow-lg active:scale-90">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-10 space-y-8 overflow-y-auto scrollbar-hide">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">{t.selectCrop}</label>
                <select value={newCropName} onChange={(e) => setNewCropName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-5 font-black text-lg text-slate-800 dark:text-white outline-none focus:border-emerald-500 shadow-inner appearance-none">
                  <option value="">{lang === 'bn' ? 'নির্বাচন করুন' : 'Select Crop'}</option>
                  {Object.values(CROPS_BY_CATEGORY).flat().sort().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">{t.variety}</label>
                <div className="relative">
                  <input type="text" value={newCropVariety} onChange={(e) => setNewCropVariety(e.target.value)} placeholder={lang === 'bn' ? "যেমন: ব্রি ধান২৮" : "e.g. BRRI dhan28"} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-5 pr-14 font-black text-lg text-slate-800 dark:text-white outline-none focus:border-emerald-500 shadow-inner" />
                  <button onClick={() => toggleListening('cropVariety')} className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-2xl shadow-md ${isListeningField === 'cropVariety' ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-400'}`}>🎙️</button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">{t.sowingDate}</label>
                <input type="date" value={newCropDate} onChange={(e) => setNewCropDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-5 font-black text-lg text-slate-800 dark:text-white outline-none focus:border-emerald-500 shadow-inner appearance-none" />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">{t.fieldLocation}</label>
                <div className="flex gap-3">
                  <input type="text" readOnly value={newCropLocation || (isDetectingLocation ? t.detecting : t.detectBtn)} className="flex-1 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-5 text-sm font-black text-slate-500 shadow-inner overflow-hidden text-ellipsis whitespace-nowrap" />
                  <button onClick={handleDetectLocationForCrop} disabled={isDetectingLocation} className={`w-16 rounded-3xl border-2 transition-all active:scale-95 flex items-center justify-center shadow-xl ${isDetectingLocation ? 'bg-slate-100 border-slate-200 text-slate-400 animate-pulse' : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700'}`} title="Identify My Location">
                    {isDetectingLocation ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleAddCrop} 
                disabled={!newCropName}
                className={`w-full font-black py-7 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all text-xl flex items-center justify-center space-x-4 border-b-[8px] ${!newCropName ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' : 'bg-emerald-600 text-white border-emerald-800 hover:bg-emerald-500'}`}
              >
                <span>{t.addToProfile}</span>
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Helper UI Components */

const NavPill = ({ id, label, icon, active, onClick }: { id: DashboardTab, label: string, icon: string, active: DashboardTab, onClick: (id: DashboardTab) => void }) => (
  <button 
    onClick={() => onClick(id)}
    className={`flex-1 min-w-[120px] py-4 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center space-x-3 ${
      active === id 
      ? 'bg-emerald-600 text-white shadow-2xl scale-105' 
      : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
    }`}
  >
     <span className="text-xl">{icon}</span>
     <span>{label}</span>
  </button>
);

const SkillBar = ({ label, val, color, icon, lang }: { label: string, val: number, color: string, icon: string, lang: Language }) => (
  <div className="space-y-3 group">
     <div className="flex justify-between items-center px-1">
        <div className="flex items-center space-x-3">
           <span className="text-2xl drop-shadow-sm group-hover:scale-125 transition-transform">{icon}</span>
           <span className="text-xs font-black uppercase tracking-wider text-slate-300">{label}</span>
        </div>
        <span className={`text-sm font-black tracking-tighter ${color === 'emerald' ? 'text-emerald-400' : color === 'rose' ? 'text-rose-400' : 'text-blue-400'}`}>{formatNumber(val, lang)}%</span>
     </div>
     <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden p-1 shadow-inner">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor] ${
            color === 'emerald' ? 'bg-emerald-500 text-emerald-500' : 
            color === 'rose' ? 'bg-rose-500 text-rose-500' : 
            'bg-blue-500 text-blue-500'
          }`} 
          style={{ width: `${val}%` }}
        ></div>
     </div>
  </div>
);

const MapQuickAction = ({ label, icon, onClick, active }: { label: string, icon: string, onClick: () => void, active: boolean }) => (
  <button 
    onClick={onClick}
    className={`px-6 py-4 rounded-3xl shadow-xl border-2 transition-all active:scale-95 flex items-center space-x-3 ${active ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}
  >
     <span className="text-2xl">{icon}</span>
     <span className={`font-black text-[11px] uppercase tracking-widest ${active ? 'text-white' : 'text-slate-700 dark:text-white'}`}>{label}</span>
  </button>
);

export default UserProfile;
