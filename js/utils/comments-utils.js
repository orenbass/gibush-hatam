window.ensureCommentArray = function ensureCommentArray(key){
  window.state = window.state || {};
  state.generalComments = state.generalComments || {};
  const cur = state.generalComments[key];
  if (Array.isArray(cur)) return cur;
  if (typeof cur === 'string' && cur.trim()){
    state.generalComments[key] = [cur.trim()];
  } else if (!cur){
    state.generalComments[key] = [];
  } else {
    state.generalComments[key] = [String(cur).trim()];
  }
  return state.generalComments[key];
};

window.addQuickComment = function addQuickComment(key, text, opt = {}){
  const t = (text||'').trim();
  if(!t) return false;
  const arr = ensureCommentArray(key);
  // חדש למעלה
  arr.unshift(t);
  if (typeof saveState === 'function' && opt.save !== false) saveState();
  return true;
};