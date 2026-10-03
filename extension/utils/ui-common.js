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
      error_rate_limited: "Çok hızlı istek gönderiyorsun. Birkaç dakika sonra tekrar dene.",
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
      // Phase 1 — Stats & Streak
      streak_label: (n) => `${n} gün üst üste`,
      streak_best: (n) => `En uzun: ${n}`,
      streak_restart: "Serini yeniden başlat!",
      stats_title: "İstatistiklerim",
      stats_this_week: "Bu Hafta",
      stats_this_month: "Bu Ay",
      stats_articles: (n) => `${n} makale özetlendi`,
      stats_analyses: (n) => `${n} taraflılık analizi yapıldı`,
      stats_questions: (n) => `${n} soru soruldu`,
      stats_votes: (n) => `${n} clickbait oyu verildi`,
      stats_top_sources: "En Çok Okunan Kaynaklar",
      stats_no_data: "Henüz veri yok. İlk haberini özetle!",
      // Phase 1 — Bias Map
      bias_map_title: "Okuma Eğilimim",
      bias_map_desc: "Okuduğun haberlerin ortalama yönelimi",
      bias_map_political_trend: "Politik Yönelim",
      bias_map_emotional_trend: "Haber Tonu",
      bias_map_avg: "Ortalama",
      bias_map_no_data: "Taraflılık analizi yaparak haritanı oluştur",
      bias_map_labels: ["Güçlü Sol", "Sol", "Merkez", "Sağ", "Güçlü Sağ"],
      bias_map_day_label: "Günlük Ortalama",
      // Phase 1 — Source Profile
      source_profile: "Kaynak Profili",
      source_reads: (n) => `${n} okuma`,
      source_not_enough: "Yeterli veri yok (min. 3 analiz)",
      source_profiles_title: "Kaynak Profilleri",
      // Phase 1 — Daily Report
      daily_report_title: "Günlük Raporun",
      daily_report_yesterday: (n) => `Dün ${n} haber özetledin`,
      daily_report_avg_bias: "Ort. bias",
      daily_report_top_source: (s, n) => `En çok: ${s} (${n})`,
      daily_report_details: "Detaylı istatistikler",
      weekly_title: "Haftalık Özet",
      weekly_articles: (n) => `Bu hafta ${n} haber analiz ettin`,
      weekly_compared: (pct) => `Geçen haftaya göre: ${pct > 0 ? "+" : ""}${pct}%`,
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
      error_rate_limited: "You're sending requests too quickly. Try again in a few minutes.",
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
      // Phase 1 — Stats & Streak
      streak_label: (n) => `${n} day streak`,
      streak_best: (n) => `Best: ${n}`,
      streak_restart: "Start your streak!",
      stats_title: "My Stats",
      stats_this_week: "This Week",
      stats_this_month: "This Month",
      stats_articles: (n) => `${n} articles summarized`,
      stats_analyses: (n) => `${n} bias analyses`,
      stats_questions: (n) => `${n} questions asked`,
      stats_votes: (n) => `${n} clickbait votes`,
      stats_top_sources: "Most Read Sources",
      stats_no_data: "No data yet. Summarize your first article!",
      // Phase 1 — Bias Map
      bias_map_title: "My Reading Bias",
      bias_map_desc: "Average bias of the news you read",
      bias_map_political_trend: "Political Leaning",
      bias_map_emotional_trend: "Tone",
      bias_map_avg: "Average",
      bias_map_no_data: "Run bias analyses to build your map",
      bias_map_labels: ["Far Left", "Left", "Center", "Right", "Far Right"],
      bias_map_day_label: "Daily Average",
      // Phase 1 — Source Profile
      source_profile: "Source Profile",
      source_reads: (n) => `${n} reads`,
      source_not_enough: "Not enough data (min. 3 analyses)",
      source_profiles_title: "Source Profiles",
      // Phase 1 — Daily Report
      daily_report_title: "Your Daily Report",
      daily_report_yesterday: (n) => `You summarized ${n} articles yesterday`,
      daily_report_avg_bias: "Avg. bias",
      daily_report_top_source: (s, n) => `Top: ${s} (${n})`,
      daily_report_details: "Detailed stats",
      weekly_title: "Weekly Summary",
      weekly_articles: (n) => `${n} articles analyzed this week`,
      weekly_compared: (pct) => `vs last week: ${pct > 0 ? "+" : ""}${pct}%`,
    },
  };

  function getTranslations(lang) {
    const resolvedLang = BASE_TRANSLATIONS[lang] ? lang : "tr";
    return { ...BASE_TRANSLATIONS[resolvedLang] };
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

  function escapeHtml(str) {
    if (typeof str !== "string") return String(str);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  function getErrorMessage(errorCode, t) {
    const map = {
      network: t.error_network,
      ai_error: t.error_ai,
      parse_error: t.error_ai,
      internal_error: t.error_server,
      db_error: t.error_server,
      unauthorized: t.error_unauthorized,
      auth_config: t.error_unauthorized,
      not_article: t.not_article,
      limit: t.daily_limit,
      assistant_limit: t.assistant_limit,
      rate_limited: t.error_rate_limited,
    };
    return map[errorCode] || t.error_generic;
  }

  function createEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = String(text);
    return el;
  }

  globalThis.AozUi = {
    getTranslations,
    getBiasDisplay,
    getClickbaitDisplay,
    getErrorMessage,
    getLimitResetText,
    escapeHtml,
    createEl,
  };
})();
