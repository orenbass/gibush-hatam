(function(){
  'use strict';

  const RELEASE_NOTES = {
    '3.7': [
      'מודל ההערות האישי קיבל כפתור "הערות מוכנות" זהה לזה של ההערות המהירות',
      'כפתורי המיקרופון בהערות (מהירות ואישיות) עובדים בצורה חלקה יותר.',
      'חישוב ציון האלונקה הסוציומטרית מעניק ציון מינימום 1 לכל משתתף פעיל בכל מקצה כדי לשקף השתתפות.',
      'שיפורי ניגודיות בממשק: טקסט כהה במצב בהיר וכפתור מיקרופון ממוסגר לקריאות טובה יותר.'
    ]
  };

  function compareVersions(a, b) {
    const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  function getNotes(version) {
    if (!version) return [];
    return RELEASE_NOTES[String(version)] || [];
  }

  function collectVersions(startVersion, includePrevious = 0) {
    const versions = Object.keys(RELEASE_NOTES).sort((a, b) => -compareVersions(a, b));
    if (!versions.length) return [];
    let startIndex = startVersion ? versions.indexOf(String(startVersion)) : -1;
    if (startIndex === -1) startIndex = 0;
    const end = Math.min(versions.length, startIndex + includePrevious + 1);
    return versions.slice(startIndex, end);
  }

  function buildHtml({ version, includePrevious = 0 } = {}) {
    const collected = collectVersions(version, includePrevious);
    if (!collected.length) return '';
    const sections = collected.map(ver => {
      const notes = getNotes(ver);
      if (!notes.length) return '';
      const items = notes.map(note => `<li class="release-note-item">${note}</li>`).join('');
      return `<section class="release-notes-section" data-version="${ver}">
        <header class="release-notes-header">מה חדש בגרסה ${ver}</header>
        <ul class="release-notes-list">${items}</ul>
      </section>`;
    }).filter(Boolean).join('');
    return sections ? `<div class="release-notes-wrapper">${sections}</div>` : '';
  }

  function ensureStyles(){
    if (document.getElementById('release-notes-style')) return;
    const style = document.createElement('style');
    style.id = 'release-notes-style';
    style.textContent = `
      .release-notes-wrapper{background:rgba(255,255,255,0.92);color:#0f172a;border-radius:14px;padding:16px 18px;box-shadow:0 6px 20px rgba(15,23,42,0.15);border:1px solid rgba(148,163,184,0.35);max-height:280px;overflow:auto;font-size:14px;line-height:1.5;}
      .release-notes-header{font-weight:700;margin-bottom:8px;color:#0f172a;font-size:15px;}
      .release-notes-list{list-style:disc;padding-right:20px;margin:0;display:flex;flex-direction:column;gap:6px;}
      .release-note-item{color:#1f2937;}
      .release-notes-wrapper::-webkit-scrollbar{width:8px;}
      .release-notes-wrapper::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.6);border-radius:999px;}
      .release-notes-wrapper::-webkit-scrollbar-track{background:rgba(226,232,240,0.6);border-radius:999px;}
      .dark .release-notes-wrapper{background:rgba(30,41,59,0.92);color:#e2e8f0;border-color:rgba(51,65,85,0.65);box-shadow:0 8px 24px rgba(15,23,42,0.35);}
      .dark .release-notes-header{color:#f8fafc;}
      .dark .release-note-item{color:#e2e8f0;}
      .dark .release-notes-wrapper::-webkit-scrollbar-thumb{background:rgba(71,85,105,0.8);}
      .dark .release-notes-wrapper::-webkit-scrollbar-track{background:rgba(30,41,59,0.6);}
    `;
    document.head.appendChild(style);
  }

  ensureStyles();

  window.ReleaseNotes = window.ReleaseNotes || {};
  Object.assign(window.ReleaseNotes, {
    getNotes,
    buildHtml,
    collectVersions
  });
})();
