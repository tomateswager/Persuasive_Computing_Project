# Levada

Temporizador de estudo com pausas ativas de 2 minutos. Cada pausa concluída faz a equipa avançar 100 m numa levada da Madeira.
Projeto de grupo de Persuasive Computing, Universidade da Madeira, 2026.

- **App:** React + Vite (PWA, instalável no telemóvel)
- **Dados:** Supabase (Postgres, autenticação anónima, RLS)
- **Alojamento:** Vercel

## Lançar (uma vez)

### 1. Base de dados (Supabase)
1. Supabase → **SQL Editor** → **New query** → cola o conteúdo de `supabase/schema.sql` → **Run**.
2. Supabase → **Authentication → Sign In / Providers** → liga **Allow anonymous sign-ins** → Save.
3. (Recomendado) **Authentication → Rate Limits**: sobe o limite de "anonymous sign-ins" por hora. O valor por defeito é baixo e, numa biblioteca, muitas pessoas partilham o mesmo IP.

### 2. Online (Vercel)
1. Vercel → **Add New → Project** → importa o repositório `levada` do GitHub.
2. Framework: **Vite** (deteta sozinho). Não é preciso mudar nada. **Deploy**.
3. O link (`https://levada-xxx.vercel.app`) é o que se partilha. O QR dos cartazes aponta para ele.

As chaves públicas do Supabase estão em `src/config.js`. Podem ser substituídas pelas variáveis
`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` na Vercel. **Nunca** pôr a secret key / service_role no código.

## Números para a League Table (todas as semanas)

Abre `https://<o-teu-link>/#/dados`. Mostra ao vivo:
- **Utilizadores** = IDs anónimos com ≥ 1 pausa concluída, excluindo colegas de Persuasive Computing e contas de teste;
- **Comportamentos** = pausas concluídas e validadas pelo servidor;
- tabela por semana e resultados do teste A/B.

Ou, no SQL Editor: `select * from league_table_numbers;`

## Regras de evidência (como a app as cumpre)

| Regra | Como |
| --- | --- |
| Só contam pessoas reais de fora da turma | Pergunta no onboarding; quem responde "Sim" fica `excluded = true` |
| Registo automático com hora | Tabela `events`; `created_at = now()` do servidor; os clientes não conseguem escrever diretamente (RLS) |
| Comportamento validado | `complete_break` só aceita pausas com ≥ 100 s, ≤ 15 min, ≥ 3 de 4 movimentos confirmados e uma só vez |
| Acesso do docente | Página `/#/dados` + vistas `league_table_numbers` e `events_export` (ver abaixo) |
| Privacidade | ID anónimo, alcunha gerada, sem nomes, emails nem localização; 18+; botão "Apagar os meus dados" |

### Marcar contas de teste da equipa
```sql
update profiles set excluded = true where nickname in ('Teira-27', 'Freira-3');
```

### Exportar dados (CSV) para a análise e o Demo Day
SQL Editor → `select * from events_export;` → **Export → CSV**. O `user_hash` é anónimo.

### Acesso só de leitura para o docente (opcional)
```sql
create role docente login password 'ESCOLHE-UMA-PASSWORD';
grant usage on schema public to docente;
grant select on public.league_table_numbers, public.events_export to docente;
grant select on public.events, public.profiles, public.teams to docente;
```
Dá ao docente o host e a porta em **Connect → Direct connection**, o utilizador `docente` e a password.

## Experiência A/B
- Atribuição aleatória 50/50 por utilizador, feita no servidor na primeira abertura (`profiles.variant`).
- **A:** "Hora da tua pausa de 2 minutos." · **B:** + "Estudantes como tu já fizeram N pausas esta semana."
- N é real. Regra fixa: mostra o total desde o lançamento até haver ≥ 100 pausas na semana corrente.
- Métrica: por utilizador, `break_completed / prompt_shown`.

## Desenvolvimento
```bash
npm install
npm run dev
```
