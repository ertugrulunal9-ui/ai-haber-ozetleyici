(() => {
  const { createEl } = globalThis.AozUi;
  const popupUi = globalThis.AozPopupUi;

  function createStatsModule(state) {
    const statsEngine = globalThis.AozStatsEngine;
    const clientState = globalThis.AozClientState;
    const appCore = globalThis.AozAppCore;

    // Expose clientState helpers on appCore for popup use
    appCore.getStreak = clientState.getStreak;
    appCore.getDailyStats = clientState.getDailyStats;

    async function renderStreakWidget() {
      const streak = await appCore.getStreak();
      if (!streak || streak.current === 0) {
        state.refs.streakWidget.classList.add("hidden");
        return;
      }
      state.refs.streakIcon.textContent = "\u{1F525}";
      state.refs.streakText.textContent = state.t.streak_label(streak.current);
      state.refs.streakBest.textContent = state.t.streak_best(streak.longest);
      state.refs.streakWidget.classList.remove("hidden");
      state.refs.streakWidget.classList.toggle("streak-hot", streak.current >= 7);
    }

    async function renderDailyReport() {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().slice(0, 10);
      const yStats = await appCore.getDailyStats(yKey);

      if (!yStats || yStats.articlesRead === 0) {
        state.refs.dailyReportCard.classList.add("hidden");
        return;
      }

      state.refs.dailyReportTitle.textContent = state.t.daily_report_title;
      state.refs.dailyReportLine1.textContent = state.t.daily_report_yesterday(yStats.articlesRead);

      const sources = yStats.sources || {};
      const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
      state.refs.dailyReportLine2.textContent = topSource
        ? state.t.daily_report_top_source(topSource[0], topSource[1])
        : "";

      state.refs.dailyReportDetailsBtn.textContent = `${state.t.daily_report_details} →`;
      state.refs.dailyReportCard.classList.remove("hidden");

      chrome.action.setBadgeText({ text: "" });
    }

    async function renderWeeklyReport() {
      const weekly = await clientState.getWeeklyStats();

      if (!weekly || weekly.totalArticles === 0) {
        state.refs.weeklyReportCard.classList.add("hidden");
        return;
      }

      const diet = statsEngine.computeMediaDietSummary(weekly, state.lang);
      state.refs.weeklyReportTitle.textContent = state.t.weekly_report_title;
      state.refs.weeklyReportLine1.textContent = state.t.weekly_report_articles(weekly.totalArticles);
      state.refs.weeklyReportLine2.textContent = diet.recommendations?.[0] || diet.summaryText || state.t.weekly_report_empty;
      state.refs.weeklyReportDetailsBtn.textContent = `${state.t.weekly_report_details} →`;
      state.refs.weeklyReportCard.classList.remove("hidden");
    }

    function _renderMediaDietSummary(container, diet, t, classPrefix = "") {
      if (!container || !diet) return;
      const p = (cls, text) => createEl("p", classPrefix ? `${classPrefix}-${cls}` : cls, text);

      container.textContent = "";
      container.appendChild(p("media-diet-title", t.media_diet_title));
      container.appendChild(p("media-diet-text", diet.summaryText));
      container.appendChild(p("media-diet-item", t.media_diet_sources(diet.uniqueSources)));
      container.appendChild(p("media-diet-item", t.media_diet_diversity(diet.sourceDiversityLabel, diet.sourceDiversityScore)));
      container.appendChild(p("media-diet-item", diet.emotionalExposureLabel));
      container.appendChild(p("media-diet-item", diet.clickbaitExposureLabel));
      if (diet.topSource) {
        container.appendChild(p("media-diet-item", t.media_diet_top_source(diet.topSource.name, diet.topSource.count)));
      }
      _renderMediaDietRecommendations(container, diet.recommendations || [], t, classPrefix);
    }

    function _renderMediaDietRecommendations(container, recommendations, t, classPrefix = "") {
      if (!recommendations.length) return;
      const pfx = (cls) => classPrefix ? `${classPrefix}-${cls}` : cls;

      container.appendChild(createEl("p", pfx("media-diet-recs-title"), t.media_diet_recommendations_title));
      const list = createEl("ul", pfx("media-diet-recs"));
      recommendations.forEach((text) => list.appendChild(createEl("li", pfx("media-diet-rec"), text)));
      container.appendChild(list);
    }

    async function handleStatsClick() {
      const streak = await clientState.getStreak();
      const weekly = await clientState.getWeeklyStats();
      const sourceProfiles = await clientState.getSourceProfiles();
      let dailyStats = {};
      try { ({ dailyStats = {} } = await chrome.storage.local.get("dailyStats")); }
      catch { /* context invalidated */ }

      state.refs.statsViewTitle.textContent = state.t.stats_title;
      state.refs.statsBackButton.textContent = state.t.back;

      if (weekly.totalArticles === 0) {
        state.refs.statsNoData.textContent = state.t.stats_no_data;
        state.refs.statsNoData.classList.remove("hidden");
        state.refs.mediaDietShareButton.classList.add("hidden");
        state.refs.statsStreakSection.classList.add("hidden");
        state.refs.statsWeeklyCard.classList.add("hidden");
        state.refs.statsBiasCard.classList.add("hidden");
        state.refs.statsTopicsCard.classList.add("hidden");
        state.refs.statsSourcesCard.classList.add("hidden");
        state.refs.statsSourceProfilesCard.classList.add("hidden");
        popupUi.showPopupView(state.refs, "stats");
        return;
      }

      state.refs.statsNoData.classList.add("hidden");

      // Streak
      if (streak.current > 0) {
        state.refs.statsStreakIcon.textContent = "\u{1F525}";
        state.refs.statsStreakText.textContent = state.t.streak_label(streak.current);
        const pct = Math.min(100, (streak.current / Math.max(streak.longest, 1)) * 100);
        state.refs.statsStreakBar.style.width = `${pct}%`;
        state.refs.statsStreakBest.textContent = state.t.streak_best(streak.longest);
        state.refs.statsStreakSection.classList.remove("hidden");
      } else {
        state.refs.statsStreakSection.classList.add("hidden");
      }

      // Weekly numbers
      state.refs.statsWeeklyLabel.textContent = state.t.stats_this_week;
      _renderMediaDietSummary(state.refs.mediaDietSummary, statsEngine.computeMediaDietSummary(weekly, state.lang), state.t, "");
      state.refs.mediaDietShareButton.textContent = state.t.media_diet_share_action;
      state.refs.mediaDietShareButton.classList.remove("hidden");
      state.refs.statsArticles.textContent = state.t.stats_articles(weekly.totalArticles);
      state.refs.statsAnalyses.textContent = state.t.stats_analyses(weekly.totalAnalyses);
      state.refs.statsQuestions.textContent = state.t.stats_questions(weekly.totalQuestions);
      state.refs.statsVotes.textContent = state.t.stats_votes(weekly.totalVotes);
      state.refs.statsWeeklyCard.classList.remove("hidden");

      // Bias Map
      const biasData = statsEngine.computeDailyBiasAverages(dailyStats, 7);
      const hasAnyBias = biasData.some((d) => d.count > 0);

      if (hasAnyBias) {
        state.refs.statsBiasTitle.textContent = state.t.bias_map_title;
        const allReadings = weekly.biasReadings;
        const avgP = allReadings.length > 0
          ? allReadings.reduce((s, r) => s + r.political, 0) / allReadings.length
          : null;
        const avgE = allReadings.length > 0
          ? allReadings.reduce((s, r) => s + r.emotional, 0) / allReadings.length
          : null;

        const biasContainer = state.refs.statsBiasContent;
        biasContainer.textContent = "";
        biasContainer.appendChild(createEl("p", "stats-bias-desc", state.t.bias_map_desc));

        if (avgP !== null) {
          const pLabel = statsEngine.computeBiasLabel(avgP, state.lang);
          const eLabel = statsEngine.computeEmotionalLabel(avgE, state.lang);
          const pLeft = (((avgP + 100) / 200) * 100).toFixed(1);
          const eLeft = avgE.toFixed(1);

          const pLabelEl = createEl("p", "stats-bias-label");
          pLabelEl.append(`${state.t.bias_map_political_trend}: `, createEl("strong", null, pLabel));
          biasContainer.appendChild(pLabelEl);

          const pBarLabels = createEl("div", "stats-bias-bar-labels");
          pBarLabels.append(createEl("span", null, state.t.bias_left), createEl("span", null, state.t.bias_center), createEl("span", null, state.t.bias_right));
          biasContainer.appendChild(pBarLabels);

          const pBar = createEl("div", "bias-bar political-bar");
          pBar.style.cssText = "position:relative;height:8px;border-radius:99px;background:linear-gradient(to right,#3b82f6,#22c55e,#ef4444);margin-bottom:12px";
          const pDot = createEl("div", "bias-dot");
          pDot.style.cssText = "position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#fff;border:2.5px solid #334155;box-shadow:0 2px 6px rgba(0,0,0,0.25)";
          pDot.style.left = `${pLeft}%`;
          pBar.appendChild(pDot);
          biasContainer.appendChild(pBar);

          const eLabelEl = createEl("p", "stats-bias-label");
          eLabelEl.append(`${state.t.bias_map_emotional_trend}: `, createEl("strong", null, eLabel));
          biasContainer.appendChild(eLabelEl);

          const eBarLabels = createEl("div", "stats-bias-bar-labels");
          eBarLabels.append(createEl("span", null, state.t.bias_objective), createEl("span", null, state.t.bias_emo_center), createEl("span", null, state.t.bias_emotional));
          biasContainer.appendChild(eBarLabels);

          const eBar = createEl("div", "bias-bar emotional-bar");
          eBar.style.cssText = "position:relative;height:8px;border-radius:99px;background:linear-gradient(to right,#22c55e,#f59e0b,#ef4444);margin-bottom:8px";
          const eDot = createEl("div", "bias-dot");
          eDot.style.cssText = "position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#fff;border:2.5px solid #334155;box-shadow:0 2px 6px rgba(0,0,0,0.25)";
          eDot.style.left = `${eLeft}%`;
          eBar.appendChild(eDot);
          biasContainer.appendChild(eBar);

          // Daily bar chart
          const dayLabels = { 0: "Pazar", 1: "Pazartesi", 2: "Salı", 3: "Çarşamba", 4: "Perşembe", 5: "Cuma", 6: "Cumartesi" };
          const dayLabelsEn = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };
          const labels = state.lang === "en" ? dayLabelsEn : dayLabels;
          const daysWithData = biasData.filter((d) => d.count > 0);

          if (daysWithData.length > 1) {
            const dayLabelEl = createEl("p", "stats-bias-label", state.t.bias_map_day_label);
            dayLabelEl.style.marginTop = "8px";
            biasContainer.appendChild(dayLabelEl);

            const dailyContainer = createEl("div", "stats-bias-daily");
            for (const d of daysWithData) {
              const dayOfWeek = new Date(d.date).getDay();
              const barWidth = Math.max(10, (((d.avgPolitical + 100) / 200) * 100));
              const biasLabel = statsEngine.computeBiasLabel(d.avgPolitical, state.lang);

              const row = createEl("div", "stats-bias-day-row");
              const barWrap = createEl("div", "stats-bias-day-bar-wrap");
              const bar = createEl("div", "stats-bias-day-bar");
              bar.style.width = `${barWidth}%`;
              barWrap.appendChild(bar);
              row.append(
                createEl("span", "stats-bias-day-label", labels[dayOfWeek]),
                barWrap,
                createEl("span", "stats-bias-day-val", biasLabel),
              );
              dailyContainer.appendChild(row);
            }
            biasContainer.appendChild(dailyContainer);
          }
        }
        state.refs.statsBiasCard.classList.remove("hidden");
      } else {
        state.refs.statsBiasCard.classList.add("hidden");
      }

      // Top Topics
      const topTopics = statsEngine.computeTopTopics(weekly.topics, 5);
      if (topTopics.length > 0) {
        state.refs.statsTopicsTitle.textContent = state.t.stats_top_topics;
        state.refs.statsTopicsList.textContent = "";
        for (const topic of topTopics) {
          state.refs.statsTopicsList.appendChild(createEl("span", "stats-topic-tag", `${topic.name} (${topic.count})`));
        }
        state.refs.statsTopicsCard.classList.remove("hidden");
      } else {
        state.refs.statsTopicsCard.classList.add("hidden");
      }

      // Top Sources
      const topSources = statsEngine.computeTopSources(weekly.sources, 5);
      if (topSources.length > 0) {
        state.refs.statsSourcesTitle.textContent = state.t.stats_top_sources;
        state.refs.statsSourcesList.textContent = "";
        for (const s of topSources) {
          const row = createEl("div", "stats-source-row");
          row.append(createEl("span", "stats-source-name", s.name), createEl("span", "stats-source-count", `(${s.count})`));
          state.refs.statsSourcesList.appendChild(row);
        }
        state.refs.statsSourcesCard.classList.remove("hidden");
      } else {
        state.refs.statsSourcesCard.classList.add("hidden");
      }

      // Source Profiles
      const profileEntries = Object.entries(sourceProfiles)
        .filter(([, p]) => p.totalBiasAnalyses >= 3)
        .sort((a, b) => b[1].totalReads - a[1].totalReads)
        .slice(0, 5);

      if (profileEntries.length > 0) {
        state.refs.statsSourceProfilesTitle.textContent = state.t.source_profiles_title;
        state.refs.statsSourceProfilesList.textContent = "";
        for (const [name, p] of profileEntries) {
          const bLabels = statsEngine.getSourceBiasLabel(p, state.lang);
          const row = createEl("div", "stats-source-profile-row");
          row.append(
            createEl("span", "stats-source-name", name),
            createEl("span", "stats-source-bias", bLabels.political),
            createEl("span", "stats-source-emo", `${bLabels.emotional}(${bLabels.emotionalValue})`),
            createEl("span", "stats-source-count", state.t.source_reads(p.totalReads)),
          );
          state.refs.statsSourceProfilesList.appendChild(row);
        }
        state.refs.statsSourceProfilesCard.classList.remove("hidden");
      } else {
        state.refs.statsSourceProfilesCard.classList.add("hidden");
      }

      popupUi.showPopupView(state.refs, "stats");
    }

    function handleStatsBack() {
      popupUi.showPopupView(state.refs, "main");
    }

    async function handleMediaDietShareClick() {
      const weekly = await clientState.getWeeklyStats();
      if (!weekly || weekly.totalArticles === 0) return;

      const text = statsEngine.buildMediaDietShareText(weekly, state.lang);
      await navigator.clipboard.writeText(text);
      state.refs.mediaDietShareButton.textContent = state.t.media_diet_share_copied;
      setTimeout(() => {
        state.refs.mediaDietShareButton.textContent = state.t.media_diet_share_action;
      }, 2000);
    }

    return {
      renderStreakWidget,
      renderDailyReport,
      renderWeeklyReport,
      handleStatsClick,
      handleStatsBack,
      handleMediaDietShareClick,
    };
  }

  globalThis.AozPopupStats = { createStatsModule };
})();
