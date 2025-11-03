(function () {
  'use strict';
  function formatTime(ms) {
    if (ms < 0) ms = 0;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}:${String(milliseconds).padStart(3,'0')}`;
  }
  function formatTime_no_ms(ms) {
    if (ms < 0) ms = 0;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
  }
  function updateTimerDisplay(elapsedTime, showMilliseconds = true) {
    const el = document.getElementById('timer-display');
    if (!el) return;
    el.textContent = `⏰ ${showMilliseconds ? formatTime(elapsedTime) : formatTime_no_ms(elapsedTime)}`;
  }
  window.formatTime = window.formatTime || formatTime;
  window.formatTime_no_ms = window.formatTime_no_ms || formatTime_no_ms;
  window.updateTimerDisplay = window.updateTimerDisplay || updateTimerDisplay;
})();