import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ta" | "hi";

export const LANGS: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
];

const STORAGE_KEY = "hg.lang";

type Dict = Record<string, string>;

const en: Dict = {
  "app.name": "Her Guardian",
  "nav.dashboard": "Dashboard",
  "nav.journey": "Journey",
  "nav.safeRoute": "Safe Route Map",
  "nav.unsafeZones": "Dangerous Location Alerts",
  "nav.emergencyContacts": "Emergency Contacts",
  "nav.liveTracking": "Live Tracking",
  "nav.settings": "Settings",
  "nav.debug": "Debug",
  "nav.signOut": "Sign out",
  "nav.back": "Back",
  "nav.selectCity": "Select Your City",

  "sos.title": "Emergency SOS",
  "sos.subtitle": "Press to alert all your contacts with live GPS location",
  "sos.button": "Send SOS",
  "sos.sending": "Sending…",
  "sos.message": "I need help. My current location is:",
  "sos.danger": "Warning: You are entering a high-risk area.",

  "lang.choose": "Choose your language",
  "lang.chooseSub": "You can change this later in Settings.",
  "lang.continue": "Continue",
  "lang.label": "Language",

  "map.you": "You",
  "map.destination": "Destination",
  "map.waitingGps": "Waiting for GPS fix…",
  "map.gpsError": "Map could not load",

  // Safe Route
  "sr.title": "Safe Route Map",
  "sr.subtitle": "Select your city",
  "sr.cityLabel": "Choose city",
  "sr.tipLabel": "Safety tip:",
  "sr.howRated": "How is the safety rating calculated?",
  "sr.howRatedTitle": "Safety rating is based on:",
  "sr.f1": "Street lighting index",
  "sr.f2": "CCTV coverage",
  "sr.f3": "Community reports",
  "sr.f4": "Time-of-day risk pattern",
  "sr.checkRoute": "Check route",
  "sr.updated": "Routes are updated every 30 minutes",
  "sr.time.day": "Daytime",
  "sr.time.night": "Night",
  "sr.time.any": "Anytime",
  "sr.safety.safe": "Safe",
  "sr.safety.moderate": "Moderate",
  "sr.safety.unsafe": "Unsafe",

  // Unsafe Zones
  "uz.title": "Dangerous Location Alerts",
  "uz.subtitle": "Community-powered safety network",
  "uz.statActive": "Active alerts",
  "uz.statUsers": "Tamil Nadu users",
  "uz.statVerified": "Verified reports",
  "uz.filter.all": "All",
  "uz.risk.high": "High Risk",
  "uz.risk.medium": "Moderate Risk",
  "uz.risk.resolved": "Resolved",
  "uz.live": "Live alerts",
  "uz.confirm": "Confirm",
  "uz.none": "No alerts.",
  "uz.reportTitle": "Report a dangerous location",
  "uz.typeLabel": "Alert type",
  "uz.locPlaceholder": "Location (e.g. Tambaram Station, Chennai)",
  "uz.descPlaceholder": "Briefly describe what happened…",
  "uz.submit": "Report anonymously",
  "uz.fillAll": "Please fill all fields",
  "uz.thanks": "Your report has been logged. Thank you.",
  "uz.disclaimer": "Reports are auto-deleted after 24 hours. Verified reports are kept longer.",
  "uz.minsAgo": "min ago",
  "uz.hrsAgo": "hr ago",
  "uz.type.harassment": "Harassment",
  "uz.type.lighting": "Poor lighting",
  "uz.type.suspicious": "Suspicious activity",
  "uz.type.stalking": "Stalking",
  "uz.type.unsafeRoad": "Unsafe road",
  "uz.type.theft": "Theft attempt",
  "uz.type.resolved": "Resolved",

  // Journey
  "j.title": "Journey",
  "j.start": "Start a journey",
  "j.destPlaceholder": "Destination (place or address)",
  "j.searchPlace": "Find place",
  "j.searching": "Searching…",
  "j.geocoded": "Location found",
  "j.geocodeFail": "Could not find that place. Try a more specific address.",
  "j.destEmpty": "Enter a destination",
  "j.etaLabel": "Expected arrival (mins from now):",
  "j.startBtn": "Start journey monitoring",
  "j.arrived": "I'm Safe — Arrived",
  "j.sos": "SOS",
  "j.cancel": "Cancel journey",
  "j.active": "Active",
  "j.eta": "ETA",
  "j.noContacts": "Add an emergency contact first",
  "j.couldNotStart": "Could not start",
  "j.started": "Journey started — contacts will be alerted if you deviate or arrive late.",
  "j.arrivedToast": "Marked arrived safely",
  "j.cancelled": "Journey cancelled",

  // Threat detector
  "td.title": "AI Threat Detection",
  "td.statusSafe": "Safe",
  "td.statusModerate": "Moderate",
  "td.statusHigh": "High Risk",
  "td.tod": "Time of day",
  "td.night": "Night (9PM–6AM)",
  "td.day": "Daytime",
  "td.zone": "Zone",
  "td.inSafeZone": "In safe zone",
  "td.unknownArea": "Unknown area",
  "td.audioOn": "Audio monitoring on",
  "td.enableAudio": "Enable audio threat detection",
  "td.audioDenied": "Microphone permission denied",
  "td.audioHelp": "Listens for loud sounds (>80dB) at night. Vibration + 30s confirmation before auto-SOS.",
  "td.detected": "Threat detected — are you safe?",
  "td.autoIn": "Auto SOS in {s}s if no response",
  "td.imSafe": "✅ I'm Safe",
  "td.sendSos": "🚨 Send SOS",
  "td.history": "Threat history",
  "td.noneYet": "No threats detected yet",
  "td.notifTitle": "⚠️ Threat detected — confirm safety",
  "td.notifBody": "{detail}. Auto SOS in 30s if no response.",
};

const ta: Dict = {
  "app.name": "Her Guardian",
  "nav.dashboard": "முகப்பு",
  "nav.journey": "பயணம்",
  "nav.safeRoute": "பாதுகாப்பான பாதை வரைபடம்",
  "nav.unsafeZones": "அபாயகரமான இடங்கள் எச்சரிக்கை",
  "nav.emergencyContacts": "அவசர தொடர்புகள்",
  "nav.liveTracking": "நேரடி கண்காணிப்பு",
  "nav.settings": "அமைப்புகள்",
  "nav.debug": "பிழைத்திருத்தம்",
  "nav.signOut": "வெளியேறு",
  "nav.back": "பின் செல்",
  "nav.selectCity": "உங்கள் நகரத்தை தேர்வு செய்யுங்கள்",

  "sos.title": "SOS எச்சரிக்கை",
  "sos.subtitle": "உங்கள் தொடர்புகளுக்கு நேரடி GPS இடத்துடன் எச்சரிக்கை அனுப்ப அழுத்தவும்",
  "sos.button": "SOS அனுப்பு",
  "sos.sending": "அனுப்புகிறது…",
  "sos.message": "எனக்கு உதவி தேவை. எனது தற்போதைய இருப்பிடம்:",
  "sos.danger": "எச்சரிக்கை: நீங்கள் அதிக ஆபத்துள்ள பகுதிக்குள் நுழைகிறீர்கள்.",

  "lang.choose": "உங்கள் மொழியை தேர்வு செய்யுங்கள்",
  "lang.chooseSub": "இதை பின்னர் அமைப்புகளில் மாற்றலாம்.",
  "lang.continue": "தொடரவும்",
  "lang.label": "மொழி",

  "map.you": "நீங்கள்",
  "map.destination": "சேருமிடம்",
  "map.waitingGps": "GPS சமிக்ஞைக்காக காத்திருக்கிறது…",
  "map.gpsError": "வரைபடம் ஏற்ற முடியவில்லை",

  "sr.title": "பாதுகாப்பான பாதை வரைபடம்",
  "sr.subtitle": "உங்கள் நகரத்தை தேர்வு செய்யுங்கள்",
  "sr.cityLabel": "நகரம் தேர்வு செய்க",
  "sr.tipLabel": "பாதுகாப்பு குறிப்பு:",
  "sr.howRated": "பாதுகாப்பு மதிப்பீடு எவ்வாறு கணக்கிடப்படுகிறது?",
  "sr.howRatedTitle": "பாதுகாப்பு மதிப்பீடு எதன் அடிப்படையில்:",
  "sr.f1": "தெரு வெளிச்சம் குறியீடு",
  "sr.f2": "CCTV கவரேஜ்",
  "sr.f3": "சமூக புகார்கள்",
  "sr.f4": "நேர சார்ந்த அபாய முறை",
  "sr.checkRoute": "பாதை சரிபார்க்கவும்",
  "sr.updated": "பாதைகள் ஒவ்வொரு 30 நிமிடத்திற்கு ஒருமுறை புதுப்பிக்கப்படுகின்றன",
  "sr.time.day": "பகல்நேரம்",
  "sr.time.night": "இரவு நேரம்",
  "sr.time.any": "எந்நேரமும்",
  "sr.safety.safe": "பாதுகாப்பானது",
  "sr.safety.moderate": "நடுத்தரம்",
  "sr.safety.unsafe": "அபாயகரமானது",

  "uz.title": "அபாயகரமான இடங்கள் எச்சரிக்கை",
  "uz.subtitle": "சமூக தகவல்களால் இயங்கும் பாதுகாப்பு வலையமைப்பு",
  "uz.statActive": "செயலில் உள்ள எச்சரிக்கைகள்",
  "uz.statUsers": "தமிழ்நாடு பயனர்கள்",
  "uz.statVerified": "சரிபார்க்கப்பட்ட புகார்கள்",
  "uz.filter.all": "அனைத்தும்",
  "uz.risk.high": "அதிக ஆபத்து",
  "uz.risk.medium": "நடுத்தர ஆபத்து",
  "uz.risk.resolved": "தீர்வு காணப்பட்டது",
  "uz.live": "நேரடி எச்சரிக்கைகள்",
  "uz.confirm": "உறுதிப்படுத்து",
  "uz.none": "எந்த எச்சரிக்கையும் இல்லை.",
  "uz.reportTitle": "அபாயகரமான இடத்தை புகாரளிக்கவும்",
  "uz.typeLabel": "எச்சரிக்கை வகை தேர்வு செய்க",
  "uz.locPlaceholder": "இடம் (எ.கா. தாம்பரம் நிலையம், சென்னை)",
  "uz.descPlaceholder": "என்ன நடந்தது என்று சுருக்கமாக விவரிக்கவும்…",
  "uz.submit": "அனாமதியாக புகாரளிக்கவும்",
  "uz.fillAll": "தயவு செய்து அனைத்து புலங்களையும் நிரப்பவும்",
  "uz.thanks": "உங்கள் புகார் பதிவு செய்யப்பட்டது. நன்றி.",
  "uz.disclaimer": "புகார்கள் 24 மணி நேரத்திற்குப் பிறகு தானாகவே நீக்கப்படும். சரிபார்க்கப்பட்ட புகார்கள் மட்டுமே நீண்ட நேரம் காட்டப்படும்.",
  "uz.minsAgo": "நிமிடங்களுக்கு முன்",
  "uz.hrsAgo": "மணி நேரத்திற்கு முன்",
  "uz.type.harassment": "தொந்தரவு",
  "uz.type.lighting": "மோசமான வெளிச்சம்",
  "uz.type.suspicious": "சந்தேகாஸ்பத்தான செயல்",
  "uz.type.stalking": "பின்தொடர்தல்",
  "uz.type.unsafeRoad": "பாதுகாப்பற்ற சாலை",
  "uz.type.theft": "திருட்டு முயற்சி",
  "uz.type.resolved": "தீர்வு காணப்பட்டது",

  "j.title": "பயணம்",
  "j.start": "பயணத்தை தொடங்கவும்",
  "j.destPlaceholder": "சேருமிடம் (இடம் அல்லது முகவரி)",
  "j.searchPlace": "இடத்தை தேடவும்",
  "j.searching": "தேடுகிறது…",
  "j.geocoded": "இடம் கண்டுபிடிக்கப்பட்டது",
  "j.geocodeFail": "அந்த இடத்தை கண்டுபிடிக்க முடியவில்லை. தெளிவான முகவரியை முயற்சிக்கவும்.",
  "j.destEmpty": "சேருமிடத்தை உள்ளிடவும்",
  "j.etaLabel": "எதிர்பார்க்கப்படும் வருகை (இப்போதிலிருந்து நிமிடங்கள்):",
  "j.startBtn": "பயண கண்காணிப்பை தொடங்கவும்",
  "j.arrived": "நான் பாதுகாப்பாக சேர்ந்தேன்",
  "j.sos": "SOS",
  "j.cancel": "பயணத்தை ரத்து செய்",
  "j.active": "செயலில்",
  "j.eta": "நேரம்",
  "j.noContacts": "முதலில் அவசர தொடர்பை சேர்க்கவும்",
  "j.couldNotStart": "தொடங்க முடியவில்லை",
  "j.started": "பயணம் தொடங்கியது — விலகினால் அல்லது தாமதமானால் தொடர்புகள் எச்சரிக்கப்படும்.",
  "j.arrivedToast": "பாதுகாப்பாக சேர்ந்ததாக குறிக்கப்பட்டது",
  "j.cancelled": "பயணம் ரத்து செய்யப்பட்டது",

  "td.title": "AI அபாய கண்டறிதல்",
  "td.statusSafe": "பாதுகாப்பானது",
  "td.statusModerate": "நடுத்தரம்",
  "td.statusHigh": "அதிக ஆபத்து",
  "td.tod": "நேரம்",
  "td.night": "இரவு (இரவு 9 – காலை 6)",
  "td.day": "பகல்நேரம்",
  "td.zone": "மண்டலம்",
  "td.inSafeZone": "பாதுகாப்பான மண்டலத்தில்",
  "td.unknownArea": "தெரியாத பகுதி",
  "td.audioOn": "ஒலி கண்காணிப்பு இயக்கப்பட்டுள்ளது",
  "td.enableAudio": "ஒலி அபாய கண்டறிதலை இயக்கு",
  "td.audioDenied": "மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது",
  "td.audioHelp": "இரவில் சத்தமான ஒலிகளை (>80dB) கேட்கிறது. தானியங்கி SOS-க்கு முன் அதிர்வு + 30 வி உறுதிப்படுத்தல்.",
  "td.detected": "அபாயம் கண்டறியப்பட்டது — நீங்கள் பாதுகாப்பாக உள்ளீர்களா?",
  "td.autoIn": "பதிலளிக்கவில்லை எனில் {s} வினாடிகளில் தானியங்கி SOS",
  "td.imSafe": "✅ நான் பாதுகாப்பாக உள்ளேன்",
  "td.sendSos": "🚨 SOS அனுப்பு",
  "td.history": "அபாய வரலாறு",
  "td.noneYet": "இதுவரை எந்த அபாயமும் கண்டறியப்படவில்லை",
  "td.notifTitle": "⚠️ அபாயம் கண்டறியப்பட்டது — பாதுகாப்பை உறுதிசெய்க",
  "td.notifBody": "{detail}. பதில் இல்லையெனில் 30 வினாடிகளில் தானியங்கி SOS.",
};

const hi: Dict = {
  "app.name": "Her Guardian",
  "nav.dashboard": "डैशबोर्ड",
  "nav.journey": "यात्रा",
  "nav.safeRoute": "सुरक्षित मार्ग मानचित्र",
  "nav.unsafeZones": "खतरनाक स्थान चेतावनी",
  "nav.emergencyContacts": "आपातकालीन संपर्क",
  "nav.liveTracking": "लाइव ट्रैकिंग",
  "nav.settings": "सेटिंग्स",
  "nav.debug": "डिबग",
  "nav.signOut": "साइन आउट",
  "nav.back": "वापस",
  "nav.selectCity": "अपना शहर चुनें",

  "sos.title": "SOS अलर्ट",
  "sos.subtitle": "अपने संपर्कों को लाइव GPS स्थान के साथ अलर्ट भेजने के लिए दबाएँ",
  "sos.button": "SOS भेजें",
  "sos.sending": "भेज रहा है…",
  "sos.message": "मुझे मदद चाहिए। मेरा वर्तमान स्थान:",
  "sos.danger": "चेतावनी: आप एक उच्च जोखिम वाले क्षेत्र में प्रवेश कर रहे हैं।",

  "lang.choose": "अपनी भाषा चुनें",
  "lang.chooseSub": "आप इसे बाद में सेटिंग्स में बदल सकते हैं।",
  "lang.continue": "जारी रखें",
  "lang.label": "भाषा",

  "map.you": "आप",
  "map.destination": "गंतव्य",
  "map.waitingGps": "GPS सिग्नल की प्रतीक्षा है…",
  "map.gpsError": "मानचित्र लोड नहीं हो सका",

  "sr.title": "सुरक्षित मार्ग मानचित्र",
  "sr.subtitle": "अपना शहर चुनें",
  "sr.cityLabel": "शहर चुनें",
  "sr.tipLabel": "सुरक्षा सुझाव:",
  "sr.howRated": "सुरक्षा रेटिंग कैसे तय होती है?",
  "sr.howRatedTitle": "सुरक्षा रेटिंग का आधार:",
  "sr.f1": "स्ट्रीट लाइटिंग सूचकांक",
  "sr.f2": "CCTV कवरेज",
  "sr.f3": "सामुदायिक रिपोर्ट",
  "sr.f4": "समय-आधारित जोखिम पैटर्न",
  "sr.checkRoute": "मार्ग जाँचें",
  "sr.updated": "मार्ग हर 30 मिनट में अपडेट होते हैं",
  "sr.time.day": "दिन",
  "sr.time.night": "रात",
  "sr.time.any": "कभी भी",
  "sr.safety.safe": "सुरक्षित",
  "sr.safety.moderate": "मध्यम",
  "sr.safety.unsafe": "असुरक्षित",

  "uz.title": "खतरनाक स्थान चेतावनी",
  "uz.subtitle": "समुदाय-संचालित सुरक्षा नेटवर्क",
  "uz.statActive": "सक्रिय अलर्ट",
  "uz.statUsers": "तमिलनाडु उपयोगकर्ता",
  "uz.statVerified": "सत्यापित रिपोर्ट",
  "uz.filter.all": "सभी",
  "uz.risk.high": "उच्च जोखिम",
  "uz.risk.medium": "मध्यम जोखिम",
  "uz.risk.resolved": "हल हो गया",
  "uz.live": "लाइव अलर्ट",
  "uz.confirm": "पुष्टि करें",
  "uz.none": "कोई अलर्ट नहीं।",
  "uz.reportTitle": "खतरनाक स्थान की रिपोर्ट करें",
  "uz.typeLabel": "अलर्ट प्रकार",
  "uz.locPlaceholder": "स्थान (जैसे ताम्बरम स्टेशन, चेन्नई)",
  "uz.descPlaceholder": "संक्षेप में बताएँ क्या हुआ…",
  "uz.submit": "अनाम रूप से रिपोर्ट करें",
  "uz.fillAll": "कृपया सभी फ़ील्ड भरें",
  "uz.thanks": "आपकी रिपोर्ट दर्ज हो गई। धन्यवाद।",
  "uz.disclaimer": "रिपोर्ट 24 घंटे बाद स्वतः हट जाती हैं। सत्यापित रिपोर्ट लंबे समय तक दिखती हैं।",
  "uz.minsAgo": "मिनट पहले",
  "uz.hrsAgo": "घंटे पहले",
  "uz.type.harassment": "उत्पीड़न",
  "uz.type.lighting": "खराब रोशनी",
  "uz.type.suspicious": "संदिग्ध गतिविधि",
  "uz.type.stalking": "पीछा करना",
  "uz.type.unsafeRoad": "असुरक्षित सड़क",
  "uz.type.theft": "चोरी का प्रयास",
  "uz.type.resolved": "हल हो गया",

  "j.title": "यात्रा",
  "j.start": "यात्रा शुरू करें",
  "j.destPlaceholder": "गंतव्य (स्थान या पता)",
  "j.searchPlace": "स्थान खोजें",
  "j.searching": "खोज रहा है…",
  "j.geocoded": "स्थान मिल गया",
  "j.geocodeFail": "वह स्थान नहीं मिला। अधिक स्पष्ट पता आज़माएँ।",
  "j.destEmpty": "गंतव्य दर्ज करें",
  "j.etaLabel": "अनुमानित आगमन (अभी से मिनट):",
  "j.startBtn": "यात्रा निगरानी शुरू करें",
  "j.arrived": "मैं सुरक्षित पहुँच गई",
  "j.sos": "SOS",
  "j.cancel": "यात्रा रद्द करें",
  "j.active": "सक्रिय",
  "j.eta": "ETA",
  "j.noContacts": "पहले एक आपातकालीन संपर्क जोड़ें",
  "j.couldNotStart": "शुरू नहीं हो सका",
  "j.started": "यात्रा शुरू — विचलन या देरी पर संपर्क सूचित किए जाएँगे।",
  "j.arrivedToast": "सुरक्षित पहुँचा चिह्नित किया",
  "j.cancelled": "यात्रा रद्द",

  "td.title": "AI खतरा पहचान",
  "td.statusSafe": "सुरक्षित",
  "td.statusModerate": "मध्यम",
  "td.statusHigh": "उच्च जोखिम",
  "td.tod": "समय",
  "td.night": "रात (रात 9 – सुबह 6)",
  "td.day": "दिन",
  "td.zone": "क्षेत्र",
  "td.inSafeZone": "सुरक्षित क्षेत्र में",
  "td.unknownArea": "अज्ञात क्षेत्र",
  "td.audioOn": "ऑडियो निगरानी चालू",
  "td.enableAudio": "ऑडियो खतरा पहचान चालू करें",
  "td.audioDenied": "माइक्रोफ़ोन अनुमति अस्वीकृत",
  "td.audioHelp": "रात में तेज़ आवाज़ (>80dB) सुनता है। ऑटो-SOS से पहले कंपन + 30 सेकंड पुष्टि।",
  "td.detected": "खतरा पहचाना गया — क्या आप सुरक्षित हैं?",
  "td.autoIn": "उत्तर न मिलने पर {s} सेकंड में ऑटो SOS",
  "td.imSafe": "✅ मैं सुरक्षित हूँ",
  "td.sendSos": "🚨 SOS भेजें",
  "td.history": "खतरा इतिहास",
  "td.noneYet": "अभी तक कोई खतरा नहीं",
  "td.notifTitle": "⚠️ खतरा पहचाना गया — सुरक्षा की पुष्टि करें",
  "td.notifBody": "{detail}. उत्तर न मिलने पर 30 सेकंड में ऑटो SOS।",
};

const DICTS: Record<Lang, Dict> = { en, ta, hi };

type Ctx = {
  lang: Lang | null;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: (k) => DICTS.en[k] ?? k,
});

function fmt(s: string, vars?: Record<string, string | number>) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored && DICTS[stored]) setLangState(stored);
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    if (typeof document !== "undefined") document.documentElement.lang = l;
  };

  const active: Lang = lang ?? "en";
  const t = (key: string, vars?: Record<string, string | number>) =>
    fmt(DICTS[active][key] ?? DICTS.en[key] ?? key, vars);

  if (!ready) return null;

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
