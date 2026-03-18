(() => {
  const BASE_TRANSLATIONS = {
    tr: {
      summarize: "Özetle",
      summarizing: "Özetleniyor...",
      back: "Geri",
      go_premium: "Beni Bilgilendir",
      daily_limit: "Günlük 10 özet hakkın doldu.",
      limit_reset: (h) => `${h} saat sonra sıfırlanacak.`,
      assistant_limit: "Günlük soru ve analiz hakkın doldu.",
      usage_loading: "Yükleniyor...",
      usage_remaining: (n) => `Bugün ${n} özet hakkın kaldı.`,
      usage_unavailable: "Kalan hak bilgisi alınamadı.",
      not_article: "Bu sayfa bir haber makalesi değil.",
      error_generic: "Bir hata oluştu. Tekrar dene.",
      error_network: "Bağlantı hatası. İnternet bağlantını kontrol et.",
      error_ai: "AI servisi şu anda yanıt veremiyor. Biraz sonra tekrar dene.",
      error_server: "Sunucu hatası. Lütfen daha sonra tekrar dene.",
      error_unauthorized: "İstek doğrulanamadı. Eklentiyi güncelle.",
      bias_btn: "⚖ Taraflılık Analizi",
      bias_loading: "Analiz ediliyor...",
      bias_title: "TARAFLILIK ANALİZİ",
      bias_left: "Sol",
      bias_right: "Sağ",
      bias_objective: "Nesnel",
      bias_emotional: "Duygusal",
      bias_labels: ["Güçlü sol", "Sol eğilimli", "Merkez", "Sağ eğilimli", "Güçlü sağ"],
      bias_emo_labels: ["Nesnel", "Kısmen duygusal", "Duygusal"],
      clickbait_title: "CLICKBAIT MI?",
      clickbait_yes: "👎 Clickbait",
      clickbait_no: "👍 Değil",
      clickbait_first: "İlk oyu sen ver",
      clickbait_stats: (yes, no) => `${yes} clickbait · ${no} değil`,
      qa_placeholder: "Bu haber hakkında bir şey sor...",
      history_label: "Son Özetler",
      summary_label: "Özet",
      qa_section_label: "Soru Sor",
      sources_title: "Diğer Kaynaklar",
      copy_action: "Kopyala",
      copied_action: "Kopyalandı!",
      twitter_action: "𝕏 Paylaş",
      feedback_good: "👍",
      feedback_bad: "👎",
      feedback_thanks: "Teşekkürler!",
      error_short: "Bir hata oluştu. Tekrar dene.",
    },
    en: {
      summarize: "Summarize",
      summarizing: "Summarizing...",
      back: "Back",
      go_premium: "Notify Me",
      daily_limit: "You've used all 10 free summaries today.",
      limit_reset: (h) => `Resets in ${h} hour${h === 1 ? "" : "s"}.`,
      assistant_limit: "You've used all question and analysis requests today.",
      usage_loading: "Loading...",
      usage_remaining: (n) => `${n} summaries left today.`,
      usage_unavailable: "Remaining quota could not be loaded.",
      not_article: "This page doesn't look like a news article.",
      error_generic: "Something went wrong. Please try again.",
      error_network: "Connection error. Check your internet connection.",
      error_ai: "AI service is not responding. Try again shortly.",
      error_server: "Server error. Please try again later.",
      error_unauthorized: "Request could not be verified. Update the extension.",
      bias_btn: "⚖ Bias Analysis",
      bias_loading: "Analyzing...",
      bias_title: "BIAS ANALYSIS",
      bias_left: "Left",
      bias_right: "Right",
      bias_objective: "Objective",
      bias_emotional: "Emotional",
      bias_labels: ["Far left", "Left-leaning", "Center", "Right-leaning", "Far right"],
      bias_emo_labels: ["Objective", "Somewhat emotional", "Emotional"],
      clickbait_title: "CLICKBAIT?",
      clickbait_yes: "👎 Clickbait",
      clickbait_no: "👍 Not clickbait",
      clickbait_first: "Be the first to vote",
      clickbait_stats: (yes, no) => `${yes} clickbait · ${no} not clickbait`,
      qa_placeholder: "Ask something about this article...",
      history_label: "Recent Summaries",
      summary_label: "Summary",
      qa_section_label: "Ask a Question",
      sources_title: "Other Sources",
      copy_action: "Copy",
      copied_action: "Copied!",
      twitter_action: "𝕏 Share",
      feedback_good: "👍",
      feedback_bad: "👎",
      feedback_thanks: "Thanks!",
      error_short: "Something went wrong.",
    },
  };

  const VARIANT_OVERRIDES = {
    sidebar: {
      tr: {
        history_label: "SON ÖZETLER",
        summary_label: "ÖZET",
        qa_section_label: "SORU SOR",
        sources_title: "DİĞER KAYNAKLAR",
        copy_action: "📋 Kopyala",
        copied_action: "✓ Kopyalandı",
        error_short: "Hata oluştu, tekrar dene.",
      },
      en: {
        history_label: "RECENT SUMMARIES",
        summary_label: "SUMMARY",
        qa_section_label: "ASK",
        sources_title: "OTHER SOURCES",
        copy_action: "📋 Copy",
        copied_action: "✓ Copied",
        error_short: "Something went wrong.",
      },
    },
  };

  function getTranslations(lang, variant = "popup") {
    const resolvedLang = BASE_TRANSLATIONS[lang] ? lang : "tr";
    return {
      ...BASE_TRANSLATIONS[resolvedLang],
      ...(VARIANT_OVERRIDES[variant]?.[resolvedLang] || {}),
    };
  }

  function getBiasDisplay({ political, emotional }, t) {
    const politicalValue = Number(political);
    const emotionalValue = Number(emotional);
    const politicalIndex =
      politicalValue < -60 ? 0 : politicalValue < -20 ? 1 : politicalValue <= 20 ? 2 : politicalValue < 60 ? 3 : 4;
    const emotionalIndex = emotionalValue < 35 ? 0 : emotionalValue < 65 ? 1 : 2;

    return {
      politicalLeft: `${(((politicalValue + 100) / 200) * 100).toFixed(1)}%`,
      emotionalLeft: `${emotionalValue.toFixed(1)}%`,
      politicalLabel: t.bias_labels[politicalIndex],
      emotionalLabel: `${t.bias_emo_labels[emotionalIndex]} (%${Math.round(emotionalValue)})`,
    };
  }

  function getClickbaitDisplay({ total = 0, clickbait = 0, userVote = null }, t) {
    const yesCount = Number(clickbait) || 0;
    const voteTotal = Number(total) || 0;
    const noCount = voteTotal - yesCount;

    return {
      yesText: `${t.clickbait_yes} (${yesCount})`,
      noText: `${t.clickbait_no} (${noCount})`,
      statsText: voteTotal === 0 ? t.clickbait_first : t.clickbait_stats(yesCount, noCount),
      yesActive: userVote === true,
      noActive: userVote === false,
    };
  }

  function getLimitResetText(t) {
    const now = new Date();
    const midnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const hoursLeft = Math.max(1, Math.ceil((midnightUtc - now) / 3600000));
    return `${t.daily_limit} ${t.limit_reset(hoursLeft)}`;
  }

  function getErrorMessage(errorCode, t) {
    const map = {
      network: t.error_network,
      ai_error: t.error_ai,
      parse_error: t.error_ai,
      internal_error: t.error_server,
      db_error: t.error_server,
      unauthorized: t.error_unauthorized,
      limit: t.daily_limit,
      assistant_limit: t.assistant_limit,
    };
    return map[errorCode] || t.error_generic;
  }

  globalThis.AozUi = {
    getTranslations,
    getBiasDisplay,
    getClickbaitDisplay,
    getErrorMessage,
    getLimitResetText,
  };
})();
