(function () {
  window.Components = window.Components || {};

  const timers = {}; // { key: { start, interval } }

  function format(ms) {
    const total = ms / 1000;
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const dec = Math.floor((total - Math.floor(total)) * 10);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${dec}`;
  }

  function startTimer(key) {
    stopTimer(key);
    const display = document.querySelector(`[data-timer-display="${key}"]`);
    if (!display) return;
    timers[key] = { start: Date.now() };
    timers[key].interval = setInterval(() => {
      const ms = Date.now() - timers[key].start;
      display.textContent = format(ms);
    }, 100);
  }

  function stopTimer(key) {
    if (timers[key]?.interval) {
      clearInterval(timers[key].interval);
      delete timers[key];
    }
  }

  // אירוע האזנה גלובלי (אחד בלבד)
  if (!window._heatHeaderTimerBound) {
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-start-heat]');
      if (btn) {
        const key = btn.getAttribute('data-start-heat');
        if (timers[key]) {
          stopTimer(key);
          btn.querySelector('.start-label').textContent = 'התחל';
        } else {
          startTimer(key);
          btn.querySelector('.start-label').textContent = 'עצור';
        }
      }
    });
    window._heatHeaderTimerBound = true;
  }

  window.Components.buildHeatHeader = function buildHeatHeader(type, heatIndex) {
    const key = `${type}-${heatIndex}`;
    return `
      <div class="heat-header">
        <div class="heat-title">${type === 'crawl' ? 'מקצה זחילה' : 'מקצה ספרינט'} #${heatIndex}</div>
        <div class="heat-timer">
          <button type="button" class="timer-btn" data-start-heat="${key}">
            <span class="icon-clock">🕒</span>
            <span class="timer-display" data-timer-display="${key}">00:00.0</span>
            <span class="start-label">התחל</span>
          </button>
        </div>
      </div>
    `;
  };

  // CSS once
  if (!document.getElementById('heat-header-style')) {
    const s = document.createElement('style');
    s.id = 'heat-header-style';
    s.textContent = `
      .heat-header {
        display:flex;align-items:center;justify-content:space-between;
        gap:16px;padding:10px 14px;margin:14px 0 6px;
        background:linear-gradient(90deg,#1e3a8a,#1e40af);border-radius:14px;
        color:#fff;font-size:14px;
      }
      .heat-title { font-weight:600; letter-spacing:.5px; }
      .heat-timer .timer-btn {
        display:flex;align-items:center;gap:10px;
        background:#fff;color:#1e3a8a;font-weight:600;
        padding:8px 14px;border-radius:999px;
        border:none;cursor:pointer;font-size:14px;
        box-shadow:0 2px 6px rgba(0,0,0,.15);
        transition:.2s;
      }
      .heat-timer .timer-btn:hover { transform:translateY(-2px); box-shadow:0 4px 10px rgba(0,0,0,.25); }
      .heat-timer .icon-clock { font-size:18px; }
      .heat-timer .timer-display { font-family:monospace; min-width:84px; text-align:center; }
      .dark .heat-header { background:linear-gradient(90deg,#334155,#1e293b); }
      .dark .heat-timer .timer-btn { background:#0f172a; color:#fff; }
    `;
    document.head.appendChild(s);
  }
})();