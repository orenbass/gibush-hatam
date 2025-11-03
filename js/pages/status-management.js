(function(){
    window.Pages = window.Pages || {};
    window.Pages.renderStatusManagementPage = function renderStatusManagementPage(){
        const allRunners = (state.runners||[])
            .filter(r=>r && r.shoulderNumber!=null && String(r.shoulderNumber).trim()!=='')
            .sort((a,b)=>Number(a.shoulderNumber)-Number(b.shoulderNumber));
        const statuses = state.crawlingDrills?.runnerStatuses || (state.crawlingDrills.runnerStatuses = {});
        const active = allRunners.filter(r=> !statuses[r.shoulderNumber]);
        const inactive = allRunners.filter(r=> statuses[r.shoulderNumber]);
        // Build active cards (with action buttons)
        const activeCardsHtml = active.map(r=>{
            const sn = r.shoulderNumber;
            return `
            <div class="status-card is-active" data-shoulder="${sn}">
                <div class="status-number">${sn}</div>
                <div class="status-actions" dir="rtl">
                    <button type="button" class="status-btn btn-temp-removed" data-action="temp_removed" aria-label="העבר ${sn} לבדיקה">
                        <span class="icon">⚠️</span><span class="text">בדיקה</span>
                    </button>
                    <button type="button" class="status-btn btn-retired" data-action="retired" aria-label="העבר ${sn} לפרש">
                        <span class="icon">⛔</span><span class="text">פרש</span>
                    </button>
                </div>
            </div>`;
        }).join('');
        // Build inactive cards (status label only)
        const inactiveCardsHtml = inactive.map(r=>{
            const sn = r.shoulderNumber;
            const st = statuses[sn];
            const isRetired = st === 'retired';
            const icon = isRetired ? '⛔' : '⚠️';
            const label = isRetired ? 'פרש' : 'בדיקה';
            const cls = isRetired ? 'is-retired' : 'is-temp-removed';
            return `
            <div class="status-card ${cls}" data-shoulder="${sn}">
                <div class="status-number">${sn}</div>
                <div class="inactive-status-pill"><span class="icon">${icon}</span><span class="pill-text">${label}</span></div>
                <button type="button" class="status-btn btn-restore" data-action="restore" aria-label="השב ${sn} לפעילות">
                    <span class="icon">✅</span><span class="text">השב</span>
                </button>
            </div>`;
        }).join('');
        // Page markup
        contentDiv.innerHTML = `
        <div class="status-page-wrapper">
            <h2 class="status-page-title">ניהול סטטוס מתמודדים (${allRunners.length})</h2>
            ${active.length? `<div class="status-section"><h3 class="section-title">פעילים (${active.length})</h3><div class="status-grid status-grid-active">${activeCardsHtml}</div></div>`:''}
            ${inactive.length? `<div class="status-section inactive-section"><h3 class="section-title">בבדיקה / פרשו (${inactive.length})</h3><div class="status-grid status-grid-inactive">${inactiveCardsHtml}</div></div>`:''}
            ${(!active.length && !inactive.length)? `<div class='status-empty'>אין מתמודדים להצגה</div>`:''}
        </div>`;
        // Delegate clicks only from active grid
        contentDiv.querySelector('.status-grid-active')?.addEventListener('click', (e)=>{
            const btn = e.target.closest('.status-btn');
            if(!btn) return;
            const card = btn.closest('.status-card');
            if(!card) return;
            const sn = Number(card.dataset.shoulder);
            const action = btn.dataset.action; // temp_removed | retired
            if(!sn || !action) return;
            statuses[sn] = action;
            saveState?.();
            renderStatusManagementPage();
        });
        // NEW: restore inactive runner
        contentDiv.querySelector('.status-grid-inactive')?.addEventListener('click', (e)=>{
            const btn = e.target.closest('.btn-restore');
            if(!btn) return;
            const card = btn.closest('.status-card');
            if(!card) return;
            const sn = Number(card.dataset.shoulder);
            if(!sn) return;
            delete statuses[sn]; // remove status -> active
            saveState?.();
            renderStatusManagementPage();
        });
    };
})();