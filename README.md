# Europa 3 Ligas ZC

Modo carreira multiplayer com 3 ligas nacionais (Premier League, La Liga e Serie A), copa nacional de cada país, Champions League e Europa League. Contas por apelido + PIN, leilões, mercado (incluindo transferências entre ligas) e painel de temporada.

Cópia adaptada do Libertadores ZC 50. Elencos do FC27 limpo (`data/fc27.json.gz`, extraído do fctoolshub em 15/10/2026, 21.700 jogadores). Os nomes Inter, Milan e Atalanta substituem os nomes licenciados da EA na exibição. Decisões do Robson em `DECISOES.md`.

- **54 clubes** (`config/europa.json`): 18 por liga, elencos intactos da base (sem as migrações do ZC 50). Os 2 de menor over de cada liga saíram; os jogadores deles seguem no FC27 para o leilão.
- **Ligas**: turno e returno, 34 rodadas, sem rebaixamento.
- **Copas nacionais** (FA Cup, Copa del Rey, Coppa Italia): 18 times, preliminar entre os 4 piores (15×18, 16×17) e depois chave de 16 (top 14 + 2 vencedores), todas as fases em ida e volta.
- **Champions e Europa League**: 27 times cada, fase de liga com 8 jogos em 9 jornadas (12 jogos por jornada, 3 folgas); top 8 direto nas oitavas, 9º–24º na repescagem (ida e volta), 25º–27º eliminados, depois quartas, semi e final em jogo único. Na 1ª temporada a vaga é pelo over (média dos 18 maiores); da 2ª em diante, pelo top 9 da tabela da liga, com vaga garantida na Champions para o campeão da Champions e o da copa nacional de cada país (se estiver fora do top 9, toma a vaga do 9º da liga dele).
- **Verba inicial**: €37,5 mi por ponto de over abaixo do Real Madrid, múltiplo de €25 mi, teto €500 mi.
- **Agenda**: sem data de início fixa; o admin escolhe no painel. 62 jornadas, 2 por dia (12:00 e 19:00, horário de Brasília). Agenda automática começa pausada.
- Stack: Node 20 + Express, SQLite somente leitura e Postgres. Deploy previsto no `render.yaml` (ainda não publicado na etapa 1). Sem keep-awake.

Local: `./start-local.sh` (Node 20 em `~/.local/node-v20.18.3`, Postgres local na porta 55432, app em http://localhost:3040). Testes: `npm test`.
