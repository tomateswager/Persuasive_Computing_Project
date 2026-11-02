// Chaves PÚBLICAS do Supabase (podem estar no código: vão sempre para o browser).
// Nunca pôr aqui a secret key / service_role.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://uzwdnbizohmambcarbbj.supabase.co';
export const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_g9vTGxqso8Mz3e9rxvQBqg_gBr0xxqB';

export const BREAK_SECONDS = 120;   // duração da pausa guiada
export const MOVE_SECONDS = 30;     // 4 movimentos x 30 s
export const AUTOSTART_SECONDS = 10; // a pausa começa sozinha (efeito default)
export const METERS_PER_BREAK = 100;
