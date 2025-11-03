(function () {
  'use strict';

  function showModal(title, message, onConfirm, isInputModal = false, onInputConfirm, options = {}) {
    const existingModal = document.getElementById('confirmation-modal');
    if (existingModal) existingModal.remove();

    // סוג (עיצוב): danger / warning / info / success
    const type = options.type || 'warning';
    const typeMeta = {
      danger:  { icon: '❌', bg: 'bg-red-50',    border: 'border-red-300',   heading: 'text-red-700',   button: 'bg-red-600 hover:bg-red-700' },
      warning: { icon: '⚠️', bg: 'bg-amber-50',  border: 'border-amber-300', heading: 'text-amber-700', button: 'bg-amber-600 hover:bg-amber-700' },
      info:    { icon: 'ℹ️', bg: 'bg-blue-50',   border: 'border-blue-300',  heading: 'text-blue-700',  button: 'bg-blue-600 hover:bg-blue-700' },
      success: { icon: '✅', bg: 'bg-green-50',  border: 'border-green-300', heading: 'text-green-700', button: 'bg-green-600 hover:bg-green-700' }
    }[type];

    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'fixed inset-0 bg-black/55 backdrop-blur-sm flex justify-center items-center z-[9999] p-4';
    modalBackdrop.id = 'confirmation-modal';
    modalBackdrop.setAttribute('role','dialog');
    modalBackdrop.setAttribute('aria-modal','true');

    const inputHtml = isInputModal
      ? `<div class="mt-4"><input type="password" id="modal-input" class="w-full p-3 border border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg text-base text-right bg-white placeholder-gray-400" placeholder="הכנס קוד גישה" aria-label="קוד גישה"></div>`
      : '';

    const html = `
      <div class="relative w-full max-w-md" data-modal-container>
        <div class="${typeMeta.bg} ${typeMeta.border} border rounded-xl shadow-xl overflow-hidden">
          <div class="px-6 pt-6 pb-2 flex items-center gap-3">
            <div class="text-2xl" aria-hidden="true">${typeMeta.icon}</div>
            <h3 class="text-xl font-bold ${typeMeta.heading} flex-1" id="modal-title">${title}</h3>
            <button class="text-gray-500 hover:text-gray-700 focus:outline-none" id="modal-x-btn" aria-label="סגור חלון">×</button>
          </div>
          <div class="px-6 pb-4 text-right">
            <p class="text-gray-800 leading-relaxed text-sm md:text-base" id="modal-message">${message}</p>
            ${inputHtml}
            ${options.extraHtml || ''}
          </div>
          <div class="px-6 pb-6 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-start sm:flex-row-reverse">
            <button id="confirm-btn" class="${typeMeta.button} text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors" aria-label="אישור פעולה">${options.confirmText || 'אישור'}</button>
            <button id="cancel-btn" class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2.5 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors" aria-label="ביטול פעולה">${options.cancelText || 'ביטול'}</button>
          </div>
        </div>
      </div>`;

    modalBackdrop.innerHTML = html;
    document.body.appendChild(modalBackdrop);

    const container = modalBackdrop.querySelector('[data-modal-container]');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const xBtn = document.getElementById('modal-x-btn');
    const inputEl = document.getElementById('modal-input');

    // פוקוס ראשוני
    setTimeout(()=> {
      (inputEl || confirmBtn).focus();
    }, 10);

    // Trap לטאב בתוך המודל
    const focusable = () => Array.from(container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    function handleKey(e){
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length -1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKey);

    function close(){
      document.removeEventListener('keydown', handleKey);
      if (modalBackdrop.parentNode) modalBackdrop.parentNode.removeChild(modalBackdrop);
      if (typeof options.onClose === 'function') options.onClose();
    }

    xBtn.addEventListener('click', close);
    cancelBtn.addEventListener('click', close);
    modalBackdrop.addEventListener('click', (e)=> { if (e.target === modalBackdrop) close(); });

    if (isInputModal) {
      confirmBtn.onclick = () => {
        const val = inputEl?.value || '';
        if (onInputConfirm) onInputConfirm(val);
        close();
      };
    } else {
      confirmBtn.onclick = () => {
        if (onConfirm) onConfirm();
        close();
      };
    }
  }

  function confirmLeaveCrawlingComments(onConfirm) {
    const st = window.state;
    const PAGES = window.PAGES || {};
    const onCrawling = st?.currentPage === PAGES.CRAWLING_COMMENTS;
    const hasActive = Array.isArray(st?.crawlingDrills?.activeSackCarriers) && st.crawlingDrills.activeSackCarriers.length > 0;

    if (onCrawling && hasActive) {
      showModal('אישור יציאה', 'יציאה תפסיק את כל נושאי השק ותנקה את הבחירות. להמשיך?', () => {
        window.stopAllSackTimers?.();
        if (st?.crawlingDrills) st.crawlingDrills.activeSackCarriers = [];
        window.saveState?.();
        if (typeof onConfirm === 'function') onConfirm();
      }, false, null, { type: 'danger', confirmText: 'סיים ויציאה', cancelText: 'חזור' });
      return true;
    }
    return false;
  }

  window.showModal = window.showModal || showModal;
  window.confirmLeaveCrawlingComments = window.confirmLeaveCrawlingComments || confirmLeaveCrawlingComments;
})();