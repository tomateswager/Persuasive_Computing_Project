-- =====================================================================
-- LEVADA · esquema da base de dados (Supabase / Postgres)
-- Colar TUDO no Supabase → SQL Editor → New query → Run.
-- Pode ser corrido mais do que uma vez (recria as funções).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 40),
  code        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nickname        text not null,
  variant         text not null check (variant in ('A','B')),
  team_id         uuid references public.teams(id) on delete set null,
  is_adult        boolean not null default false,
  pc_student      boolean not null default false,
  excluded        boolean not null default false,   -- não conta para a League Table
  pledge          smallint not null default 1 check (pledge between 1 and 3),
  block_minutes   smallint not null default 45 check (block_minutes in (25,45,60)),
  streak_enabled  boolean not null default true,
  onboarded       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Registo de eventos. created_at é SEMPRE a hora do servidor.
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  variant     text,
  team_id     uuid,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists events_type_time on public.events (type, created_at);
create index if not exists events_user_time on public.events (user_id, created_at);

-- ---------------------------------------------------------------------
-- Segurança: RLS. Os clientes só leem os próprios dados; tudo o que
-- escreve passa por funções (RPC) que validam no servidor.
-- ---------------------------------------------------------------------
alter table public.teams    enable row level security;
alter table public.profiles enable row level security;
alter table public.events   enable row level security;

drop policy if exists "ler o meu perfil" on public.profiles;
create policy "ler o meu perfil" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "ler os meus eventos" on public.events;
create policy "ler os meus eventos" on public.events
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "ler a minha equipa" on public.teams;
create policy "ler a minha equipa" on public.teams
  for select to authenticated
  using (id = (select team_id from public.profiles where id = auth.uid()));

-- ---------------------------------------------------------------------
-- Funções auxiliares internas
-- ---------------------------------------------------------------------
create or replace function public._lisbon_day(ts timestamptz)
returns date language sql immutable as $$
  select (ts at time zone 'Europe/Lisbon')::date
$$;

create or replace function public._week_start()
returns timestamptz language sql stable as $$
  select (date_trunc('week', now() at time zone 'Europe/Lisbon')) at time zone 'Europe/Lisbon'
$$;

create or replace function public._me()
returns public.profiles language plpgsql stable security definer set search_path = public as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'sem sessão'; end if;
  select * into p from public.profiles where id = auth.uid();
  if not found then raise exception 'perfil inexistente'; end if;
  return p;
end $$;

create or replace function public._log(p_type text, p_data jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare p public.profiles; new_id bigint;
begin
  p := public._me();
  insert into public.events (user_id, type, variant, team_id, data)
  values (p.id, p_type, p.variant, p.team_id, coalesce(p_data, '{}'::jsonb))
  returning id into new_id;
  return new_id;
end $$;

-- Sequência de dias com pausa, com 1 dia livre por semana (Europe/Lisbon)
create or replace function public._streak(p_user uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare
  d date := public._lisbon_day(now());
  today date := d;
  n int := 0;
  free_used_week date := null;
  has boolean;
begin
  for i in 0..400 loop
    select exists (
      select 1 from public.events
      where user_id = p_user and type = 'break_completed'
        and public._lisbon_day(created_at) = d
    ) into has;
    if has then
      n := n + 1;
    elsif d = today then
      null;                                   -- hoje ainda não acabou
    elsif free_used_week is distinct from date_trunc('week', d)::date then
      free_used_week := date_trunc('week', d)::date;  -- usa o dia livre desta semana
    else
      exit;
    end if;
    d := d - 1;
  end loop;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- RPC: perfil e onboarding
-- ---------------------------------------------------------------------
create or replace function public.ensure_profile()
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  p public.profiles;
  animals text[] := array['Teira','Freira','Bisbis','Tentilhão','Pombo','Garajau','Cagarra','Lobo','Morcego','Corre-caminhos','Fura-bardos','Papinho'];
begin
  if auth.uid() is null then raise exception 'sem sessão'; end if;
  select * into p from public.profiles where id = auth.uid();
  if found then return p; end if;
  insert into public.profiles (id, nickname, variant)
  values (
    auth.uid(),
    animals[1 + floor(random() * array_length(animals,1))::int] || '-' || (1 + floor(random()*99))::int,
    case when random() < 0.5 then 'A' else 'B' end      -- sorteio A/B, 50/50, por utilizador
  )
  returning * into p;
  perform public._log('user_created');
  return p;
end $$;

create or replace function public.complete_onboarding(p_adult boolean, p_pc_student boolean, p_pledge int)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if not coalesce(p_adult,false) then raise exception 'É preciso ter 18 anos ou mais.'; end if;
  update public.profiles set
    is_adult = true,
    pc_student = coalesce(p_pc_student,false),
    excluded = excluded or coalesce(p_pc_student,false),
    pledge = greatest(1, least(3, coalesce(p_pledge,1))),
    onboarded = true
  where id = auth.uid()
  returning * into p;
  perform public._log('pledge_made', jsonb_build_object('pledge', p.pledge));
  return p;
end $$;

create or replace function public.update_settings(p_block int default null, p_pledge int default null, p_streak boolean default null)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  update public.profiles set
    block_minutes  = case when p_block in (25,45,60) then p_block else block_minutes end,
    pledge         = case when p_pledge between 1 and 3 then p_pledge else pledge end,
    streak_enabled = coalesce(p_streak, streak_enabled)
  where id = auth.uid()
  returning * into p;
  perform public._log('settings_changed', jsonb_build_object('block', p.block_minutes, 'pledge', p.pledge, 'streak', p.streak_enabled));
  return p;
end $$;

-- ---------------------------------------------------------------------
-- RPC: equipas
-- ---------------------------------------------------------------------
create or replace function public.create_team(p_name text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t public.teams; c text;
begin
  perform public._me();
  loop
    c := 'LEV-' || lpad((floor(random()*10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.teams where code = c);
  end loop;
  insert into public.teams (name, code) values (trim(p_name), c) returning * into t;
  update public.profiles set team_id = t.id where id = auth.uid();
  perform public._log('team_joined', jsonb_build_object('created', true));
  return t;
end $$;

create or replace function public.join_team(p_code text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t public.teams; n int;
begin
  perform public._me();
  select * into t from public.teams where code = upper(trim(p_code));
  if not found then raise exception 'Código não encontrado.'; end if;
  select count(*) into n from public.profiles where team_id = t.id and id <> auth.uid();
  if n >= 5 then raise exception 'Esta equipa já tem 5 pessoas.'; end if;
  update public.profiles set team_id = t.id where id = auth.uid();
  perform public._log('team_joined', jsonb_build_object('created', false));
  return t;
end $$;

-- ---------------------------------------------------------------------
-- RPC: eventos e pausas
-- ---------------------------------------------------------------------
create or replace function public.log_event(p_type text, p_data jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
begin
  if p_type not in ('session_started','session_ended','prompt_shown','break_skipped','break_abandoned',
                    'move_confirmed','move_skipped','checkin','highfive_sent','landmark_viewed',
                    'transparency_viewed','notifications_enabled') then
    raise exception 'tipo de evento inválido';
  end if;
  return public._log(p_type, p_data);
end $$;

create or replace function public.start_break(p_mode text default 'normal', p_source text default 'timer')
returns bigint language plpgsql security definer set search_path = public as $$
begin
  return public._log('break_started', jsonb_build_object('mode', p_mode, 'source', p_source));
end $$;

-- O comportamento-alvo. Só conta se: a pausa começou há >= 100 s e <= 15 min,
-- pertence ao utilizador, ainda não foi concluída, e >= 3 de 4 movimentos foram confirmados.
create or replace function public.complete_break(p_start_id bigint, p_moves int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s public.events; p public.profiles; elapsed numeric; total int;
begin
  p := public._me();
  select * into s from public.events where id = p_start_id and user_id = p.id and type = 'break_started';
  if not found then raise exception 'pausa inválida'; end if;
  if exists (select 1 from public.events where user_id = p.id and type = 'break_completed'
             and (data->>'start_id')::bigint = p_start_id) then
    raise exception 'pausa já registada';
  end if;
  elapsed := extract(epoch from now() - s.created_at);
  if elapsed < 100 or elapsed > 900 then
    raise exception 'duração inválida (% s)', round(elapsed);
  end if;
  if coalesce(p_moves,0) < 3 then raise exception 'movimentos insuficientes'; end if;
  perform public._log('break_completed', jsonb_build_object(
    'start_id', p_start_id, 'moves', p_moves, 'mode', s.data->>'mode', 'seconds', round(elapsed)));
  if p.team_id is null then
    select count(*) into total from public.events
      where user_id = p.id and type = 'break_completed';
  else
    select count(*) into total from public.events e
      join public.profiles pr on pr.id = e.user_id
      where e.type = 'break_completed' and pr.team_id = p.team_id;
  end if;
  return jsonb_build_object('team_breaks', total);
end $$;

-- ---------------------------------------------------------------------
-- RPC: leitura (ecrãs da app)
-- ---------------------------------------------------------------------
create or replace function public.social_count()
returns jsonb language sql stable security definer set search_path = public as $$
  with w as (
    select count(*) n from public.events e join public.profiles p on p.id = e.user_id
    where e.type = 'break_completed' and not p.excluded and e.created_at >= public._week_start()
  ), t as (
    select count(*) n from public.events e join public.profiles p on p.id = e.user_id
    where e.type = 'break_completed' and not p.excluded
  )
  -- regra fixa pré-registada: semana corrente só quando já houver >= 100 pausas nela
  select case when (select n from w) >= 100
    then jsonb_build_object('count', (select n from w), 'scope', 'week')
    else jsonb_build_object('count', (select n from t), 'scope', 'total') end
$$;

create or replace function public.get_home()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare p public.profiles; t public.teams; res jsonb;
begin
  p := public._me();
  select * into t from public.teams where id = p.team_id;
  select jsonb_build_object(
    'profile', to_jsonb(p),
    'team', case when t.id is null then null else jsonb_build_object(
        'id', t.id, 'name', t.name, 'code', t.code,
        'breaks', (select count(*) from public.events e join public.profiles m on m.id = e.user_id
                   where e.type='break_completed' and m.team_id = t.id),
        'members', (select coalesce(jsonb_agg(jsonb_build_object(
                        'nickname', m.nickname, 'me', m.id = p.id,
                        'week', (select count(*) from public.events e where e.user_id = m.id
                                 and e.type='break_completed' and e.created_at >= public._week_start()))
                      order by m.created_at), '[]'::jsonb)
                    from public.profiles m where m.team_id = t.id),
        'recent', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
                     select jsonb_build_object('nickname', m.nickname, 'at', e.created_at) x
                     from public.events e join public.profiles m on m.id = e.user_id
                     where e.type='break_completed' and m.team_id = t.id and m.id <> p.id
                     order by e.created_at desc limit 5) r)
      ) end,
    'my_breaks', (select count(*) from public.events where user_id = p.id and type='break_completed'),
    'today', (select count(*) from public.events where user_id = p.id and type='break_completed'
              and public._lisbon_day(created_at) = public._lisbon_day(now())),
    'streak', public._streak(p.id)
  ) into res;
  return res;
end $$;

create or replace function public.get_league()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare my_team uuid;
begin
  select team_id into my_team from public.profiles where id = auth.uid();
  return (
    select coalesce(jsonb_agg(r order by (r->>'km_per_member')::numeric desc, r->>'name'), '[]'::jsonb) from (
      select jsonb_build_object(
        'name', t.name,
        'members', count(distinct m.id),
        'breaks', count(e.id),
        'km_per_member', round(count(e.id) * 0.1 / greatest(count(distinct m.id),1), 2),
        'mine', t.id = my_team
      ) r
      from public.teams t
      join public.profiles m on m.team_id = t.id and not m.excluded
      left join public.events e on e.user_id = m.id and e.type = 'break_completed'
                               and e.created_at >= public._week_start()
      group by t.id, t.name
    ) q
  );
end $$;

create or replace function public.delete_my_data()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'sem sessão'; end if;
  delete from auth.users where id = auth.uid();   -- apaga perfil e eventos em cascata
end $$;

-- ---------------------------------------------------------------------
-- Estatísticas públicas (página /#/dados) — só agregados, sem IDs
-- ---------------------------------------------------------------------
create or replace function public.get_public_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  with done as (
    select e.* from public.events e join public.profiles p on p.id = e.user_id
    where e.type = 'break_completed' and not p.excluded
  ),
  weeks as (
    select (date_trunc('week', created_at at time zone 'Europe/Lisbon'))::date wk,
           count(*) behaviours, count(distinct user_id) active_users
    from done group by 1
  ),
  firsts as (
    select user_id, (date_trunc('week', min(created_at) at time zone 'Europe/Lisbon'))::date wk
    from done group by 1
  ),
  ab as (
    select p.variant,
      count(distinct p.id) filter (where exists (select 1 from done d where d.user_id = p.id)) users,
      (select count(*) from public.events e where e.user_id in (select id from public.profiles x where x.variant = p.variant and not x.excluded) and e.type='prompt_shown') prompts,
      (select count(*) from done d where d.variant = p.variant) completions
    from public.profiles p where not p.excluded group by p.variant
  )
  select jsonb_build_object(
    'generated_at', now(),
    'users', (select count(distinct user_id) from done),
    'behaviours', (select count(*) from done),
    'signups', (select count(*) from public.profiles where not excluded and onboarded),
    'weeks', (select coalesce(jsonb_agg(jsonb_build_object(
                'week', w.wk, 'behaviours', w.behaviours, 'active_users', w.active_users,
                'new_users', (select count(*) from firsts f where f.wk = w.wk),
                'cumulative_users', (select count(*) from firsts f where f.wk <= w.wk),
                'cumulative_behaviours', (select count(*) from done d where (date_trunc('week', d.created_at at time zone 'Europe/Lisbon'))::date <= w.wk)
              ) order by w.wk), '[]'::jsonb) from weeks w),
    'ab', (select coalesce(jsonb_agg(jsonb_build_object('variant', variant, 'users', users,
              'prompts', prompts, 'completions', completions,
              'conversion', case when prompts > 0 then round(completions::numeric / prompts, 3) end)
              order by variant), '[]'::jsonb) from ab)
  )
$$;

-- ---------------------------------------------------------------------
-- Vistas para o docente / exportação (acesso só por SQL, nunca pela app)
-- ---------------------------------------------------------------------
create or replace view public.league_table_numbers with (security_invoker = true) as
  select
    count(distinct e.user_id) as users,
    count(*)                  as behaviours,
    max(e.created_at)         as last_behaviour_at
  from public.events e join public.profiles p on p.id = e.user_id
  where e.type = 'break_completed' and not p.excluded;

create or replace view public.events_export with (security_invoker = true) as
  select e.id, e.created_at, e.type, e.variant,
         substr(md5(e.user_id::text), 1, 10) as user_hash,
         substr(md5(coalesce(e.team_id::text,'')), 1, 8) as team_hash,
         p.excluded, e.data
  from public.events e join public.profiles p on p.id = e.user_id
  order by e.created_at;

revoke all on public.league_table_numbers, public.events_export from anon, authenticated;

-- ---------------------------------------------------------------------
-- Permissões das funções
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.ensure_profile(), public.complete_onboarding(boolean, boolean, int),
  public.update_settings(int, int, boolean), public.create_team(text), public.join_team(text),
  public.log_event(text, jsonb), public.start_break(text, text), public.complete_break(bigint, int),
  public.social_count(), public.get_home(), public.get_league(), public.delete_my_data()
to authenticated;
grant execute on function public.get_public_stats() to anon, authenticated;
revoke execute on function public._me(), public._log(text, jsonb), public._streak(uuid) from authenticated;
