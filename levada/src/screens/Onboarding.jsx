import React, { useState } from 'react';
import { api } from '../api.js';
import { Back, Button, Chip, Icon, Landscape } from '../ui.jsx';

const draft = { adult: false, pc: null, pledge: 1, joinFirst: false };

function Dots({ n }) {
  return (
    <div className="dots" aria-label={`Passo ${n} de 3`}>
      {[1, 2, 3].map((i) => <span key={i} className={i === n ? 'dot dot-on' : i < n ? 'dot dot-done' : 'dot'} />)}
    </div>
  );
}

export function Welcome({ go }) {
  return (
    <main className="screen pad">
      <div className="logo">LEVADA</div>
      <Landscape />
      <h1 className="display">Estuda melhor.<br />Mexe-te 2 minutos.</h1>
      <p className="muted lead">A Levada é o teu temporizador de estudo. Cada pausa ativa faz a tua equipa avançar 100 m numa levada da Madeira.</p>
      <div className="grow" />
      <Button onClick={() => { draft.joinFirst = false; go('how'); }}>Começar</Button>
      <Button kind="text" onClick={() => { draft.joinFirst = true; go('privacy'); }}>Já tenho um código de equipa</Button>
    </main>
  );
}

export function How({ go }) {
  const steps = [
    ['Estuda em blocos de 45 min', 'O temporizador marca o ritmo. Tu só estudas.'],
    ['No fim do bloco, mexe-te 2 min', 'A Levada guia-te passo a passo. Sem equipamento, até na biblioteca.'],
    ['A tua equipa avança 100 m', 'Cada pausa leva a equipa mais longe numa levada real da Madeira.'],
  ];
  return (
    <main className="screen pad">
      <Back onClick={() => go('welcome')} />
      <Dots n={1} />
      <h1 className="title">Como funciona</h1>
      <ol className="steps">
        {steps.map(([h, d], i) => (
          <li key={h}><span className="num">{i + 1}</span><div><strong>{h}</strong><p className="muted">{d}</p></div></li>
        ))}
      </ol>
      <div className="grow" />
      <Button onClick={() => go('privacy')}>Continuar</Button>
    </main>
  );
}

export function Privacy({ go, refresh, data }) {
  const [adult, setAdult] = useState(draft.adult);
  const [pc, setPc] = useState(draft.pc);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const signedIn = !!data?.profile;

  async function next() {
    setErr('');
    if (!adult) return setErr('Para usar a Levada tens de ter 18 anos ou mais.');
    if (pc === null) return setErr('Responde à pergunta sobre Persuasive Computing.');
    draft.adult = adult; draft.pc = pc;
    setBusy(true);
    try {
      if (!signedIn) { await api.signIn(); await api.ensureProfile(); await refresh(); }
      go('pledge');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <main className="screen pad">
      <Back onClick={() => go(draft.joinFirst ? 'welcome' : 'how')} />
      <Dots n={2} />
      <h1 className="title">Antes de começar</h1>
      <section className="card stack-s">
        <div className="row gap-s"><Icon name="escudo" color="var(--green)" /><strong>O que registamos</strong></div>
        <p className="muted">A Levada regista um ID anónimo, a tua equipa e quando começas e acabas pausas, só para medir se ajuda as pessoas a mexer-se mais, num projeto da Universidade da Madeira.</p>
        <p><strong className="medium">Sem nomes, emails nem localização. Podes apagar tudo no Perfil.</strong></p>
      </section>
      <label className="check">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        <span className="box" aria-hidden="true"><Icon name="check" size={16} color="#fff" stroke={3} /></span>
        Tenho 18 anos ou mais
      </label>
      <div className="stack-s">
        <p className="strong">Estás inscrito em Persuasive Computing?</p>
        <div className="row gap-s" role="radiogroup">
          <Chip selected={pc === true} onClick={() => setPc(true)}>Sim</Chip>
          <Chip selected={pc === false} onClick={() => setPc(false)}>Não</Chip>
        </div>
        <p className="small muted">Só perguntamos para não contar colegas da turma nos resultados. Podes usar a app na mesma.</p>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <div className="grow" />
      <Button onClick={next} disabled={busy}>{busy ? 'A preparar…' : 'Continuar'}</Button>
    </main>
  );
}

export function Pledge({ go, refresh }) {
  const [pledge, setPledge] = useState(draft.pledge);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function next() {
    setBusy(true); setErr('');
    try {
      draft.pledge = pledge;
      await api.completeOnboarding(true, !!draft.pc, pledge);
      const h = await refresh();
      go(h.team ? 'home' : 'team');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  return (
    <main className="screen pad">
      <Back onClick={() => go('privacy')} />
      <Dots n={3} />
      <h1 className="title">Qual é a tua meta esta semana?</h1>
      <p className="muted lead">Começa pequeno. Podes mudar quando quiseres.</p>
      <div className="stack-s" role="radiogroup">
        {[1, 2, 3].map((n) => (
          <button key={n} role="radio" aria-checked={pledge === n} className={`option${pledge === n ? ' option-on' : ''}`} onClick={() => setPledge(n)}>
            <span className="radio" aria-hidden="true" />
            <span className="grow">{n} {n === 1 ? 'pausa' : 'pausas'} por dia de estudo</span>
            {n === 1 && <span className="badge">Recomendado</span>}
          </button>
        ))}
      </div>
      <p className="row gap-s small muted"><Icon name="equipa" size={20} /> A tua equipa vai ver o teu compromisso.</p>
      {err && <p className="error" role="alert">{err}</p>}
      <div className="grow" />
      <Button onClick={next} disabled={busy}>{busy ? 'A guardar…' : 'Comprometo-me'}</Button>
    </main>
  );
}

export function TeamForm({ refresh, onDone, say }) {
  const invite = (() => { try { return localStorage.getItem('levada-invite') || ''; } catch { return ''; } })();
  const [name, setName] = useState('');
  const [code, setCode] = useState(invite);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  async function create() {
    if (name.trim().length < 2) return setErr('Dá um nome à equipa (2 letras ou mais).');
    setBusy('create'); setErr('');
    try { await api.createTeam(name.trim()); await refresh(); say?.('Equipa criada. Convida amigos com o código.'); onDone(); }
    catch (e) { setErr(e.message); } finally { setBusy(''); }
  }
  async function join() {
    if (!code.trim()) return setErr('Escreve o código de convite.');
    setBusy('join'); setErr('');
    try { await api.joinTeam(code.trim()); try { localStorage.removeItem('levada-invite'); } catch { /* */ } await refresh(); say?.('Entraste na equipa.'); onDone(); }
    catch (e) { setErr(e.message); } finally { setBusy(''); }
  }
  return (
    <>
      {invite && (
        <section className="card stack-s">
          <strong className="h3">Foste convidado</strong>
          <label className="field"><span>Código de convite</span><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></label>
          <Button onClick={join} disabled={!!busy}>{busy === 'join' ? 'A entrar…' : 'Entrar na equipa'}</Button>
        </section>
      )}
      <section className="card stack-s">
        <strong className="h3">Criar equipa</strong>
        <label className="field"><span>Nome da equipa</span><input value={name} maxLength={40} placeholder="Os Lagartixas" onChange={(e) => setName(e.target.value)} /></label>
        <Button kind={invite ? 'secondary' : 'primary'} onClick={create} disabled={!!busy}>{busy === 'create' ? 'A criar…' : 'Criar e convidar'}</Button>
      </section>
      {!invite && (
        <section className="card stack-s">
          <strong className="h3">Entrar com código</strong>
          <label className="field"><span>Código de convite</span><input value={code} placeholder="LEV-0000" onChange={(e) => setCode(e.target.value.toUpperCase())} /></label>
          <Button kind="secondary" onClick={join} disabled={!!busy}>{busy === 'join' ? 'A entrar…' : 'Entrar na equipa'}</Button>
        </section>
      )}
      {err && <p className="error" role="alert">{err}</p>}
    </>
  );
}

export function TeamSetup({ go, refresh, say }) {
  return (
    <main className="screen pad">
      <h1 className="title">A tua equipa</h1>
      <p className="muted lead">Equipas de 3 a 5 amigos. Convida pessoas de fora da turma.</p>
      <TeamForm refresh={refresh} say={say} onDone={() => go('home')} />
      <Button kind="text" onClick={() => go('home')}>Agora não, começar sozinho</Button>
    </main>
  );
}
