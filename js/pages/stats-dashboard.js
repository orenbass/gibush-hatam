// stats-dashboard.js
// דשבורד סטטיסטיקות עם ויזואליזציות מתקדמות
// מופרד מהדשבורד המאוחד כדי לא להכביד על הקובץ הראשי
(function(){
    if (window.StatsDashboard) return;
  
    class StatsDashboard {
      constructor(parentDashboard) {
        this.parent = parentDashboard; // הפניה לדשבורד המאוחד
      }
  
      /**
       * פתיחת חלון דשבורד הסטטיסטיקות
       */
      show() {
        // הכנת הנתונים
        const allCandidates = this.parent.aggregateAllCandidates();
        const stats = this.calculateStatistics(allCandidates);
        
        // יצירת חלון צף
        const overlay = document.createElement('div');
        overlay.id = 'statsOverlay';
        overlay.className = 'stats-overlay';
        overlay.innerHTML = `
          <div class="stats-overlay-backdrop"></div>
          <div class="stats-panel">
            <header class="stats-header">
              <h2>📊 דשבורד סטטיסטיקות</h2>
              <button class="stats-close-btn" title="סגור">✖</button>
            </header>
            <div class="stats-content">
              <!-- סטטיסטיקות כלליות -->
              <section class="stats-section">
                <h3>📈 סטטיסטיקות כלליות</h3>
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-value">${allCandidates.length}</div>
                    <div class="stat-label">סה"כ מתמודדים</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${stats.avgOverall ?? '-'}</div>
                    <div class="stat-label">ממוצע כללי</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${stats.maxOverall ?? '-'}</div>
                    <div class="stat-label">ציון מקסימלי</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-value">${stats.minOverall ?? '-'}</div>
                    <div class="stat-label">ציון מינימלי</div>
                  </div>
                </div>
              </section>
  
              <!-- התפלגות ציונים - עוגה -->
              <section class="stats-section">
                <h3>🎯 התפלגות ציונים (מעוגל)</h3>
                <div class="chart-container">
                  <canvas id="scoresDistChart" width="400" height="400"></canvas>
                </div>
                <div class="chart-legend" id="scoresLegend"></div>
              </section>
  
              <!-- טבלת Top 10 -->
              <section class="stats-section">
                <h3>🏆 Top 10 מתמודדים</h3>
                <div class="top-table">
                  ${this.buildTopTable(allCandidates)}
                </div>
              </section>
            </div>
          </div>
        `;
        
        document.body.appendChild(overlay);
        
        // אנימציה
        requestAnimationFrame(() => overlay.classList.add('visible'));
        
        // אירועים
        overlay.querySelector('.stats-close-btn').addEventListener('click', () => this.close());
        overlay.querySelector('.stats-overlay-backdrop').addEventListener('click', () => this.close());
        
        // ציור הגרפים - רק עוגת הציונים
        setTimeout(() => {
          this.drawScoresDistributionChart(stats);
        }, 100);
      }
  
      /**
       * סגירת חלון דשבורד הסטטיסטיקות
       */
      close() {
        const overlay = document.getElementById('statsOverlay');
        if (overlay) {
          overlay.classList.remove('visible');
          setTimeout(() => overlay.remove(), 300);
        }
      }
  
      /**
       * חישוב סטטיסטיקות
       */
      calculateStatistics(candidates) {
        const validCandidates = candidates.filter(c => c.overallAvg !== null);
        
        if (validCandidates.length === 0) {
          return {
            avgOverall: null,
            avgSprint: null,
            avgCrawl: null,
            avgStretcher: null,
            maxOverall: null,
            minOverall: null,
            distribution: {}
          };
        }
  
        // ממוצעים
        const avgOverall = (validCandidates.reduce((sum, c) => sum + c.overallAvg, 0) / validCandidates.length).toFixed(2);
        const sprintScores = candidates.filter(c => c.sprintAvg !== null).map(c => c.sprintAvg);
        const crawlScores = candidates.filter(c => c.crawlingAvg !== null).map(c => c.crawlingAvg);
        const stretcherScores = candidates.filter(c => c.stretcherAvg !== null).map(c => c.stretcherAvg);
        
        const avgSprint = sprintScores.length ? (sprintScores.reduce((a,b) => a+b, 0) / sprintScores.length).toFixed(2) : null;
        const avgCrawl = crawlScores.length ? (crawlScores.reduce((a,b) => a+b, 0) / crawlScores.length).toFixed(2) : null;
        const avgStretcher = stretcherScores.length ? (stretcherScores.reduce((a,b) => a+b, 0) / stretcherScores.length).toFixed(2) : null;
  
        // מקסימום ומינימום
        const maxOverall = Math.max(...validCandidates.map(c => c.overallAvg)).toFixed(2);
        const minOverall = Math.min(...validCandidates.map(c => c.overallAvg)).toFixed(2);
  
        // התפלגות ציונים מעוגלים
        const distribution = {};
        validCandidates.forEach(c => {
          const rounded = Math.round(c.overallAvg);
          distribution[rounded] = (distribution[rounded] || 0) + 1;
        });
  
        return {
          avgOverall,
          avgSprint,
          avgCrawl,
          avgStretcher,
          maxOverall,
          minOverall,
          distribution
        };
      }
  
      /**
       * ציור גרף עוגת התפלגות ציונים
       */
      drawScoresDistributionChart(stats) {
        const canvas = document.getElementById('scoresDistChart');
        if (!canvas) return;
  
        const ctx = canvas.getContext('2d');
        const dist = stats.distribution;
        const scores = Object.keys(dist).sort((a, b) => a - b);
        const counts = scores.map(s => dist[s]);
  
        // צבעים
        const colors = [
          '#ef4444', '#f97316', '#f59e0b', '#eab308', 
          '#84cc16', '#22c55e', '#10b981', '#14b8a6'
        ];
  
        // ציור עוגה
        const total = counts.reduce((a, b) => a + b, 0);
        let currentAngle = -Math.PI / 2;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
  
        scores.forEach((score, i) => {
          const sliceAngle = (counts[i] / total) * 2 * Math.PI;
          
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
          ctx.closePath();
          ctx.fillStyle = colors[i % colors.length];
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
  
          // טקסט באמצע הפרוסה
          const labelAngle = currentAngle + sliceAngle / 2;
          const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
          const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
          
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${counts[i]}`, labelX, labelY);
  
          currentAngle += sliceAngle;
        });
  
        // מקרא
        const legend = document.getElementById('scoresLegend');
        if (legend) {
          legend.innerHTML = scores.map((score, i) => `
            <div class="legend-item">
              <span class="legend-color" style="background-color: ${colors[i % colors.length]}"></span>
              <span>ציון ${score}: ${counts[i]} מתמודדים (${((counts[i]/total)*100).toFixed(1)}%)</span>
            </div>
          `).join('');
        }
      }
  
      /**
       * בניית טבלת Top 10
       */
      buildTopTable(candidates) {
        const top10 = candidates
          .filter(c => c.overallAvg !== null)
          .sort((a, b) => b.overallAvg - a.overallAvg)
          .slice(0, 10);
  
        return `
          <table class="stats-table">
            <thead>
              <tr>
                <th>דירוג</th>
                <th>כתף</th>
                <th>קבוצה</th>
                <th>ציון כולל</th>
              </tr>
            </thead>
            <tbody>
              ${top10.map((c, i) => `
                <tr class="${i < 3 ? `top-${i+1}` : ''}">
                  <td>${i + 1}</td>
                  <td>${c.shoulder}</td>
                  <td>${c.group}</td>
                  <td><strong>${c.overallAvg}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    }
  
    // חשיפה גלובלית
    window.StatsDashboard = StatsDashboard;
  })();