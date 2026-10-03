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
      bias_btn: "⚖ Ton sinyallerini analiz et",
      bias_loading: "Analiz ediliyor...",
      bias_title: "TON VE ÇERÇEVE SİNYALLERİ",
      bias_helper: "Kesin hüküm değil; metindeki politik çerçeve ve duygusal dil sinyalleridir.",
      bias_disclaimer: "Bu analiz kesin hüküm değil, metinsel sinyaller üzerinden üretilmiştir.",
      bias_left: "Sol",
      bias_center: "Merkez",
      bias_right: "Sağ",
      bias_objective: "Nesnel",
      bias_emo_center: "Orta",
      bias_emotional: "Duygusal",
      bias_labels: ["Güçlü sol", "Sol eğilimli", "Merkez", "Sağ eğilimli", "Güçlü sağ"],
      bias_emo_labels: ["Nesnel", "Kısmen duygusal", "Duygusal"],
      clickbait_title: "BAŞLIK SİNYALİ",
      clickbait_helper: "Başlığın abartılı veya yanıltıcı bulunup bulunmadığını topluluk oylarıyla gör.",
      clickbait_yes: "👎 Clickbait",
      clickbait_no: "👍 Değil",
      clickbait_first: "İlk oyu sen ver",
      clickbait_stats: (yes, no) => `${yes} clickbait · ${no} değil`,
      qa_placeholder: "Bu haber hakkında bir şey sor...",
      history_label: "Son Özetler",
      saved_label: "Kaydedilenler",
      summary_label: "Haberin Özü",
      summary_helper: "Ana fikri hızlıca yakala; ayrıntıya geçmeden önce olayın ne anlattığını gör.",
      qa_section_label: "Soru Sor",
      sources_title: "Başka Kaynaklar",
      sources_helper: "Aynı konuyu farklı kaynaklarda karşılaştır; tek anlatıya sıkışma.",
      sources_empty: "Bu haber için alternatif kaynak bulunamadı. Başlık çok özgün olabilir veya RSS sonuçları geçici olarak boş dönmüş olabilir.",
      source_compare_label: "Kaynak karşılaştırması",
      source_signal_same: "Aynı kaynak",
      source_signal_close: "Yakın eşleşme",
      source_signal_semantic: "Aynı olay",
      source_signal_semantic_near: "Semantik eşleşme",
      source_signal_check: "Çerçeveyi kontrol et",
      source_frame_same: "Aynı kaynaktan geldiği için bağımsız perspektif sayma.",
      source_frame_close: "Başlık ana olayla örtüşüyor; ayrıntı veya ton farkına bak.",
      source_frame_economic: "Bu başlık olayı ekonomik etki çerçevesinden kuruyor.",
      source_frame_political: "Bu başlık politik sorumluluk çerçevesini öne çıkarıyor.",
      source_frame_legal: "Bu başlık hukuki/soruşturma boyutunu öne çıkarıyor.",
      source_frame_security: "Bu başlık güvenlik ve kriz boyutunu öne çıkarıyor.",
      source_frame_sensational: "Bu başlık daha sansasyonel veya alarmist bir ton kullanıyor olabilir.",
      source_frame_general: "Başlık farklı bir açı kuruyor olabilir; anlatı farkını kontrol et.",
      source_frame_label_economic: "ekonomik",
      source_frame_label_political: "politik",
      source_frame_label_legal: "hukuki",
      source_frame_label_security: "güvenlik",
      source_frame_label_sensational: "sansasyonel",
      source_compare_summary: ({ independentCount, closeCount, semanticCount, frames }) => {
        const frameText = frames.length ? ` Öne çıkan çerçeveler: ${frames.join(", ")}.` : "";
        const semanticText = semanticCount ? ` ${semanticCount} semantik eşleşme.` : "";
        return `${independentCount} bağımsız kaynak, ${closeCount} yakın eşleşme bulundu.${semanticText}${frameText}`;
      },
      copy_action: "Kopyala",
      copied_action: "Kopyalandı!",
      save_action: "Kaydet",
      saved_action: "Kaydedildi",
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
      media_diet_title: "Medya Diyetim",
      media_diet_recommendations_title: "Öneriler",
      media_diet_sources: (n) => `${n} farklı kaynak`,
      media_diet_diversity: (label, score) => `Kaynak çeşitliliği: ${label} (%${score})`,
      media_diet_top_source: (name, count) => `En baskın kaynak: ${name} (${count})`,
      media_diet_share_action: "Raporu kopyala",
      media_diet_share_copied: "Rapor kopyalandı",
      stats_this_week: "Bu Hafta",
      stats_this_month: "Bu Ay",
      stats_articles: (n) => `${n} makale özetlendi`,
      stats_analyses: (n) => `${n} taraflılık analizi yapıldı`,
      stats_questions: (n) => `${n} soru soruldu`,
      stats_votes: (n) => `${n} clickbait oyu verildi`,
      stats_top_sources: "En Çok Okunan Kaynaklar",
      stats_top_topics: "En Çok Takip Edilen Konular",
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
      weekly_report_title: "Haftalık Medya Raporu",
      weekly_report_articles: (n) => `Bu hafta ${n} haber analiz ettin`,
      weekly_report_empty: "Bu hafta henüz medya raporu oluşmadı.",
      weekly_report_details: "Haftalık detaylar",
      // Auth
      auth_signin_title: "Devam etmek için giriş yap",
      auth_signup_title: "Ücretsiz hesap oluştur",
      auth_signin_btn: "Giriş Yap",
      auth_signup_btn: "Kayıt Ol",
      auth_goto_signup: "Hesabın yok mu? Kayıt ol",
      auth_goto_signin: "Zaten hesabın var mı? Giriş yap",
      auth_google_btn: "Google ile Giriş Yap",
      auth_divider: "veya",
      auth_email_placeholder: "E-posta",
      auth_password_placeholder: "Şifre",
      auth_error_empty: "E-posta ve şifre gerekli.",
      auth_error_invalid: "E-posta veya şifre hatalı.",
      auth_error_generic: "Giriş yapılamadı. Tekrar dene.",
      auth_confirm_email: "E-postanı kontrol et — onay bağlantısı gönderdik.",
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
      bias_btn: "⚖ Analyze tone signals",
      bias_loading: "Analyzing...",
      bias_title: "TONE AND FRAMING SIGNALS",
      bias_helper: "Not a final verdict; these are political framing and emotional language signals from the text.",
      bias_disclaimer: "This is not a final verdict; it is generated from textual signals.",
      bias_left: "Left",
      bias_center: "Center",
      bias_right: "Right",
      bias_objective: "Objective",
      bias_emo_center: "Moderate",
      bias_emotional: "Emotional",
      bias_labels: ["Far left", "Left-leaning", "Center", "Right-leaning", "Far right"],
      bias_emo_labels: ["Objective", "Somewhat emotional", "Emotional"],
      clickbait_title: "HEADLINE SIGNAL",
      clickbait_helper: "See whether the community finds the headline exaggerated or misleading.",
      clickbait_yes: "👎 Clickbait",
      clickbait_no: "👍 Not clickbait",
      clickbait_first: "Be the first to vote",
      clickbait_stats: (yes, no) => `${yes} clickbait · ${no} not clickbait`,
      qa_placeholder: "Ask something about this article...",
      history_label: "Recent Summaries",
      saved_label: "Saved Articles",
      summary_label: "Article Gist",
      summary_helper: "Get the core point first, before spending attention on the full story.",
      qa_section_label: "Ask a Question",
      sources_title: "Other Sources",
      sources_helper: "Compare the same topic across sources and avoid getting stuck in one framing.",
      sources_empty: "No alternative sources found for this article. The headline may be too specific or RSS results may be temporarily empty.",
      source_compare_label: "Source comparison",
      source_signal_same: "Same source",
      source_signal_close: "Close match",
      source_signal_semantic: "Same event",
      source_signal_semantic_near: "Semantic match",
      source_signal_check: "Check framing",
      source_frame_same: "Same source, so do not count it as an independent perspective.",
      source_frame_close: "The headline overlaps with the main event; check details or tone differences.",
      source_frame_economic: "This headline frames the story through economic impact.",
      source_frame_political: "This headline foregrounds political responsibility.",
      source_frame_legal: "This headline foregrounds the legal or investigation angle.",
      source_frame_security: "This headline foregrounds security or crisis impact.",
      source_frame_sensational: "This headline may use a more sensational or alarmist tone.",
      source_frame_general: "This headline may frame the story from a different angle; compare the narrative.",
      source_frame_label_economic: "economic",
      source_frame_label_political: "political",
      source_frame_label_legal: "legal",
      source_frame_label_security: "security",
      source_frame_label_sensational: "sensational",
      source_compare_summary: ({ independentCount, closeCount, semanticCount, frames }) => {
        const frameText = frames.length ? ` Leading frames: ${frames.join(", ")}.` : "";
        const semanticText = semanticCount ? ` ${semanticCount} semantic matches.` : "";
        return `${independentCount} independent sources, ${closeCount} close matches found.${semanticText}${frameText}`;
      },
      copy_action: "Copy",
      copied_action: "Copied!",
      save_action: "Save",
      saved_action: "Saved",
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
      media_diet_title: "My Media Diet",
      media_diet_recommendations_title: "Suggestions",
      media_diet_sources: (n) => `${n} unique sources`,
      media_diet_diversity: (label, score) => `Source variety: ${label} (${score}%)`,
      media_diet_top_source: (name, count) => `Top source: ${name} (${count})`,
      media_diet_share_action: "Copy report",
      media_diet_share_copied: "Report copied",
      stats_this_week: "This Week",
      stats_this_month: "This Month",
      stats_articles: (n) => `${n} articles summarized`,
      stats_analyses: (n) => `${n} bias analyses`,
      stats_questions: (n) => `${n} questions asked`,
      stats_votes: (n) => `${n} clickbait votes`,
      stats_top_sources: "Most Read Sources",
      stats_top_topics: "Most Followed Topics",
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
      weekly_report_title: "Weekly Media Report",
      weekly_report_articles: (n) => `${n} articles analyzed this week`,
      weekly_report_empty: "No weekly media report yet.",
      weekly_report_details: "Weekly details",
      // Auth
      auth_signin_title: "Sign in to continue",
      auth_signup_title: "Create a free account",
      auth_signin_btn: "Sign In",
      auth_signup_btn: "Sign Up",
      auth_goto_signup: "No account? Sign up",
      auth_goto_signin: "Already have an account? Sign in",
      auth_google_btn: "Continue with Google",
      auth_divider: "or",
      auth_email_placeholder: "Email",
      auth_password_placeholder: "Password",
      auth_error_empty: "Email and password are required.",
      auth_error_invalid: "Incorrect email or password.",
      auth_error_generic: "Could not sign in. Please try again.",
      auth_confirm_email: "Check your email — we sent a confirmation link.",
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
