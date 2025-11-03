(function () {
  'use strict';
  function normalizeScore(value, min, max) {
    if (min === max) return value > min ? 7 : 1;
    const inverted = max < min;
    const lo = inverted ? max : min;
    const hi = inverted ? min : max;
    const v = Math.min(Math.max(value, lo), hi);
    let t = (v - lo) / (hi - lo);
    if (inverted) t = 1 - t;
    return Math.min(7, Math.max(1, Math.round(1 + t * 6)));
  }

  function computeHeatResults(arrivals = []) {
    // בדיקת בטיחות - וידוא שarrivals הוא מערך
    if (!Array.isArray(arrivals)) {
      console.warn('computeHeatResults: arrivals is not an array:', arrivals);
      return [];
    }
    // NEW: סינון מתמודדים שאינם פעילים (status !== 'active') כדי שלא ישפיעו על דירוג
    const activeArrivals = arrivals.filter(a => !a.status || a.status === 'active');
    const withOrder = activeArrivals.map((a, i) => ({ ...a, _order: i }));
    const isFinisher = a => typeof a.finishTime === 'number' && a.finishTime > 0;
    const finishers = withOrder.filter(isFinisher).sort((a, b) => (a.finishTime - b.finishTime) || (a._order - b._order));
    const dnfs = withOrder.filter(a => !isFinisher(a));
    const fastest = finishers.length ? finishers[0].finishTime : null;

    const results = [];
    
    // חישוב ציונים עבור מי שסיים
    finishers.forEach((a, idx) => {
      const rank = idx + 1;
      const totalFinishers = finishers.length;
      
      // ציון מיקום: מקום ראשון יקבל 7, מקום אחרון יקבל 1, באופן מדורג
      const positionScore = totalFinishers === 1 ? 7 : Math.max(1, Math.round(7 - ((rank - 1) / (totalFinishers - 1)) * 6));
      
      // ציון זמן: יחסי לזמן המהיר ביותר (המהיר ביותר יקבל 7)
      const timeScore = fastest && a.finishTime ? Math.max(1, Math.min(7, Math.round((7 * fastest) / a.finishTime))) : 1;
      
      // ציון סופי: ממוצע של שני הציונים
      const finalScore = Math.round((positionScore + timeScore) / 2);
      
      results.push({ 
        rank, 
        shoulderNumber: a.shoulderNumber, 
        finishTime: a.finishTime, 
        score: finalScore,
        positionScore, // שמירת הציונים הנפרדים למידע נוסף
        timeScore,
        comment: a.comment || null 
      });
    });
    
    // מי שלא סיים יקבל ציון 1
    dnfs.forEach((a, i) => {
      results.push({ 
        rank: finishers.length + i + 1, 
        shoulderNumber: a.shoulderNumber, 
        finishTime: null, 
        score: 1,
        positionScore: 1,
        timeScore: 1,
        comment: a.comment || 'לא סיים' 
      });
    });
    
    return results;
  }

  function computeCrawlingSprintResults(arrivals = []) {
    if (!Array.isArray(arrivals)) {
      console.warn('computeCrawlingSprintResults: arrivals is not an array:', arrivals);
      return [];
    }
    
    const withOrder = arrivals.map((a, i) => ({ ...a, _order: i }));
    const isFinisher = a => typeof a.finishTime === 'number' && a.finishTime > 0;
    const finishers = withOrder.filter(isFinisher).sort((a, b) => (a.finishTime - b.finishTime) || (a._order - b._order));
    const dnfs = withOrder.filter(a => !isFinisher(a));
    const fastest = finishers.length ? finishers[0].finishTime : null;

    const results = [];
    
    // חישוב ציונים עבור מי שסיים - בטווח 1-5
    finishers.forEach((a, idx) => {
      const rank = idx + 1;
      const totalFinishers = finishers.length;
      
      // ציון מיקום: מקום ראשון יקבל 5, מקום אחרון יקבל 1
      const positionScore = totalFinishers === 1 ? 5 : Math.max(1, Math.round(5 - ((rank - 1) / (totalFinishers - 1)) * 4));
      
      // ציון זמן: יחסי לזמן המהיר ביותר (המהיר ביותר יקבל 5)
      const timeScore = fastest && a.finishTime ? Math.max(1, Math.min(5, Math.round((5 * fastest) / a.finishTime))) : 1;
      
      // ציון סופי: ממוצע של שני הציונים
      const finalScore = Math.round((positionScore + timeScore) / 2);
      
      results.push({ 
        rank, 
        shoulderNumber: a.shoulderNumber, 
        finishTime: a.finishTime, 
        score: finalScore,
        positionScore,
        timeScore,
        comment: a.comment || null 
      });
    });
    
    // מי שלא סיים יקבל ציון 1
    dnfs.forEach((a, i) => {
      results.push({ 
        rank: finishers.length + i + 1, 
        shoulderNumber: a.shoulderNumber, 
        finishTime: null, 
        score: 1,
        positionScore: 1,
        timeScore: 1,
        comment: a.comment || 'לא סיים' 
      });
    });
    
    return results;
  }

  function getSprintHeatResults(heat) { return (!heat || !Array.isArray(heat.arrivals)) ? [] : computeHeatResults(heat.arrivals); }
  function getCrawlingSprintHeatResults(sprint) { return (!sprint || !Array.isArray(sprint.arrivals)) ? [] : computeHeatResults(sprint.arrivals); }

  // FIXED: חישוב ציון ספרינט סופי - כולל מתמודדים שהשתתפו אבל לא סיימו
  function calculateSprintFinalScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const statuses = window.state?.crawlingDrills?.runnerStatuses || {};
    // אם הרץ עצמו מוגדר פרש/נגרע מוחלט – החזר 1
    if (statuses[shoulderNumber] && statuses[shoulderNumber] !== 'active') return 1;

    const heats = window.state?.heats || [];
    if (heats.length === 0) return 1;
    
    const validScores = [];
    
    heats.forEach(heat => {
      if (!heat.arrivals || !heat.arrivals.length) return; // מקצה ריק – דלג
      // מציאת הגעה של הרץ כשהוא פעיל
      const arrival = heat.arrivals.find(a => a.shoulderNumber === shoulderNumber && (!a.status || a.status === 'active'));
      if (!arrival) return; // לא השתתף בפועל – לא מוסיפים ציון 1 יותר

      const heatResults = window.computeHeatResults?.(heat.arrivals) || [];
      const runnerResult = heatResults.find(r => r.shoulderNumber === shoulderNumber);
      if (runnerResult && runnerResult.finishTime && runnerResult.finishTime > 0) {
        validScores.push(runnerResult.score);
      } else {
        // השתתף אבל לא סיים
        validScores.push(1);
      }
    });
    
    if (!validScores.length) return 1; // לא השתתף באף מקצה פעיל
    return Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length);
  }

  // UPDATED: חישוב ציון זחילה ספרינט סופי - עכשיו בטווח 1-5 במקום 1-7
  function getCrawlingSprintScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const statuses = window.state?.crawlingDrills?.runnerStatuses || {};
    if (statuses[shoulderNumber] && statuses[shoulderNumber] !== 'active') return 1;

    const crawlingSprints = window.state?.crawlingDrills?.sprints || [];
    if (!crawlingSprints.length) return 1;
    
    const validScores = [];
    crawlingSprints.forEach(sprint => {
      if (!sprint.arrivals || !sprint.arrivals.length) return;
      const arrival = sprint.arrivals.find(a => a.shoulderNumber === shoulderNumber && (!a.status || a.status === 'active'));
      if (!arrival) return; // לא השתתף => לא מוסיפים 1

      const crawlingResults = computeCrawlingSprintResults(sprint.arrivals);
      const runnerResult = crawlingResults.find(r => r.shoulderNumber === shoulderNumber);
      if (runnerResult && runnerResult.finishTime && runnerResult.finishTime > 0) {
        validScores.push(runnerResult.score);
      } else {
        validScores.push(1); // השתתף ולא סיים
      }
    });
    
    if (!validScores.length) return 1;
    return Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length);
  }

  // NEW MODEL 2: Sociometric stretcher heat scoring
  function computeSociometricStretcherHeatScores(heat) {
    if (!heat) return {};
    const selections = heat.selections || {};
    const order = heat.selectionOrder || { stretcher: [], jerrican: [] };
    const res = {}; // shoulderNumber -> { role, score }

    // Stretcher scoring (first 4 only). Assumes system constraint prevents >4.
    const stretcherScores = [7, 6.5, 6.0, 5.5];
    (order.stretcher || []).forEach((sn, idx) => {
      if (idx < stretcherScores.length) {
        res[sn] = { role: 'אלונקה', score: stretcherScores[idx] };
      }
    });

    // Jerrican scoring: first 4.5 then -0.5 each, floor at 1
    (order.jerrican || []).forEach((sn, idx) => {
      if (res[sn]) return; // already stretcher
      const base = 4.5 - 0.5 * idx; // 4.5,4.0,3.5,...
      const score = Math.max(1, base);
      res[sn] = { role: "ג'ריקן", score };
    });

    // Determine participants: explicit participants array OR all keys from selections or orders
    const participantSet = new Set();
    (heat.participants || []).forEach(p => participantSet.add(String(p)));
    Object.keys(selections).forEach(sn => participantSet.add(String(sn)));
    (order.stretcher || []).forEach(sn => participantSet.add(String(sn)));
    (order.jerrican || []).forEach(sn => participantSet.add(String(sn)));

    // Any participant not selected gets baseline 1
    participantSet.forEach(sn => {
      if (!res[sn]) res[sn] = { role: 'השתתף - לא נבחר', score: 1 };
    });

    return res; // map of shoulderNumber(string) -> {role, score}
  }

  // REPLACED: calculateStretcherFinalScore now uses Model 2 scoring
  function calculateStretcherFinalScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const statuses = window.state?.crawlingDrills?.runnerStatuses || {};
    if (statuses[shoulderNumber] !== 'פעיל' && statuses[shoulderNumber] !== undefined) return 1;

    const sociometricData = window.state?.sociometricStretcher;
    const heats = sociometricData?.heats || [];
    if (!heats.length) return 1;

    const perHeatScores = [];

    heats.forEach(heat => {
      // Only consider heats that have any selection order data / selections
      if (!heat) return;
      const hasData = (heat.selectionOrder && ((heat.selectionOrder.stretcher||[]).length || (heat.selectionOrder.jerrican||[]).length)) || (heat.selections && Object.keys(heat.selections).length);
      if (!hasData) return;
      const map = computeSociometricStretcherHeatScores(heat);
      const rec = map[String(shoulderNumber)];
      if (rec) perHeatScores.push(rec.score);
    });

    if (!perHeatScores.length) return 1;

    const avg = perHeatScores.reduce((s,v)=>s+v,0)/perHeatScores.length;
    // Keep internal average with one decimal; finalScore remains integer (legacy interface)
    const finalScore = Math.round(avg); // preserve existing expectations

    // Cache per-runner details structure for reports (optional)
    window.state.sociometricStretcherResults = window.state.sociometricStretcherResults || {};
    window.state.sociometricStretcherResults[shoulderNumber] = {
      shoulderNumber,
      averageScore: Math.round(avg*10)/10,
      heats: perHeatScores.length,
      rawScores: perHeatScores.slice(),
      finalScore
    };

    return finalScore;
  }

  // REPLACED: getRunnerStretcherDetails uses Model 2 scoring map
  function getRunnerStretcherDetails(shoulderNumber) {
    const sociometricData = window.state?.sociometricStretcher;
    const heats = sociometricData?.heats || [];

    const heatResults = [];
    heats.forEach((heat, idx) => {
      if (!heat) return;
      const hasData = (heat.selectionOrder && ((heat.selectionOrder.stretcher||[]).length || (heat.selectionOrder.jerrican||[]).length)) || (heat.selections && Object.keys(heat.selections).length);
      if (!hasData) return; // skip inactive heat
      const map = computeSociometricStretcherHeatScores(heat);
      const rec = map[String(shoulderNumber)];
      if (rec) {
        heatResults.push({
          heatIndex: idx + 1,
            heatName: `מקצה ${idx + 1}`,
            role: rec.role,
            score: rec.score,
            participated: true
        });
      } else {
        // Not a participant in this active heat
        heatResults.push({
          heatIndex: idx + 1,
          heatName: `מקצה ${idx + 1}`,
          role: 'לא השתתף',
          score: null,
          participated: false
        });
      }
    });

    const participated = heatResults.filter(h => h.participated);
    const scores = participated.map(h => h.score).filter(s => typeof s === 'number');
    const avg = scores.length ? (scores.reduce((s,v)=>s+v,0)/scores.length) : 0;

    return {
      shoulderNumber,
      heatResults,
      finalScore: Math.round(avg),
      averageScore: Math.round(avg*10)/10,
      totalHeats: heatResults.length,
      participatedHeats: participated.length,
      stretcherCount: heatResults.filter(h => h.role === 'אלונקה').length,
      jerricanCount: heatResults.filter(h => h.role === "ג'ריקן").length,
      notSelectedCount: heatResults.filter(h => h.role === 'השתתף - לא נבחר').length
    };
  }

  // NEW: חישוב ציון סחיבת שק לפי דקות
  function getSackCarryScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const carriers = window.state?.crawlingDrills?.sackCarriers || {};
    const carrierData = carriers[shoulderNumber];
    
    if (!carrierData || !carrierData.totalTime || carrierData.totalTime <= 0) {
      return 0; // מי שלא סחב כלל לא מקבל נקודות
    }
    
    // המרת זמן ממילישניות לדקות
    const totalMinutes = carrierData.totalTime / (1000 * 60);
    const minutesPerPoint = window.CONFIG?.SACK_CARRY_MINUTES_PER_POINT || 4;
    
    // חישוב נקודות - כל 4 דקות = נקודה אחת
    const points = Math.floor(totalMinutes / minutesPerPoint);
    
    return points;
  }

  // UPDATED: פונקציה מפושטת לציון זחילה קבוצתית סופי - רק על בסיס נשיאת שק
  function calculateCrawlingFinalScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const statuses = window.state?.crawlingDrills?.runnerStatuses || {};
    if (statuses[shoulderNumber] !== 'פעיל' && statuses[shoulderNumber] !== undefined) return 1;

    // ציון ספרינטי זחילה (1-5)
    const sprintScore = getCrawlingSprintScore(runner);
    
    // נקודות סחיבת שק (0+)
    const sackPoints = getSackCarryScore(runner);
    
    // ציון כולל = ספרינט + נקודות שק, בטווח 1-7 (נחתך ב-7)
    const totalScore = sprintScore + sackPoints;
    const finalScore = Math.min(7, Math.max(1, totalScore)); // UPDATED: היה 5, כעת 7
    
    return finalScore;
  }

  // NEW: חישוב וביצוע עדכון ציוני ספרינטים לכל הרצים
  function updateAllSprintScores() {
    if (!window.state) return;
    
    // יצירת מבנה נתונים לשמירת תוצאות מפורטות
    window.state.sprintResults = window.state.sprintResults || {};
    
    const runners = window.state.runners || [];
    const heats = window.state.heats || [];
    
    runners.forEach(runner => {
      const shoulderNumber = runner.shoulderNumber;
      
      // חישוב תוצאות עבור כל מקצה
      const heatResults = heats.map((heat, heatIndex) => {
        const results = getSprintHeatResults(heat);
        const runnerResult = results.find(r => r.shoulderNumber === shoulderNumber);
        
        return {
          heatIndex: heatIndex + 1,
          heatName: `מקצה ${heatIndex + 1}`,
          rank: runnerResult ? runnerResult.rank : null,
          finishTime: runnerResult ? runnerResult.finishTime : null,
          score: runnerResult ? runnerResult.score : null,
          participated: !!runnerResult,
          // NEW: שמירת מידע נוסף לייצוא
          status: runnerResult ? (runnerResult.finishTime ? 'סיים' : 'לא סיים') : 'לא השתתף',
          formattedTime: runnerResult && runnerResult.finishTime ? formatTime_no_ms(runnerResult.finishTime) : null
        };
      });
      
      // חישוב ציון סופי
      const validScores = heatResults.filter(h => h.score !== null).map(h => h.score);
      const finalScore = validScores.length > 0 
        ? Math.min(7, Math.max(1, Math.round(validScores.reduce((s, v) => s + v, 0) / validScores.length)))
        : 1;
      
      // שמירת הנתונים המפורטים
      window.state.sprintResults[shoulderNumber] = {
        shoulderNumber,
        heatResults,
        finalScore,
        totalHeats: heats.length,
        participatedHeats: heatResults.filter(h => h.participated).length,
        validScores,
        averageScore: validScores.length > 0 ? Math.round((validScores.reduce((s, v) => s + v, 0) / validScores.length) * 10) / 10 : 0,
        bestRank: heatResults.filter(h => h.rank !== null).length > 0 ? Math.min(...heatResults.filter(h => h.rank !== null).map(h => h.rank)) : null,
        worstRank: heatResults.filter(h => h.rank !== null).length > 0 ? Math.max(...heatResults.filter(h => h.rank !== null).map(h => h.rank)) : null,
        lastUpdated: new Date().toISOString()
      };
    });
    
    // שמירת המצב
    if (typeof window.saveState === 'function') {
      window.saveState();
    }
  }

  // NEW: פונקציה לייצוא נתוני ספרינטים לפורמט Excel משופר
  function exportSprintResultsForExcel() {
    const runners = window.state?.runners || [];
    const heats = window.state?.heats || [];
    
    if (runners.length === 0) return [];
    
    const exportData = runners.map(runner => {
      const shoulderNumber = runner.shoulderNumber;
      const details = getRunnerSprintDetails(shoulderNumber);
      
      if (!details) {
        // יצירת שורה בסיסית אם אין נתונים
        const row = {
          'מספר כתף': shoulderNumber,
          'ציון סופי ספרינטים': 1,
          'מקצים השתתף': 0,
          'סה״כ מקצים': heats.length,
          'ממוצע מיקומים': 'לא השתתף',
          'מיקום טוב ביותר': 'לא השתתף',
          'מיקום גרוע ביותר': 'לא השתתף'
        };
        
        // הוספת עמודות ריקות לכל מקצה
        heats.forEach((heat, index) => {
          row[`מקצה ${index + 1} - מיקום`] = 'לא השתתף';
          row[`מקצה ${index + 1} - זמן`] = 'לא סיים';
          row[`מקצה ${index + 1} - ציון`] = 'לא השתתף';
          row[`מקצה ${index + 1} - סטטוס`] = 'לא השתתף';
        });
        
        return row;
      }
      
      const row = {
        'מספר כתף': shoulderNumber,
        'ציון סופי ספרינטים': details.finalScore,
        'מקצים השתתף': details.summary.participatedHeats,
        'סה״כ מקצים': details.summary.totalHeats,
        'ממוצע מיקומים': details.summary.averageRank || 'לא השתתף',
        'ממוצע ציונים': details.sprintResults.averageScore || 0,
        'מיקום טוב ביותר': details.sprintResults.bestRank || 'לא השתתף',
        'מיקום גרוע ביותר': details.sprintResults.worstRank || 'לא השתתף'
      };
      
      // הוספת עמודות מפורטות לכל מקצה
      details.heatResults.forEach((heatResult, index) => {
        const heatNum = index + 1;
        row[`מקצה ${heatNum} - מיקום`] = heatResult.rank || 'לא השתתף';
        row[`מקצה ${heatNum} - זמן`] = heatResult.formattedTime || 'לא סיים';
        row[`מקצה ${heatNum} - ציון`] = heatResult.score || 'לא השתתף';
        row[`מקצה ${heatNum} - סטטוס`] = heatResult.status || 'לא השתתף';
      });
      
      return row;
    });
    
    return exportData;
  }

  // NEW: פונקציה להצגת תוצאות מפורטות של רץ
  function getRunnerSprintDetails(shoulderNumber) {
    const results = window.state?.sprintResults?.[shoulderNumber];
    if (!results) return null;
    
    return {
      shoulderNumber,
      finalScore: results.finalScore,
      heatResults: results.heatResults,
      sprintResults: {
        averageScore: results.averageScore,
        bestRank: results.bestRank,
        worstRank: results.worstRank,
        validScores: results.validScores
      },
      summary: {
        totalHeats: results.totalHeats,
        participatedHeats: results.participatedHeats,
        averageRank: results.heatResults.filter(h => h.rank !== null).length > 0
          ? Math.round(results.heatResults.filter(h => h.rank !== null).reduce((sum, h) => sum + h.rank, 0) / results.heatResults.filter(h => h.rank !== null).length * 10) / 10
          : null
      }
    };
  }

  // Helper function for time formatting
  function formatTime_no_ms(ms) {
    if (!ms || ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // UPDATED: פונקציות לחישוב ציון זחילה קבוצתית - ציון גבוה יותר למי שסחב יותר זמן
  function calculateCrawlingGroupScore(runner) {
    const shoulderNumber = runner.shoulderNumber;
    const carriers = window.state?.crawlingDrills?.sackCarriers || {};
    const allRunners = window.state?.runners || [];
    const activeRunners = allRunners.filter(r => 
      (window.state?.crawlingDrills?.runnerStatuses?.[r.shoulderNumber] || 'פעיל') === 'פעיל'
    );
    
    if (activeRunners.length === 0) return 1;
    
    // חישוב זמני נשיאת שק של כל הרצים הפעילים
    const sackTimes = activeRunners.map(r => {
      const carrierData = carriers[r.shoulderNumber];
      return {
        shoulderNumber: r.shoulderNumber,
        totalTime: carrierData?.totalTime || 0
      };
    }).filter(r => r.totalTime > 0); // רק מי שנשא שק
    
    if (sackTimes.length === 0) return 1;
    
    // מיון לפי זמן (ארוך יותר = טוב יותר) - שינוי כיוון המיון
    sackTimes.sort((a, b) => b.totalTime - a.totalTime);
    
    // מציאת מיקום הרץ הנוכחי
    const runnerTime = carriers[shoulderNumber]?.totalTime || 0;
    if (runnerTime === 0) return 1; // לא נשא שק
    
    const rank = sackTimes.findIndex(r => r.shoulderNumber === shoulderNumber) + 1;
    
    // המרה לסקלה 1-7 (ככל שהמיקום טוב יותר - זמן יותר ארוך, הציון גבוה יותר)
    const totalParticipants = sackTimes.length;
    const normalizedScore = ((totalParticipants - rank + 1) / totalParticipants) * 6 + 1;
    
    return Math.round(normalizedScore);
  }

  window.Scoring = { 
    normalizeScore, 
    computeHeatResults, 
    getSprintHeatResults, 
    getCrawlingSprintHeatResults, 
    calculateSprintFinalScore, 
    getCrawlingSprintScore, 
    getSackCarryScore, 
    calculateCrawlingFinalScore, 
    calculateStretcherFinalScore,
    updateAllSprintScores,
    getRunnerSprintDetails,
    exportSprintResultsForExcel,
    computeSociometricStretcherHeatScores,
    getRunnerStretcherDetails
  };

  window.normalizeScore ??= normalizeScore;
  window.computeHeatResults ??= computeHeatResults;
  window.getSprintHeatResults ??= getSprintHeatResults;
  window.getCrawlingSprintHeatResults ??= getCrawlingSprintHeatResults;
  window.calculateSprintFinalScore ??= calculateSprintFinalScore;
  window.getCrawlingSprintScore ??= getCrawlingSprintScore;
  window.getSackCarryScore ??= getSackCarryScore;
  window.calculateCrawlingFinalScore ??= calculateCrawlingFinalScore;
  window.calculateStretcherFinalScore ??= calculateStretcherFinalScore;
  window.updateAllSprintScores ??= updateAllSprintScores;
  window.getRunnerSprintDetails ??= getRunnerSprintDetails;
  window.exportSprintResultsForExcel ??= exportSprintResultsForExcel;
  window.computeSociometricStretcherHeatScores ??= computeSociometricStretcherHeatScores;
  window.getRunnerStretcherDetails ??= getRunnerStretcherDetails;
})();