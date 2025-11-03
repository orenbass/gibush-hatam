// ===============================================
// מערכת ייצוא דוחות מאוחדת - GibushApp
// הקובץ היחיד לכל פעולות הייצוא
// ===============================================

window.GibushAppExporter = window.GibushAppExporter || {};

// פונקציה מרכזית ליצירת קובץ Excel מפורט
window.GibushAppExporter.createDetailedReport = function createDetailedReport() {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout: יצירת הדוח לקחה יותר מ-15 שניות'));
    }, 15000);

    console.log('GibushAppExporter: מתחיל יצירת דוח מפורט...');
    
    try {
      // וידוא שהציונים מעודכנים
      if (typeof window.updateAllSprintScores === 'function') {
        window.updateAllSprintScores();
      }

      // בדיקת זמינות ספריית ExcelJS
      if (typeof ExcelJS === 'undefined') {
        console.warn('ExcelJS לא זמין - יצירת CSV');
        return resolve(createCSVFallback());
      }

      // יצירת workbook חדש עם RTL
      const wb = new ExcelJS.Workbook();
      wb.views = [{ rightToLeft: true }]; // הגדרת RTL לכל החוברת
      
      const groupNum = window.state?.groupNumber || 'לא מוגדר';
      const evaluatorName = window.state?.evaluatorName || 'לא מוגדר';
      const now = new Date();

      // NEW: גליון 1 - סיכום כללי
      const summaryWs = wb.addWorksheet('סיכום כללי');
      summaryWs.views = [{ rightToLeft: true }];
      
      // פרטי הגיבוש בעמודה A במקום K
      summaryWs.getCell('A1').value = 'שם מעריך:';
      summaryWs.getCell('B1').value = evaluatorName;
      summaryWs.getCell('A2').value = 'מספר קבוצה:';
      summaryWs.getCell('B2').value = groupNum;
      summaryWs.getCell('A3').value = 'תאריך ושעה:';
      summaryWs.getCell('B3').value = `${now.toLocaleDateString('he-IL')}, ${now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
      
      // כותרות עמודות בשורה 5
      const summaryHeaders = [
        'דירוג', 'מס\' כתף', 'ציון ספרינטים (7-1)', 'ציון זחילה (7-1)',
        'ציון אלונקות (7-1)', 'ציון כללי', 'הערות כלליות'
      ];
      
      summaryHeaders.forEach((header, index) => {
        const cell = summaryWs.getCell(5, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // נתוני המתמודדים לסיכום - כולל לא פעילים
      const runners = window.state?.runners || [];
      const sprintExportData = window.exportSprintResultsForExcel?.() || [];
      
      const processedRunners = runners.map(runner => {
        const shoulderNumber = runner.shoulderNumber;
        const status = window.state?.crawlingDrills?.runnerStatuses?.[shoulderNumber] || 'פעיל';
        
        // כולל גם לא פעילים
        const sprintData = sprintExportData.find(s => s['מספר כתף'] == shoulderNumber);
        const manual = window.state?.manualScores?.[shoulderNumber];
        
        const sprint = status === 'פעיל' ? (manual?.sprint ?? (sprintData?.['ציון סופי ספרינטים'] || safeCalculate('calculateSprintFinalScore', runner))) : 1;
        const crawl = status === 'פעיל' ? (manual?.crawl ?? safeCalculate('calculateCrawlingFinalScore', runner)) : 1;
        const stretcher = status === 'פעיל' ? (manual?.stretcher ?? safeCalculate('calculateStretcherFinalScore', runner)) : 1;
        const total = status === 'פעיל' ? (CONFIG?.USE_WEIGHTED_AVERAGE ? calculateWeightedAverage(sprint, crawl, stretcher) : Math.round((sprint + crawl + stretcher) / 3)) : 1;
        const comments = getFormattedComments(shoulderNumber);
        
        return { shoulderNumber, sprint, crawl, stretcher, total, comments: comments.text, status };
      }).sort((a, b) => {
        // מיון: פעילים קודם לפי ציון, אחר כך לא פעילים לפי מספר כתף
        if (a.status === 'פעיל' && b.status !== 'פעיל') return -1;
        if (a.status !== 'פעיל' && b.status === 'פעיל') return 1;
        if (a.status === 'פעיל' && b.status === 'פעיל') return b.total - a.total;
        return a.shoulderNumber - b.shoulderNumber;
      });

      // הוספת נתונים לגליון סיכום - כולל לא פעילים
      processedRunners.forEach((runner, index) => {
        const rowIndex = 6 + index;
        const rank = runner.status === 'פעיל' ? (processedRunners.filter(r => r.status === 'פעיל').findIndex(r => r.shoulderNumber === runner.shoulderNumber) + 1) : 'לא פעיל';
        
        [rank, runner.shoulderNumber, runner.sprint, runner.crawl, runner.stretcher, runner.total, runner.comments]
          .forEach((value, colIndex) => {
            const cell = summaryWs.getCell(rowIndex, colIndex + 1);
            cell.value = value;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            
            // צבעי רקע - אפור ללא פעילים
            if (runner.status !== 'פעיל') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
            } else {
              // צבעי רקע לפי דירוג רק לפעילים
              const activeRank = typeof rank === 'number' ? rank : 0;
              if (activeRank === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
              else if (activeRank === 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
              else if (activeRank === 3) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCD7F32' } };
              else if (index % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            }
          });
      });

      // התאמת רוחב עמודות בסיכום
      [8, 10, 18, 16, 16, 12, 40].forEach((width, index) => {
        summaryWs.getColumn(index + 1).width = width;
      });

      // NEW: גליון 2 - ספרינטים עם טבלאות נפרדות לכל מקצה
      const sprintWs = wb.addWorksheet('ספרינטים');
      sprintWs.views = [{ rightToLeft: true }];
      
      let currentRow = 1;
      
      // כותרת כללית
      sprintWs.getCell(`A${currentRow}`).value = 'נתוני ספרינטים מפורטים';
      sprintWs.getCell(`A${currentRow}`).font = { bold: true, size: 16 };
      sprintWs.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      sprintWs.mergeCells(`A${currentRow}:E${currentRow}`);
      currentRow += 2;
      
      const totalHeats = window.state?.heats?.length || 0;
      const allRunners = runners; // כולל פעילים ולא פעילים
      const activeRunners = allRunners.filter(runner => {
        const status = window.state?.crawlingDrills?.runnerStatuses?.[runner.shoulderNumber] || 'פעיל';
        return status === 'פעיל';
      });
      
      // יצירת טבלה נפרדת לכל מקצה
      for (let heatIndex = 1; heatIndex <= totalHeats; heatIndex++) {
        // כותרת המקצה
        sprintWs.getCell(`A${currentRow}`).value = `מקצה ${heatIndex}`;
        sprintWs.getCell(`A${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        sprintWs.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        sprintWs.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
        sprintWs.mergeCells(`A${currentRow}:E${currentRow}`);
        currentRow++;
        
        // כותרות עמודות המקצה
        const heatHeaders = ['מס\' כתף', 'מיקום', 'זמן', 'ציון', 'סטטוס'];
        heatHeaders.forEach((header, colIndex) => {
          const cell = sprintWs.getCell(currentRow, colIndex + 1);
          cell.value = header;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        currentRow++;
        
        // נתוני המקצה - כולל לא פעילים
        allRunners.forEach((runner, runnerIndex) => {
          const shoulderNumber = runner.shoulderNumber;
          const status = window.state?.crawlingDrills?.runnerStatuses?.[shoulderNumber] || 'פעיל';
          const sprintData = sprintExportData.find(s => s['מספר כתף'] == shoulderNumber);
          
          const rowData = [
            shoulderNumber,
            status === 'פעיל' ? (sprintData?.[`מקצה ${heatIndex} - מיקום`] || 'לא השתתף') : 'לא פעיל',
            status === 'פעיל' ? (sprintData?.[`מקצה ${heatIndex} - זמן`] || 'לא סיים') : 'לא פעיל',
            status === 'פעיל' ? (sprintData?.[`מקצה ${heatIndex} - ציון`] || 'לא השתתף') : 'לא פעיל',
            status === 'פעיל' ? (sprintData?.[`מקצה ${heatIndex} - סטטוס`] || 'לא השתתף') : 'לא פעיל'
          ];
          
          rowData.forEach((value, colIndex) => {
            const cell = sprintWs.getCell(currentRow, colIndex + 1);
            cell.value = value;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            
            // צבע רקע אפור ללא פעילים
            if (status !== 'פעיל') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
            } else if (runnerIndex % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
            }
          });
          currentRow++;
        });
        
        // רווח בין טבלאות
        currentRow += 2;
      }
      
      // הוספת טבלת סיכום בסוף
      sprintWs.getCell(`A${currentRow}`).value = 'סיכום ספרינטים';
      sprintWs.getCell(`A${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      sprintWs.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      sprintWs.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
      sprintWs.mergeCells(`A${currentRow}:F${currentRow}`);
      currentRow++;
      
      const sprintSummaryHeaders = ['מס\' כתף', 'ציון סופי', 'השתתפות', 'ממוצע מיקום', 'מיקום טוב ביותר', 'מיקום גרוע ביותר'];
      sprintSummaryHeaders.forEach((header, colIndex) => {
        const cell = sprintWs.getCell(currentRow, colIndex + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      currentRow++;
      
      activeRunners.forEach((runner, runnerIndex) => {
        const shoulderNumber = runner.shoulderNumber;
        
        // קבלת נתוני ספרינט מפורטים מהמערכת
        const runnerSprintDetails = window.getRunnerSprintDetails?.(shoulderNumber);
        const sprintData = sprintExportData.find(s => s['מספר כתף'] == shoulderNumber);
        
        // חישוב נתונים נכונים - רק מקצים שבהם מישהו השתתף
        let finalScore = 1;
        let participation = '0/0';
        let avgRank = 'N/A';
        let bestRank = 'N/A';
        let worstRank = 'N/A';
        
        // חישוב מספר המקצים הפעילים (שבהם לפחות אחד השתתף)
        const heats = window.state?.heats || [];
        const activeHeatsCount = heats.filter(heat => 
          heat.arrivals && heat.arrivals.length > 0
        ).length;
        
        if (runnerSprintDetails) {
          finalScore = runnerSprintDetails.finalScore;
          participation = `${runnerSprintDetails.summary.participatedHeats}/${activeHeatsCount}`;
          avgRank = runnerSprintDetails.summary.averageRank || 'N/A';
          bestRank = runnerSprintDetails.sprintResults.bestRank || 'N/A';
          worstRank = runnerSprintDetails.sprintResults.worstRank || 'N/A';
        } else if (sprintData) {
          // Fallback לנתונים מהייצוא - עדכון לכלול רק מקצים פעילים
          finalScore = sprintData['ציון סופי ספרינטים'] || 1;
          const participatedHeats = sprintData['מקצים השתתף'] || 0;
          participation = `${participatedHeats}/${activeHeatsCount}`;
          avgRank = sprintData['ממוצע מיקומים'] || 'N/A';
          bestRank = sprintData['מיקום טוב ביותר'] || 'N/A';
          worstRank = sprintData['מיקום גרוע ביותר'] || 'N/A';
        }
        
        const rowData = [shoulderNumber, finalScore, participation, avgRank, bestRank, worstRank];
        
        rowData.forEach((value, colIndex) => {
          const cell = sprintWs.getCell(currentRow, colIndex + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          if (runnerIndex % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          }
        });
        currentRow++;
      });

      // התאמת רוחב עמודות בגליון ספרינטים
      sprintWs.getColumn(1).width = 12; // מס' כתף
      sprintWs.getColumn(2).width = 10; // מיקום/ציון
      sprintWs.getColumn(3).width = 12; // זמן
      sprintWs.getColumn(4).width = 8;  // ציון
      sprintWs.getColumn(5).width = 15; // סטטוס/השתתפות
      sprintWs.getColumn(6).width = 15; // ממוצע מיקום

      // NEW: גליון 3 - זחילה קבוצתית (מפושט)
      const crawlGroupWs = wb.addWorksheet('זחילה קבוצתית');
      crawlGroupWs.views = [{ rightToLeft: true }];
      
      crawlGroupWs.getCell('A1').value = 'נתוני זחילה קבוצתית';
      crawlGroupWs.getCell('A1').font = { bold: true, size: 16 };
      crawlGroupWs.getCell('A1').alignment = { horizontal: 'center' };
      crawlGroupWs.mergeCells('A1:D1');
      
      // UPDATED: כותרות מפושטות - רק מס' כתף, זמן נשיאת שק, ציון סופי והערות
      const crawlGroupHeaders = ['מס\' כתף', 'זמן נשיאת שק', 'ציון סופי זחילה קבוצתית', 'הערות'];
      crawlGroupHeaders.forEach((header, index) => {
        const cell = crawlGroupWs.getCell(3, index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });

      // UPDATED: נתוני זחילה קבוצתית מפושטים - כולל לא פעילים
      allRunners.forEach((runner, index) => {
        const rowIndex = 4 + index;
        const shoulderNumber = runner.shoulderNumber;
        const status = window.state?.crawlingDrills?.runnerStatuses?.[shoulderNumber] || 'פעיל';
        
        // קבלת זמן נשיאת שק
        const carriers = window.state?.crawlingDrills?.sackCarriers || {};
        const sackTime = carriers[shoulderNumber]?.totalTime || 0;
        const formattedSackTime = status === 'פעיל' ? (sackTime > 0 ? formatTime_no_ms(sackTime) : 'לא נשא') : 'לא פעיל';
        
        // ציון סופי - מבוסס רק על נשיאת שק
        const finalCrawlScore = status === 'פעיל' ? safeCalculate('calculateCrawlingFinalScore', runner) : 1;
        
        const rowData = [
          shoulderNumber,
          formattedSackTime,
          finalCrawlScore,
          '' // הערות זחילה
        ];
        
        rowData.forEach((value, colIndex) => {
          const cell = crawlGroupWs.getCell(rowIndex, colIndex + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          // צבע רקע אפור ללא פעילים
          if (status !== 'פעיל') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
          } else if (index % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          }
        });
      });

      // NEW: גליון 4 - זחילות ספרינט עם טבלאות נפרדות כמו ספרינטים
      const crawlSprintWs = wb.addWorksheet('זחילות ספרינט');
      crawlSprintWs.views = [{ rightToLeft: true }];
      
      let crawlCurrentRow = 1;
      
      // כותרת כללית
      crawlSprintWs.getCell(`A${crawlCurrentRow}`).value = 'נתוני זחילות ספרינט מפורטים';
      crawlSprintWs.getCell(`A${crawlCurrentRow}`).font = { bold: true, size: 16 };
      crawlSprintWs.getCell(`A${crawlCurrentRow}`).alignment = { horizontal: 'center' };
      crawlSprintWs.mergeCells(`A${crawlCurrentRow}:E${crawlCurrentRow}`);
      crawlCurrentRow += 2;
      
      const crawlingSprints = window.state?.crawlingDrills?.sprints || [];
      
      // יצירת טבלה נפרדת לכל זחילה ספרינט
      crawlingSprints.forEach((sprint, sprintIndex) => {
        // כותרת הזחילה
        crawlSprintWs.getCell(`A${crawlCurrentRow}`).value = `זחילה ספרינט ${sprintIndex + 1}`;
        crawlSprintWs.getCell(`A${crawlCurrentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        crawlSprintWs.getCell(`A${crawlCurrentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        crawlSprintWs.getCell(`A${crawlCurrentRow}`).alignment = { horizontal: 'center' };
        crawlSprintWs.mergeCells(`A${crawlCurrentRow}:E${crawlCurrentRow}`);
        crawlCurrentRow++;
        
        // כותרות עמודות הזחילה
        const crawlHeaders = ['מס\' כתף', 'מיקום', 'זמן', 'ציון', 'סטטוס'];
        crawlHeaders.forEach((header, colIndex) => {
          const cell = crawlSprintWs.getCell(crawlCurrentRow, colIndex + 1);
          cell.value = header;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        crawlCurrentRow++;
        
        // נתוני הזחילה - כולל לא פעילים
        allRunners.forEach((runner, runnerIndex) => {
          const shoulderNumber = runner.shoulderNumber;
          const status = window.state?.crawlingDrills?.runnerStatuses?.[shoulderNumber] || 'פעיל';
          const crawlResults = window.getCrawlingSprintHeatResults ? window.getCrawlingSprintHeatResults(sprint) : [];
          const runnerResult = crawlResults.find(r => r.shoulderNumber === shoulderNumber);
          
          const rowData = [
            shoulderNumber,
            status === 'פעיל' ? (runnerResult ? runnerResult.rank : 'לא השתתף') : 'לא פעיל',
            status === 'פעיל' ? (runnerResult && runnerResult.finishTime ? formatTime_no_ms(runnerResult.finishTime) : 'לא סיים') : 'לא פעיל',
            status === 'פעיל' ? (runnerResult ? runnerResult.score : 'לא השתתף') : 'לא פעיל',
            status === 'פעיל' ? (runnerResult ? (runnerResult.finishTime ? 'סיים' : 'לא סיים') : 'לא השתתף') : 'לא פעיל'
          ];
          
          rowData.forEach((value, colIndex) => {
            const cell = crawlSprintWs.getCell(crawlCurrentRow, colIndex + 1);
            cell.value = value;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            
            // צבע רקע אפור ללא פעילים
            if (status !== 'פעיל') {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
            } else if (runnerIndex % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
            }
          });
          crawlCurrentRow++;
        });
        
        // רווח בין טבלאות
        crawlCurrentRow += 2;
      });
      
      // הוספת טבלת סיכום זחילות בסוף
      crawlSprintWs.getCell(`A${crawlCurrentRow}`).value = 'סיכום זחילות ספרינט';
      crawlSprintWs.getCell(`A${crawlCurrentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      crawlSprintWs.getCell(`A${crawlCurrentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      crawlSprintWs.getCell(`A${crawlCurrentRow}`).alignment = { horizontal: 'center' };
      crawlSprintWs.mergeCells(`A${crawlCurrentRow}:F${crawlCurrentRow}`);
      crawlCurrentRow++;
      
      const crawlSummaryHeaders = ['מס\' כתף', 'ציון סופי', 'השתתפות', 'ממוצע מיקום', 'מיקום טוב ביותר', 'מיקום גרוע ביותר'];
      crawlSummaryHeaders.forEach((header, colIndex) => {
        const cell = crawlSprintWs.getCell(crawlCurrentRow, colIndex + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      crawlCurrentRow++;
      
      // נתוני סיכום זחילות
      activeRunners.forEach((runner, runnerIndex) => {
        const shoulderNumber = runner.shoulderNumber;
        
        // חישוב נתוני סיכום זחילות רק ממקצים פעילים
        const activeCrawlingSprints = crawlingSprints.filter(sprint => 
          sprint.arrivals && sprint.arrivals.length > 0
        );
        
        const allCrawlResults = activeCrawlingSprints.map(sprint => {
          const results = window.getCrawlingSprintHeatResults ? window.getCrawlingSprintHeatResults(sprint) : [];
          return results.find(r => r.shoulderNumber === shoulderNumber);
        }).filter(Boolean);
        
        const validScores = allCrawlResults.map(r => r.score).filter(s => s > 0);
        const validRanks = allCrawlResults.map(r => r.rank).filter(r => r > 0);
        
        const finalScore = validScores.length > 0 ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length) : 1;
        const participation = `${allCrawlResults.length}/${activeCrawlingSprints.length}`;
        const avgRank = validRanks.length > 0 ? Math.round((validRanks.reduce((sum, rank) => sum + rank, 0) / validRanks.length) * 10) / 10 : 'N/A';
        const bestRank = validRanks.length > 0 ? Math.min(...validRanks) : 'N/A';
        const worstRank = validRanks.length > 0 ? Math.max(...validRanks) : 'N/A';
        
        const rowData = [shoulderNumber, finalScore, participation, avgRank, bestRank, worstRank];
        
        rowData.forEach((value, colIndex) => {
          const cell = crawlSprintWs.getCell(crawlCurrentRow, colIndex + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          if (runnerIndex % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          }
        });
        crawlCurrentRow++;
      });

      // התאמת רוחב עמודות בגליון זחילות ספרינט
      crawlSprintWs.getColumn(1).width = 12; // מס' כתף
      crawlSprintWs.getColumn(2).width = 10; // מיקום/ציון
      crawlSprintWs.getColumn(3).width = 12; // זמן
      crawlSprintWs.getColumn(4).width = 8;  // ציון
      crawlSprintWs.getColumn(5).width = 15; // סטטוס/השתתפות
      crawlSprintWs.getColumn(6).width = 15; // ממוצע מיקום

      // NEW: גליון 5 - אלונקות סוציומטריות עם טבלאות נפרדות כמו ספרינטים
      const stretcherWs = wb.addWorksheet('אלונקות סוציומטריות');
      stretcherWs.views = [{ rightToLeft: true }];
      
      let stretcherCurrentRow = 1;
      
      // כותרת כללית
      stretcherWs.getCell(`A${stretcherCurrentRow}`).value = 'נתוני אלונקות סוציומטריות מפורטים';
      stretcherWs.getCell(`A${stretcherCurrentRow}`).font = { bold: true, size: 16 };
      stretcherWs.getCell(`A${stretcherCurrentRow}`).alignment = { horizontal: 'center' };
      stretcherWs.mergeCells(`A${stretcherCurrentRow}:E${stretcherCurrentRow}`);
      stretcherCurrentRow += 2;
      
      const sociometricData = window.state?.sociometricStretcher;
      const stretcherHeats = sociometricData?.heats || [];
      
      // יצירת טבלה נפרדת לכל מקצה אלונקות
      stretcherHeats.forEach((heat, heatIndex) => {
        // כותרת המקצה
        stretcherWs.getCell(`A${stretcherCurrentRow}`).value = `מקצה ${heatIndex + 1}`;
        stretcherWs.getCell(`A${stretcherCurrentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        stretcherWs.getCell(`A${stretcherCurrentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        stretcherWs.getCell(`A${stretcherCurrentRow}`).alignment = { horizontal: 'center' };
        stretcherWs.mergeCells(`A${stretcherCurrentRow}:E${stretcherCurrentRow}`);
        stretcherCurrentRow++;
        
        // כותרות עמודות המקצה (עודכן לשימוש במודל 2)
        const stretcherHeaders = ['מס\' כתף', 'תפקיד', 'ציון', 'הערות'];
        stretcherHeaders.forEach((header, colIndex) => {
          const cell = stretcherWs.getCell(stretcherCurrentRow, colIndex + 1);
          cell.value = header;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        stretcherCurrentRow++;
        
        // מיפוי ציונים לפי מודל 2
        const heatScoreMap = (typeof window.computeSociometricStretcherHeatScores === 'function')
          ? window.computeSociometricStretcherHeatScores(heat)
          : {};
        
        // נתוני המקצה (משתמשים ברצים פעילים בלבד לצורך דירוג, לא פעילים לא מוצגים)
        activeRunners.forEach((runner, runnerIndex) => {
          const shoulderNumber = runner.shoulderNumber;
          const rec = heatScoreMap ? heatScoreMap[String(shoulderNumber)] : undefined;
          let role, score;
          if (rec) {
            role = rec.role; // 'אלונקה' | 'ג'ריקן' | 'השתתף - לא נבחר'
            score = rec.score; // מספר (כולל שברים 6.5 וכו') או 1
          } else {
            // לא השתתף כלל במקצה זה
            role = 'לא השתתף';
            score = 'לא השתתף';
          }
          
          const rowData = [
            shoulderNumber,
            role,
            score,
            '' // הערות (עתידי)
          ];
          
            rowData.forEach((value, colIndex) => {
            const cell = stretcherWs.getCell(stretcherCurrentRow, colIndex + 1);
            cell.value = value;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            if (runnerIndex % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
            }
          });
          stretcherCurrentRow++;
        });
        
        // רווח בין טבלאות
        stretcherCurrentRow += 2;
      });
      
      // הוספת טבלת סיכום אלונקות בסוף
      stretcherWs.getCell(`A${stretcherCurrentRow}`).value = 'סיכום אלונקות סוציומטריות';
      stretcherWs.getCell(`A${stretcherCurrentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      stretcherWs.getCell(`A${stretcherCurrentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      stretcherWs.getCell(`A${stretcherCurrentRow}`).alignment = { horizontal: 'center' };
      stretcherWs.mergeCells(`A${stretcherCurrentRow}:F${stretcherCurrentRow}`);
      stretcherCurrentRow++;
      
      const stretcherSummaryHeaders = ['מס\' כתף', 'ציון סופי', 'השתתפות', 'פעמים אלונקה', 'פעמים ג\'ריקן', 'ממוצע ציון'];
      stretcherSummaryHeaders.forEach((header, colIndex) => {
        const cell = stretcherWs.getCell(stretcherCurrentRow, colIndex + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      stretcherCurrentRow++;
      
      // נתוני סיכום אלונקות
      activeRunners.forEach((runner, runnerIndex) => {
        const shoulderNumber = runner.shoulderNumber;
        const stretcherDetails = safeCalculate('getRunnerStretcherDetails', shoulderNumber);
        
        const finalScore = safeCalculate('calculateStretcherFinalScore', runner);
        const participation = stretcherDetails ? `${stretcherDetails.participatedHeats}/${stretcherDetails.totalHeats}` : '0/0';
        const stretcherCount = stretcherDetails ? stretcherDetails.stretcherCount : 0;
        const jerricanCountValue = stretcherDetails ? stretcherDetails.jerricanCount : 0;
        const averageScore = stretcherDetails ? stretcherDetails.averageScore : 0;
        
        const rowData = [
          shoulderNumber,
          finalScore,
          participation,
          stretcherCount,
          jerricanCountValue,
          averageScore
        ];
        
        rowData.forEach((value, colIndex) => {
          const cell = stretcherWs.getCell(stretcherCurrentRow, colIndex + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          if (runnerIndex % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          }
        });
        stretcherCurrentRow++;
      });

      // התאמת רוחב עמודות בגליון אלונקות
      stretcherWs.getColumn(1).width = 12; // מס' כתף
      stretcherWs.getColumn(2).width = 15; // תפקיד/ציון
      stretcherWs.getColumn(3).width = 8;  // ציון
      stretcherWs.getColumn(4).width = 15; // השתתפות/הערות
      stretcherWs.getColumn(5).width = 15; // פעמים ג'ריקן
      stretcherWs.getColumn(6).width = 12; // ממוצע ציון

      // התאמת רוחב עמודות בכל הגליונות
      [summaryWs, sprintWs, crawlGroupWs, crawlSprintWs, stretcherWs].forEach(ws => {
        ws.columns.forEach((column, index) => {
          if (index < 2) column.width = 12;
          else if (index < 6) column.width = 15;
          else column.width = 20;
        });
      });

      // עיצוב כותרות מידע עליון
      ['A1', 'A2', 'A3'].forEach(cellAddr => {
        const cell = summaryWs.getCell(cellAddr);
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'right' };
      });

      // המרה ל-blob
      wb.xlsx.writeBuffer().then(buffer => {
        clearTimeout(timeoutId);
        const blob = new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const filename = generateFilename('xlsx');
        resolve({ blob, filename, type: 'excel' });
      }).catch(err => {
        clearTimeout(timeoutId);
        reject(err);
      });

    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });

  // פונקציות עזר פנימיות
  function safeCalculate(fnName, runner) {
    try {
      return typeof window[fnName] === 'function' ? window[fnName](runner) : 1;
    } catch (e) {
      console.warn(`שגיאה בחישוב ${fnName}:`, e);
      return 1;
    }
  }

  function calculateWeightedAverage(sprint, crawl, stretcher) {
    const weights = {
      sprint: CONFIG.SPRINT_WEIGHT || 1,
      crawl: CONFIG.CRAWLING_WEIGHT || 1,
      stretcher: CONFIG.STRETCHER_WEIGHT || 1
    };
    const totalWeight = weights.sprint + weights.crawl + weights.stretcher;
    return Math.round(((sprint * weights.sprint) + (crawl * weights.crawl) + (stretcher * weights.stretcher)) / totalWeight);
  }

  function getFormattedComments(shoulderNumber) {
    const raw = window.state?.generalComments?.[shoulderNumber];
    const arr = Array.isArray(raw) ? raw.filter(c => c && c.trim()) :
                (raw && String(raw).trim() ? [String(raw).trim()] : []);
    return {
      count: arr.length,
      text: arr.join(' | ')
    };
  }

  function generateFilename(extension = 'xlsx') {
    const evaluatorName = window.state?.evaluatorName || 'לא_מוגדר';
    const groupNum = window.state?.groupNumber || '1';
    const now = new Date();
    const day = String(now.getDate()).padStart(2,'0');
    const month = String(now.getMonth() + 1).padStart(2,'0');
    const year = String(now.getFullYear()).slice(-2);
    
    // ניקוי שם המעריך מתווים לא חוקיים לשם קובץ
    const cleanEvaluatorName = evaluatorName
      .replace(/[<>:"/\\|?*]/g, '_') // החלפת תווים לא חוקיים
      .replace(/\s+/g, '_') // החלפת רווחים בקו תחתון
      .trim();
    
    return `${cleanEvaluatorName}_קבוצה-${groupNum}_${day}.${month}.${year}.${extension}`;
  }

  function createCSVFallback() {
    console.log('יוצר CSV fallback...');
    const rows = createReportRows();
    const csv = '\uFEFF' + rows.map(r=>r.map(cell=>{
      const v = (cell==null?'':String(cell));
      return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;
    }).join(',')).join('\n');
    return { 
      blob: new Blob([csv], { type:'text/csv;charset=utf-8;' }), 
      filename: generateFilename('csv'), 
      type: 'csv' 
    };
  }

  function createReportRows() {
    // נתונים מפורטים כמו בפונקציה הראשית
    const baseHeaders = [
      'מספר כתף','סטטוס','ציון ספרינט','ציון זחילה',
      (CONFIG?.STRETCHER_PAGE_LABEL || 'אלונקה'),
      'ציון סופי','השתתפות ספרינטים','ממוצע מיקום','כמות הערות','הערות'
    ];
    
    const totalHeats = window.state?.heats?.length || 0;
    for (let i = 1; i <= totalHeats; i++) {
      baseHeaders.push(`מקצה ${i} - מיקום`, `מקצה ${i} - זמן`, `מקצה ${i} - ציון`, `מקצה ${i} - סטטוס`);
    }
    
    const rows = [baseHeaders];
    const runners = window.state?.runners || [];
    const sprintExportData = window.exportSprintResultsForExcel?.() || [];
    
    runners.forEach(r => {
      const shoulderNumber = r.shoulderNumber;
      const status = window.state?.crawlingDrills?.runnerStatuses?.[shoulderNumber] || 'פעיל';
      const sprintData = sprintExportData.find(s => s['מספר כתף'] == shoulderNumber);
      
      let sprint=0, crawl=0, stretcher=0, total='';
      let participation = 'N/A', avgRank = 'N/A';
      
      if (status === 'פעיל') {
        const manual = window.state?.manualScores?.[shoulderNumber];
        sprint = manual?.sprint ?? (sprintData?.['ציון סופי ספרינטים'] || safeCalculate('calculateSprintFinalScore', r));
        crawl = manual?.crawl ?? safeCalculate('calculateCrawlingFinalScore', r);
        stretcher = manual?.stretcher ?? safeCalculate('calculateStretcherFinalScore', r);
        
        total = CONFIG?.USE_WEIGHTED_AVERAGE 
          ? calculateWeightedAverage(sprint, crawl, stretcher)
          : Math.round((sprint + crawl + stretcher) / 3);
        
        if (sprintData) {
          participation = sprintData['מקצי ספרינט השתתפות'] || 'N/A';
          avgRank = sprintData['ממוצע מיקום ספרינטים'] || 'N/A';
        }
      }
      
      const comments = getFormattedComments(shoulderNumber);
      const baseRow = [shoulderNumber, status, sprint, crawl, stretcher, total, participation, avgRank, comments.count, comments.text];
      
      // הוספת נתוני ספרינט מפורטים
      for (let i = 1; i <= totalHeats; i++) {
        if (sprintData) {
          baseRow.push(
            sprintData[`מקצה ${i} - מיקום`] || 'לא השתתף',
            sprintData[`מקצה ${i} - זמן`] || 'לא סיים',
            sprintData[`מקצה ${i} - ציון`] || 'לא השתתף',
            sprintData[`מקצה ${i} - סטטוס`] || 'לא השתתף'
          );
        } else {
          baseRow.push('לא השתתף', 'לא סיים', 'לא השתתף', 'לא השתתף');
        }
      }
      
      rows.push(baseRow);
    });
    return rows;
  }
};

// פונקציה מרכזית לשליחה לדרייב
window.GibushAppExporter.uploadToDrive = async function uploadToDrive(blob, filename) {
  console.log('מתחיל העלאה לדרייב:', filename);
  
  const uploadMethods = [
    () => window.uploadBlobToDrive?.(blob, filename, { 
      mimeType: blob.type,
      description: `דוח ציונים - קבוצה ${window.state?.groupNumber || 'לא מוגדר'}`,
      name: filename // שימוש בשם הקובץ המדויק
    }),
    () => window.GoogleDriveUploader?.upload(blob, filename),
    () => window.DriveUploader?.upload(blob, filename)
  ];
  
  for (const method of uploadMethods) {
    try {
      const result = await method();
      if (result) {
        console.log('הועלה בהצלחה לדרייב');
        return { success: true, result };
      }
    } catch (error) {
      console.warn('שיטת העלאה נכשלה:', error.message);
    }
  }
  
  throw new Error('כל שיטות ההעלאה נכשלו');
};

// פונקציה מרכזית להורדה
window.GibushAppExporter.downloadFile = function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 1000);
};

// NEW: פונקציות שהועברו מעמוד הדוח
window.GibushAppExporter.triggerDownload = function triggerDownload(blob, filename) {
  window.GibushAppExporter.downloadFile(blob, filename);
};

// NEW: פונקציה ליצירת blob באמצעות XLSX fallback
window.GibushAppExporter.buildManualBlob = function buildManualBlob() {
  const rows = createReportRows();
  if (window.XLSX) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const wbout = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    return {
      blob: new Blob([wbout], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      filename: generateFilename('xlsx')
    };
  }
  // CSV fallback
  return createCSVFallback();
};

// API ראשי - פונקציה אחת לכל הפעולות
window.GibushAppExporter.exportReport = async function exportReport(action = 'download') {
  try {
    console.log(`מתחיל ייצוא דוח - פעולה: ${action}`);
    
    // יצירת הדוח
    const report = await window.GibushAppExporter.createDetailedReport();
    
    // ביצוע הפעולה המבוקשת
    switch (action) {
      case 'download':
        window.GibushAppExporter.downloadFile(report.blob, report.filename);
        return { success: true, action: 'download', filename: report.filename };
        
      case 'drive':
        await window.GibushAppExporter.uploadToDrive(report.blob, report.filename);
        return { success: true, action: 'drive', filename: report.filename };
        
      case 'both':
        window.GibushAppExporter.downloadFile(report.blob, report.filename);
        await window.GibushAppExporter.uploadToDrive(report.blob, report.filename);
        return { success: true, action: 'both', filename: report.filename };
        
      default:
        throw new Error(`פעולה לא מוכרת: ${action}`);
    }
    
  } catch (error) {
    console.error('שגיאה בייצוא דוח:', error);
    throw error;
  }
};

// NEW: Backward compatibility - פונקציות שעמוד הדוח השתמש בהן
window.GibushAppExporter.buildReportBlobSmart = window.GibushAppExporter.createDetailedReport;
window.GibushAppExporter.tryDriveUpload = async function(blob, filename) {
  try {
    const result = await window.GibushAppExporter.uploadToDrive(blob, filename);
    return { ok: true, res: result, via: 'GibushAppExporter.uploadToDrive' };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
};

// פונקציה עזר לעיצוב זמן ללא מילישניות (אם לא קיימת)
function formatTime_no_ms(ms) {
  if (!ms || ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}