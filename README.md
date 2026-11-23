# Europa 3 Ligas ZC

Modo carreira multiplayer com 3 ligas nacionais (Premier League, La Liga e Serie A), copa nacional de cada país, Champions League e Europa League. Contas por apelido + PIN, leilões, mercado (incluindo transferências entre ligas) e painel de temporada.

Cópia adaptada do Libertadores ZC 50. Elencos do FC27 limpo (`data/fc27.json.gz`, extraído do fctoolshub em 15/10/2026, 21.700 jogadores). Os nomes Inter, Milan e Atalanta substituem os nomes licenciados da EA na exibição. Decisões do Robson em `DECISOES.md`.

- **60 clubes** (`config/europa.json`): 20 por liga, elencos intactos da base (sem as migrações do ZC 50).
- **Ligas**: turno e returno, 38 rodadas.
- **Copas nacionais** (FA Cup, Copa del Rey, Coppa Italia): 20 times, preliminar entre os 8 piores e depois chave de 16, todas as fases em ida e volta.
- **Champions e Europa League**: 30 times cada, fase de liga com 8 jogos; top 8 direto nas oitavas, 9º–24º na repescagem (ida e volta), depois quartas, semi e final em jogo único. Na 1ª temporada a vaga é pelo over (média dos 11 maiores); da 2ª em diante, pelo top 10 da tabela da liga, com vaga garantida na Champions para o campeão da Champions e o da copa nacional de cada país (se estiver fora do top 10, toma a vaga do 10º da liga dele).
- **Verba inicial**: faixas do ZC 50 escaladas para 60 clubes, pelo ranking global de over (maior over, menor verba).
- **Agenda**: sem data de início fixa; o admin escolhe no painel. 65 jornadas, 2 por dia (12:00 e 19:00, horário de Brasília). Agenda automática começa pausada.
- Stack: Node 20 + Express, SQLite somente leitura e Postgres. Deploy previsto no `render.yaml` (ainda não publicado na etapa 1). Sem keep-awake.

Local: `./start-local.sh` (Node 20 em `~/.local/node-v20.18.3`, Postgres local na porta 55432, app em http://localhost:3040). Testes: `npm test`.
