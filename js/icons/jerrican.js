(function () {
  window.Icons = window.Icons || {};
  window.Icons.jerrican = function jerricanIcon(extra='') {
    return `<svg ${extra} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path class="body" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"
        d="M8 3h4.6c.4 0 .8.16 1.1.44l1.9 1.76H17a2 2 0 0 1 2 2v11.5A2.3 2.3 0 0 1 16.7 21H7.3A2.3 2.3 0 0 1 5 18.7V5.7C5 4.76 5.76 4 6.7 4H8z"/>
      <path class="handle" fill="currentColor"
        d="M8 3h4.6c.4 0 .8.16 1.1.44l1.9 1.76H17v1h-2.8L12.3 4.3a.9.9 0 0 0-.6-.3H8V3z"/>
      <rect class="cap" x="14.6" y="4.2" width="2.8" height="2" rx=".45" fill="currentColor"/>
      <path class="water"
        d="M6.8 11.2v6.7c0 .46.36.83.82.83h8.76c.46 0 .82-.37.82-.83v-6.7c-.95.62-1.9.62-2.85 0-.95.62-1.9.62-2.85 0-.95.62-1.9.62-2.85 0-.95.62-1.9.62-2.85 0z"/>
      <path class="brace" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"
        d="M10 10.8 14 14.8M12.4 10.8 16 14.2"/>
    </svg>`;
  };
})();