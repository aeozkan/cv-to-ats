export type Lang = "en" | "tr";

export const translations = {
  en: {
    title: "CV → ATS Converter",
    subtitle:
      "Upload your resume. We'll strip non-ATS elements, reorganize it into a standard ATS layout, and suggest missing keywords.",
    languageLabel: "Output language",
    english: "English",
    turkish: "Türkçe",
    step1Title: "1. Upload your resume",
    step1Desc: "PDF or DOCX. Text is extracted in your browser.",
    fileLabel: "Resume file",
    selected: "Selected",
    targetRoleLabel: "Target role (optional)",
    targetRolePh: "e.g. Senior Frontend Engineer",
    convert: "Convert to ATS Format",
    converting: "Converting...",
    translateConvert: "Translate & Optimize to English",
    scoreTitle: "ATS Match Score",
    scoreDescPrefix: "Estimated for role:",
    currentScore: "Current score",
    missingTitle: "Missing Keywords",
    missingDesc: "Add these to boost ATS match.",
    noGaps: "No major keyword gaps detected.",
    tipsTitle: "Improvement Tips",
    tipsDesc: "Quick wins for ATS compatibility.",
    resumeTitle: "ATS-Optimized Resume",
    resumeDesc: "Edit if needed, then download as ATS-friendly PDF.",
    download: "Download PDF",
    noFile: "No file",
    noFileDesc: "Upload a PDF or DOCX resume first.",
    rateLimited: "Rate limited",
    rateLimitedDesc: "Please wait and try again.",
    creditsNeeded: "Credits needed",
    creditsNeededDesc: "Add credits to your Lovable AI workspace.",
    error: "Error",
    failed: "Failed",
    converted: "Resume converted",
    detectedRole: "Detected role",
    extractError: "Could not extract enough text from the file. Try a different file.",
  },
  tr: {
    title: "CV → ATS Dönüştürücü",
    subtitle:
      "Özgeçmişinizi yükleyin. ATS uyumsuz öğeleri kaldırır, standart ATS düzenine yeniden organize eder ve eksik anahtar kelimeleri öneririz.",
    languageLabel: "Çıktı dili",
    english: "English",
    turkish: "Türkçe",
    step1Title: "1. Özgeçmişinizi yükleyin",
    step1Desc: "PDF veya DOCX. Metin tarayıcınızda çıkarılır.",
    fileLabel: "Özgeçmiş dosyası",
    selected: "Seçilen",
    targetRoleLabel: "Hedef pozisyon (opsiyonel)",
    targetRolePh: "örn. Kıdemli Frontend Mühendisi",
    convert: "ATS Formatına Dönüştür",
    converting: "Dönüştürülüyor...",
    translateConvert: "Türkçeye Çevir ve Optimize Et",
    scoreTitle: "ATS Uyum Skoru",
    scoreDescPrefix: "Tahmini pozisyon:",
    currentScore: "Mevcut skor",
    missingTitle: "Eksik Anahtar Kelimeler",
    missingDesc: "ATS uyumunu artırmak için ekleyin.",
    noGaps: "Önemli anahtar kelime eksiği bulunmadı.",
    tipsTitle: "İyileştirme Önerileri",
    tipsDesc: "ATS uyumu için hızlı kazanımlar.",
    resumeTitle: "ATS Optimize Edilmiş Özgeçmiş",
    resumeDesc: "Gerekirse düzenleyin, ardından ATS uyumlu PDF olarak indirin.",
    download: "PDF İndir",
    noFile: "Dosya yok",
    noFileDesc: "Önce PDF veya DOCX bir özgeçmiş yükleyin.",
    rateLimited: "Hız sınırı aşıldı",
    rateLimitedDesc: "Lütfen bekleyip tekrar deneyin.",
    creditsNeeded: "Kredi gerekli",
    creditsNeededDesc: "Lovable AI alanınıza kredi ekleyin.",
    error: "Hata",
    failed: "Başarısız",
    converted: "Özgeçmiş dönüştürüldü",
    detectedRole: "Algılanan pozisyon",
    extractError: "Dosyadan yeterli metin çıkarılamadı. Farklı bir dosya deneyin.",
  },
} as const;

export function t(lang: Lang) {
  return translations[lang];
}

const TURKISH_HINT = /[çğıİöşüÇĞÖŞÜ]|\b(ve|ile|için|deneyim|eğitim|çalışma|şirket|üniversite|beceriler|yetenekler|özgeçmiş|projeler)\b/i;

export function detectLanguage(text: string): Lang {
  const sample = text.slice(0, 4000);
  let trHits = 0;
  const matches = sample.match(/[çğıİöşüÇĞÖŞÜ]/g);
  if (matches) trHits += matches.length;
  if (TURKISH_HINT.test(sample)) trHits += 5;
  return trHits >= 5 ? "tr" : "en";
}