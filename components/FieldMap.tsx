import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { searchNearbySellers } from '../services/geminiService';
import { Language, GroundingChunk } from '../types';
import { ToolGuideHeader } from './ToolGuideHeader';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const customIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map panning
const MapUpdater = ({ coords, zoom }: { coords: { lat: number, lng: number } | null, zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], zoom, { animate: true, duration: 1 });
    }
  }, [coords, zoom, map]);
  return null;
};

interface FieldMapProps {
  onBack: () => void;
  lang: Language;
}

// Added translation object for FieldMap to fix "Cannot find name 't'" errors
const T = {
  bn: {
    clickToFocus: "ফোকাস করতে ক্লিক করুন",
    openInApp: "ম্যাপ অ্যাপে দেখুন",
  },
  en: {
    clickToFocus: "Click to focus",
    openInApp: "Open in App",
  }
};

const FieldMap: React.FC<FieldMapProps> = ({ onBack, lang }) => {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [sellers, setSellers] = useState<{ text: string; groundingChunks: GroundingChunk[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMapPanning, setIsMapPanning] = useState(false);
  const [searchType, setSearchType] = useState('Agri Seed and Pesticide Store');
  const [customSearch, setCustomSearch] = useState('');
  const [selectedPlaceQuery, setSelectedPlaceQuery] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  const watchIdRef = useRef<number | null>(null);

  // Define translation helper t
  const t = T[lang];

  // Identify the nearest hub from grounding chunks
  const nearestHub = useMemo(() => {
    if (!sellers?.groundingChunks) return null;
    const mapChunks = sellers.groundingChunks.filter(c => c.maps);
    return mapChunks.length > 0 ? mapChunks[0].maps : null;
  }, [sellers]);

  const performSearch = useCallback(async (type: string, overrideCoords?: { lat: number, lng: number }) => {
    const targetCoords = overrideCoords || coords;
    if (!targetCoords) return;
    
    setSearchType(type);
    setIsLoading(true);
    setSellers(null);
    try {
      const data = await searchNearbySellers(targetCoords.lat, targetCoords.lng, type, lang);
      setSellers(data);
      
      // Automatically highlight the nearest one
      const mapChunks = data.groundingChunks?.filter((c: any) => c.maps);
      if (mapChunks && mapChunks.length > 0) {
        const closest = mapChunks[0].maps!;
        setSelectedPlaceQuery(closest.title);
        setMapZoom(16);
      }
    } catch (e) {
      console.error("Maps Search Error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [coords, lang]);

  // High Precision Location Fetcher
  const updateLocation = useCallback((isManual: boolean = false) => {
    if (!navigator.geolocation) {
      alert(lang === 'bn' ? "জিপিএস সমর্থিত নয়।" : "GPS not supported.");
      return;
    }

    setIsLoading(true);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0 
    };

    const success = (pos: GeolocationPosition) => {
      setPermissionStatus('granted');
      const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoords(newCoords);
      if (!mapCenter) setMapCenter(newCoords);
      setIsTracking(true);
      if (isManual) {
        setSelectedPlaceQuery(null);
        setMapZoom(17);
        setMapCenter(newCoords);
        performSearch(searchType, newCoords);
      }
      setIsLoading(false);
    };

    const error = (err: GeolocationPositionError) => {
      console.warn(`Geo Error: ${err.message}`);
      setIsLoading(false);
      setIsTracking(false);
      if (err.code === err.PERMISSION_DENIED) {
        setPermissionStatus('denied');
        if (isManual) alert(lang === 'bn' ? "আপনি লোকেশন পারমিশন বন্ধ করেছেন। সেটিংস থেকে এটি চালু করুন।" : "Location permission denied. Please enable it in browser settings.");
      } else {
        if (isManual) alert(lang === 'bn' ? "লোকেশন পাওয়া যায়নি। জিপিএস সিগন্যাল চেক করুন।" : "Location failed. Check GPS signal.");
      }
    };

    // Use watchPosition for real-time tracking in the field
    watchIdRef.current = navigator.geolocation.watchPosition(success, error, geoOptions);
    // Also do a single request for faster first load
    navigator.geolocation.getCurrentPosition(success, error, geoOptions);
  }, [lang, searchType, mapCenter, performSearch]);

  useEffect(() => {
    updateLocation(false);
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [updateLocation]);

  const handleFocusPlace = (title: string, placeLat?: number, placeLng?: number) => {
    setIsMapPanning(true);
    setSelectedPlaceQuery(title);
    setIsTracking(false); 
    setMapZoom(18); 
    
    if (placeLat && placeLng) {
      setMapCenter({ lat: placeLat, lng: placeLng });
    }

    const mapElement = document.getElementById('main-field-map');
    if (mapElement && window.innerWidth < 1024) {
      mapElement.scrollIntoView({ behavior: 'smooth' });
    }

    setTimeout(() => {
      setIsMapPanning(false);
    }, 1000);
  };

  const openNativeMap = () => {
    if (!coords) return;
    const label = selectedPlaceQuery || searchType;
    // Use geo: URI for Android device map
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (isAndroid) {
      window.open(`geo:${coords.lat},${coords.lng}?q=${encodeURIComponent(label)}`, '_system');
    } else {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&query=${encodeURIComponent(label)}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      <ToolGuideHeader 
        title={lang === 'bn' ? 'এগ্রি-ম্যাপ ও বিক্রেতা হাব' : 'Agri-Map & Hub'}
        subtitle={lang === 'bn' ? 'আপনার ক্ষেতের অবস্থান এবং নিকটস্থ কৃষি উপকরণ বিক্রেতা খুঁজুন।' : 'Locate your field and find authentic nearby agri-input sellers.'}
        protocol="Device Native Map Integration"
        source="Real-time Field GPS Tracking"
        lang={lang}
        onBack={onBack}
        icon="📍"
        themeColor="emerald"
        guideSteps={lang === 'bn' ? [
          "আপনার মোবাইলের লোকেশন (GPS) 'High Accuracy' মোডে রাখুন।",
          "ম্যাপের ডান পাশের 'সবুজ আইকন' টিপে রিয়েল-টাইম ট্র্যাকিং চালু করুন।",
          "বীজ বা বালাইনাশক বিক্রেতা খুঁজতে নিচের কুইক বাটনগুলো ব্যবহার করুন।",
          "সবচেয়ে কাছের কেন্দ্রটি স্বয়ংক্রিয়ভাবে ম্যাপে হাইলাইট করা হবে।"
        ] : [
          "Set your mobile location (GPS) to 'High Accuracy' mode.",
          "Tap the 'Green Icon' on the map to enable continuous real-time tracking.",
          "Use quick category buttons to find input sellers grounded by AI.",
          "The closest hub will be automatically highlighted on the map."
        ]}
      />

      {permissionStatus === 'denied' && (
        <div className="mb-6 bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
           <div className="flex items-center space-x-4">
              <span className="text-3xl">🚫</span>
              <div>
                <p className="font-black text-rose-800">{lang === 'bn' ? 'লোকেশন পারমিশন প্রয়োজন' : 'Location Permission Required'}</p>
                <p className="text-xs font-medium text-rose-600 leading-relaxed">{lang === 'bn' ? 'ম্যাপটি কাজ করার জন্য ব্রাউজারের সেটিংস থেকে লোকেশন পারমিশন দিন।' : 'To make the map functional, please enable location access in your browser settings.'}</p>
              </div>
           </div>
           <button onClick={() => updateLocation(true)} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">রিলোড করুন</button>
        </div>
      )}

      {nearestHub && !isLoading && (
        <div className="mb-8 animate-fade-in-up">
           <div className="bg-emerald-600 text-white p-6 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 border-b-8 border-emerald-800 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-full bg-white/10 -skew-x-12 translate-x-8"></div>
              <div className="flex items-center space-x-6 relative z-10">
                 <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-xl animate-bounce">🏠</div>
                 <div>
                    <div className="flex items-center space-x-2 mb-1">
                       <span className="bg-white text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Closest Detected</span>
                       <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-ping"></span>
                    </div>
                    <h3 className="text-2xl font-black leading-tight">{nearestHub.title}</h3>
                    <p className="text-xs font-bold text-emerald-100 opacity-80 mt-1">{lang === 'bn' ? 'আপনার বর্তমান অবস্থান থেকে নিকটতম।' : 'Nearest center from your location.'}</p>
                 </div>
              </div>
              <button 
                onClick={() => {
                  const isAndroid = /Android/i.test(navigator.userAgent);
                  if (isAndroid) {
                    window.open(`geo:0,0?q=${encodeURIComponent(nearestHub.title)}`, '_system');
                  } else {
                    window.open(nearestHub.uri, '_blank');
                  }
                }}
                className="w-full md:w-auto bg-white text-emerald-700 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-emerald-50 transition-all active:scale-95 flex items-center justify-center space-x-3 relative z-10"
              >
                 <span>{lang === 'bn' ? 'সরাসরি নেভিগেট করুন' : 'Navigate Now'}</span>
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div 
            id="main-field-map" 
            className={`bg-white rounded-[3rem] p-4 shadow-2xl border border-slate-100 overflow-hidden aspect-video relative group transition-all duration-700 transform ${isMapPanning ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'} z-0`}
          >
            {coords && mapCenter ? (
              <MapContainer 
                center={[mapCenter.lat, mapCenter.lng]} 
                zoom={mapZoom} 
                style={{ height: '100%', width: '100%', borderRadius: '2rem', zIndex: 1 }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater coords={mapCenter} zoom={mapZoom} />
                
                {/* User Location Marker */}
                <Marker position={[coords.lat, coords.lng]}>
                  <Popup>{lang === 'bn' ? 'আপনার অবস্থান' : 'Your Location'}</Popup>
                </Marker>

                {/* Seller Markers (if any coordinates exist in grounding chunks) */}
                {/* Note: Google Gemini grounding chunks might not always provide lat/lng directly, 
                    but if we had them, we would map them here. Since we rely on the device map for navigation,
                    the primary marker is the user's location. */}
              </MapContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full space-y-6 text-slate-400 bg-slate-50 rounded-[2rem]">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">🌍</div>
                </div>
                <p className="font-black uppercase tracking-[0.2em] text-xs">Calibrating Satellite Link...</p>
                <button onClick={() => updateLocation(true)} className="bg-[#0A8A1F] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl">{lang === 'bn' ? 'লোকেশন পারমিশন দিন' : 'Grant Permission'}</button>
              </div>
            )}
            
            {/* Panning Overlay */}
            {isMapPanning && (
              <div className="absolute inset-4 rounded-[2rem] bg-emerald-900/10 backdrop-blur-[2px] z-20 flex items-center justify-center animate-fade-in">
                 <div className="bg-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Panning to Target...</span>
                 </div>
              </div>
            )}

            <div className="absolute top-8 right-8 flex flex-col space-y-2 z-10">
               <button 
                onClick={() => updateLocation(true)}
                className={`p-4 rounded-2xl shadow-xl border transition-all active:scale-90 flex items-center justify-center ${
                  isTracking 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-200 animate-pulse' 
                  : 'bg-white/95 backdrop-blur-md border-white text-slate-800 hover:bg-emerald-50'
                }`}
                title={lang === 'bn' ? "আমার বর্তমান অবস্থান" : "My Current Location"}
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                 </svg>
               </button>
               <button 
                onClick={openNativeMap}
                disabled={!coords}
                className="p-4 bg-blue-600 rounded-2xl shadow-xl text-white transition-all active:scale-90 border border-blue-500 disabled:opacity-50"
                title={lang === 'bn' ? "ম্যাপস অ্যাপে দেখুন" : "Open in Maps App"}
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                 </svg>
               </button>
            </div>

            <div className="absolute bottom-8 right-8 bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-xl border border-white flex items-center space-x-3 pointer-events-none z-10">
               <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isTracking ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isTracking ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
               </span>
               <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">
                 {isTracking ? (lang === 'bn' ? 'জিপিএস ট্র্যাকিং সক্রিয়' : 'Live GPS Tracking') : (lang === 'bn' ? 'লোকেশন অফ' : 'GPS Offline')}
               </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
             <div className="flex flex-wrap gap-2 flex-1">
                <MapActionBtn active={searchType === 'Agri Seed and Pesticide Store' && !selectedPlaceQuery} icon="🌱" label={lang === 'bn' ? 'বীজ ও বিষ' : 'Inputs'} onClick={() => { setSelectedPlaceQuery(null); performSearch('Agri Seed and Pesticide Store'); }} />
                <MapActionBtn active={searchType === 'Fertilizer Store' && !selectedPlaceQuery} icon="⚖️" label={lang === 'bn' ? 'সার' : 'Fertilizer'} onClick={() => { setSelectedPlaceQuery(null); performSearch('Fertilizer Store'); }} />
                <MapActionBtn active={searchType === 'Upazila Agriculture Office' && !selectedPlaceQuery} icon="🏛️" label={lang === 'bn' ? 'DAE অফিস' : 'DAE Office'} onClick={() => { setSelectedPlaceQuery(null); performSearch('Upazila Agriculture Office'); }} />
             </div>
             <div className="flex gap-2 w-full sm:w-auto">
                <input 
                  type="text" 
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                  placeholder={lang === 'bn' ? "সার্ভিস খুঁজুন..." : "Find service..."}
                  className="bg-white border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-emerald-500 shadow-sm"
                  onKeyDown={(e) => e.key === 'Enter' && performSearch(customSearch)}
                />
                <button 
                  onClick={() => performSearch(customSearch)}
                  className="bg-slate-900 text-white p-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
             </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6 h-full">
           <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl h-full flex flex-col border-b-[12px] border-emerald-600 max-h-[600px] lg:max-h-none">
              <div className="flex justify-between items-center mb-8 shrink-0">
                <h3 className="text-xl font-black flex items-center">
                   <span className="mr-3 p-2 bg-white/10 rounded-xl">🏬</span> 
                   {lang === 'bn' ? 'নিকটস্থ কেন্দ্রসমূহ' : 'Nearby Hubs'}
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                 {isLoading && !sellers ? (
                   <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
                      <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Updating Satellite View...</p>
                   </div>
                 ) : sellers?.groundingChunks?.length ? (
                   sellers.groundingChunks.map((chunk, idx) => chunk.maps ? (
                     <div 
                        key={idx} 
                        onClick={() => handleFocusPlace(chunk.maps!.title)}
                        className={`p-5 rounded-[2.2rem] border transition-all cursor-pointer group ${
                          selectedPlaceQuery === chunk.maps.title 
                          ? 'bg-emerald-600 border-emerald-500 shadow-xl scale-[1.02]' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-black text-sm leading-tight group-hover:text-white">{chunk.maps.title}</h4>
                           {idx === 0 && <span className="bg-white text-emerald-600 text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap ml-2">Nearest</span>}
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 group-hover:text-emerald-100 uppercase tracking-widest mb-4">{t.clickToFocus}</p>
                        <div className="flex items-center justify-between">
                           <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                const isAndroid = /Android/i.test(navigator.userAgent);
                                if (isAndroid) {
                                  window.open(`geo:0,0?q=${encodeURIComponent(chunk.maps!.title)}`, '_system');
                                } else {
                                  window.open(chunk.maps!.uri, '_blank'); 
                                }
                              }}
                              className="text-[9px] font-black uppercase text-emerald-400 group-hover:text-white underline underline-offset-4"
                           >
                              {t.openInApp}
                           </button>
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${selectedPlaceQuery === chunk.maps.title ? 'bg-white text-emerald-600' : 'bg-white/10 text-white group-hover:bg-white group-hover:text-emerald-600'}`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                           </div>
                        </div>
                     </div>
                   ) : null)
                 ) : (
                   <div className="text-center py-20 opacity-30 flex flex-col items-center space-y-4">
                      <div className="text-6xl">🏜️</div>
                      <p className="text-xs font-bold leading-relaxed px-8">
                        {lang === 'bn' ? 'নিকটস্থ কোনো কেন্দ্র পাওয়া যায়নি। অন্য কিছু লিখে খুঁজুন।' : 'No nearby hubs detected. Try searching manually.'}
                      </p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const MapActionBtn = ({ icon, label, onClick, active }: any) => (
  <button 
    onClick={onClick}
    className={`px-6 py-4 rounded-2xl shadow-sm transition-all flex items-center space-x-3 active:scale-95 group border-2 ${
      active 
      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl' 
      : 'bg-white border-slate-100 text-slate-700 hover:shadow-md hover:border-emerald-200'
    }`}
  >
     <span className={`text-xl transition-transform ${active ? 'scale-110' : 'group-hover:scale-125'}`}>{icon}</span>
     <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-600'}`}>{label}</span>
  </button>
);

export default FieldMap;
