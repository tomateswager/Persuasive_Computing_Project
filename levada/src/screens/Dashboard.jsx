import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const d = (s) => new Date(s + 'T12:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });

export default function Dashboard() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  async function load() {
    setErr('');
    try { setS(await api.publicStats()); } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);

  return (
    <main className="dash">
      <header className="dash-head">
        <div>
          <div className="logo">LEVADA</div>
          <h1 className="title">Dados do projeto</h1>
          <p className="muted">Persuasive Computing · Universidade da Madeira. Dados ao vivo, registados automaticamente pelo servidor.</p>
        </div>
        <a className="link" href="/">Abrir a app</a>
      </header>
      {err && <p className="error">{err}</p>}
      {!s && !err && <p className="muted">A carregar…</p>}
      {s && (
        <>
          <section className="dash-kpis">
            <div className="card"><span className="small muted">Utilizadores (League Table)</span><b>{s.users}</b><span className="tiny muted">IDs anónimos com pelo menos 1 pausa concluída</span></div>
            <div className="card"><span className="small muted">Comportamentos (League Table)</span><b>{s.behaviours}</b><span className="tiny muted">Pausas ativas de 2 min concluídas e validadas</span></div>
            <div className="card"><span className="small muted">Registos</span><b>{s.signups}</b><span className="tiny muted">Pessoas que concluíram o onboarding</span></div>
          </section>

          <section className="card">
            <h2 className="h3">Por semana</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Semana de</th><th>Pausas</th><th>Utilizadores ativos</th><th>Novos utilizadores</th><th>Utilizadores (acum.)</th><th>Pausas (acum.)</th></tr></thead>
                <tbody>
                  {s.weeks.length === 0 && <tr><td colSpan={6} className="muted">Ainda sem dados.</td></tr>}
                  {[...s.weeks].reverse().map((w) => (
                    <tr key={w.week}><td>{d(w.week)}</td><td>{w.behaviours}</td><td>{w.active_users}</td><td>{w.new_users}</td><td>{w.cumulative_users}</td><td>{w.cumulative_behaviours}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card">
            <h2 className="h3">Experiência A/B · prova social no prompt da pausa</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Versão</th><th>Utilizadores</th><th>Prompts mostrados</th><th>Pausas concluídas</th><th>Conversão</th></tr></thead>
                <tbody>
                  {s.ab.length === 0 && <tr><td colSpan={5} className="muted">Ainda sem dados.</td></tr>}
                  {s.ab.map((r) => (
                    <tr key={r.variant}><td>{r.variant === 'A' ? 'A · controlo' : 'B · prova social'}</td><td>{r.users}</td><td>{r.prompts}</td><td>{r.completions}</td><td>{r.conversion == null ? '–' : `${Math.round(r.conversion * 100)} %`}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="tiny muted">Atribuição aleatória 50/50 por utilizador. A análise final (Mann-Whitney U por utilizador) é feita sobre a exportação completa.</p>
          </section>
          <p className="tiny muted">Excluídos: colegas inscritos em Persuasive Computing e contas de teste da equipa. Atualizado às {new Date(s.generated_at).toLocaleTimeString('pt-PT')}.</p>
        </>
      )}
    </main>
  );
}
