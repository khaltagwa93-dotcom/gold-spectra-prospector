export type Locale = "ar" | "en";

export const dictionary = {
  ar: {
    dir: "rtl" as const,
    appName: "GOLD SPECTRA PROSPECTOR",
    tagline: "منصّة استهداف استكشاف الذهب بالأقمار الصناعية والذكاء الاصطناعي",
    pasteMapsUrl: "الصق رابط Google Maps للمنطقة المراد تحليلها",
    mapsUrlPlaceholder: "https://www.google.com/maps/place/...",
    startAnalysis: "ابدأ التحليل",
    manualAoi: "تحديد المنطقة يدويًا",
    unresolvedLink: "تعذر استخراج موقع موثوق من الرابط. يرجى تحديد الموقع يدويًا على الخريطة.",
    presetAreas: "مساحات جاهزة",
    customArea: "مساحة مخصّصة",
    tools: {
      point: "نقطة",
      circle: "دائرة",
      rectangle: "مستطيل",
      polygon: "مضلّع"
    },
    dashboard: "لوحة التحكم",
    newProject: "مشروع جديد",
    projects: "المشاريع",
    disclaimerShort:
      "هذا النظام يحدّد مناطق ذات خصائص جيولوجية وبنيوية وطيفية قد تكون مواتية للاستكشاف. لا يكتشف أو يثبت وجود الذهب مباشرة.",
    disclaimerFull:
      "GOLD SPECTRA PROSPECTOR يوفّر استهدافًا لاستكشاف المعادن استنادًا إلى أدلة الاستشعار عن بعد والتحليل الطيفي والجيولوجي والبنيوي والتضاريسي المتاحة. لا يكتشف أو يؤكد أو يثبت وجود الذهب تحت السطح. تتطلب جميع الأهداف تحققًا جيولوجيًا وميدانيًا مستقلاً.",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج"
  },
  en: {
    dir: "ltr" as const,
    appName: "GOLD SPECTRA PROSPECTOR",
    tagline: "AI-Powered Satellite & Geological Gold Exploration Targeting Platform",
    pasteMapsUrl: "Paste a Google Maps link for the area to analyze",
    mapsUrlPlaceholder: "https://www.google.com/maps/place/...",
    startAnalysis: "Start Analysis",
    manualAoi: "Select area manually",
    unresolvedLink: "Could not extract a reliable location from this link. Please select the area manually on the map.",
    presetAreas: "Preset areas",
    customArea: "Custom area",
    tools: {
      point: "Point",
      circle: "Circle",
      rectangle: "Rectangle",
      polygon: "Polygon"
    },
    dashboard: "Dashboard",
    newProject: "New Project",
    projects: "Projects",
    disclaimerShort:
      "This system identifies areas with geological, structural and spectral characteristics that may be favorable for mineral exploration. It does not directly detect or prove the presence of gold.",
    disclaimerFull:
      "GOLD SPECTRA PROSPECTOR provides mineral exploration targeting based on available remote sensing, spectral, geological, structural and terrain evidence. It does not detect, confirm, or prove the presence of gold underground. All targets require independent geological and field verification.",
    signIn: "Sign in",
    signOut: "Sign out"
  }
};
