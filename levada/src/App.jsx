import React, { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { timerStore, readInviteCode } from './system.js';
import { Toast, Button } from './ui.jsx';
import { Welcome, How, Privacy, Pledge, TeamSetup } from './screens/Onboarding.jsx';
import { Home, Session, Prompt, Break, Done } from './screens/Loop.jsx';
import { Levada, Landmark, League, Profile, Transparency, DeleteData } from './screens/Tabs.jsx';
import Dashboard from './screens/Dashboard.jsx';

export default function App() {
  const [route, setRoute] = useState('loading');
  const [params, setParams] = useState({});
  const [data, setData] = useState(null);       // get_home()
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [isDash, setIsDash] = useState(location.hash.startsWith('#/dados'));

  const go = useCallback((r, p = {}) => { setParams(p); setRoute(r); window.scrollTo(0, 0); }, []);
  const say = useCallback((t) => { setToast(t); setTimeout(() => setToast(''), 2600); }, []);

  const refresh = useCallback(async () => {
    const h = await api.home();
    setData(h);
    return h;
  }, []);

  const boot = useCallback(async () => {
    setError('');
    readInviteCode();
    try {
      const session = await api.session();
      if (!session) { go('welcome'); return; }
      await api.ensureProfile();
      const h = await refresh();
      if (!h.profile.onboarded) { go('privacy'); return; }
      const t = timerStore.get();
      if (t?.endsAt && !t.paused && t.endsAt <= Date.now()) { timerStore.clear(); go('prompt', { source: 'timer' }); return; }
      if (t?.endsAt || t?.paused) { go('session'); return; }
      go('home');
    } catch (e) {
      // Sessão de um utilizador que já não existe: limpa e recomeça
      if (/profiles_id_fkey|perfil inexistente|sem sessão/.test(e.message || '')) {
        await api.resetLocal(); go('welcome'); return;
      }
      setError(e.message || 'Erro a carregar.');
      setRoute('error');
    }
  }, [go, refresh]);

  useEffect(() => {
    const onHash = () => setIsDash(location.hash.startsWith('#/dados'));
    window.addEventListener('hashchange', onHash);
    if (!isDash) boot();
    return () => window.removeEventListener('hashchange', onHash);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!isDash && route === 'loading') boot(); }, [isDash]); // eslint-disable-line

  if (isDash) return <Dashboard />;

  const ctx = { go, data, refresh, say, params, profile: data?.profile };
  const screens = {
    welcome: Welcome, how: How, privacy: Privacy, pledge: Pledge, team: TeamSetup,
    home: Home, session: Session, prompt: Prompt, break: Break, done: Done,
    levada: Levada, landmark: Landmark, liga: League, perfil: Profile,
    transparency: Transparency, delete: DeleteData,
  };
  const Screen = screens[route];

  return (
    <div className="app">
      {route === 'loading' && <div className="center-screen"><div className="logo">LEVADA</div></div>}
      {route === 'error' && (
        <div className="screen pad center-screen">
          <div className="logo">LEVADA</div>
          <p className="muted center">{error}</p>
          <Button onClick={boot}>Tentar outra vez</Button>
        </div>
      )}
      {Screen && <Screen key={route + (params.key || '')} {...ctx} />}
      <Toast text={toast} />
    </div>
  );
}
