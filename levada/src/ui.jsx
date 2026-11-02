import React from 'react';

const P = {
  foco: <><line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="15" y1="14" y2="11" /><circle cx="12" cy="14" r="8" /></>,
  levada: <><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" /><path d="M15 5.764v15" /><path d="M9 3.236v15" /></>,
  liga: <><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></>,
  perfil: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  voltar: <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
  chama: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  equipa: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  escudo: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  fechar: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  mao: <><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" /><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" /><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" /></>,
  partilhar: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></>,
  sino: <><path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /></>,
};

export function Icon({ name, size = 22, color = 'currentColor', stroke = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[name]}</svg>
  );
}

export function Button({ kind = 'primary', children, ...rest }) {
  return <button className={`btn btn-${kind}`} {...rest}>{children}</button>;
}

export function Chip({ selected, children, ...rest }) {
  return <button className={`chip${selected ? ' chip-on' : ''}`} aria-pressed={!!selected} {...rest}>{children}</button>;
}

export function Back({ onClick }) {
  return (
    <button className="back" onClick={onClick}><Icon name="voltar" size={22} /> Voltar</button>
  );
}

export function Progress({ value, dark }) {
  return (
    <div className={`bar${dark ? ' bar-dark' : ''}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function Ring({ size = 220, frac = 1, main, sub, dark }) {
  const r = size / 2 - 10, c = 2 * Math.PI * r;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? '#2E6A44' : '#E6EFE8'} strokeWidth="14" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? '#DCE6DD' : '#2E6A44'} strokeWidth="14"
          strokeLinecap="round" strokeDasharray={`${c * Math.max(0, Math.min(1, frac))} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray .9s linear' }} />
      </svg>
      <div className="ring-text">
        <div className={`ring-main${dark ? ' on-dark' : ''}`} style={{ fontSize: size > 240 ? 56 : 48 }}>{main}</div>
        <div className={`ring-sub${dark ? ' on-dark-muted' : ''}`}>{sub}</div>
      </div>
    </div>
  );
}

export function TabBar({ tab, go }) {
  const tabs = [['foco', 'Foco', 'home'], ['levada', 'Levada', 'levada'], ['liga', 'Liga', 'liga'], ['perfil', 'Perfil', 'perfil']];
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {tabs.map(([icon, label, route]) => (
        <button key={route} className={`tab${tab === route ? ' tab-on' : ''}`} onClick={() => go(route)}
          aria-current={tab === route ? 'page' : undefined}>
          <Icon name={icon} size={24} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

export function Toast({ text }) {
  if (!text) return null;
  return <div className="toast" role="status">{text}</div>;
}

export const fmt = (s) => {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const fmtLong = (s) => {
  s = Math.max(0, Math.ceil(s));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
export const km = (v) => v.toFixed(1).replace('.', ',');

// Ilustrações dos movimentos
const FIG = {
  shoulders: <><circle cx="171" cy="58" r="20" fill="#2E6A44" /><path d="M171 80 V160 M171 160 L148 220 M171 160 L194 220" stroke="#17351F" strokeWidth="10" strokeLinecap="round" /><path d="M171 100 C 140 92, 122 110, 126 134 M171 100 C 202 92, 220 110, 216 134" stroke="#17351F" strokeWidth="10" strokeLinecap="round" fill="none" /><path d="M110 92 a 26 26 0 1 1 10 -30 M232 92 a 26 26 0 1 0 -10 -30" stroke="#1F5F86" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 8" fill="none" /></>,
  reach: <><circle cx="171" cy="80" r="20" fill="#2E6A44" /><path d="M171 102 V170 M171 170 L152 222 M171 170 L190 222 M158 112 L126 38 M184 112 L216 38" stroke="#17351F" strokeWidth="10" strokeLinecap="round" /><path d="M250 74 V44 M242 52 L250 44 L258 52 M92 74 V44 M84 52 L92 44 L100 52" stroke="#1F5F86" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  march: <><circle cx="171" cy="50" r="20" fill="#2E6A44" /><path d="M171 72 V150 M171 150 L150 218 M171 150 L206 170 L200 214 M171 92 L140 130 M171 92 L204 126" stroke="#17351F" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M232 170 V140 M224 148 L232 140 L240 148" stroke="#1F5F86" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  calves: <><rect x="40" y="96" width="262" height="12" rx="6" fill="#B9C7BC" /><circle cx="171" cy="40" r="20" fill="#2E6A44" /><path d="M171 62 V140 M171 140 L160 200 M171 140 L182 200 M171 84 L120 104 M171 84 L222 104" stroke="#17351F" strokeWidth="10" strokeLinecap="round" /><path d="M146 214 L196 214" stroke="#17351F" strokeWidth="8" strokeLinecap="round" /><path d="M210 180 V150 M202 158 L210 150 L218 158" stroke="#1F5F86" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  chest: <><circle cx="171" cy="56" r="20" fill="#2E6A44" /><path d="M171 78 V156 M171 156 L150 220 M171 156 L192 220 M171 96 L136 130 L171 150 M171 96 L206 130 L171 150" stroke="#17351F" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M110 104 H86 M94 96 L86 104 L94 112 M232 104 H256 M248 96 L256 104 L248 112" stroke="#1F5F86" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>,
  neck: <><circle cx="186" cy="62" r="20" fill="#2E6A44" /><path d="M171 92 V164 M171 164 L150 222 M171 164 L192 222 M171 104 L142 150 M171 104 L200 150" stroke="#17351F" strokeWidth="10" strokeLinecap="round" fill="none" /><path d="M140 40 a 40 40 0 0 1 70 -6" stroke="#1F5F86" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 8" fill="none" /></>,
};
export function MoveArt({ art }) {
  return (
    <svg className="art" viewBox="0 0 342 230" role="img" aria-label="Ilustração do movimento">
      <rect width="342" height="230" rx="24" fill="#E6EFE8" />{FIG[art]}
    </svg>
  );
}

export function Landscape() {
  return (
    <svg className="art" viewBox="0 0 342 230" role="img" aria-label="Montanhas e uma levada">
      <rect width="342" height="230" rx="22" fill="#E6EFE8" />
      <path d="M0 150 L60 82 L112 120 L186 36 L252 108 L298 70 L342 108 V230 H0Z" fill="#2E6A44" fillOpacity="0.22" />
      <path d="M0 190 L48 140 L96 172 L150 118 L214 166 L270 130 L342 166 V230 H0Z" fill="#2E6A44" fillOpacity="0.35" />
      <path d="M-6 204 C 60 160, 104 222, 170 172 S 262 96, 348 82" stroke="#1F5F86" strokeWidth="12" strokeLinecap="round" strokeOpacity="0.35" fill="none" />
      <path d="M-6 204 C 60 160, 104 222, 170 172 S 262 96, 348 82" stroke="#17351F" strokeWidth="2.5" strokeDasharray="2 9" strokeLinecap="round" fill="none" />
      <circle cx="46" cy="180" r="8" fill="#17351F" /><circle cx="170" cy="172" r="8" fill="#17351F" />
      <circle cx="300" cy="92" r="11" fill="#F4F2EB" stroke="#17351F" strokeWidth="3" />
    </svg>
  );
}
