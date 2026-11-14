// AgriStuntti – ohjaus: näppäimistö, peliohjain ja kosketusnapit.
const keys = new Set();
const touch = { left: 0, right: 0, gas: 0, brake: 0 };
const I = { onKey: null, active: false, touchUsed: false };
const MAP = { left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], gas: ['ArrowUp', 'KeyW'], brake: ['ArrowDown', 'KeyS', 'Space'] };
const GAME = new Set([].concat(...Object.values(MAP)));

addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (!e.repeat && I.onKey) I.onKey(e.code);
  keys.add(e.code);
  if (I.active && GAME.has(e.code)) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => { keys.clear(); for (const k in touch) touch[k] = 0; });

export function bindTouch(root, onBtn) {
  root.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); I.touchUsed = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (er) { /* */ } if (k in touch) touch[k] = 1; else if (onBtn) onBtn(k); };
    const off = e => { e.preventDefault(); b.classList.remove('on'); if (k in touch) touch[k] = 0; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off);
    b.addEventListener('lostpointercapture', off); b.addEventListener('contextmenu', e => e.preventDefault());
  });
}

let padPrev = [];
// palauttaa { throttle -1…1, steer -1…1 (vasen +) } ja välittää ohjaimen nappien painallukset onKey-kutsulle
export function state() {
  const has = n => MAP[n].some(k => keys.has(k));
  let steer = (has('left') || touch.left ? 1 : 0) - (has('right') || touch.right ? 1 : 0);
  let throttle = (has('gas') || touch.gas ? 1 : 0) - (has('brake') || touch.brake ? 1 : 0);
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  pads.forEach((p, pi) => {
    const ax = p.axes[0] || 0;
    if (Math.abs(ax) > 0.15) steer = Math.max(-1, Math.min(1, steer - ax));
    const b = i => p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.3);
    const rt = p.buttons[7] ? p.buttons[7].value : 0, lt = p.buttons[6] ? p.buttons[6].value : 0;
    if (rt > 0.05 || lt > 0.05) throttle = rt - lt;
    if (b(0)) throttle = 1;
    if (b(1) || b(2)) throttle = -1;
    if (b(14)) steer = 1;
    if (b(15)) steer = -1;
    // napit tapahtumina: Y = kamera, X / select = palautus, start = tauko
    const prev = padPrev[pi] || {};
    const now = { cam: b(3), reset: b(8) || b(4), pause: b(9) };
    if (I.onKey) {
      if (now.cam && !prev.cam) I.onKey('KeyC');
      if (now.reset && !prev.reset) I.onKey('KeyR');
      if (now.pause && !prev.pause) I.onKey('Escape');
    }
    padPrev[pi] = now;
  });
  return { throttle, steer };
}
export function reset() { keys.clear(); for (const k in touch) touch[k] = 0; }
export default I;
