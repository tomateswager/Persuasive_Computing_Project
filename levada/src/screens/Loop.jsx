import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { AUTOSTART_SECONDS, BREAK_SECONDS, MOVE_SECONDS } from '../config.js';
import { ROUTINES, teamProgress, LEVADA } from '../data.js';
import { askNotifications, chime, keepAwake, notify, timerStore, unlockAudio } from '../system.js';
import { Button, Chip, Icon, MoveArt, Progress, Ring, TabBar, fmt, fmtLong, km } from '../ui.jsx';

function useNow(ms = 500) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

// ------------------------------------------------------------------ S06 Foco
export function Home({ go, data, refresh, profile, say }) {
  const [minutes, setMinutes] = useState(profile?.block_minutes || 45);
  useEffect(() => { refresh().catch(() => {}); }, []); // eslint-disable-line
  if (!data) return null;
  const team = data.team;
  const prog = teamProgress(team ? team.breaks : data.my_breaks);
  const met = data.today >= profile.pledge;

  async function setBlock(m) {
    setMinutes(m);
    api.updateSettings({ block: m }).then(refresh).catch(() => say('Não foi possível guardar.'));
  }
  async function start() {
    unlockAudio();
    const perm = await askNotifications();
    if (perm === 'granted') api.log('notifications_enabled');
    timerStore.set({ endsAt: Date.now() + minutes * 60000, minutes });
    api.log('session_started', { minutes });
    go('session');
  }

  return (
    <div className="with-tabs">
      <main className="screen pad">
        <div className="row between">
          <h1 className="title">Olá, {profile.nickname}</h1>
          {profile.streak_enabled && data.streak > 0 && (
            <span className="pill pill-amber"><Icon name="chama" size={18} /> {data.streak} {data.streak === 1 ? 'dia' : 'dias'}</span>
          )}
        </div>
        <p className="row gap-xs small muted medium">
          {met && <Icon name="check" size={18} color="var(--green)" />}
          Hoje: {data.today} {data.today === 1 ? 'pausa' : 'pausas'} · {met ? 'meta cumprida' : `meta: ${profile.pledge}`}
        </p>
        <section className="card stack center-x">
          <Ring size={212} frac={1} main={fmtLong(minutes * 60)} sub="Bloco de foco" />
          <div className="row gap-s center-x" role="radiogroup" aria-label="Duração do bloco">
            {[25, 45, 60].map((m) => <Chip key={m} selected={m === minutes} onClick={() => setBlock(m)}>{m} min</Chip>)}
          </div>
          <Button onClick={start}>Começar bloco</Button>
          <Button kind="text" onClick={() => { unlockAudio(); go('prompt', { source: 'manual' }); }}>Fazer uma pausa agora</Button>
        </section>
        <button className="card stack-s tap" onClick={() => go('levada')}>
          <div className="row between"><strong>{team ? team.name : 'Sem equipa'}</strong><span className="green small strong">{km(prog.km)} / {km(LEVADA.km)} km</span></div>
          <Progress value={prog.pct} />
          <span className="small muted left">
            {team ? `${LEVADA.name} · ${prog.next ? `faltam ${Math.round((prog.next.km - prog.km) * 1000)} m para ${prog.next.name}` : 'levada concluída!'}`
                  : 'Cria ou entra numa equipa para caminharem juntos.'}
          </span>
        </button>
      </main>
      <TabBar tab="home" go={go} />
    </div>
  );
}

// ------------------------------------------------------------------ S07 Sessão
export function Session({ go }) {
  const now = useNow(500);
  const [t, setT] = useState(() => timerStore.get() || { endsAt: Date.now() + 45 * 60000, minutes: 45 });
  const left = t.paused ? t.left : Math.max(0, (t.endsAt - now) / 1000);
  const total = t.minutes * 60;
  const ended = useRef(false);

  useEffect(() => { keepAwake(true); return () => { keepAwake(false); }; }, []);
  useEffect(() => {
    if (!t.paused && left <= 0 && !ended.current) {
      ended.current = true;
      timerStore.clear();
      api.log('session_ended', { completed: true, minutes: t.minutes });
      chime();
      if (document.hidden) notify('Hora da tua pausa de 2 minutos', 'Levanta-te, a Levada guia-te.');
      go('prompt', { source: 'timer' });
    }
  }, [left, t, go]);

  function togglePause() {
    const next = t.paused
      ? { minutes: t.minutes, endsAt: Date.now() + t.left * 1000 }
      : { minutes: t.minutes, paused: true, left };
    timerStore.set(next); setT(next);
  }
  function stop() {
    timerStore.clear();
    api.log('session_ended', { completed: false, minutes: t.minutes, left: Math.round(left) });
    go('home');
  }

  return (
    <main className="screen pad dark center-x">
      <p className="on-dark-muted strong">{t.paused ? 'Em pausa' : 'A focar'}</p>
      <div className="grow" />
      <Ring size={280} dark frac={left / total} main={fmtLong(left)} sub="restantes" />
      <p className="on-dark-muted center">Quando o tempo acabar, a Levada guia-te numa pausa de 2 minutos.</p>
      <div className="grow" />
      <Button kind="secondary" onClick={togglePause}>{t.paused ? 'Retomar bloco' : 'Pausar bloco'}</Button>
      <Button kind="text-light" onClick={stop}>Terminar bloco</Button>
    </main>
  );
}

// ------------------------------------------------------------------ S08 Prompt (A/B)
export function Prompt({ go, profile, params }) {
  const variant = profile?.variant || 'A';
  const [mode, setMode] = useState('normal');
  const [social, setSocial] = useState(null);
  const [startedAt] = useState(Date.now());
  const now = useNow(250);
  const left = AUTOSTART_SECONDS - (now - startedAt) / 1000;
  const done = useRef(false);

  useEffect(() => {
    api.log('prompt_shown', { source: params.source || 'timer' });
    if (variant === 'B') api.socialCount().then(setSocial).catch(() => {});
  }, []); // eslint-disable-line

  function begin(auto) {
    if (done.current) return; done.current = true;
    go('break', { mode, source: auto ? 'autostart' : 'tap', key: Date.now() });
  }
  function skip() {
    if (done.current) return; done.current = true;
    api.log('break_skipped', { source: params.source || 'timer' });
    go('home');
  }
  useEffect(() => { if (left <= 0) begin(true); }, [left]); // eslint-disable-line

  // Regra fixa (pré-registada): com menos de 10 pausas não mostramos o número, porque um valor baixo
  // pode ter o efeito contrário. Daí em diante, total desde o lançamento até haver >= 100 na semana.
  const socialText = social
    ? social.count < 10
      ? 'Estudantes como tu estão a começar a fazer pausas ativas na Levada.'
      : social.scope === 'week'
      ? `Estudantes como tu já fizeram ${social.count} pausas esta semana.`
      : `Estudantes como tu já fizeram ${social.count} ${social.count === 1 ? 'pausa' : 'pausas'} na Levada.`
    : null;

  return (
    <main className="screen dark sheet-screen">
      <div className="sheet-top center-x">
        <div className="clock on-dark">00:00</div>
        <p className="on-dark-muted medium">{params.source === 'manual' ? 'Pausa escolhida por ti' : 'Bloco concluído'}</p>
      </div>
      <section className="sheet stack">
        <span className="pill pill-green" aria-live="polite">Começa sozinha em {Math.max(0, Math.ceil(left))} s</span>
        <h1 className="title">Hora da tua pausa de 2 minutos.</h1>
        {variant === 'B' && socialText
          ? <p className="social row gap-s"><Icon name="equipa" color="var(--green)" /> <strong>{socialText}</strong></p>
          : variant === 'A' ? <p className="muted lead">Levanta-te e segue 4 movimentos simples. Eu guio-te.</p> : <p className="muted lead">&nbsp;</p>}
        <div className="row gap-s" role="radiogroup" aria-label="Tipo de pausa">
          <Chip selected={mode === 'normal'} onClick={() => setMode('normal')}>Modo normal</Chip>
          <Chip selected={mode === 'biblioteca'} onClick={() => setMode('biblioteca')}>Modo biblioteca</Chip>
        </div>
        <Button onClick={() => begin(false)}>Começar pausa</Button>
        <Button kind="secondary" onClick={skip}>Agora não</Button>
      </section>
    </main>
  );
}

// ------------------------------------------------------------------ S09 Pausa guiada
export function Break({ go, params, refresh, data }) {
  const mode = params.mode || 'normal';
  const moves = ROUTINES[mode];
  const [startId, setStartId] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [manual, setManual] = useState(0);
  const [status, setStatus] = useState({});     // index -> 'done' | 'skip'
  const [phase, setPhase] = useState('starting'); // starting | running | saving | incomplete | error
  const [err, setErr] = useState('');
  const now = useNow(250);
  const elapsed = startedAt ? (now - startedAt) / 1000 : 0;
  const left = BREAK_SECONDS - elapsed;
  const idx = Math.min(moves.length - 1, Math.max(manual, Math.floor(elapsed / MOVE_SECONDS)));
  const allAnswered = Object.keys(status).length >= moves.length;
  const confirmed = Object.values(status).filter((s) => s === 'done').length;
  const before = useRef(data?.team ? data.team.breaks : data?.my_breaks || 0);

  async function begin() {
    setPhase('starting'); setErr('');
    try {
      const id = await api.startBreak(mode, params.source || 'tap');
      setStartId(id); setStartedAt(Date.now()); setPhase('running');
    } catch (e) { setErr(e.message); setPhase('error'); }
  }
  useEffect(() => { begin(); keepAwake(true); return () => { keepAwake(false); }; }, []); // eslint-disable-line

  useEffect(() => {
    if (phase !== 'running' || left > 0) return;
    if (confirmed >= 3) {
      setPhase('saving');
      api.completeBreak(startId, confirmed)
        .then(async () => { chime(); await refresh().catch(() => {}); go('done', { before: before.current, mode }); })
        .catch((e) => { setErr(e.message); setPhase('error'); });
    } else {
      api.log('break_abandoned', { reason: 'moves', confirmed, start_id: startId });
      setPhase('incomplete');
    }
  }, [left, phase]); // eslint-disable-line

  function answer(kind) {
    if (status[idx]) return;
    setStatus((s) => ({ ...s, [idx]: kind }));
    api.log(kind === 'done' ? 'move_confirmed' : 'move_skipped', { move: idx + 1, start_id: startId });
    if (idx < moves.length - 1) setManual(idx + 1);
  }
  function close() {
    if (phase === 'running') api.log('break_abandoned', { reason: 'closed', confirmed, start_id: startId });
    go('home');
  }

  if (phase === 'incomplete' || phase === 'error') {
    return (
      <main className="screen pad">
        <h1 className="title">{phase === 'incomplete' ? 'Esta pausa não contou' : 'Algo correu mal'}</h1>
        <p className="muted lead">{phase === 'incomplete'
          ? `Confirmaste ${confirmed} de 4 movimentos. Para contar, confirma pelo menos 3 com “Feito”.`
          : err}</p>
        <div className="grow" />
        <Button onClick={() => go('break', { ...params, key: Date.now() })}>Tentar outra vez</Button>
        <Button kind="secondary" onClick={() => go('home')}>Voltar ao início</Button>
      </main>
    );
  }

  const m = moves[idx];
  const waiting = allAnswered && left > 0;
  return (
    <main className="screen pad">
      <div className="row gap-s">
        <button className="icon-btn" onClick={close} aria-label="Sair da pausa"><Icon name="fechar" size={24} /></button>
        <div className="segments" aria-hidden="true">
          {moves.map((_, i) => <span key={i} className={status[i] === 'done' ? 'seg seg-on' : status[i] === 'skip' ? 'seg seg-skip' : i === idx ? 'seg seg-now' : 'seg'} />)}
        </div>
        <span className="small strong muted">{idx + 1} de 4</span>
      </div>
      <div className="center-x">
        <div className="clock">{phase === 'starting' ? '2:00' : fmt(left)}</div>
        <span className="small muted">da pausa restantes</span>
      </div>
      {waiting ? (
        <>
          <div className="art done-art"><Icon name="check" size={64} color="var(--green)" stroke={2.5} /></div>
          <h1 className="title">Quase!</h1>
          <p className="muted lead">Mantém-te de pé e respira fundo até o tempo acabar. {confirmed >= 3 ? 'Esta pausa vai contar.' : 'Confirmaste menos de 3 movimentos, por isso esta pausa não vai contar.'}</p>
        </>
      ) : (
        <>
          <MoveArt art={m.art} />
          <h1 className="title">{m.name}</h1>
          <p className="muted lead">{m.text}</p>
          <p className="row gap-xs small blue medium"><Icon name="info" size={18} /> Se sentires dor, salta este movimento.</p>
        </>
      )}
      <div className="grow" />
      {!waiting && <>
        <Button onClick={() => answer('done')} disabled={phase !== 'running'}>{phase === 'starting' ? 'A começar…' : 'Feito'}</Button>
        <Button kind="text" onClick={() => answer('skip')} disabled={phase !== 'running'}>Saltar movimento</Button>
      </>}
      {phase === 'saving' && <p className="center muted">A guardar a pausa…</p>}
    </main>
  );
}

// ------------------------------------------------------------------ S10 Pausa concluída
export function Done({ go, data, params }) {
  const [feel, setFeel] = useState(null);
  const [hf, setHf] = useState(false);
  const team = data?.team;
  const after = team ? team.breaks : data?.my_breaks || 0;
  const p = teamProgress(after);
  const prev = teamProgress(params.before ?? after - 1);
  const newLandmark = useMemo(() => p.unlocked.find((l) => !prev.unlocked.some((x) => x.id === l.id)), [after]); // eslint-disable-line
  const mate = team?.recent?.[0];

  function check(v) { setFeel(v); api.log('checkin', { answer: v }); }
  function highfive() { setHf(true); api.log('highfive_sent'); }

  return (
    <main className="screen pad">
      <div className="ok-badge"><Icon name="check" size={30} color="#fff" stroke={3} /></div>
      <div className="big green">+100 m</div>
      <h1 className="title">Pausa concluída</h1>
      <p className="muted lead">
        {team ? `A equipa ${team.name} já percorreu ${km(p.totalKm)} km.` : `Já percorreste ${km(p.totalKm)} km.`}{' '}
        {p.next ? `Faltam ${Math.round((p.next.km - p.km) * 1000)} m para ${p.next.name}.` : 'Chegaram ao fim da levada!'}
      </p>
      <Progress value={p.pct} />
      {newLandmark && (
        <button className="card row gap-s tap highlight" onClick={() => go('landmark', { id: newLandmark.id })}>
          <Icon name="levada" color="var(--green)" /><span className="grow left"><strong>Novo marco desbloqueado</strong><br /><span className="small muted">{newLandmark.name}</span></span><Icon name="chevron" />
        </button>
      )}
      <p className="strong">Sentes-te melhor?</p>
      <div className="row gap-s">
        {['Sim', 'Igual', 'Não'].map((v) => <Chip key={v} selected={feel === v} onClick={() => check(v)}>{v}</Chip>)}
      </div>
      {team && (
        <button className="card row gap-s tap" onClick={highfive} disabled={hf}>
          <Icon name="mao" size={26} color="var(--green)" />
          <span className="grow left">
            <strong>{hf ? 'High-five enviado!' : 'Envia um high-five à equipa'}</strong><br />
            <span className="small muted">{mate ? `${mate.nickname} também fez uma pausa recentemente.` : 'Mostra à equipa que fizeste a tua parte.'}</span>
          </span>
        </button>
      )}
      <div className="grow" />
      <Button onClick={() => go('home')}>Voltar ao estudo</Button>
      <Button kind="text" onClick={() => go('levada')}>Ver a levada</Button>
    </main>
  );
}
