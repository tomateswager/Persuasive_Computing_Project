import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { LEVADA, TECHNIQUES, teamProgress } from '../data.js';
import { askNotifications, timerStore } from '../system.js';
import { Back, Button, Chip, Icon, Landscape, Progress, TabBar, km } from '../ui.jsx';
import { TeamForm } from './Onboarding.jsx';

// ------------------------------------------------------------------ S11 Levada
export function Levada({ go, data, refresh, say }) {
  useEffect(() => { refresh().catch(() => {}); }, []); // eslint-disable-line
  if (!data) return null;
  const team = data.team;

  if (!team) {
    return (
      <div className="with-tabs">
        <main className="screen pad">
          <h1 className="title">A tua levada</h1>
          <p className="muted lead">Cria uma equipa ou entra numa para percorrerem juntos a {LEVADA.name}.</p>
          <TeamForm refresh={refresh} say={say} onDone={() => go('levada', { key: Date.now() })} />
        </main>
        <TabBar tab="levada" go={go} />
      </div>
    );
  }

  const p = teamProgress(team.breaks);
  const link = `${location.origin}/?c=${team.code}`;
  async function share() {
    const text = `Junta-te à minha equipa na Levada: pausas de 2 minutos enquanto estudamos. Código ${team.code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Levada', text, url: link });
      else { await navigator.clipboard.writeText(`${text} ${link}`); say('Convite copiado.'); }
    } catch { /* cancelado */ }
  }

  return (
    <div className="with-tabs">
      <main className="screen pad">
        <p className="small strong green">{team.name}{p.lap > 0 ? ` · volta ${p.lap + 1}` : ''}</p>
        <h1 className="title">{LEVADA.name}</h1>
        <p className="small muted medium">{km(p.km)} de {km(LEVADA.km)} km · {team.breaks} {team.breaks === 1 ? 'pausa' : 'pausas'} no total</p>
        <Progress value={p.pct} />
        <section className="card timeline">
          {LEVADA.landmarks.map((l, i) => {
            const done = p.unlocked.some((u) => u.id === l.id);
            const isNext = p.next?.id === l.id;
            const Tag = done ? 'button' : 'div';
            return (
              <Tag key={l.id} className={`tl-row${done ? ' tap' : ''}`} onClick={done ? () => go('landmark', { id: l.id }) : undefined}>
                <span className="tl-line">
                  <span className={`tl-dot${done ? ' tl-done' : isNext ? ' tl-next' : ''}`}>{done && <Icon name="check" size={14} color="#fff" stroke={3} />}</span>
                  {i < LEVADA.landmarks.length - 1 && <span className={`tl-bar${done ? ' tl-bar-done' : ''}`} />}
                </span>
                <span className="tl-text">
                  <strong className={done || isNext ? '' : 'muted'}>{l.name}</strong>
                  <span className={`small ${isNext ? 'green strong' : 'muted'}`}>
                    {km(l.km)} km{done && l.km > 0 ? ' · desbloqueado' : ''}{isNext ? ` · faltam ${Math.round((l.km - p.km) * 1000)} m` : ''}
                  </span>
                </span>
              </Tag>
            );
          })}
        </section>
        <section className="card stack-s">
          <p className="small strong muted">Esta semana</p>
          {team.members.map((m) => (
            <div key={m.nickname} className="row between"><span className="medium">{m.nickname}{m.me ? ' (tu)' : ''}</span><span className="muted">{m.week} {m.week === 1 ? 'pausa' : 'pausas'}</span></div>
          ))}
        </section>
        {team.members.length < 5 && (
          <section className="card stack-s">
            <div className="row between"><strong>Convida amigos</strong><span className="code">{team.code}</span></div>
            <p className="small muted">Equipas até 5 pessoas. De preferência, de fora da turma de Persuasive Computing.</p>
            <Button kind="secondary" onClick={share}><Icon name="partilhar" size={18} /> Partilhar convite</Button>
          </section>
        )}
      </main>
      <TabBar tab="levada" go={go} />
    </div>
  );
}

// ------------------------------------------------------------------ S12 Marco
export function Landmark({ go, params }) {
  const l = LEVADA.landmarks.find((x) => x.id === params.id) || LEVADA.landmarks[0];
  useEffect(() => { api.log('landmark_viewed', { id: l.id }); }, []); // eslint-disable-line
  return (
    <main className="screen dark pad center-y">
      <section className="sheet-card stack">
        <Landscape />
        <span className="pill pill-green">Marco desbloqueado · {km(l.km)} km</span>
        <h1 className="title">{l.name}</h1>
        <p className="muted">{l.fact}</p>
        <Button onClick={() => go('levada')}>Continuar</Button>
      </section>
    </main>
  );
}

// ------------------------------------------------------------------ S13 Liga
export function League({ go }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.league().then(setRows).catch((e) => setErr(e.message)); }, []);
  return (
    <div className="with-tabs">
      <main className="screen pad">
        <h1 className="title">Liga semanal</h1>
        <p className="small muted medium">Recomeça todas as segundas-feiras</p>
        {err && <p className="error">{err}</p>}
        {rows && rows.length === 0 && <p className="muted">Ainda não há equipas na liga esta semana. Sê o primeiro!</p>}
        {rows && rows.length > 0 && (
          <section className="card list">
            {rows.map((r, i) => (
              <div key={r.name + i} className={`list-row${r.mine ? ' mine' : ''}`}>
                <span className={`pos${r.mine ? ' green' : ''}`}>{i + 1}</span>
                <span className="grow"><strong>{r.name}{r.mine ? ' (a tua)' : ''}</strong><br /><span className="small muted">{r.members} {r.members === 1 ? 'membro' : 'membros'}</span></span>
                <span className="right"><strong className={r.mine ? 'green' : ''}>{km(Number(r.km_per_member))} km</strong><br /><span className="tiny muted">por membro</span></span>
              </div>
            ))}
          </section>
        )}
        {!rows && !err && <p className="muted">A carregar…</p>}
        <p className="small muted">Ordenado por km médios por membro, para equipas pequenas poderem ganhar. Não há ranking individual.</p>
      </main>
      <TabBar tab="liga" go={go} />
    </div>
  );
}

// ------------------------------------------------------------------ S14 Perfil
export function Profile({ go, data, refresh, profile, say }) {
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  if (!data) return null;
  async function set(patch) {
    try { await api.updateSettings(patch); await refresh(); } catch (e) { say(e.message); }
  }
  async function enableNotif() {
    const r = await askNotifications(); setPerm(r);
    if (r === 'granted') { api.log('notifications_enabled'); say('Notificações ligadas.'); }
    else if (r === 'denied') say('Notificações bloqueadas nas definições do browser.');
  }
  return (
    <div className="with-tabs">
      <main className="screen pad">
        <div className="row gap">
          <span className="avatar">{profile.nickname[0]}</span>
          <div><h1 className="title">{profile.nickname}</h1><p className="small muted">{data.team ? data.team.name : 'Sem equipa'} · alcunha gerada, sem nome</p></div>
        </div>
        <div className="stats">
          <div className="card"><b className="green">{data.my_breaks}</b><span className="small muted">pausas</span></div>
          <div className="card"><b className="green">{profile.streak_enabled ? data.streak : '–'}</b><span className="small muted">{profile.streak_enabled && data.streak === 1 ? 'dia seguido' : 'dias seguidos'}</span></div>
          <div className="card"><b className="green">{data.my_breaks * 2}</b><span className="small muted">min a mexer</span></div>
        </div>
        <p className="small strong muted">Definições</p>
        <section className="card stack-s">
          <span className="medium">Duração do bloco</span>
          <div className="row gap-s">{[25, 45, 60].map((m) => <Chip key={m} selected={profile.block_minutes === m} onClick={() => set({ block: m })}>{m} min</Chip>)}</div>
          <span className="medium">Meta (pausas por dia de estudo)</span>
          <div className="row gap-s">{[1, 2, 3].map((n) => <Chip key={n} selected={profile.pledge === n} onClick={() => set({ pledge: n })}>{n}</Chip>)}</div>
          <label className="row between switch-row">
            <span className="medium">Sequência de dias (streak)</span>
            <input type="checkbox" className="switch" checked={profile.streak_enabled} onChange={(e) => set({ streak: e.target.checked })} />
          </label>
          <div className="row between">
            <span className="medium">Notificações</span>
            {perm === 'granted' ? <span className="muted">Ligadas</span>
              : perm === 'unsupported' ? <span className="muted small">Instala a app no ecrã inicial</span>
              : <button className="link" onClick={enableNotif}>{perm === 'denied' ? 'Bloqueadas' : 'Ligar'}</button>}
          </div>
        </section>
        <section className="card list">
          <button className="list-row tap" onClick={() => go('transparency')}><span className="grow left">Como te tentamos convencer</span><Icon name="chevron" color="var(--muted)" /></button>
          <a className="list-row tap" href="/#/dados" target="_blank" rel="noreferrer"><span className="grow left">Dados públicos do projeto</span><Icon name="chevron" color="var(--muted)" /></a>
          <button className="list-row tap" onClick={() => go('delete')}><span className="grow left red">Apagar os meus dados</span><Icon name="chevron" color="var(--muted)" /></button>
        </section>
        <p className="tiny muted">Projeto de Persuasive Computing, Universidade da Madeira, 2026. Regista apenas um ID anónimo, a tua equipa e quando começas e acabas pausas.</p>
      </main>
      <TabBar tab="perfil" go={go} />
    </div>
  );
}

// ------------------------------------------------------------------ S15 Transparência
export function Transparency({ go }) {
  useEffect(() => { api.log('transparency_viewed'); }, []);
  return (
    <main className="screen pad">
      <Back onClick={() => go('perfil')} />
      <h1 className="title">Como te tentamos convencer</h1>
      <p className="muted">A Levada usa técnicas de persuasão. Explicamo-las aqui porque achamos que deves saber.</p>
      {TECHNIQUES.map(([h, d]) => (
        <section key={h} className="card stack-xs"><strong>{h}</strong><p className="small muted">{d}</p></section>
      ))}
      <section className="card stack-xs"><strong>O que nunca fazemos</strong><p className="small muted">Inventar números, culpar-te, criar urgência falsa, esconder a saída, falar de peso ou calorias, ou vender dados.</p></section>
    </main>
  );
}

// ------------------------------------------------------------------ S16 Apagar
export function DeleteData({ go, say }) {
  const [busy, setBusy] = useState(false);
  async function del() {
    setBusy(true);
    try {
      await api.deleteMyData();
      timerStore.clear();
      try { localStorage.clear(); } catch { /* */ }
      say('Os teus dados foram apagados.');
      location.replace('/');
    } catch (e) { say(e.message); setBusy(false); }
  }
  return (
    <main className="screen dark sheet-screen">
      <div className="grow" />
      <section className="sheet stack">
        <h1 className="title">Apagar todos os teus dados?</h1>
        <p className="muted">Apagamos o teu ID anónimo e as tuas pausas, e a tua equipa deixa de te contar. Isto não dá para desfazer.</p>
        <Button kind="danger" onClick={del} disabled={busy}>{busy ? 'A apagar…' : 'Apagar os meus dados'}</Button>
        <Button kind="secondary" onClick={() => go('perfil')} disabled={busy}>Cancelar</Button>
      </section>
    </main>
  );
}
