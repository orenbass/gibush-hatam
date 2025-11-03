// ===============================================
// ייצוא אקסל מאוחד מהדשבורד האגרגטיבי
// ===============================================

window.AggregatedExcelExporter = {
  /**
   * יצירת קובץ אקסל מאוחד
   * @param {Object} dashboard - המופע של AggregatedDashboard
   * @returns {Promise<void>}
   */
  async exportToExcel(dashboard) {
    if (typeof ExcelJS === 'undefined') {
      alert('שגיאה: ספריית ExcelJS לא נטענה. אנא רענן את הדף ונסה שוב.');
      return;
    }

    // יצירת workbook עם RTL
    const wb = new ExcelJS.Workbook();
    wb.views = [{ rightToLeft: true }];
    
    const now = new Date();
    const monthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const dateStr = dashboard.lastQuery ? `${monthNames[dashboard.lastQuery.month - 1]} ${dashboard.lastQuery.year}` : now.toLocaleDateString('he-IL');

    // יצירת גליון סיכום כללי
    await this._createSummarySheet(wb, dashboard, dateStr);
    
    // יצירת גליונות לפי קבוצות
    await this._createGroupSheets(wb, dashboard);
    
    // יצירת גליון הערות מאוחדות
    await this._createCommentsSheet(wb, dashboard);

    // הורדת הקובץ
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const filename = `גיבוש_מאוחד_${dateStr.replace(/\s+/g, '_')}_${now.getDate()}.${now.getMonth() + 1}.${now.getFullYear()}.xlsx`;
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ קובץ אקסל מאוחד נוצר בהצלחה:', filename);
  },

  /**
   * יצירת גליון סיכום כללי
   */
  async _createSummarySheet(wb, dashboard, dateStr) {
    const summaryWs = wb.addWorksheet('סיכום כללי');
    summaryWs.views = [{ rightToLeft: true }];
    
    // כותרת
    summaryWs.getCell('A1').value = `סיכום מאוחד של כל המועמדים - ${dateStr}`;
    summaryWs.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1e293b' } };
    summaryWs.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    summaryWs.mergeCells('A1:J1'); // שונה מ-I ל-J בגלל עמודת הסטטוס
    
    // כותרות טבלה
    const summaryHeaders = ['מיקום', 'קבוצה', 'מס\' כתף', 'ספרינט', 'זחילה', 'אלונקה', 'ממוצע כולל', 'מספר מעריכים', 'סטטוס', 'הערות'];
    summaryHeaders.forEach((header, idx) => {
      const cell = summaryWs.getCell(3, idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    // נתונים
    const allCandidates = dashboard.aggregateAllCandidates();
    
    // הפרדה בין פעילים ללא פעילים
    const activeCandidates = [];
    const inactiveCandidates = [];
    
    allCandidates.forEach(candidate => {
      const statusInfo = this._getRunnerStatusInfo(dashboard, candidate.group, candidate.shoulder);
      if (statusInfo.isInactive) {
        inactiveCandidates.push({ ...candidate, statusInfo });
      } else {
        activeCandidates.push({ ...candidate, statusInfo });
      }
    });
    
    // משתמשים פעילים
    let currentRow = 4;
    activeCandidates.forEach((candidate, idx) => {
      const allComments = this._collectAllComments(dashboard, candidate.group, candidate.shoulder);
      
      const rowData = [
        idx + 1,
        candidate.group,
        candidate.shoulder,
        candidate.sprintAvg ?? '-',
        candidate.crawlingAvg ?? '-',
        candidate.stretcherAvg ?? '-',
        candidate.overallAvg ?? '-',
        candidate.evalCount,
        'פעיל',
        allComments.join(' | ')
      ];
      
      this._writeRowToSheet(summaryWs, currentRow, rowData, idx, false);
      currentRow++;
    });
    
    // שורת הפרדה אם יש לא פעילים
    if (inactiveCandidates.length > 0) {
      currentRow++; // רווח
      const separatorCell = summaryWs.getCell(currentRow, 1);
      separatorCell.value = 'משתמשים לא פעילים';
      separatorCell.font = { bold: true, size: 13, color: { argb: 'FFDC2626' } };
      separatorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
      separatorCell.alignment = { horizontal: 'center', vertical: 'middle' };
      summaryWs.mergeCells(`A${currentRow}:J${currentRow}`);
      currentRow++;
    }
    
    // משתמשים לא פעילים
    inactiveCandidates.forEach((candidate, idx) => {
      const allComments = this._collectAllComments(dashboard, candidate.group, candidate.shoulder);
      
      // הוספת הערת סטטוס להערות
      const statusNote = candidate.statusInfo.note;
      const commentsWithStatus = statusNote ? [statusNote, ...allComments] : allComments;
      
      const rowData = [
        activeCandidates.length + idx + 1,
        candidate.group,
        candidate.shoulder,
        candidate.sprintAvg ?? '-',
        candidate.crawlingAvg ?? '-',
        candidate.stretcherAvg ?? '-',
        candidate.overallAvg ?? '-',
        candidate.evalCount,
        'לא פעיל',
        commentsWithStatus.join(' | ')
      ];
      
      this._writeRowToSheet(summaryWs, currentRow, rowData, idx, true);
      currentRow++;
    });
    
    // התאמת רוחב עמודות
    [10, 10, 12, 12, 12, 12, 14, 14, 14, 50].forEach((width, idx) => {
      summaryWs.getColumn(idx + 1).width = width;
    });
  },

  /**
   * כתיבת שורה לגליון
   */
  _writeRowToSheet(ws, rowIdx, rowData, candidateIdx, isInactive) {
    rowData.forEach((value, colIdx) => {
      const cell = ws.getCell(rowIdx, colIdx + 1);
      cell.value = value;
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx >= 8 };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      
      if (isInactive) {
        // סימון משתמשים לא פעילים באדום בהיר
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
        cell.font = { color: { argb: 'FF991B1B' } };
      } else {
        // צבעי רקע לפי מיקום (רק לפעילים)
        if (candidateIdx === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
        else if (candidateIdx === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
        else if (candidateIdx === 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCD7F32' } };
        else if (candidateIdx % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
    });
  },

  /**
   * קבלת מידע על סטטוס הרץ
   */
  _getRunnerStatusInfo(dashboard, group, shoulder) {
    const gData = dashboard.state.groups.get(group);
    if (!gData) return { isInactive: false, note: '' };
    
    let totalEvaluators = 0;
    let inactiveCount = 0;
    const evaluatorNames = [];
    
    gData.evaluators.forEach((evalData, evaluatorName) => {
      totalEvaluators++;
      
      // בדיקה בכל מקום אפשרי לסטטוס
      const isInactiveInEval = 
        evalData.crawlingDrills?.runnerStatuses?.[shoulder] === 'retired' ||
        evalData.crawlingDrills?.runnerStatuses?.[shoulder] === 'inactive';
      
      const runner = (evalData.runners || []).find(r => String(r.shoulderNumber) === String(shoulder));
      const hasRetiredStatus = runner && (runner.status === 'retired' || runner.status === 'inactive');
      
      if (isInactiveInEval || hasRetiredStatus) {
        inactiveCount++;
        evaluatorNames.push(evaluatorName);
      }
    });
    
    // אם כל המעריכים סימנו כלא פעיל
    if (inactiveCount === totalEvaluators && totalEvaluators > 0) {
      return { 
        isInactive: true, 
        note: 'לא פעיל אצל כל המעריכים'
      };
    }
    
    // אם חלק מהמעריכים סימנו כלא פעיל
    if (inactiveCount > 0) {
      return { 
        isInactive: true, 
        note: `לא פעיל אצל ${inactiveCount} מתוך ${totalEvaluators} מעריכים (${evaluatorNames.join(', ')})`
      };
    }
    
    return { isInactive: false, note: '' };
  },

  /**
   * יצירת גליונות לפי קבוצות
   */
  async _createGroupSheets(wb, dashboard) {
    const groupNumbers = dashboard._groupNumbers();
    
    for (const groupNumber of groupNumbers) {
      const gData = dashboard.state.groups.get(groupNumber);
      if (!gData) continue;
      
      const ws = wb.addWorksheet(`קבוצה ${groupNumber}`);
      ws.views = [{ rightToLeft: true }];
      
      let currentRow = 1;
      
      // טבלה מסכמת
      ws.getCell(`A${currentRow}`).value = `קבוצה ${groupNumber} - סיכום ממוצעי כל המעריכים`;
      ws.getCell(`A${currentRow}`).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.mergeCells(`A${currentRow}:I${currentRow}`); // שונה מ-H ל-I
      currentRow++;
      
      // כותרות טבלה מסכמת
      const groupSummaryHeaders = ['מיקום', 'מס\' כתף', 'ספרינט', 'זחילה', 'אלונקה', 'ממוצע כולל', 'מספר מעריכים', 'סטטוס', 'הערות מאוחדות'];
      groupSummaryHeaders.forEach((header, idx) => {
        const cell = ws.getCell(currentRow, idx + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C757D' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      currentRow++;
      
      // נתוני הסיכום - הפרדה בין פעילים ללא פעילים
      const groupCandidates = dashboard.aggregateGroup(gData);
      const activeCandidates = [];
      const inactiveCandidates = [];
      
      groupCandidates.forEach(candidate => {
        const statusInfo = this._getRunnerStatusInfo(dashboard, groupNumber, candidate.shoulder);
        if (statusInfo.isInactive) {
          inactiveCandidates.push({ ...candidate, statusInfo });
        } else {
          activeCandidates.push({ ...candidate, statusInfo });
        }
      });
      
      // פעילים
      activeCandidates.forEach((candidate, idx) => {
        const allComments = this._collectAllComments(dashboard, groupNumber, candidate.shoulder);
        
        const rowData = [
          idx + 1,
          candidate.shoulder,
          candidate.sprintAvg ?? '-',
          candidate.crawlingAvg ?? '-',
          candidate.stretcherAvg ?? '-',
          candidate.overallAvg ?? '-',
          candidate.evalCount,
          'פעיל',
          allComments.join(' | ')
        ];
        
        rowData.forEach((value, colIdx) => {
          const cell = ws.getCell(currentRow, colIdx + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx === 8 };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          // צבעי רקע
          if (idx === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFD700' } };
          else if (idx === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
          else if (idx === 2) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCD7F32' } };
          else if (idx % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        });
        currentRow++;
      });
      
      // לא פעילים
      if (inactiveCandidates.length > 0) {
        currentRow++; // רווח
        const separatorCell = ws.getCell(currentRow, 1);
        separatorCell.value = 'משתמשים לא פעילים';
        separatorCell.font = { bold: true, size: 12, color: { argb: 'FFDC2626' } };
        separatorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
        separatorCell.alignment = { horizontal: 'center', vertical: 'middle' };
        ws.mergeCells(`A${currentRow}:I${currentRow}`);
        currentRow++;
        
        inactiveCandidates.forEach((candidate, idx) => {
          const allComments = this._collectAllComments(dashboard, groupNumber, candidate.shoulder);
          const statusNote = candidate.statusInfo.note;
          const commentsWithStatus = statusNote ? [statusNote, ...allComments] : allComments;
          
          const rowData = [
            activeCandidates.length + idx + 1,
            candidate.shoulder,
            candidate.sprintAvg ?? '-',
            candidate.crawlingAvg ?? '-',
            candidate.stretcherAvg ?? '-',
            candidate.overallAvg ?? '-',
            candidate.evalCount,
            'לא פעיל',
            commentsWithStatus.join(' | ')
          ];
          
          rowData.forEach((value, colIdx) => {
            const cell = ws.getCell(currentRow, colIdx + 1);
            cell.value = value;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx === 8 };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
            cell.font = { color: { argb: 'FF991B1B' } };
          });
          currentRow++;
        });
      }
      
      currentRow += 2;
      
      // טבלאות לכל מעריך
      const evaluators = Array.from(gData.evaluators.entries());
      
      evaluators.forEach(([evaluatorName, evalData]) => {
        ws.getCell(`A${currentRow}`).value = `מעריך: ${evaluatorName}`;
        ws.getCell(`A${currentRow}`).font = { bold: true, size: 13, color: { argb: 'FF1e293b' } };
        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFe0e7ff' } };
        ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
        ws.mergeCells(`A${currentRow}:G${currentRow}`);
        currentRow++;
        
        const evalHeaders = ['מס\' כתף', 'ספרינט', 'זחילה', 'אלונקה', 'ממוצע', 'סטטוס', 'הערות'];
        evalHeaders.forEach((header, idx) => {
          const cell = ws.getCell(currentRow, idx + 1);
          cell.value = header;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF94a3b8' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });
        currentRow++;
        
        const runners = evalData.runners || [];
        const activeRunners = [];
        const inactiveRunners = [];
        
        runners.forEach(runner => {
          const isInactive = 
            evalData.crawlingDrills?.runnerStatuses?.[runner.shoulderNumber] === 'retired' ||
            evalData.crawlingDrills?.runnerStatuses?.[runner.shoulderNumber] === 'inactive' ||
            runner.status === 'retired' ||
            runner.status === 'inactive';
          
          if (isInactive) {
            inactiveRunners.push(runner);
          } else {
            activeRunners.push(runner);
          }
        });
        
        // רצים פעילים
        activeRunners.forEach((runner, runnerIdx) => {
          const sprintAvg = runner.finalScores?.sprint ?? '-';
          const crawlingAvg = runner.finalScores?.crawling ?? '-';
          const stretcherAvg = runner.finalScores?.stretcher ?? '-';
          const scores = [sprintAvg, crawlingAvg, stretcherAvg].filter(v => typeof v === 'number');
          const overallAvg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '-';
          
          const comments = dashboard._collectComments(evalData, runner.shoulderNumber);
          const commentsStr = comments.join(' | ');
          
          const rowData = [
            runner.shoulderNumber,
            sprintAvg,
            crawlingAvg,
            stretcherAvg,
            overallAvg,
            'פעיל',
            commentsStr
          ];
          
          rowData.forEach((value, colIdx) => {
            const cell = ws.getCell(currentRow, colIdx + 1);
            cell.value = value;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx === 6 };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            
            if (runnerIdx % 2 === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
            }
          });
          currentRow++;
        });
        
        // רצים לא פעילים
        if (inactiveRunners.length > 0) {
          const separatorCell = ws.getCell(currentRow, 1);
          separatorCell.value = '--- לא פעילים ---';
          separatorCell.font = { bold: true, size: 10, color: { argb: 'FFDC2626' }, italic: true };
          separatorCell.alignment = { horizontal: 'center', vertical: 'middle' };
          ws.mergeCells(`A${currentRow}:G${currentRow}`);
          currentRow++;
          
          inactiveRunners.forEach((runner, runnerIdx) => {
            const sprintAvg = runner.finalScores?.sprint ?? '-';
            const crawlingAvg = runner.finalScores?.crawling ?? '-';
            const stretcherAvg = runner.finalScores?.stretcher ?? '-';
            const scores = [sprintAvg, crawlingAvg, stretcherAvg].filter(v => typeof v === 'number');
            const overallAvg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '-';
            
            const comments = dashboard._collectComments(evalData, runner.shoulderNumber);
            const commentsStr = comments.join(' | ');
            
            const rowData = [
              runner.shoulderNumber,
              sprintAvg,
              crawlingAvg,
              stretcherAvg,
              overallAvg,
              'לא פעיל',
              commentsStr
            ];
            
            rowData.forEach((value, colIdx) => {
              const cell = ws.getCell(currentRow, colIdx + 1);
              cell.value = value;
              cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx === 6 };
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
              cell.font = { color: { argb: 'FF991B1B' } };
            });
            currentRow++;
          });
        }
        
        currentRow += 2;
      });
      
      // התאמת רוחב עמודות
      [12, 12, 12, 12, 12, 14, 14, 50].forEach((width, idx) => {
        ws.getColumn(idx + 1).width = width;
      });
    }
  },

  /**
   * יצירת גליון הערות מאוחדות
   */
  async _createCommentsSheet(wb, dashboard) {
    const commentsWs = wb.addWorksheet('הערות מאוחדות');
    commentsWs.views = [{ rightToLeft: true }];
    
    commentsWs.getCell('A1').value = 'הערות מאוחדות לכל מועמד מכל המעריכים';
    commentsWs.getCell('A1').font = { bold: true, size: 14 };
    commentsWs.getCell('A1').alignment = { horizontal: 'center' };
    commentsWs.mergeCells('A1:E1');
    
    const commentsHeaders = ['קבוצה', 'מס\' כתף'];
    const allEvaluators = dashboard._allEvaluatorNames();
    allEvaluators.forEach(name => commentsHeaders.push(name));
    
    commentsHeaders.forEach((header, idx) => {
      const cell = commentsWs.getCell(3, idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    let commentRow = 4;
    dashboard.state.groups.forEach((gData, groupNumber) => {
      const shoulderNumbers = new Set();
      gData.evaluators.forEach(evalData => {
        (evalData.runners || []).forEach(r => shoulderNumbers.add(r.shoulderNumber));
      });
      
      const sortedShoulders = Array.from(shoulderNumbers).sort((a, b) => a - b);
      
      sortedShoulders.forEach((shoulder, idx) => {
        const rowData = [groupNumber, shoulder];
        
        allEvaluators.forEach(evaluatorName => {
          const evalData = gData.evaluators.get(evaluatorName);
          if (evalData) {
            const comments = dashboard._collectComments(evalData, shoulder);
            rowData.push(comments.length > 0 ? comments.join(' | ') : '');
          } else {
            rowData.push('');
          }
        });
        
        rowData.forEach((value, colIdx) => {
          const cell = commentsWs.getCell(commentRow, colIdx + 1);
          cell.value = value;
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: colIdx >= 2 };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          
          if (idx % 2 === 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
          }
        });
        commentRow++;
      });
    });
    
    commentsWs.getColumn(1).width = 10;
    commentsWs.getColumn(2).width = 12;
    for (let i = 3; i <= commentsHeaders.length; i++) {
      commentsWs.getColumn(i).width = 35;
    }
  },

  /**
   * איסוף כל ההערות מכל המעריכים למועמד ספציפי
   */
  _collectAllComments(dashboard, group, shoulder) {
    const gData = dashboard.state.groups.get(group);
    const allComments = [];
    
    if (gData) {
      gData.evaluators.forEach((evalData) => {
        const comments = dashboard._collectComments(evalData, shoulder);
        comments.forEach(comment => {
          if (!allComments.includes(comment)) {
            allComments.push(comment);
          }
        });
      });
    }
    
    return allComments;
  }
};
