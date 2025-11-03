(function(){
  if (window.ensureSharedCompetitionStyles) return;
  window.ensureSharedCompetitionStyles = function(){
    if (document.getElementById('shared-competition-styles')) return;
    const st = document.createElement('style');
    st.id = 'shared-competition-styles';
    st.textContent = `
      .heat-bar, .heat-bar-sprint{
        direction:rtl;display:flex;flex-direction:column;gap:10px;
        background:#1e3a8a;color:#fff;padding:10px 16px 14px;
        border-radius:16px;margin:12px 0 10px;
      }
      .dark .heat-bar, .dark .heat-bar-sprint{background:#334155}
      .heat-bar-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .heat-bar-title{font-size:18px;font-weight:700;letter-spacing:.5px;text-align:center;flex:1}
      .heat-bar-btn{
        background:#2563eb;color:#fff;border:none;font-weight:600;
        padding:8px 14px;border-radius:10px;cursor:pointer;
        display:inline-flex;align-items:center;gap:6px;font-size:14px;
        transition:.15s;box-shadow:0 2px 6px rgba(0,0,0,.25);
      }
      .heat-bar-btn[disabled]{opacity:.55;cursor:not-allowed}
      .heat-bar-btn:hover:not([disabled]){background:#1d4ed8}

      #timer-display.timer-display{
        font-family:monospace;
        font-size:18px; /* הקטנה */
        min-width:78px;
        text-align:center;
        line-height:1;
      }
      .timer-center{
        display:flex;
        justify-content:center;
        margin-top:4px;
        margin-bottom:4px;
      }
      .timer-display{
        display:inline-flex;
        align-items:center;
        gap:4px;
        font-variant-numeric:tabular-nums;
      }
      .timer-display .timer-icon{
        font-size:18px; /* האייקון 18 */
        line-height:1;
        opacity:.9;
      }
      .dark .timer-display .timer-icon{opacity:.85}

      .timer-display.small{font-size:18px}

      .heat-actions{
        display:flex;gap:10px;justify-content:center;
        margin:6px 0 14px;direction:rtl;flex-wrap:wrap;width:100%;
      }
      .heat-btn{
        border:none;border-radius:10px;cursor:pointer;font-weight:700;
        padding:10px 18px;font-size:14px;transition:.15s;
        box-shadow:0 2px 6px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;min-width:110px;
      }
      .heat-btn.start{background:#10b981;color:#fff}
      .heat-btn.start:hover{background:#059669}
      .heat-btn.stop{background:#ef4444;color:#fff}
      .heat-btn.stop:hover{background:#dc2626}
      .heat-btn.undo{background:#f59e0b;color:#fff}
      .heat-btn.undo:hover{background:#d97706}
      .heat-btn.hidden{display:none!important}
      .heat-actions.single .heat-btn:not(.hidden),
      .heat-actions.double .heat-btn:not(.hidden){flex:1 1 0;min-width:0}

      .auto-grid .runner-btn,
      .cs-grid-3min .runner-btn{
        display:flex;align-items:center;justify-content:center;
        height:64px;border-radius:12px;font-weight:700;letter-spacing:.5px;transition:.15s;
      }
      .auto-grid .runner-btn:active,
      .cs-grid-3min .runner-btn:active{transform:scale(.96)}

      .cs-grid-3min{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      @media (min-width:640px){.cs-grid-3min{grid-template-columns:repeat(5,minmax(0,1fr))}}

      .auto-grid{
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(80px,1fr));
        gap:10px;
      }

      /* מניעת אייקון שעשוי להופיע מהקוד הישן */
      #timer-display .icon-clock,
      .heat-timer-box .icon-clock,
      #timer-display .clock-icon,
      #timer-display i,
      #timer-display svg {
        display:none !important;
      }
      .heat-timer-box{padding:0;margin:0;background:transparent!important;box-shadow:none!important;border:0!important;}
      
      /* Timer with persistent icon */
      .timer-display{
        display:inline-flex;
        align-items:center;
        gap:6px;
        font-variant-numeric:tabular-nums;
      }
      .timer-display .timer-icon{
        font-size:18px;
        line-height:1;
        opacity:.9;
      }
      .dark .timer-display .timer-icon{opacity:.85}
    `;
    document.head.appendChild(st);
  };
})();

if(!window.ensureTimerIcon){
  window.ensureTimerIcon = function(){
    const el = document.getElementById('timer-display');
    if(!el) return;
    const valSpan = el.querySelector('#timer-value');
    if (valSpan){
      return; // כבר מובנה
    }
    const current = el.textContent.trim() || '00:00';
    el.innerHTML = `<span class="timer-icon" aria-hidden="true">🕒</span><span id="timer-value">${current}</span>`;
  };
}
if(!window.setTimerValue){
  window.setTimerValue = function(txt){
    const span = document.getElementById('timer-value');
    if(span) span.textContent = txt;
  };
}

/* הסרת כל העיצובים הכפולים של arrival-row */
/* כל העיצוב מרוכז בקובץ arrival-rows.css */