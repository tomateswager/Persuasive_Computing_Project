// Som, notificações, vibração, wake lock e estado do temporizador (sobrevive a recarregar a página)
let ctx = null;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* sem áudio */ }
}

export function chime() {
  try {
    unlockAudio();
    if (!ctx) return;
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = [660, 880, 990][i];
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.45);
    });
  } catch { /* ignora */ }
  try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignora */ }
}

export async function askNotifications() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try { return await Notification.requestPermission(); } catch { return 'denied'; }
}

export async function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'levada-break', renotify: true });
    else new Notification(title, { body, icon: '/icon-192.png' });
  } catch { /* ignora */ }
}

let lock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !lock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener?.('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release(); lock = null;
    }
  } catch { lock = null; }
}

const KEY = 'levada-timer';
export const timerStore = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignora */ } },
  clear() { try { localStorage.removeItem(KEY); } catch { /* ignora */ } },
};

export function readInviteCode() {
  try {
    const c = new URLSearchParams(location.search).get('c');
    if (c) { localStorage.setItem('levada-invite', c.toUpperCase()); history.replaceState(null, '', location.pathname + location.hash); }
    return localStorage.getItem('levada-invite') || '';
  } catch { return ''; }
}
