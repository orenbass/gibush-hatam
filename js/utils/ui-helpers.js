(function () {
  function ensureOverlay() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'hidden';
      overlay.innerHTML = `
        <div class="loading-box">
          <div class="spinner" aria-hidden="true"></div>
          <div id="loading-text">נא להמתין...</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    ensureCss();
    return overlay;
  }

  function ensureCss() {
    if (document.getElementById('loading-overlay-style')) return;
    const st = document.createElement('style');
    st.id = 'loading-overlay-style';
    st.textContent = `
      #loading-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 5000;
        backdrop-filter: blur(4px);
      }
      #loading-overlay.hidden { display: none !important; }
      #loading-overlay .loading-box {
        background:#fff;
        color:#1f2937;
        padding:26px 34px;
        border-radius:18px;
        box-shadow:0 10px 30px -5px rgba(0,0,0,.35);
        display:flex;
        flex-direction:column;
        gap:18px;
        align-items:center;
        min-width:240px;
        font-family:inherit;
      }
      .dark #loading-overlay .loading-box {
        background:#1f2937;
        color:#f1f5f9;
      }
      #loading-overlay .spinner {
        width:56px;
        height:56px;
        border:6px solid #e2e8f0;
        border-top-color:#3b82f6;
        border-radius:50%;
        animation:spin 1s linear infinite;
      }
      .dark #loading-overlay .spinner {
        border-color:#374151;
        border-top-color:#60a5fa;
      }
      #loading-overlay #loading-text {
        font-size:15px;
        font-weight:600;
        letter-spacing:.3px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      body._loading-active { overflow:hidden; touch-action:none; }
    `;
    document.head.appendChild(st);
  }

  window.showLoading = function (message = 'נא להמתין...') {
    const overlay = ensureOverlay();
    const textEl = overlay.querySelector('#loading-text');
    if (textEl) textEl.textContent = message;
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
    document.body.classList.add('_loading-active');
  };

  window.hideLoading = function () {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }
    document.body.classList.remove('_loading-active');
  };
})();