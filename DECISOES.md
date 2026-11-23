# Europa 3 Ligas ZC – decisões (23/11/2026)

Horários de Brasília. Etapa 1 publicada; o mata-mata europeu abaixo é o formato decidido pelo Robson em 23/11/2026.

## Formato esportivo (Robson, 23/11)

- **3 ligas nacionais** de 20 clubes: Premier League (Inglaterra), La Liga (Espanha), Serie A (Itália). Turno e returno, **38 rodadas**. No returno os mandos do primeiro turno se invertem; no total cada clube faz 19 jogos em casa e 19 fora.
- **Copa nacional** de cada país, só entre os 20 da liga (FA Cup, Copa del Rey, Coppa Italia):
  - Chaveamento para 20 times: **preliminar entre os 8 piores** (13º×20º, 14º×19º, 15º×18º, 16º×17º), depois oitavas com os 12 melhores e os 4 vencedores (1×vencedor 16/17, 2×15/18, 3×14/19, 4×13/20, 5×12, 6×11, 7×10, 8×9).
  - Na 1ª temporada o “melhor/pior” é o over (média dos 11 maiores). Da 2ª em diante, a tabela da liga da temporada anterior.
  - **Todas as fases em ida e volta**, inclusive a final. A ida é na casa do pior; a volta, na casa do melhor. Empate no agregado vai para os pênaltis (sem gol fora).
- **Champions League e Europa League**, 30 times cada:
  - Fase de liga no estilo atual: **8 jogos** por clube (4 em casa, 4 fora), sem repetir adversário, em 8 jornadas. O emparelhamento é um grafo circulante (diferenças 1, 3, 5 e 7) aplicado à lista dos 30, ordenada por over (1ª temporada) ou pela campanha que gerou a vaga (2ª em diante).
  - **Os 8 primeiros da fase de liga vão direto às oitavas.** Os classificados do **9º ao 24º jogam a repescagem** (ida e volta): 9º×24º, 10º×23º, 11º×22º, 12º×21º, 13º×20º, 14º×19º, 15º×18º e 16º×17º, com a ida na casa do pior. Os 6 últimos (25º–30º) são eliminados. Os 8 vencedores enfrentam o top 8 nas oitavas (1º×vencedor 16/17, 2º×15/18, …, 8º×9/24), também em ida e volta (ida na casa do pior). Depois quartas e semi (ida e volta, no chaveamento 1/8×4/5 e 2/7×3/6) e **final em jogo único** (campo neutro). Empate no agregado vai para os pênaltis (sem gol fora).
  - **1ª temporada**: os 10 de maior over de cada liga na Champions, os 10 de menor over na Europa League. Over = média dos 11 maiores do elenco FC27, com desempate na média dos 18 e no nome.
  - **Da 2ª temporada em diante**: top 10 da tabela da liga na Champions, o restante na Europa League. O campeão da Champions e o campeão da copa nacional de cada país têm **vaga garantida** na Champions seguinte. Se o campeão já está no top 10 da liga dele, nada muda. Se está fora, toma a vaga do 10º (e, se houver dois campeões fora do top 10 na mesma liga, saem o 10º e o 9º, nesta ordem, sem tirar quem já tiver vaga garantida). Quem perde a vaga vai à Europa League. Se o mesmo time ganha as duas, conta uma vaga só. Cada liga segue com 10 na Champions e 10 na Europa (30 e 30 no total). Critérios da tabela: pontos, vitórias, saldo, gols pró, nome.

## Verba inicial

Faixas do ZC 50 (500 / 400 / 300 / 200 / 100 / 50 / 0 milhões de euros), pelo **ranking de over entre os 60** (maior over, menor verba). As faixas originais eram para 40 clubes (5+5+10+5+5+5+5); aqui foram escaladas 1,5× para somar 60, com 7 ou 8 nas pontas:

| Rank (1 = maior over) | Verba |
|---|---|
| 1–7 | € 0 |
| 8–15 | € 50 mi |
| 16–22 | € 100 mi |
| 23–30 | € 200 mi |
| 31–45 | € 300 mi |
| 46–52 | € 400 mi |
| 53–60 | € 500 mi |

Lista completa em `config/europa.json` (rank e `budget` de cada clube). Ex.: Barcelona, Real Madrid, Arsenal, Manchester City, Liverpool, Inter e Atlético começam com € 0; Frosinone, Lecce, Málaga e outros do fim da lista, com € 500 mi.

Premiação por posição **em cada liga nacional** (provisória, no molde do ZC 50): 1º € 100 mi, 2º 50, 3º 30, 4º–8º 20, 9º–10º 10, 11º–20º 0. Por jogo, em qualquer competição: vitória € 1 mi, empate € 0,3 mi. Títulos de copa e europeias ainda **sem prêmio extra** nesta etapa.

## Clubes e base

Os 60 clubes são os da base FC27 de 15/10/2026, **sem** as migrações do Libertadores ZC 50 (jogadores não saem para o Leilão ZC nem para clubes CONMEBOL). Na tela, **Inter**, **Milan** e **Atalanta** no lugar de Lombardia FC, Milano FC e Bergamo Calcio. Escudos desta etapa são **placeholders** (sigla colorida); não foram inventados brasões oficiais.

Qualificação da 1ª temporada (over dos 11):

- **Champions**: Arsenal, Manchester City, Liverpool, Man Utd, Chelsea, Spurs, Aston Villa, Newcastle Utd, Nott'm Forest, Sunderland; FC Barcelona, Real Madrid, Atlético de Madrid, Athletic Bilbao, Villarreal CF, Real Betis, Real Sociedad, Rayo Vallecano, Celta, CA Osasuna; Inter, SSC Napoli, AS Roma, Milan, Juventus FC, Atalanta, Como 1907, SS Lazio, ACF Fiorentina, Bologna FC.
- **Europa League**: Crystal Palace, Brentford, Everton, AFC Bournemouth, Brighton, Leeds United, Fulham, Ipswich Town, Hull City, Coventry City; Valencia CF, Sevilla FC, RC Deportivo, RCD Espanyol, Getafe CF, D. Alavés, Levante UD, R. Racing Club, Elche CF, Málaga CF; Torino FC, Sassuolo, Udinese Calcio, Genoa CFC, Venezia FC, Parma Calcio, Cagliari Calcio, AC Monza, US Lecce, Frosinone Calcio.

O corte 10º/11º da Premier é apertado (Sunderland 80,1 × Crystal Palace 80,0), mas não empata. Roma e Napoli empatam no over dos 11; o desempate dos 18 deixa o Napoli à frente — os dois entram na Champions.

Não há acesso/rebaixamento com as segundas divisões nesta etapa.

## Calendário (65 jornadas, 2 por dia)

Sem data de início fixa: o admin escolhe o dia 0 no painel (`Começar nova temporada`, `Resetar` ou `Definir calendário`). O padrão gerado:

- Dia 0: leilão de pré-temporada 12:00–20:00; mercado 21:40 até o dia 4 às 23:59.
- Jornada 1 no dia 5, às 12:00. Duas jornadas por dia (12:00 e 19:00).
- Sequência: 8 blocos de (liga, liga, europeia) até a 16ª rodada das ligas e as 8 jornadas da fase de liga europeia; preliminar das copas em volta das rodadas 17–19; **janela do meio depois da jornada 29** (após a 19ª rodada das ligas): mercado 21:00 desse dia até 3 dias depois às 20:00, leilão no dia seguinte 12:00–20:00, jogos voltam 4 dias depois.
- Depois da janela: repescagem europeia (ida e volta) e oitavas europeias intercaladas com as ligas 20–23; oitavas/quartas/semis das copas intercaladas com ligas 24–31 e com as quartas/semis europeias; ligas 32–38; final da Champions/Europa League (jogo único); final das copas (ida e volta).
- **Janela do fim** no dia seguinte à última jornada (leilão 12:00–21:00, mercado até o outro dia 21:00).

Com início em 01/07/2027 (exemplo): jornada 1 em 06/07, janela do meio 20–23/07, última jornada em 10/08, janela final 11–12/08. Cerca de 43 dias no total. Agenda automática começa **pausada**.

Os três leilões (pré, meio, fim) não têm lista fixa: o admin monta os lotes na busca FC27. Sem lotes, o leilão é pulado e o mercado abre. Continua valendo: lances visíveis, no máximo 1 por clube, os 5 maiores overs (entre os 60) não dão lance no de pré.

## Transferências e contas

Transferências entre qualquer uma das 3 ligas (os 60 clubes estão no mesmo mercado). Jogadores de fora das 3 ligas só entram se o admin os colocar no leilão. Contas: apelido + PIN. Admins padrão: Robshow e Duque (`admins.js`), mais `ADMIN_APELIDOS`. Clubes são atribuídos na Central da liga.

## O que ficou de fora / pendências

- Escudos oficiais (hoje só placeholder com sigla).
- Prêmio em dinheiro para campeões de copa e das europeias.
- Acesso/rebaixamento e 2ª divisão.
- Ajuste fino da UI (seletor de competição nas abas Campeonato/Tabela ainda é básico).
- Listas fixas de leilão da 1ª temporada: não há; o admin escolhe na busca.
