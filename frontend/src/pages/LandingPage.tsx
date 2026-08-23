import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  HelpCircle, 
  Globe, 
  ArrowRight, 
  User, 
  Truck, 
  ShieldCheck, 
  Zap, 
  ChevronDown,
  Sparkles,
  X,
  Award
} from 'lucide-react';
import { useSessionStore } from '../store/useSessionStore';

type LanguageCode = 'EN' | 'TA' | 'KN' | 'HI';

interface TranslationMap {
  tag: string;
  title1: string;
  title2: string;
  title3: string;
  subtitle: string;
  continueGuest: string;
  creatingSession: string;
  startShopping: string;
  alreadyHaveAccount: string;
  loginHere: string;
  expressDelivery: string;
  sameDayShipping: string;
  noAccountReq: string;
  browseAnon: string;
  instantSession: string;
  fastLoadSpeed: string;
  floatingCardTitle: string;
  floatingCardSub: string;
  liveSystem: string;
  help: string;
  login: string;
  helpCenter: string;
  faq1Q: string;
  faq1A: string;
  faq2Q: string;
  faq2A: string;
  faq3Q: string;
  faq3A: string;
  faq4Q: string;
  faq4A: string;
  closeHelp: string;
}

const translations: Record<LanguageCode, TranslationMap> = {
  EN: {
    tag: "Brand New Day, Better Service",
    title1: "BRAND NEW DAY",
    title2: "Everything You Needed,",
    title3: "Delivered Faster.",
    subtitle: "Shop top-tier electronics, everyday fashion, fresh groceries, modern home supplies and more with instant guest access.",
    continueGuest: "Continue as Guest",
    creatingSession: "Creating Guest Session...",
    startShopping: "Start Shopping",
    alreadyHaveAccount: "Already have an account?",
    loginHere: "Login here",
    expressDelivery: "Express Delivery",
    sameDayShipping: "Same-day shipping",
    noAccountReq: "No Account Req.",
    browseAnon: "Browse anonymously",
    instantSession: "Instant Session",
    fastLoadSpeed: "Fast load speed",
    floatingCardTitle: "Seamless Anonymous Browsing",
    floatingCardSub: "Clickstream Telemetry & Real-time Session Tracking",
    liveSystem: "Live System",
    help: "Help",
    login: "Login",
    helpCenter: "NexDay Help Center",
    faq1Q: "Q: Do I need an account to browse products?",
    faq1A: "No! You can click 'Continue as Guest' to start shopping immediately. We generate an anonymous guest session token that captures your browsing activity.",
    faq2Q: "Q: When do I need to register an account?",
    faq2A: "An account is only required when completing a purchase or reviewing your order history.",
    faq3Q: "Q: What languages are supported?",
    faq3A: "NexDay supports English (Main), Tamil (தமிழ்), Kannada (ಕನ್ನಡ), and Hindi (हिन्दी). You can change language in the navigation header.",
    faq4Q: "Q: How is my clickstream data logged?",
    faq4A: "All session activity generates real-time telemetry files on our servers. This data will tomorrow be processed by a Kafka messaging queue into our analytics pipeline.",
    closeHelp: "Close Help"
  },
  TA: {
    tag: "புதிய நாள், சிறந்த சேவை",
    title1: "புதிய நாள்",
    title2: "உங்களுக்கு தேவையான அனைத்தும்,",
    title3: "வேகமாக விநியோகிக்கப்படுகிறது.",
    subtitle: "உடனடி விருந்தினர் அணுகலுடன் எலக்ட்ரானிக்ஸ், ஃபேஷன், மளிகை பொருட்கள் மற்றும் பலவற்றை ஷாப்பிங் செய்யுங்கள்.",
    continueGuest: "விருந்தினராக தொடரவும்",
    creatingSession: "விருந்தினர் அமர்வு உருவாக்கப்படுகிறது...",
    startShopping: "ஷாப்பிங் செய்ய",
    alreadyHaveAccount: "ஏற்கனவே கணக்கு உள்ளதா?",
    loginHere: "இங்கே உள்நுழைக",
    expressDelivery: "விரைவு விநியோகம்",
    sameDayShipping: "அன்றே டெலிவரி",
    noAccountReq: "கணக்கு தேவையில்லை",
    browseAnon: "அநாமதேயமாக உலாவுக",
    instantSession: "உடனடி அமர்வு",
    fastLoadSpeed: "வேகமான ஏற்றுதல்",
    floatingCardTitle: "தடையற்ற அநாமதேய உலாவுதல்",
    floatingCardSub: "நிகழ்நேர டெலிமெட்ரி கண்காணிப்பு",
    liveSystem: "நேரடி அமைப்பு",
    help: "உதவி",
    login: "உள்நுழை",
    helpCenter: "நெக்ஸ்டே உதவி மையம்",
    faq1Q: "கே: தயாரிப்புகளை உலாவ எனக்கு ஒரு கணக்கு தேவையா?",
    faq1A: "இல்லை! உடனடியாக ஷாப்பிங் செய்ய நீங்கள் 'விருந்தினராகத் தொடரவும்' என்பதைக் கிளிக் செய்யலாம்.",
    faq2Q: "கே: நான் எப்போது ஒரு கணக்கை பதிவு செய்ய வேண்டும்?",
    faq2A: "வாங்குதலை முடிக்கும்போது அல்லது உங்கள் ஆர்டர் வரலாற்றை மதிப்பாய்வு செய்யும் போது மட்டுமே கணக்கு தேவைப்படும்.",
    faq3Q: "கே: எந்த மொழிகள் ஆதரிக்கப்படுகின்றன?",
    faq3A: "நெக்ஸ்டே ஆங்கிலம் (முதன்மை), தமிழ் (தமிழ்), கன்னடம் (ಕನ್ನಡ) மற்றும் இந்தி (हिन्दी) ஆகியவற்றை ஆதரிக்கிறது.",
    faq4Q: "கே: எனது கிளிக்ஸ்ட்ரீம் தரவு எவ்வாறு உள்நுழைகிறது?",
    faq4A: "அனைத்து அமர்வு செயல்பாடுகளும் எங்கள் சேவையகங்களில் நிகழ்நேர டெலிமெட்ரி கோப்புகளை உருவாக்குகின்றன.",
    closeHelp: "உதவியை மூடு"
  },
  KN: {
    tag: "ಹೊಸ ದಿನ, ಉತ್ತಮ ಸೇವೆ",
    title1: "ಹೊಸ ದಿನ",
    title2: "ನಿಮಗೆ ಬೇಕಾದ ಎಲ್ಲವೂ,",
    title3: "ವೇಗವಾಗಿ ವಿತರಣೆ.",
    subtitle: "ಉಚಿತ ಅತಿಥಿ ಪ್ರವೇಶದೊಂದಿಗೆ ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್, ಫ್ಯಾಷನ್, ದಿನಸಿ ಸಾಮಗ್ರಿಗಳು ಮತ್ತು ಹೆಚ್ಚಿನದನ್ನು ಖರೀದಿಸಿ.",
    continueGuest: "ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ",
    creatingSession: "ಅತಿಥಿ ಸೆಷನ್ ರಚಿಸಲಾಗುತ್ತಿದೆ...",
    startShopping: "ಶಾಪಿಂಗ್ ಪ್ರಾರಂಭಿಸಿ",
    alreadyHaveAccount: "ಖಾತೆಯನ್ನು ಹೊಂದಿದ್ದೀರಾ?",
    loginHere: "ಇಲ್ಲಿ ಲಾಗಿನ್ ಮಾಡಿ",
    expressDelivery: "ವೇಗದ ವಿತರಣೆ",
    sameDayShipping: "ಅದೇ ದಿನ ರವಾನೆ",
    noAccountReq: "ಖಾತೆಯ ಅಗತ್ಯವಿಲ್ಲ",
    browseAnon: "ಅನಾಮಧೇಯವಾಗಿ ಬ್ರೌಸ್ ಮಾಡಿ",
    instantSession: "ತ್ವರಿತ ಸೆಷನ್",
    fastLoadSpeed: "ವೇಗದ ಲೋಡಿಂಗ್ ವೇಗ",
    floatingCardTitle: "ಅಡೆತಡೆಯಿಲ್ಲದ ಅನಾಮಧೇಯ ಬ್ರೌಸಿಂಗ್",
    floatingCardSub: "ನಿಜಾವಧಿಯ ಟೆಲಿಮೆಟ್ರಿ ಟ್ರ್ಯಾಕಿಂಗ್",
    liveSystem: "ಲೈವ್ ಸಿಸ್ಟಮ್",
    help: "ಸಹಾಯ",
    login: "ಲಾಗಿನ್",
    helpCenter: "ನೆಕ್ಸ್‌ಡೇ ಸಹಾಯ ಕೇಂದ್ರ",
    faq1Q: "ಪ್ರಶ್ನೆ: ಉತ್ಪನ್ನಗಳನ್ನು ಬ್ರೌಸ್ ಮಾಡಲು ನನಗೆ ಖಾತೆಯ ಅಗತ್ಯವಿದೆಯೇ?",
    faq1A: "ಇಲ್ಲ! ತಕ್ಷಣ ಶಾಪಿಂಗ್ ಪ್ರಾರಂಭಿಸಲು ನೀವು 'ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ' ಕ್ಲಿಕ್ ಮಾಡಬಹುದು.",
    faq2Q: "ಪ್ರಶ್ನೆ: ನಾನು ಯಾವಾಗ ಖಾತೆಯನ್ನು ನೋಂದಾಯಿಸಿಕೊಳ್ಳಬೇಕು?",
    faq2A: "ಖರೀದಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸುವಾಗ ಅಥವಾ ನಿಮ್ಮ ಆರ್ಡರ್ ಇತಿಹಾಸವನ್ನು ಪರಿಶೀಲಿಸುವಾಗ ಮಾತ್ರ ಖಾತೆಯ ಅಗತ್ಯವಿದೆ.",
    faq3Q: "ಪ್ರಶ್ನೆ: ಯಾವ ಭಾಷೆಗಳನ್ನು ಬೆಂಬಲಿಸಲಾಗುತ್ತದೆ?",
    faq3A: "ನೆಕ್ಸ್‌ಡೇ ಇಂಗ್ಲಿಷ್ (ಮುಖ್ಯ), ತಮಿಳು (தமிழ்), ಕನ್ನಡ (ಕನ್ನಡ) ಮತ್ತು ಹಿಂದಿ (ಹಿन्दी) ಭಾಷೆಗಳನ್ನು ಬೆಂಬಲಿಸುತ್ತದೆ.",
    faq4Q: "ಪ್ರಶ್ನೆ: ನನ್ನ ಕ್ಲಿಕ್‌ಸ್ಟ್ರೀಮ್ ಡೇಟಾವನ್ನು ಹೇಗೆ ಲಾಗ್ ಮಾಡಲಾಗುತ್ತದೆ?",
    faq4A: "ಎಲ್ಲಾ ಸೆಷನ್ ಚಟುವಟಿಕೆಯು ನಮ್ಮ ಸರ್ವರ್‌ಗಳಲ್ಲಿ ನೈಜ-ಸಮಯದ ಟೆಲಿಮೆಟ್ರಿ ಫೈಲ್‌ಗಳನ್ನು ರಚಿಸುತ್ತದೆ.",
    closeHelp: "ಸಹಾಯ ಮುಚ್ಚಿ"
  },
  HI: {
    tag: "नया दिन, बेहतर सेवा",
    title1: "नया दिन",
    title2: "वह सब कुछ जो आपको चाहिए,",
    title3: "तेज़ी से डिलीवर किया गया।",
    subtitle: "तुरंत गेस्ट एक्सेस के साथ बेहतरीन इलेक्ट्रॉनिक्स, फैशन, किराना सामान, होम डेकोर और बहुत कुछ खरीदें।",
    continueGuest: "गेस्ट के रूप में जारी रखें",
    creatingSession: "गेस्ट सेशन बनाया जा रहा है...",
    startShopping: "खरीदारी शुरू करें",
    alreadyHaveAccount: "पहले से ही एक खाता है?",
    loginHere: "यहाँ लॉगिन करें",
    expressDelivery: "एक्सप्रेस डिलीवरी",
    sameDayShipping: "उसी दिन शिपिंग",
    noAccountReq: "अकाउंट की आवश्यकता नहीं",
    browseAnon: "गुमनाम रूप से ब्राउज़ करें",
    instantSession: "तुरंत सेशन",
    fastLoadSpeed: "तेज़ लोडिंग स्पीड",
    floatingCardTitle: "निर्बाध गुमनाम ब्राउज़िंग",
    floatingCardSub: "रीयल-टाइम क्लिकस्ट्रीम टेलीमेट्री",
    liveSystem: "लाइव सिस्टम",
    help: "सहायता",
    login: "लॉगिन",
    helpCenter: "नेक्सडे सहायता केंद्र",
    faq1Q: "प्र: क्या मुझे उत्पाद देखने के लिए अकाउंट की आवश्यकता है?",
    faq1A: "नहीं! आप तुरंत खरीदारी शुरू करने के लिए 'गेस्ट के रूप में जारी रखें' पर क्लिक कर सकते हैं।",
    faq2Q: "प्र: मुझे अकाउंट रजिस्टर करने की आवश्यकता कब होगी?",
    faq2A: "केवल खरीदारी पूरी करते समय या अपना ऑर्डर इतिहास देखते समय ही अकाउंट की आवश्यकता होती है।",
    faq3Q: "प्र: कौन सी भाषाएं समर्थित हैं?",
    faq3A: "नेक्सडे अंग्रेजी (मुख्य), तमिल (தமிழ்), कन्नड़ (ಕನ್ನಡ), और हिंदी (हिन्दी) का समर्थन करता है।",
    faq4Q: "प्र: मेरा क्लिकस्ट्रीम डेटा कैसे लॉग होता है?",
    faq4A: "सभी सेशन गतिविधियां हमारे सर्वर पर रीयल-टाइम टेलीमेट्री फाइलें बनाती हैं।",
    closeHelp: "सहायता बंद करें"
  }
};

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { createGuestSession, isLoading, session, customer } = useSessionStore();
  const [selectedLang, setSelectedLang] = useState<LanguageCode>('EN');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const t = translations[selectedLang];

  useEffect(() => {
    if (customer || (session && session.user_type === 'registered')) {
      navigate('/home');
    }
  }, [customer, session, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleContinueAsGuest = async () => {
    await createGuestSession();
    navigate('/home');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F7F8F9] text-[#041E42] flex flex-col justify-between selection:bg-[#0071DC] selection:text-white relative overflow-hidden">
      
      {/* CINEMATIC BACKGROUND GLOW ACCENTS */}
      <div className="absolute top-[-10%] left-1/4 w-[500px] h-[500px] bg-[#0071DC]/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-[30%] right-[-5%] w-[450px] h-[450px] bg-[#FFC220]/15 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }}></div>

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#0071DC] text-white shadow-md backdrop-blur-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* BRANDING */}
          <motion.div 
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="bg-[#FFC220] text-[#041E42] p-2.5 rounded-full shadow-md flex items-center justify-center font-bold">
              <ShoppingBag className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight flex items-center gap-1 leading-none">
                Nex<span className="text-[#FFC220]">Day</span>
              </span>
              <span className="text-[10px] text-blue-100 font-semibold tracking-wider uppercase mt-1">
                Enterprise Retail Portal
              </span>
            </div>
          </motion.div>

          {/* HEADER NAV ACTIONS */}
          <div className="flex items-center space-x-4 sm:space-x-6 text-sm font-medium">
            
            <button 
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center space-x-1.5 text-blue-100 hover:text-white transition-all py-2 px-3 rounded-xl hover:bg-white/10"
              title="Help & Support"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">{t.help}</span>
            </button>

            {/* Language Dropdown */}
            <div className="relative" ref={langRef}>
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center space-x-1.5 text-blue-100 hover:text-white transition-all py-2 px-3 rounded-xl hover:bg-white/10"
              >
                <Globe className="w-4 h-4" />
                <span>{selectedLang}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {isLangOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white text-[#041E42] rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 overflow-hidden"
                  >
                    {[
                      { code: 'EN' as const, name: 'English (Main)' },
                      { code: 'TA' as const, name: 'Tamil (தமிழ்)' },
                      { code: 'KN' as const, name: 'Kannada (ಕನ್ನಡ)' },
                      { code: 'HI' as const, name: 'Hindi (हिन्दी)' }
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLang(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-[#F2F8FD] transition-colors ${selectedLang === lang.code ? 'text-[#0071DC] bg-blue-50' : ''}`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Login Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLoginClick}
              className="bg-white text-[#0071DC] hover:bg-blue-50 px-5 py-2.5 rounded-full font-extrabold text-sm shadow-md flex items-center space-x-2 border border-white/40"
            >
              <User className="w-4 h-4 stroke-[2.5]" />
              <span>{t.login}</span>
            </motion.button>

          </div>
        </div>
      </header>

      {/* MAIN HERO SECTION */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* HERO TEXT COLUMN */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 space-y-8 text-left"
          >
            
            {/* Tag / Badge */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-50 via-amber-50 to-blue-50 text-[#0071DC] border border-[#0071DC]/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#FFC220] fill-[#FFC220] animate-spin" style={{ animationDuration: '6s' }} />
              <span>{t.tag}</span>
            </motion.div>

            {/* Headline with slogan */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#041E42] tracking-tight leading-[1.1]">
              {t.title1} <br />
              <span className="text-[#0071DC] relative inline-block">
                {t.title2} <br />
                {t.title3}
                <span className="absolute bottom-1 left-0 w-full h-3 bg-[#FFC220]/60 -z-10 rounded-full blur-[1px]"></span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-600 font-medium leading-relaxed max-w-xl">
              {t.subtitle}
            </p>

            {/* CTA BUTTONS CONTAINER */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              
              {/* Continue as Guest Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleContinueAsGuest}
                disabled={isLoading}
                className="bg-[#FFC220] hover:bg-[#E5AC12] text-[#041E42] px-8 py-4 rounded-full font-black text-base shadow-xl hover:shadow-2xl flex items-center justify-center space-x-3 cursor-pointer group transition-all"
              >
                <span>{isLoading ? t.creatingSession : t.continueGuest}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-200 stroke-[2.5]" />
              </motion.button>

              {/* Start Shopping Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleContinueAsGuest}
                className="bg-[#0071DC] hover:bg-[#0046BE] text-white px-7 py-4 rounded-full font-black text-base shadow-md flex items-center justify-center space-x-2 transition-all"
              >
                <span>{t.startShopping}</span>
              </motion.button>

            </div>

            {/* LOGIN PROMPT */}
            <div className="pt-2 flex items-center space-x-2 text-sm text-gray-500 font-semibold">
              <span>{t.alreadyHaveAccount}</span>
              <button 
                onClick={handleLoginClick}
                className="text-[#0071DC] font-black hover:underline underline-offset-4 focus:outline-none"
              >
                {t.loginHere}
              </button>
            </div>

            {/* KEY VALUE PROPOSITIONS */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-gray-200/80">
              <motion.div whileHover={{ y: -3 }} className="flex items-center space-x-2 p-2 rounded-xl hover:bg-white transition-all">
                <div className="p-2.5 bg-blue-50 text-[#0071DC] rounded-xl shadow-xs">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-extrabold text-[#041E42]">{t.expressDelivery}</p>
                  <p className="text-[11px] text-gray-500 font-medium">{t.sameDayShipping}</p>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="flex items-center space-x-2 p-2 rounded-xl hover:bg-white transition-all">
                <div className="p-2.5 bg-amber-50 text-[#E5AC12] rounded-xl shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-extrabold text-[#041E42]">{t.noAccountReq}</p>
                  <p className="text-[11px] text-gray-500 font-medium">{t.browseAnon}</p>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -3 }} className="flex items-center space-x-2 p-2 rounded-xl hover:bg-white transition-all">
                <div className="p-2.5 bg-blue-50 text-[#0071DC] rounded-xl shadow-xs">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-extrabold text-[#041E42]">{t.instantSession}</p>
                  <p className="text-[11px] text-gray-500 font-medium">{t.fastLoadSpeed}</p>
                </div>
              </motion.div>
            </div>

          </motion.div>

          {/* HERO IMAGE COLUMN WITH CINEMATIC FLOATING CARD & BADGES */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative"
          >
            {/* FLOATING PARALLAX CINEMATIC BADGE TOP RIGHT */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -top-6 -right-4 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-gray-100 flex items-center space-x-2"
            >
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="text-xs font-black text-[#041E42] font-mono">1,500+ Orders Today</span>
            </motion.div>

            {/* FLOATING PARALLAX CINEMATIC BADGE TOP LEFT */}
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="absolute -top-4 -left-4 z-20 bg-gradient-to-r from-[#0071DC] to-[#0046BE] text-white px-4 py-2 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-extrabold"
            >
              <Award className="w-4 h-4 text-[#FFC220]" />
              <span>Top Rated E-Commerce</span>
            </motion.div>

            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-white group">
              <img 
                src="/images/hero/hero_banner.jpg" 
                alt="NexDay Products Banner"
                className="w-full h-[380px] sm:h-[480px] object-cover object-center group-hover:scale-105 transition-transform duration-1000 ease-out"
              />
              
              {/* FLOATING NEXDAY FEATURE CARD */}
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl border border-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0071DC] text-[#FFC220] flex items-center justify-center font-black text-xl shadow-md">
                    ND
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#041E42]">{t.floatingCardTitle}</h4>
                    <p className="text-xs text-gray-500 font-semibold">{t.floatingCardSub}</p>
                  </div>
                </div>
                <span className="hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black rounded-full shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{t.liveSystem}</span>
                </span>
              </motion.div>

            </div>
          </motion.div>

        </div>

      </main>

      {/* HELP MODAL */}
      <AnimatePresence>
        {isHelpOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHelpOpen(false)}
              className="absolute inset-0 bg-[#041E42]/60 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10"
            >
              <div className="bg-[#0071DC] text-white p-6 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-[#FFC220]" />
                  <h3 className="font-black text-lg">{t.helpCenter}</h3>
                </div>
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto">
                <div>
                  <h4 className="font-extrabold text-sm text-[#0071DC]">{t.faq1Q}</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.faq1A}</p>
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-extrabold text-sm text-[#0071DC]">{t.faq2Q}</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.faq2A}</p>
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-extrabold text-sm text-[#0071DC]">{t.faq3Q}</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.faq3A}</p>
                </div>
                <div className="border-t pt-3">
                  <h4 className="font-extrabold text-sm text-[#0071DC]">{t.faq4Q}</h4>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.faq4A}</p>
                </div>
              </div>

              <div className="bg-[#F7F8F9] px-6 py-4 flex justify-end border-t border-gray-100">
                <button 
                  onClick={() => setIsHelpOpen(false)}
                  className="px-6 py-2 bg-[#041E42] text-white hover:bg-[#0071DC] rounded-full text-xs font-bold transition-all shadow-sm"
                >
                  {t.closeHelp}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-[#041E42] text-white py-8 border-t border-gray-800 text-xs relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider uppercase text-blue-200">NexDay Enterprise</span>
            <span>&copy; {new Date().getFullYear()} NexDay Inc. All rights reserved.</span>
          </div>
          <div className="flex space-x-6 text-gray-400 font-medium">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#help" className="hover:text-white transition-colors">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
