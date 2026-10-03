const translations = {
  tr: {
    brandName: "AI Haber Özetleyici",
    subtitle: "Kurulum tamamlandı! Haberlerin özünü, tonunu ve kaynak farkını tek tıkla gör.",
    f1Title: "Haberin Özü",
    f1Desc: "Herhangi bir haber sayfasında ana fikri hızlıca yakala.",
    f2Title: "Ton Sinyalleri",
    f2Desc: "Metindeki politik çerçeve ve duygusal dil sinyallerini gör.",
    f3Title: "Soru-Cevap",
    f3Desc: "Haber hakkında sorular sor, AI anında yanıtlasın.",
    f4Title: "Clickbait Oyu",
    f4Desc: "Başlık clickbait mi? Topluluk ile birlikte oyla.",
    f5Title: "Okuma Serisi & İstatistikler",
    f5Desc: "Okuma alışkanlığını, kaynak çeşitliliğini ve medya diyeti sinyallerini takip et.",
    howTitle: "Nasıl Kullanılır?",
    step1: "Bir haber sitesine git.",
    step2: "Sağ üstteki eklenti ikonuna tıkla.",
    step3: '"Özetle" butonuna bas — öz, ton sinyalleri ve kaynaklar hazır!',
    footerText: "Günlük 10 ücretsiz özet hakkın var. İyi okumalar!",
    langBtn: "EN",
  },
  en: {
    brandName: "AI News Summarizer",
    subtitle: "Setup complete! See the gist, tone, and source differences in one click.",
    f1Title: "Article Gist",
    f1Desc: "Catch the core point on any news page fast.",
    f2Title: "Tone Signals",
    f2Desc: "See political framing and emotional language signals in the article.",
    f3Title: "Q&A",
    f3Desc: "Ask questions about the article and get instant AI answers.",
    f4Title: "Clickbait Vote",
    f4Desc: "Is the headline clickbait? Vote together with the community.",
    f5Title: "Reading Streak & Stats",
    f5Desc: "Track your reading habit, source variety, and media diet signals.",
    howTitle: "How to Use?",
    step1: "Go to a news website.",
    step2: "Click the extension icon at the top right.",
    step3: 'Hit "Summarize" — gist, tone signals, and sources are ready!',
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
