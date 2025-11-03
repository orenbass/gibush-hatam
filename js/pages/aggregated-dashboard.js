// aggregated-dashboard.js
// דשבורד חדש לקריאת קובץ מאוחד מהדרייב והצגת אגריגציה
// שימוש: AggregatedDashboard.init();
(function(){
  if (window.AggregatedDashboard) {
    // augment existing with refresh if missing
    if (!window.AggregatedDashboard.prototype.refreshCurrent) {
      window.AggregatedDashboard.prototype.refreshCurrent = function(){ if(!this.lastQuery) return this.renderDatePicker(); this._refreshFetch(); };
    }
    return;
  }

  class AggregatedDashboard {
    static init(opts={}) {
      const instance = new AggregatedDashboard(opts);
      instance.renderDatePicker();
      return instance;
    }

    constructor({ mountId='aggregated-dashboard-root' }={}) {
      this.mountId = mountId;
      this.state = {
        raw: null, // המערך המקורי של האובייקטים (מעריכים)
        groups: new Map(), // groupNumber -> { evaluators: Map(evaluatorName -> dataObject) }
        selected: { group: null, evaluator: null },
        scoreFilters: new Set() // מסנן ציונים - סט של ציונים לסינון (1, 2, 3, 4, 5)
      };
      this.lastQuery = null; // שמירת חודש/שנה לריענון
      this.ensureMount();
      this._mobileMode = this.isMobile();
      this._bindResize();
    }

    ensureMount() {
      let el = document.getElementById(this.mountId);
      if (!el) {
        el = document.createElement('div');
        el.id = this.mountId;
        document.body.appendChild(el);
      }
      el.classList.add('aggregated-dashboard');
      this.root = el;
    }

    clearRoot() { this.root.innerHTML=''; }

    isMobile(){ return window.innerWidth < 640; }

    _bindResize(){
      let rAF = null;
      window.addEventListener('resize', () => {
        if (rAF) cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
          const current = this.isMobile();
          if (current !== this._mobileMode){
            this._mobileMode = current;
            this.renderCurrentView();
          }
        });
      });
    }

    renderDatePicker() {
      this.clearRoot();
      this._injectStyles();
      const wrap = document.createElement('div');
      wrap.className='agg-date-picker';
      const today = new Date();
      const defYear = today.getFullYear();
      const defMonth = String(today.getMonth()+1).padStart(2,'0');
      wrap.innerHTML = `
        <div class="picker-card">
          <div class="picker-head">
            <h2 class="picker-title">דשבורד גיבוש מאוחד</h2>
            <p class="picker-sub">בחר חודש ושנה כדי לטעון את הנתונים המאוחדים</p>
          </div>
          <div class="picker-form">
            <label class="picker-field" aria-label="בחירת חודש">
              <span>חודש</span>
              <input type="number" id="aggMonth" min="1" max="12" value="${defMonth}" placeholder="MM" />
            </label>
            <label class="picker-field" aria-label="בחירת שנה">
              <span>שנה</span>
              <input type="number" id="aggYear" min="2023" max="2100" value="${defYear}" placeholder="YYYY" />
            </label>
            <button id="aggLoadBtn" class="picker-load-btn" title="טען דשבורד">🚀 טען דשבורד</button>
          </div>
          <div id="aggDateError" class="picker-error" role="alert" aria-live="polite"></div>
        </div>`;
      this.root.appendChild(wrap);
      const btn = wrap.querySelector('#aggLoadBtn');
      btn.addEventListener('click', async () => {
        const month = parseInt(wrap.querySelector('#aggMonth').value,10);
        const year = parseInt(wrap.querySelector('#aggYear').value,10);
        const errEl = wrap.querySelector('#aggDateError');
        errEl.textContent='';
        if (!month || !year) { errEl.textContent='נא להזין חודש ושנה'; return; }
        try {
          btn.disabled = true; btn.classList.add('is-loading'); btn.textContent='טוען...';
          const data = await window.GoogleDriveReader.fetchAggregated({ year, month });
          this._afterInitialFetch({ year, month }, data);
        } catch(e){
          console.error(e);
          errEl.textContent = e.message || 'שגיאה בטעינת הנתונים';
        } finally {
          btn.disabled = false; btn.classList.remove('is-loading'); btn.textContent='🚀 טען דשבורד';
        }
      });
    }

    ingest(rawArray) {
      this.state.raw = rawArray;
      this.state.groups.clear();
      rawArray.forEach(obj => {
        const d = obj.data || obj; // התאמה לגיבוי
        const group = d.groupNumber;
        if (!group) return;
        if (!this.state.groups.has(group)) {
          this.state.groups.set(group, { evaluators: new Map() });
        }
        this.state.groups.get(group).evaluators.set(d.evaluatorName || 'לא ידוע', d);
      });
      // Reset selections
      this.state.selected.group = null;
      this.state.selected.evaluator = null;
    }

    async _refreshFetch(){
      if(!this.lastQuery) return;
      const headerBtn = this.root.querySelector('#aggRefreshBtn');
      if (headerBtn) { headerBtn.disabled=true; headerBtn.textContent='מרענן...'; }
      try {
        const data = await window.GoogleDriveReader.fetchAggregated(this.lastQuery);
        this.ingest(data);
        // שמירה על הבחירות הקיימות אם עדיין קיימות
        this.renderMainLayout();
      } catch(e){ console.error(e); alert('שגיאת ריענון: '+(e.message||e)); }
      finally { if (headerBtn){ headerBtn.disabled=false; headerBtn.textContent='ריענון'; } }
    }

    async _afterInitialFetch(q, data){
      this.lastQuery = q; // שמור לחצן ריענון
      this.ingest(data);
      this.renderMainLayout();
    }

    renderMainLayout() {
      this.clearRoot();
      this._injectStyles();
      const header = document.createElement('div');
      header.className='agg-header shadow-sm';
      const groups = this._groupNumbers();
      const evaluatorsAll = this._allEvaluatorNames();
      header.innerHTML = `
        <div class="agg-header-row agg-header-row--filters">
          <div class="agg-header-left">
            <button id="aggExitBtn" class="agg-btn agg-btn-secondary" title="יציאה">🚪 יציאה</button>
            <button id="aggRefreshBtn" class="agg-btn agg-btn-primary" title="ריענון">🔄 ריענון</button>
            <button id="aggExportExcelBtn" class="agg-btn agg-btn-success" title="הורד אקסל מאוחד">📥 הורד אקסל</button>
            <button id="aggStatsBtn" class="agg-btn agg-btn-stats" title="דשבורד סטטיסטיקות">📊 דשבורד סטטיסטיקות</button>
            <div class="agg-subtitle agg-inline-stats">סה"כ מעריכים: <strong>${this.countEvaluators()}</strong> | סה"כ קבוצות: <strong>${this.state.groups.size}</strong></div>
          </div>
          <div class="agg-header-right">
            <div class="agg-search-wrap">
              <input type="text" id="aggSearchInput" placeholder="חיפוש מספר / קבוצה" aria-label="חיפוש" />
              <button class="clear-btn" id="aggSearchClear" title="נקה" aria-label="נקה חיפוש">×</button>
            </div>
            <div class="agg-filters-line">
              <select id="aggGroupSelect" class="agg-filter-select" title="בחירת קבוצה">
                <option value="" ${this.state.selected.group? '':'selected'}>סיכום כללי</option>
                ${groups.map(g=>`<option value="${g}" ${this.state.selected.group==g?'selected':''}>קבוצה ${g}</option>`).join('')}
              </select>
              <select id="aggEvaluatorSelect" class="agg-filter-select" title="בחירת מעריך">
                <option value="" ${this.state.selected.evaluator? '':'selected'}>כל המעריכים</option>
                ${(this.state.selected.group? this._evaluatorNamesByGroup(this.state.selected.group): evaluatorsAll).map(n=>`<option value="${n}" ${this.state.selected.evaluator===n?'selected':''}>${n}</option>`).join('')}
              </select>
              <div class="score-filter-dropdown">
                <button id="aggScoreFilterBtn" class="agg-btn agg-btn-filter" title="סנן לפי ציונים">
                  🎯 ציונים ${this.state.scoreFilters.size > 0 ? `(${this.state.scoreFilters.size})` : ''}
                </button>
                <div id="aggScoreFilterMenu" class="score-filter-menu" style="display: none;">
                  <div class="score-filter-header">
                    <span>בחר ציונים לסינון:</span>
                    <button class="score-clear-all" id="aggScoreClearAll">נקה הכל</button>
                  </div>
                  <div class="score-checkboxes">
                    ${[1, 2, 3, 4, 5, 6, 7].map(score => `
                      <label class="score-checkbox-label">
                        <input type="checkbox" class="score-checkbox" data-score="${score}" ${this.state.scoreFilters.has(score) ? 'checked' : ''}>
                        <span>ציון ${score}</span>
                      </label>
                    `).join('')}
                  </div>
                  <div class="score-filter-actions">
                    <button id="aggScoreApply" class="agg-btn agg-btn-primary agg-btn-sm">החל</button>
                    <button id="aggScoreCancel" class="agg-btn agg-btn-secondary agg-btn-sm">ביטול</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
      const body = document.createElement('div');
      body.className='agg-body agg-body--single';
      body.innerHTML = `<section class="agg-content" id="aggContent" aria-live="polite"></section>`;
      this.root.appendChild(header);
      this.root.appendChild(body);
      
      // Event listeners
      header.querySelector('#aggExitBtn').addEventListener('click', () => this.renderDatePicker());
      header.querySelector('#aggRefreshBtn').addEventListener('click', () => this.refreshCurrent());
      header.querySelector('#aggExportExcelBtn').addEventListener('click', () => this.exportAggregatedExcel());
      header.querySelector('#aggStatsBtn').addEventListener('click', () => this.showStatsDashboard());
      header.querySelector('#aggGroupSelect').addEventListener('change', (e)=>{
        const v = e.target.value || null;
        this.state.selected.group = v;
        this.state.selected.evaluator = null;
        this._updateFilters();
      });
      header.querySelector('#aggEvaluatorSelect').addEventListener('change', (e)=>{
        const v = e.target.value || null;
        this.state.selected.evaluator = v;
        this._updateFilters();
      });
      
      // Score filter events
      const scoreFilterBtn = header.querySelector('#aggScoreFilterBtn');
      const scoreFilterMenu = header.querySelector('#aggScoreFilterMenu');
      const scoreApply = header.querySelector('#aggScoreApply');
      const scoreCancel = header.querySelector('#aggScoreCancel');
      const scoreClearAll = header.querySelector('#aggScoreClearAll');
      
      scoreFilterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = scoreFilterMenu.style.display === 'block';
        scoreFilterMenu.style.display = isVisible ? 'none' : 'block';
      });
      
      scoreApply.addEventListener('click', () => {
        const checkboxes = scoreFilterMenu.querySelectorAll('.score-checkbox');
        this.state.scoreFilters.clear();
        checkboxes.forEach(cb => {
          if (cb.checked) {
            this.state.scoreFilters.add(parseInt(cb.dataset.score));
          }
        });
        scoreFilterMenu.style.display = 'none';
        scoreFilterBtn.innerHTML = `🎯 ציונים ${this.state.scoreFilters.size > 0 ? `(${this.state.scoreFilters.size})` : ''}`;
        this.renderCurrentView();
      });
      
      scoreCancel.addEventListener('click', () => {
        // Restore checkboxes to match current state
        const checkboxes = scoreFilterMenu.querySelectorAll('.score-checkbox');
        checkboxes.forEach(cb => {
          cb.checked = this.state.scoreFilters.has(parseInt(cb.dataset.score));
        });
        scoreFilterMenu.style.display = 'none';
      });
      
      scoreClearAll.addEventListener('click', () => {
        const checkboxes = scoreFilterMenu.querySelectorAll('.score-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!scoreFilterBtn.contains(e.target) && !scoreFilterMenu.contains(e.target)) {
          scoreFilterMenu.style.display = 'none';
        }
      });
      
      const searchInput = header.querySelector('#aggSearchInput');
      const searchClear = header.querySelector('#aggSearchClear');
      if (searchInput) {
        if (this._lastSearch) { searchInput.value = this._lastSearch; setTimeout(()=> this._applySearch(this._lastSearch), 0); }
        searchInput.addEventListener('input', e=> this._applySearch(e.target.value));
        searchInput.addEventListener('keydown', e=> { if (e.key==='Escape'){ searchInput.value=''; this._applySearch(''); } });
      }
      if (searchClear) {
        searchClear.addEventListener('click', ()=> { if(!searchInput) return; searchInput.value=''; this._applySearch(''); searchInput.focus(); });
      }
      this.renderCurrentView();
    }

    _updateFilters(){
      // עדכון דינמי של רשימות הפילטרים לפי בחירה נוכחית
      const groupSelect = this.root.querySelector('#aggGroupSelect');
      const evaluatorSelect = this.root.querySelector('#aggEvaluatorSelect');
      if (!groupSelect || !evaluatorSelect) return;

      // עדכון רשימת קבוצות לפי מעריך נבחר
      const groupsToShow = this.state.selected.evaluator 
        ? this._groupsByEvaluator(this.state.selected.evaluator)
        : this._groupNumbers();
      
      groupSelect.innerHTML = `
        <option value="" ${this.state.selected.group? '':'selected'}>סיכום כללי</option>
        ${groupsToShow.map(g=>`<option value="${g}" ${this.state.selected.group==g?'selected':''}>קבוצה ${g}</option>`).join('')}
      `;

      // עדכון רשימת מעריכים לפי קבוצה נבחרת
      const evaluatorsToShow = this.state.selected.group
        ? this._evaluatorNamesByGroup(this.state.selected.group)
        : this._allEvaluatorNames();
      
      evaluatorSelect.innerHTML = `
        <option value="" ${this.state.selected.evaluator? '':'selected'}>כל המעריכים</option>
        ${evaluatorsToShow.map(n=>`<option value="${n}" ${this.state.selected.evaluator===n?'selected':''}>${n}</option>`).join('')}
      `;

      this.renderCurrentView();
    }

    _groupsByEvaluator(evaluatorName){
      // מחזיר רשימת קבוצות שהמעריך העריך
      const groupsSet = new Set();
      this.state.groups.forEach((gData, groupNumber) => {
        if (gData.evaluators.has(evaluatorName)) {
          groupsSet.add(groupNumber);
        }
      });
      return Array.from(groupsSet).sort((a,b)=>parseInt(a)-parseInt(b));
    }

    renderCurrentView(){
      const content = this.root.querySelector('#aggContent');
      if (!content) return;
      
      if (!this.state.selected.group) {
        if (!this.state.selected.evaluator) {
          content.innerHTML = '<h3 class="content-title">סיכום כל המתמודדים</h3>';
          const allCandidates = this.aggregateAllCandidates();
          const { active, retired } = this.separateActiveAndRetired(allCandidates);
          content.appendChild(this.buildResponsiveCandidates(active));
          if (retired.length > 0) {
            content.appendChild(this.buildRetiredCandidatesSection(retired));
          }
        } else {
          content.innerHTML = `<h3 class="content-title">מעריך · ${this.state.selected.evaluator} · (כל הקבוצות)</h3>`;
          const evaluatorCandidates = this.aggregateEvaluatorAcrossAll(this.state.selected.evaluator);
          const { active, retired } = this.separateActiveAndRetired(evaluatorCandidates);
          content.appendChild(this.buildResponsiveCandidates(active));
          if (retired.length > 0) {
            content.appendChild(this.buildRetiredCandidatesSection(retired));
          }
        }
      } else {
        const gData = this.state.groups.get(this.state.selected.group);
        if (!gData) { content.textContent='לא נמצאה קבוצה'; return; }
        if (!this.state.selected.evaluator) {
          content.innerHTML = `<h3 class="content-title">קבוצה ${this.state.selected.group} · ממוצעי כל המעריכים</h3>`;
          const groupCandidates = this.aggregateGroup(gData);
          const { active, retired } = this.separateActiveAndRetired(groupCandidates);
          content.appendChild(this.buildResponsiveCandidates(active));
          if (retired.length > 0) {
            content.appendChild(this.buildRetiredCandidatesSection(retired));
          }
        } else {
          const evalData = gData.evaluators.get(this.state.selected.evaluator);
          content.innerHTML = `<h3 class="content-title">קבוצה ${this.state.selected.group} · מעריך · ${this.state.selected.evaluator}</h3>`;
          if (evalData) {
            const list = (evalData.runners||[]).map(r=>{
              const sprintAvg = r.finalScores?.sprint ?? null;
              const crawlingAvg = r.finalScores?.crawling ?? null;
              const stretcherAvg = r.finalScores?.stretcher ?? null;
              const parts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
              const overallAvg= parts.length? +(parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2):null;
              return { 
                group: evalData.groupNumber, 
                shoulder: r.shoulderNumber, 
                sprintAvg, 
                crawlingAvg, 
                stretcherAvg, 
                overallAvg, 
                evalCount: 1, 
                hasComments: this._hasComments(evalData.groupNumber, r.shoulderNumber),
                status: r.status || 'active'
              };
            }).sort((a,b)=> (b.overallAvg ?? -1) - (a.shoulder - b.shoulder));
            
            const { active, retired } = this.separateActiveAndRetired(list);
            content.appendChild(this.buildResponsiveCandidates(active));
            if (retired.length > 0) {
              content.appendChild(this.buildRetiredCandidatesSection(retired));
            }
          } else {
            content.appendChild(document.createTextNode('לא נמצאו נתונים למעריך')); 
          }
        }
      }
    }

    separateActiveAndRetired(candidates) {
      const active = [];
      const retired = [];
      
      candidates.forEach(candidate => {
        // בדיקה אם המועמד פרש - נחפש בנתונים המקוריים
        const isRetired = this.isRunnerRetired(candidate.group, candidate.shoulder);
        
        if (isRetired) {
          retired.push(candidate);
        } else {
          active.push(candidate);
        }
      });
      
      return { active, retired };
    }

    isRunnerRetired(group, shoulder) {
      const gData = this.state.groups.get(group);
      if (!gData) return false;
      
      // בדיקה אם יש סטטוס פרישה בכל אחד מהמעריכים
      for (const evalData of gData.evaluators.values()) {
        if (evalData.crawlingDrills?.runnerStatuses?.[shoulder] === 'retired') {
          return true;
        }
        // בדיקה בנתוני הרץ עצמו
        const runner = (evalData.runners || []).find(r => String(r.shoulderNumber) === String(shoulder));
        if (runner && runner.status === 'retired') {
          return true;
        }
      }
      
      return false;
    }

    buildRetiredCandidatesSection(retiredCandidates) {
      const section = document.createElement('div');
      section.className = 'retired-candidates-section';
      
      section.innerHTML = `
        <h4 class="retired-title">מתמודדים לא פעילים</h4>
        <div class="retired-bubbles">
          ${retiredCandidates.map(r => `
            <button class="retired-bubble" data-group="${r.group}" data-shoulder="${r.shoulder}" title="מועמד ${r.shoulder} - קבוצה ${r.group}">
              ${r.shoulder}
            </button>
          `).join('')}
        </div>
      `;
      
      // הוספת פונקציונליות לחיצה על בועיות
      section.querySelectorAll('.retired-bubble').forEach(bubble => {
        bubble.addEventListener('click', () => this._openCandidateDetails(bubble.dataset.group, bubble.dataset.shoulder));
      });
      
      return section;
    }

    renderGroupLanding(groupNumber) {
      const gData = this.state.groups.get(groupNumber);
      const content = this.root.querySelector('#aggContent');
      content.innerHTML = `<h3>קבוצה ${groupNumber}</h3>`;
      const evaluatorTabs = document.createElement('div');
      evaluatorTabs.className='agg-evaluator-tabs';
      const evalNames = Array.from(gData.evaluators.keys());
      evaluatorTabs.innerHTML = `
        <button data-role="groupSummary" class="tab-btn ${!this.state.selected.evaluator? 'active':''}">סיכום קבוצה</button>
        ${evalNames.map(n=>`<button class="tab-btn ${this.state.selected.evaluator===n?'active':''}" data-evaluator="${n}">${n}</button>`).join('')}
      `;
      content.appendChild(evaluatorTabs);
      evaluatorTabs.querySelectorAll('button').forEach(btn=>{
        btn.addEventListener('click',()=>{
          if (btn.getAttribute('data-role')==='groupSummary') {
            this.state.selected.evaluator = null;
            this.renderGroupLanding(groupNumber);
          } else {
            this.state.selected.evaluator = btn.getAttribute('data-evaluator');
            this.renderGroupLanding(groupNumber);
          }
        });
      });

      if (!this.state.selected.evaluator) {
        this.renderGroupSummary(container, gData, groupNumber);
      } else {
        this.renderEvaluatorView(container, gData.evaluators.get(this.state.selected.evaluator));
      }
    }

    renderGroupSummary(container, gData, groupNumber) {
      const block = document.createElement('div');
      block.innerHTML = `<h4>ממוצעים בין כל המעריכים - קבוצה ${groupNumber}</h4>`;
      const aggregated = this.aggregateGroup(gData);
      block.appendChild(this.buildCandidatesTable(aggregated));
      container.appendChild(block);
    }

    aggregateGroup(gData) {
      const map = new Map();
      gData.evaluators.forEach(evalData => {
        (evalData.runners||[]).forEach(r => {
          const key = r.shoulderNumber;
          if (!map.has(key)) map.set(key,{ group: evalData.groupNumber, shoulder: r.shoulderNumber, sprint: [], crawling: [], stretcher: [] });
          const entry = map.get(key);
          if (r.finalScores) ['sprint','crawling','stretcher'].forEach(k=> { if (typeof r.finalScores[k]==='number') entry[k].push(r.finalScores[k]); });
        });
      });
      return Array.from(map.values()).map(c=> {
        const sprintAvg=this.avg(c.sprint), crawlingAvg=this.avg(c.crawling), stretcherAvg=this.avg(c.stretcher);
        const pts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
        const overallAvg = pts.length? +(pts.reduce((a,b)=>a+b,0)/pts.length).toFixed(2):null;
        return { group: c.group, shoulder: c.shoulder, sprintAvg, crawlingAvg, stretcherAvg, overallAvg, evalCount: Math.max(c.sprint.length,c.crawling.length,c.stretcher.length), hasComments: this._hasComments(c.group, c.shoulder) };
      }).sort((a,b)=> {
        // מיון נכון: ציון כולל גבוה קודם
        const scoreA = a.overallAvg ?? -Infinity;
        const scoreB = b.overallAvg ?? -Infinity;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.shoulder - b.shoulder;
      });
    }

    renderEvaluatorView(container, evalData) {
      const block = document.createElement('div');
      block.innerHTML = `<h4>מעריך: ${evalData.evaluatorName}</h4>`;
      const simpleList = (evalData.runners||[]).map(r=>{
        const sprintAvg = r.finalScores?.sprint ?? null;
        const crawlingAvg = r.finalScores?.crawling ?? null;
        const stretcherAvg = r.finalScores?.stretcher ?? null;
        const parts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
        const overallAvg= parts.length? +(parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2):null;
        return ({
          group: evalData.groupNumber,
          shoulder: r.shoulderNumber,
          sprintAvg,
          crawlingAvg,
          stretcherAvg,
          overallAvg,
          evalCount: 1,
          hasComments: this._hasComments(evalData.groupNumber, r.shoulderNumber)
        });
      }).sort((a,b)=> (b.overallAvg ?? -1) - (a.shoulder - b.shoulder));
      block.appendChild(this.buildCandidatesTable(simpleList));
      container.appendChild(block);
    }

    _applySearch(q){
      this._lastSearch = q.trim();
      const content = this.root.querySelector('#aggContent');
      if (!content) return;
      const tables = content.querySelectorAll('tbody');
      tables.forEach(tb => {
        tb.querySelectorAll('tr').forEach(tr => {
          if (!this._lastSearch) { tr.classList.remove('faded'); tr.style.display=''; return; }
          const g = tr.getAttribute('data-group');
          const s = tr.getAttribute('data-shoulder');
          const show = (g && g.includes(this._lastSearch)) || (s && s.includes(this._lastSearch));
          tr.style.display = show?'' :'none';
        });
      });
      // כרטיסים בנייד
      content.querySelectorAll('.candidate-card, .candidate-row').forEach(card => {
        if (card.classList.contains('candidate-row-header')) return; // דילוג על כותרת
        if (!this._lastSearch){ card.style.display=''; return; }
        const g = card.getAttribute('data-group');
        const s = card.getAttribute('data-shoulder');
        const show = (g && g.includes(this._lastSearch)) || (s && s.includes(this._lastSearch));
        card.style.display = show?'' :'none';
      });
    }

    _openCandidateDetails(group, shoulder){
      const details = this._collectCandidateDetails(group, shoulder);
      if (!details) { alert('לא נמצאו פרטים למועמד'); return; }
      this._showDetailsOverlay(details);
    }

    _collectCandidateDetails(group, shoulder){
      // Robust lookup for numeric/string keys
      const gData = this.state.groups.get(group) || this.state.groups.get(String(group)) || this.state.groups.get(parseInt(group));
      if (!gData) return null;
      const perEvaluator = [];
      gData.evaluators.forEach(evData => {
        const runner = (evData.runners||[]).find(r => String(r.shoulderNumber)===String(shoulder));
        if (runner) {
          perEvaluator.push({
            evaluator: evData.evaluatorName || 'לא ידוע',
            finalScores: runner.finalScores || {},
            comments: this._collectComments(evData, runner.shoulderNumber),
            heats: this._extractHeatTimes(evData, runner.shoulderNumber),
            crawl: this._extractCrawling(evData, runner.shoulderNumber),
            stretcher: this._extractStretcher(evData, runner.shoulderNumber)
          });
        }
      });
      if (!perEvaluator.length) return null;
      const avg = (key)=>{ const arr=perEvaluator.map(e=> e.finalScores?.[key]).filter(v=>typeof v==='number'); if(!arr.length) return null; return +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2); };
      return { group, shoulder, perEvaluator, avgSprint: avg('sprint'), avgCrawl: avg('crawling'), avgStretcher: avg('stretcher') };
    }

    _collectComments(evData, shoulder){
      const out = [];
      const sn = String(shoulder);
      const add = (val)=>{
        if (val === null || val === undefined) return;
        if (Array.isArray(val)) { val.forEach(add); return; }
        if (typeof val === 'object') {
          if (typeof val.text === 'string') add(val.text);
          return;
        }
        if (typeof val === 'string') {
          const t = val.trim();
          // דילוג על 'לא סיים' גנרי ללא הקשר – נוסיף אותו בהמשך עם פרטי מקצה
          if (!t || t === '-' || t.toLowerCase() === 'na' || t === 'לא סיים') return;
          if (!out.includes(t)) out.push(t);
        }
      };
      // Legacy keyed structures
      if (evData.quickComments && evData.quickComments[sn]) add(evData.quickComments[sn]);
      if (evData.generalComments && evData.generalComments[sn]) add(evData.generalComments[sn]);
      if (evData.crawlingDrills?.comments && evData.crawlingDrills.comments[sn]) add(evData.crawlingDrills.comments[sn]);
      // Runner-level
      const runner = (evData.runners||[]).find(r => String(r.shoulderNumber)===sn);
      if (runner) {
        add(runner.quickComments);
        add(runner.generalComments);
        // ספרינטים זחילה ברמת הרץ
        (runner.crawlingSprints||[]).forEach((s,idx)=>{
          if (!s) return;
          const comment = (s.comment||'').trim();
            if (comment === 'לא סיים') {
              const heatNum = s.heatNumber ?? s.heatIndex ?? s.heat ?? (idx+1);
              const label = `זחילה מקצה ${heatNum} - לא סיים`;
              if (!out.includes(label)) out.push(label);
            } else if (comment) add(comment);
        });
        // ספרינטים ריצה ברמת הרץ
        (runner.sprintHeats||[]).forEach((h,idx)=>{
          if (!h) return;
          const comment = (h.comment||'').trim();
            if (comment === 'לא סיים') {
              const heatNum = h.heatNumber ?? h.heatIndex ?? h.heat ?? (idx+1);
              const label = `ספרינט מקצה ${heatNum} - לא סיים`;
              if (!out.includes(label)) out.push(label);
            } else if (comment) add(comment);
        });
      }
      // NEW: הוספת פריטי DNF עם הקשר מקצה וסוגו לחלון ההערות המאוחד
      try {
        // ספרינטים רגילים (מקור evaluator.heats)
        (evData.heats||[]).forEach((h,hIdx) => {
          const rec = (h.arrivals||[]).find(a => String(a.shoulderNumber)===sn);
          if (rec && (!rec.finishTime) && rec.comment === 'לא סיים') {
            const heatNum = h.heatNumber ?? h.heatIndex ?? h.heat ?? (hIdx+1);
            const label = `ספרינט מקצה ${heatNum} - לא סיים`;
            if (!out.includes(label)) out.push(label);
          }
        });
        // ספרינטים זחילה (מקור evaluator.crawlingDrills.sprints)
        (evData.crawlingDrills?.sprints||[]).forEach((s,sIdx) => {
          const rec = (s.arrivals||[]).find(a => String(a.shoulderNumber)===sn);
          if (rec && (!rec.finishTime) && rec.comment === 'לא סיים') {
            const heatNum = s.heatNumber ?? s.heatIndex ?? s.heat ?? (sIdx+1);
            const label = `זחילה מקצה ${heatNum} - לא סיים`;
            if (!out.includes(label)) out.push(label);
          }
        });
      } catch(e){ /* silent */ }
      return out;
    }

    _extractHeatTimes(evData, shoulder){
      const heats = evData.heats || evData?.data?.heats || [];
      return heats.map((h,i)=>{
        const arr = h.arrivals||[]; const rec = arr.find(a=> String(a.shoulderNumber)===String(shoulder));
        const heatNum = h.heatNumber ?? h.heatIndex ?? h.heat ?? (i+1);
        return { heat: heatNum, time: rec?rec.finishTime:null, comment: rec?rec.comment:null };
      }).filter(h=> h.time!==null || h.comment);
    }

    _extractCrawling(evData, shoulder){
      const sprints = evData.crawlingDrills?.sprints || [];
      return sprints.map((s,i)=> {
        const arr = s.arrivals||[]; const rec = arr.find(a=> String(a.shoulderNumber)===String(shoulder));
        const heatNum = s.heatNumber ?? s.heatIndex ?? s.heat ?? (i+1);
        return { sprint: heatNum, time: rec?rec.finishTime:null, comment: rec?rec.comment:null };
      }).filter(r=> r.time!==null || r.comment);
    }

    _extractStretcher(evData, shoulder){
      const heats = evData.sociometricStretcher?.heats || [];
      const picks = heats.map(h=> h.selections && h.selections[shoulder] ? { heat: h.heatNumber, role: h.selections[shoulder] } : null).filter(Boolean);
      return picks;
    }

    _showDetailsOverlay(data){
      document.getElementById('aggDetailsOverlay')?.remove();
      const wrap = document.createElement('div');
      wrap.id='aggDetailsOverlay';
      wrap.className='agg-overlay';
      const combinedComments = Array.from(new Set(data.perEvaluator.flatMap(e=> e.comments)));
      wrap.innerHTML = `
        <div class="agg-overlay-backdrop" data-close></div>
        <div class="agg-overlay-panel" role="dialog" aria-label="פרטי מועמד">
          <header class="panel-header">
            <h3>מועמד ${data.shoulder} (קבוצה ${data.group})</h3>
            <button class="close-btn" data-close aria-label="סגירת חלון">✖</button>
          </header>
          <section class="panel-section panel-summary">
            <div class="summary-cards">
              <div class="summary-card"><span>ספרינט</span><strong>${data.avgSprint ?? '-'}</strong></div>
              <div class="summary-card"><span>זחילה</span><strong>${data.avgCrawl ?? '-'}</strong></div>
              <div class="summary-card"><span>אלונקה</span><strong>${data.avgStretcher ?? '-'}</strong></div>
              <div class="summary-card total"><span>כולל</span><strong>${(function(){const parts=[data.avgSprint,data.avgCrawl,data.avgStretcher].filter(v=>typeof v==='number');return parts.length? (parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2):'-';})()}</strong></div>
            </div>
            ${combinedComments.length?`<div class="combined-comments"><h4>הערות מאוחדות</h4><ul>${combinedComments.map(c=>`<li>${this._escape(c)}</li>`).join('')}</ul></div>`:''}
          </section>
          <section class="panel-section">
            <h4>פירוט לפי מעריך</h4>
            <div class="evaluator-accordion">
              ${data.perEvaluator.map((e,i)=>`
                <details ${i===0?'open':''}>
                  <summary><span class="eval-name">${e.evaluator}</span>
                    <span class="eval-scores">
                      <span class="pill sprint" title="ספרינט">${e.finalScores?.sprint ?? '-'}</span>
                      <span class="pill crawl" title="זחילה">${e.finalScores?.crawling ?? '-'}</span>
                      <span class="pill stretcher" title="אלונקה">${e.finalScores?.stretcher ?? '-'}</span>
                    </span>
                  </summary>
                  <div class="eval-body">
                    ${e.comments.length?`<div class="comments-block"><h5>הערות</h5><ul>${e.comments.map(c=>`<li>${this._escape(c)}</li>`).join('')}</ul></div>`:''}
                    ${e.heats.length?`<div class="heats-block"><h5>ספרינטים</h5>${this._buildMiniList(e.heats,'heat')}</div>`:''}
                    ${e.crawl.length?`<div class="crawl-block"><h5>זחילות</h5>${this._buildMiniList(e.crawl,'sprint')}</div>`:''}
                    ${e.stretcher.length?`<div class="stretcher-block"><h5>אלונקה סוציו'</h5><ul class="tag-list">${e.stretcher.map(s=>`<li class="tag role-${s.role}">H${s.heat}: ${s.role}</li>`).join('')}</ul></div>`:''}
                  </div>
                </details>`).join('')}
            </div>
          </section>
        </div>`;
      document.body.appendChild(wrap);
      wrap.querySelectorAll('[data-close]').forEach(el=> el.addEventListener('click',()=> wrap.remove()));
      wrap.addEventListener('keydown', (e)=> { if(e.key==='Escape') wrap.remove(); });
      setTimeout(()=> wrap.classList.add('visible'), 16);
    }

    _buildMiniList(arr, label){
      return `<ul class="mini-time-list">${arr.map(a=> `<li><span class="mini-label">${label[0].toUpperCase()}${a[label]}</span>${a.time!==null? this._formatMs(a.time):''}${a.comment?`<em>${this._escape(a.comment)}</em>`:''}</li>`).join('')}</ul>`;
    }

    _formatMs(ms){ if(!ms && ms!==0) return ''; const s=(ms/1000); return `<span class="time-val">${s.toFixed(2)}s</span>`; }

    _escape(t){ return String(t).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

    _hasComments(group, shoulder){
      const g = this.state.groups.get(group);
      if (!g) return false;
      const sn = String(shoulder);
      for (const ev of g.evaluators.values()) {
        // Use the unified collector (already filters ריקים / רווחים)
        const arr = this._collectComments(ev, sn);
        if (arr.length) return true;
      }
      return false;
    }

    buildCandidatesTable(list, opts={}) {
      const clickable = opts.clickable !== false;
      const hasOverall = list.some(r=> typeof r.overallAvg === 'number' || r.overallAvg === null);
      
      // מיון לפי ציון כללי ומיספור מיקומים
      const sortedList = [...list].sort((a,b)=> (b.overallAvg ?? -1) - (a.overallAvg ?? -1) || parseInt(a.group)-parseInt(b.group) || a.shoulder-b.shoulder);
      const listWithPositions = sortedList.map((item, index) => ({
        ...item,
        position: index + 1
      }));

      const table = document.createElement('div');
      table.className='agg-table-wrapper';
      table.innerHTML = `
        <div class="agg-table-scroll">
          <table class="agg-table">
            <thead>
              <tr>
                <th title="מיקום כללי">מיקום</th>
                <th title="מספר כתף">כתף</th>
                <th title="מספר קבוצה">קבוצה</th>
                <th title="ממוצע ציון ספרינט">ספרינט</th>
                <th title="ממוצע ציון זחילה">זחילה</th>
                <th title="ממוצע ציון אלונקה">אלונקה</th>
                ${hasOverall?'<th title="ממוצע כולל (3 פרמטרים)">כולל</th>':''}
                <th title="מספר מעריכים תורמים">מעריכים</th>
                <th title="הערות">הערות</th>
              </tr>
            </thead>
            <tbody>
              ${listWithPositions.map(r=>`
                <tr ${clickable?`class="agg-row" data-group="${r.group}" data-shoulder="${r.shoulder}" tabindex="0" aria-label="מועמד ${r.shoulder} בקבוצה ${r.group}"`:''}>
                  <td class="position-cell ${r.position <= 3 ? `position-${r.position}` : ''}">${r.position}</td>
                  <td><span class="sn">${r.shoulder}</span></td>
                  <td>${r.group}</td>
                  <td class="score sprint">${r.sprintAvg ?? ''}</td>
                  <td class="score crawl">${r.crawlingAvg ?? ''}</td>
                  <td class="score stretcher">${r.stretcherAvg ?? ''}</td>
                  ${hasOverall?`<td class="score overall">${r.overallAvg ?? ''}</td>`:''}
                  <td>${r.evalCount}</td>
                  <td class="comments-cell">${r.hasComments?'<span class="comment-indicator" title="יש הערות" aria-label="יש הערות"></span>':''}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
      if (clickable) {
        table.querySelectorAll('.agg-row').forEach(row => {
          row.addEventListener('click', ()=> this._openCandidateDetails(row.dataset.group, row.dataset.shoulder));
          row.addEventListener('keydown', (e)=> { if(e.key==='Enter'||e.key===' ') { e.preventDefault(); this._openCandidateDetails(row.dataset.group, row.dataset.shoulder); } });
        });
      }
      return table;
    }

    buildResponsiveCandidates(list, opts={}){
      // תמיד נשתמש בפריסת שורות (גם בדסקטופ)
      return this.buildCandidatesCards(list, opts);
    }

    buildCandidatesCards(list, opts={}){
      // פריסה חדשה: שורה אחת דחוסה לכל מתמודד + שורת כותרות
      const clickable = opts.clickable !== false;
      
      // מיון ראשוני לפי ציון כולל
      const sortedList = [...list].sort((a,b)=> (b.overallAvg ?? -1) - (a.overallAvg ?? -1) || parseInt(a.group)-parseInt(b.group) || a.shoulder-b.shoulder);
      
      // סינון לפי ציון כולל מעוגל בלבד
      let filteredList = sortedList;
      if (this.state.scoreFilters.size > 0) {
        filteredList = sortedList.filter(candidate => {
          // בדיקה של הציון הכולל בלבד לאחר עיגול
          if (candidate.overallAvg === null || candidate.overallAvg === undefined) {
            return false;
          }
          const roundedScore = Math.round(candidate.overallAvg);
          return this.state.scoreFilters.has(roundedScore);
        });
      }
      
      // מיספור מיקומים מחדש אחרי הסינון
      const withPos = filteredList.map((item,i)=> ({...item, position: i+1}));
      const wrap = document.createElement('div');
      wrap.className='agg-mobile-lines';
      
      // הצגת הודעה אם אין תוצאות
      if (withPos.length === 0) {
        wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:#64748b;font-size:.85rem;">לא נמצאו מתמודדים התואמים לסינון</div>';
        return wrap;
      }
      
      // שורת כותרות - סדר חדש: מיקום, כתף, קבוצה
      const headerRow = `<div class="candidate-row candidate-row-header" aria-hidden="true">
        <div class="col col-pos">מיקום</div>
        <div class="col col-shoulder">כתף</div>
        <div class="col col-group">קבוצה</div>
        <div class="col col-sprint">ספרינט</div>
        <div class="col col-crawl">זחילה</div>
        <div class="col col-stretcher">אלונקה</div>
        <div class="col col-overall">כולל</div>
        <div class="col col-evals">מעריכים</div>
        <div class="col col-comments"></div>
      </div>`;
      wrap.innerHTML = headerRow + withPos.map(r => `
        <div class="candidate-row ${clickable?'clickable':''}" data-group="${r.group}" data-shoulder="${r.shoulder}" tabindex="0" aria-label="מועמד ${r.shoulder} קבוצה ${r.group}">
          <div class="col col-pos ${r.position<=3? 'top-'+r.position:''}" title="מיקום">${r.position}</div>
          <div class="col col-shoulder" title="מספר כתף">${r.shoulder}</div>
          <div class="col col-group" title="קבוצה">${r.group}</div>
          <div class="col col-sprint" title="ציון ספרינט">${r.sprintAvg ?? '-'}</div>
          <div class="col col-crawl" title="ציון זחילה">${r.crawlingAvg ?? '-'}</div>
          <div class="col col-stretcher" title="ציון אלונקה">${r.stretcherAvg ?? '-'}</div>
          <div class="col col-overall" title="ציון כולל">${r.overallAvg ?? '-'}</div>
          <div class="col col-evals" title="מספר מעריכים">${r.evalCount}</div>
          <div class="col col-comments" title="הערות">${r.hasComments?'<span class="comments-icon" aria-label="יש הערות" role="img">💬</span>':''}</div>
        </div>`).join('');
      if (clickable){
        wrap.querySelectorAll('.candidate-row.clickable').forEach(row => {
          row.addEventListener('click', ()=> this._openCandidateDetails(row.dataset.group, row.dataset.shoulder));
          row.addEventListener('keydown', e => { if(e.key==='Enter'||e.key===' '){ e.preventDefault(); this._openCandidateDetails(row.dataset.group, row.dataset.shoulder);} });
        });
      }
      return wrap;
    }

    _injectStyles(){
      const existing = document.getElementById('aggDashboardStyles');
      if (existing) return; // כבר נטען
      
      // טעינת קובץ CSS חיצוני
      const link = document.createElement('link');
      link.id = 'aggDashboardStyles';
      link.rel = 'stylesheet';
      link.href = 'css/aggregated-dashboard.css';
      document.head.appendChild(link);
    }

    countEvaluators() {
      // ספירה נכונה - מעריך ייספר רק פעם אחת גם אם הערך כמה קבוצות
      const uniqueEvaluators = new Set();
      this.state.groups.forEach(gData => {
        gData.evaluators.forEach((_, evaluatorName) => {
          uniqueEvaluators.add(evaluatorName);
        });
      });
      return uniqueEvaluators.size;
    }

    refreshCurrent() {
      if(!this.lastQuery) return this.renderDatePicker();
      this._refreshFetch();
    }

    avg(arr){ 
      if(!arr.length) return null; 
      const v=(arr.reduce((a,b)=>a+b,0)/arr.length); 
      return +v.toFixed(2); 
    }

    _groupNumbers(){ 
      return Array.from(this.state.groups.keys()).sort((a,b)=>parseInt(a)-parseInt(b)); 
    }
    
    _allEvaluatorNames(){ 
      const set = new Set(); 
      this.state.groups.forEach(g=> g.evaluators.forEach((_,name)=> set.add(name))); 
      return Array.from(set).sort(); 
    }
    
    _evaluatorNamesByGroup(g){ 
      const gd=this.state.groups.get(g); 
      if(!gd) return []; 
      return Array.from(gd.evaluators.keys()).sort(); 
    }

    aggregateAllCandidates() {
      const map = new Map();
      this.state.groups.forEach((gData, groupNumber) => {
        gData.evaluators.forEach(evalData => {
          (evalData.runners||[]).forEach(r => {
            const key = groupNumber+'-'+r.shoulderNumber;
            if (!map.has(key)) map.set(key,{ group: groupNumber, shoulder: r.shoulderNumber, sprint: [], crawling: [], stretcher: [] });
            const entry = map.get(key);
            if (r.finalScores) {
              ['sprint','crawling','stretcher'].forEach(k=> { if (typeof r.finalScores[k]==='number') entry[k].push(r.finalScores[k]); });
            }
          });
        });
      });
      return Array.from(map.values()).map(c=> {
        const sprintAvg = this.avg(c.sprint);
        const crawlingAvg = this.avg(c.crawling);
        const stretcherAvg = this.avg(c.stretcher);
        const parts = [sprintAvg, crawlingAvg, stretcherAvg].filter(v=> typeof v==='number');
        const overallAvg = parts.length? +(parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2) : null;
        return {
          group: c.group,
          shoulder: c.shoulder,
          sprintAvg,
          crawlingAvg,
          stretcherAvg,
          overallAvg,
          evalCount: Math.max(c.sprint.length, c.crawling.length, c.stretcher.length),
          hasComments: this._hasComments(c.group, c.shoulder)
        };
      }).sort((a,b)=> {
        // מיון נכון: ציון כולל גבוה קודם
        const scoreA = a.overallAvg ?? -Infinity;
        const scoreB = b.overallAvg ?? -Infinity;
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (a.group !== b.group) return parseInt(a.group) - parseInt(b.group);
        return a.shoulder - b.shoulder;
      });
    }

    aggregateEvaluatorAcrossAll(name){
      const rows=[];
      this.state.groups.forEach((gData, groupNumber)=>{
        gData.evaluators.forEach((evData, evName)=>{
          if (evName===name){
            (evData.runners||[]).forEach(r=>{
              const sprintAvg = r.finalScores?.sprint ?? null;
              const crawlingAvg = r.finalScores?.crawling ?? null;
              const stretcherAvg = r.finalScores?.stretcher ?? null;
              const parts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
              const overallAvg= parts.length? +(parts.reduce((a,b)=>a+b,0)/parts.length).toFixed(2):null;
              rows.push({ 
                group: groupNumber, 
                shoulder: r.shoulderNumber, 
                sprintAvg, 
                crawlingAvg, 
                stretcherAvg, 
                overallAvg, 
                evalCount:1, 
                hasComments: this._hasComments(groupNumber, r.shoulderNumber) 
              });
            });
          }
        });
      });
      return rows.sort((a,b)=> {
        // מיון נכון: ציון כולל גבוה קודם
        const scoreA = a.overallAvg ?? -Infinity;
        const scoreB = b.overallAvg ?? -Infinity;
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (a.group !== b.group) return parseInt(a.group) - parseInt(b.group);
        return a.shoulder - b.shoulder;
      });
    }

    aggregateGroup(gData) {
      const map = new Map();
      gData.evaluators.forEach(evalData => {
        (evalData.runners||[]).forEach(r => {
          const key = r.shoulderNumber;
          if (!map.has(key)) map.set(key,{ group: evalData.groupNumber, shoulder: r.shoulderNumber, sprint: [], crawling: [], stretcher: [] });
          const entry = map.get(key);
          if (r.finalScores) ['sprint','crawling','stretcher'].forEach(k=> { if (typeof r.finalScores[k]==='number') entry[k].push(r.finalScores[k]); });
        });
      });
      return Array.from(map.values()).map(c=> {
        const sprintAvg=this.avg(c.sprint), crawlingAvg=this.avg(c.crawling), stretcherAvg=this.avg(c.stretcher);
        const pts=[sprintAvg,crawlingAvg,stretcherAvg].filter(v=> typeof v==='number');
        const overallAvg = pts.length? +(pts.reduce((a,b)=>a+b,0)/pts.length).toFixed(2):null;
        return { group: c.group, shoulder: c.shoulder, sprintAvg, crawlingAvg, stretcherAvg, overallAvg, evalCount: Math.max(c.sprint.length,c.crawling.length,c.stretcher.length), hasComments: this._hasComments(c.group, c.shoulder) };
      }).sort((a,b)=> {
        // מיון נכון: ציון כולל גבוה קודם
        const scoreA = a.overallAvg ?? -Infinity;
        const scoreB = b.overallAvg ?? -Infinity;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.shoulder - b.shoulder;
      });
    }

    // ============================================
    // פונקציה ליצירת קובץ אקסל מאוחד - קוראת לקובץ החיצוני
    // ============================================
    async exportAggregatedExcel() {
      const btn = this.root.querySelector('#aggExportExcelBtn');
      if (!btn) return;
      
      try {
        btn.disabled = true;
        btn.textContent = '⏳ מייצר אקסל...';
        
        // קריאה לפונקציית הייצוא החיצונית
        await window.AggregatedExcelExporter.exportToExcel(this);
        
      } catch (error) {
        console.error('❌ שגיאה ביצירת קובץ אקסל:', error);
        alert('שגיאה ביצירת קובץ האקסל: ' + error.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '📥 הורד אקסל';
        }
      }
    }

    // ============================================
    // פתיחת דשבורד סטטיסטיקות - מופרד לקובץ נפרד
    // ============================================
    showStatsDashboard() {
      if (!window.StatsDashboard) {
        console.error('❌ StatsDashboard לא נטען');
        alert('שגיאה: דשבורד הסטטיסטיקות לא זמין');
        return;
      }
      
      // יצירת instance של דשבורד הסטטיסטיקות ופתיחתו
      const statsDashboard = new window.StatsDashboard(this);
      statsDashboard.show();
    }
  }

  // Wrapper page renderer for main app integration
  window.Pages = window.Pages || {};
  window.Pages.renderAggregatedDashboardPage = function(){
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = '<div id="aggregated-dashboard-root"></div>';
    // if instance exists reuse? create fresh each time
    window.__aggDashInstance = AggregatedDashboard.init({ mountId: 'aggregated-dashboard-root' });
  };

  window.AggregatedDashboard = AggregatedDashboard;
})();