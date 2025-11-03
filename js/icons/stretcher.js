(function () {
  window.Icons = window.Icons || {};
  window.Icons.stretcher = function stretcherIcon(extra='') {
    return `<svg ${extra} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2" y="9" width="3" height="6" rx="1" fill="currentColor"></rect>
      <rect x="5" y="11" width="14" height="4" rx="1" fill="currentColor" opacity=".85"></rect>
      <rect x="19" y="11" width="3" height="4" rx="1" fill="currentColor"></rect>
      <rect x="6.4" y="15" width="1.2" height="3" fill="currentColor"></rect>
      <rect x="16.4" y="15" width="1.2" height="3" fill="currentColor"></rect>
      <circle cx="7" cy="18.5" r="1.5" fill="currentColor"></circle>
      <circle cx="17" cy="18.5" r="1.5" fill="currentColor"></circle>
    </svg>`;
  };
})();