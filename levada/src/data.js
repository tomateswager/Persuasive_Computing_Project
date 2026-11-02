// Percurso inspirado na Levada do Caldeirão Verde (Santana, Madeira). Distâncias aproximadas.
export const LEVADA = {
  name: 'Levada do Caldeirão Verde',
  km: 6.5,
  landmarks: [
    { id: 'queimadas', km: 0, name: 'Queimadas (início)',
      fact: 'O percurso começa no Parque Florestal das Queimadas, em Santana, já dentro da floresta Laurissilva.' },
    { id: 'laurissilva', km: 1.2, name: 'Floresta Laurissilva',
      fact: 'A Laurissilva da Madeira é Património Mundial da UNESCO desde 1999. É uma das maiores manchas de floresta de louro que restam no mundo.' },
    { id: 'levadas', km: 2.5, name: 'O canal da levada',
      fact: 'As levadas são canais de rega construídos desde o século XV para levar a água do norte, mais húmido, para os campos do sul da ilha.' },
    { id: 'miradouro', km: 3.5, name: 'Miradouro do vale',
      fact: 'Til, loureiro e vinhático são algumas das árvores que formam a Laurissilva. Muitas das plantas que vês aqui só existem na Macaronésia.' },
    { id: 'tuneis', km: 5.0, name: 'Os túneis',
      fact: 'Nesta levada há túneis escavados na rocha. Quem a percorre a pé leva sempre uma lanterna.' },
    { id: 'caldeirao', km: 6.5, name: 'Caldeirão Verde (fim)',
      fact: 'O Caldeirão Verde é uma cascata com cerca de 100 metros que cai numa lagoa rodeada de paredes cobertas de verde.' },
  ],
};

export function teamProgress(breaks) {
  const totalKm = (breaks * 100) / 1000;
  const lap = Math.floor(totalKm / LEVADA.km);
  const km = +(totalKm - lap * LEVADA.km).toFixed(1);
  const next = LEVADA.landmarks.find((l) => l.km > km) || null;
  const unlocked = LEVADA.landmarks.filter((l) => l.km <= km || lap > 0);
  return { totalKm: +totalKm.toFixed(1), km, lap, next, unlocked, pct: km / LEVADA.km };
}

export const ROUTINES = {
  normal: [
    { name: 'Roda os ombros', text: 'De pé, faz 10 rotações para trás, devagar. Respira fundo a cada volta.', art: 'shoulders' },
    { name: 'Estica-te para cima', text: 'Junta as mãos acima da cabeça e estica-te o mais que conseguires. Mantém 3 respirações.', art: 'reach' },
    { name: 'Marcha no lugar', text: 'Levanta os joelhos alternadamente, a um ritmo confortável, até o tempo acabar.', art: 'march' },
    { name: 'Elevações de gémeos', text: 'Apoia as mãos na mesa e sobe na ponta dos pés 15 vezes, devagar.', art: 'calves' },
  ],
  biblioteca: [
    { name: 'Roda os ombros', text: 'De pé, faz 10 rotações para trás, devagar e sem barulho.', art: 'shoulders' },
    { name: 'Abre o peito', text: 'Entrelaça as mãos atrás das costas e afasta os ombros. Mantém 3 respirações.', art: 'chest' },
    { name: 'Inclina a cabeça', text: 'Inclina a cabeça para cada lado, devagar, 5 segundos de cada vez.', art: 'neck' },
    { name: 'Elevações de gémeos', text: 'Apoia as mãos na mesa e sobe na ponta dos pés 15 vezes. Ninguém dá por nada.', art: 'calves' },
  ],
};

export const TECHNIQUES = [
  ['A pausa começa sozinha', 'Efeito default: é mais fácil seguir o que já está escolhido. “Agora não” está sempre ao lado, com o mesmo destaque.'],
  ['Mostramos quantas pausas se fizeram', 'Prova social. Os números são sempre reais, calculados ao vivo na base de dados. Metade das pessoas vê este número e a outra metade não: é o nosso teste A/B.'],
  ['Contamos dias seguidos', 'Aversão à perda. Tens um dia livre por semana e podes desligar a sequência no Perfil.'],
  ['Pedimos uma meta pequena', 'Compromisso e coerência. Podes mudar a meta quando quiseres.'],
  ['Equipas e levada', 'Unidade e progresso coletivo. Não há ranking individual, só entre equipas.'],
  ['Recompensa logo a seguir', 'Os benefícios para a saúde são distantes; o avanço na levada é imediato.'],
];
