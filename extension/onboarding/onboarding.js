const translations = {
  tr: {
    brandName: "AI Haber Özetleyici",
    subtitle: "Kurulum tamamlandı! İşte yapabileceklerin:",
    f1Title: "Haber Özeti",
    f1Desc: "Herhangi bir haber sayfasında tek tıkla AI destekli özet al.",
    f2Title: "Taraflılık Analizi",
    f2Desc: "Haberin politik ve duygusal yönelimini analiz et.",
    f3Title: "Soru-Cevap",
    f3Desc: "Haber hakkında sorular sor, AI anında yanıtlasın.",
    f4Title: "Clickbait Oyu",
    f4Desc: "Başlık clickbait mi? Topluluk ile birlikte oyla.",
    howTitle: "Nasıl Kullanılır?",
    step1: "Bir haber sitesine git.",
    step2: "Sağ üstteki eklenti ikonuna tıkla veya yan paneli kullan.",
    step3: '"Özetle" butonuna bas — özet, analiz ve kaynaklar hazır!',
    footerText: "Günlük 10 ücretsiz özet hakkın var. İyi okumalar!",
    langBtn: "EN",
  },
  en: {
    brandName: "AI News Summarizer",
    subtitle: "Setup complete! Here's what you can do:",
    f1Title: "News Summary",
    f1Desc: "Get an AI-powered summary on any news page with one click.",
    f2Title: "Bias Analysis",
    f2Desc: "Analyze the political and emotional bias of news articles.",
    f3Title: "Q&A",
    f3Desc: "Ask questions about the article and get instant AI answers.",
    f4Title: "Clickbait Vote",
    f4Desc: "Is the headline clickbait? Vote together with the community.",
    howTitle: "How to Use?",
    step1: "Go to a news website.",
    step2: "Click the extension icon at the top right, or use the sidebar.",
    step3: 'Hit "Summarize" — summary, analysis, and sources are ready!',
    footerText: "You have 10 free summaries per day. Happy reading!",
    langBtn: "TR",
  },
};

let currentLang = "tr";

function applyTranslations(lang) {
  const t = translations[lang];
  const ids = Object.keys(t);
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t[id];
  });
  document.documentElement.lang = lang;
}

function toggleLang() {
  currentLang = currentLang === "tr" ? "en" : "tr";
  applyTranslations(currentLang);

  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.set({ lang: currentLang });
  }
}

// Detect saved language preference
if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.local.get("lang", (result) => {
    if (result.lang === "en" || result.lang === "tr") {
      currentLang = result.lang;
      applyTranslations(currentLang);
    }
  });
}

document.getElementById("langBtn").addEventListener("click", toggleLang);
