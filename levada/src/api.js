import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'levada-auth' },
});

function friendly(error) {
  const m = error?.message || String(error);
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sem ligação à internet. Tenta outra vez.';
  if (/anonymous/i.test(m) && /disabled/i.test(m)) return 'O registo anónimo está desligado no Supabase.';
  return m;
}

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(friendly(error));
  return data;
}

export const api = {
  // Devolve a sessão guardada, mas só se o utilizador ainda existir no servidor
  // (ex.: foi apagado). Sem internet, mantém a sessão.
  async session() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return null;
    const { error } = await supabase.auth.getUser();
    if (error && error.status && error.status >= 400 && error.status < 500) {
      await api.resetLocal();
      return null;
    }
    return data.session;
  },
  async resetLocal() {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    try { localStorage.removeItem('levada-auth'); localStorage.removeItem('levada-timer'); } catch { /* */ }
  },
  async signIn() {
    const existing = await api.session();
    if (existing) return existing;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(friendly(error));
    return data.session;
  },
  ensureProfile: () => rpc('ensure_profile'),
  completeOnboarding: (adult, pcStudent, pledge) =>
    rpc('complete_onboarding', { p_adult: adult, p_pc_student: pcStudent, p_pledge: pledge }),
  updateSettings: ({ block = null, pledge = null, streak = null }) =>
    rpc('update_settings', { p_block: block, p_pledge: pledge, p_streak: streak }),
  createTeam: (name) => rpc('create_team', { p_name: name }),
  joinTeam: (code) => rpc('join_team', { p_code: code }),
  log: (type, data = {}) => rpc('log_event', { p_type: type, p_data: data }).catch(() => null),
  startBreak: (mode, source) => rpc('start_break', { p_mode: mode, p_source: source }),
  completeBreak: (startId, moves) => rpc('complete_break', { p_start_id: startId, p_moves: moves }),
  socialCount: () => rpc('social_count'),
  home: () => rpc('get_home'),
  league: () => rpc('get_league'),
  publicStats: () => rpc('get_public_stats'),
  async deleteMyData() {
    await rpc('delete_my_data');
    await supabase.auth.signOut().catch(() => {});
  },
};
