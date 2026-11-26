# Europa 3 Ligas ZC – decisões (26/11/2026)

Horários de Brasília. Etapa 1 publicada; o mata-mata europeu abaixo é o formato decidido pelo Robson em 23/11/2026.

## Formato esportivo (Robson, 23/11)

- **3 ligas nacionais** de **18 clubes**: Premier League (Inglaterra), La Liga (Espanha), Serie A (Itália). Turno e returno, **34 rodadas**. No returno os mandos do primeiro turno se invertem; no total cada clube faz 17 jogos em casa e 17 fora. Sem rebaixamento.
- **Copa nacional** de cada país, só entre os 18 da liga (FA Cup, Copa del Rey, Coppa Italia):
  - Chaveamento para 18 times: **preliminar entre os 4 piores** (15º×18º, 16º×17º), depois oitavas com os 14 melhores e os 2 vencedores (1×vencedor 16/17, 2×15/18, 3×14, 4×13, 5×12, 6×11, 7×10, 8×9).
  - Na 1ª temporada o “melhor/pior” é o over (média dos 18 maiores, desempate dos 11). Da 2ª em diante, a tabela da liga da temporada anterior.
  - **Todas as fases em ida e volta**, inclusive a final. A ida é na casa do pior; a volta, na casa do melhor. Empate no agregado vai para os pênaltis (sem gol fora).
- **Champions League e Europa League**, **27 times** cada:
  - Fase de liga: **8 jogos** por clube (4 em casa, 4 fora), sem repetir adversário, em **9 jornadas de 12 jogos** (27 é ímpar: 3 times folgam por jornada; cada time folga 1 vez). Total 108 jogos. O emparelhamento é determinístico (resíduos 0–8 × 3 camadas; na jornada r folgam r, r+9 e r+18; fatoração quase perfeita de K_9).
  - **Os 8 primeiros da fase de liga vão direto às oitavas.** Os classificados do **9º ao 24º jogam a repescagem** (ida e volta): 9º×24º, …, 16º×17º, com a ida na casa do pior. Os 3 últimos (**25º–27º**) são eliminados. Os 8 vencedores enfrentam o top 8 nas oitavas (1º×vencedor 16/17, …, 8º×9/24), também em ida e volta (ida na casa do pior). Depois quartas e semi (ida e volta, no chaveamento 1/8×4/5 e 2/7×3/6) e **final em jogo único** (campo neutro). Empate no agregado vai para os pênaltis (sem gol fora).
  - **1ª temporada**: os 9 de maior over de cada liga na Champions, os 9 de menor over na Europa League. Over = média dos 18 maiores do elenco FC27, com desempate na média dos 11 e no nome.
  - **Da 2ª temporada em diante**: top 9 da tabela da liga na Champions, o restante na Europa League. O campeão da Champions e o campeão da copa nacional de cada país têm **vaga garantida** na Champions seguinte. Se o campeão já está no top 9 da liga dele, nada muda. Se está fora, toma a vaga do 9º (e, se houver dois campeões fora do top 9 na mesma liga, saem o 9º e o 8º, nesta ordem, sem tirar quem já tiver vaga garantida). Quem perde a vaga vai à Europa League. Se o mesmo time ganha as duas, conta uma vaga só. Cada liga segue com 9 na Champions e 9 na Europa (27 e 27 no total). Critérios da tabela: pontos, vitórias, saldo, gols pró, nome.

## Verba inicial

Aprovada em 23/11/2026 (mesmo molde do Libertadores ZC 50, com o valor por ponto ajustado à faixa de over das 3 ligas):

- O **over do time** é a média dos **18 jogadores de maior over** do elenco inicial. O desempate (ranking) é pela média dos 11 maiores.
- O time de maior over (**Real Madrid, 85,17**) recebe **€ 0**.
- Cada ponto de over abaixo dele vale **€ 37,5 mi**.
- O valor é arredondado para múltiplos de **€ 25 mi**, com teto de **€ 500 mi**.
- Fórmula: `min(500, round(37,5 × (85,17 − over) / 25) × 25)` milhões. Total dos 54 clubes: **€ 14.750 mi**.

Lista completa em `config/europa.json` (rank, `ovr18` e `budget` de cada clube). Exemplos: Arsenal, Barcelona e Manchester City € 25 mi; Liverpool € 75 mi; Atlético e Inter € 100 mi; Chelsea € 150 mi; Milan € 200 mi; Valencia € 325 mi; Parma € 475 mi; Frosinone € 500 mi.

Premiação por posição **em cada liga nacional** (provisória, no molde do ZC 50): 1º € 100 mi, 2º 50, 3º 30, 4º–8º 20, 9º–10º 10, 11º–18º 0. Por jogo, em qualquer competição: vitória € 1 mi, empate € 0,3 mi. Títulos de copa e europeias ainda **sem prêmio extra** nesta etapa.

## Clubes e base

Os **54 clubes ativos** vêm da base FC27 de 15/10/2026 (18 por liga), **sem** as migrações do Libertadores ZC 50. Em 26/11/2026 saíram os 2 de menor over de cada liga (média dos 18, desempate dos 11): **Hull City** (74,50) e **Coventry City** (74,50) na Premier; **R. Racing Club** (72,78) e **Málaga CF** (72,00) na La Liga; e, na Serie A, o **US Lecce** (71,83). O Robson pediu para **manter o Frosinone Calcio** (72,06); no lugar dele saiu o próximo de menor over, o **AC Monza** (72,56). Os jogadores desses 6 clubes continuam no FC27 e podem entrar no leilão pelo admin, mas os clubes não disputam as ligas. Na tela, **Inter**, **Milan** e **Atalanta** no lugar de Lombardia FC, Milano FC e Bergamo Calcio. Escudos oficiais dos 54 (e dos 6 que saíram) estão no site.

Qualificação da 1ª temporada (over dos 18, desempate pelos 11). Corte 9º/10º: Premier League, Nott'm Forest (79,17) na Champions e Crystal Palace (78,89) na Europa League; La Liga, Rayo Vallecano (77,00) / CA Osasuna (76,61); Serie A, Bologna FC (76,00) / ACF Fiorentina (75,83).

- **Champions**: Arsenal, Manchester City, Liverpool, Man Utd, Chelsea, Spurs, Newcastle Utd, Aston Villa, Nott'm Forest; Real Madrid, FC Barcelona, Atlético de Madrid, Athletic Bilbao, Villarreal CF, Real Betis, Real Sociedad, Celta, Rayo Vallecano; Inter, SSC Napoli, Juventus FC, AS Roma, Milan, Atalanta, Como 1907, SS Lazio, Bologna FC.
- **Europa League**: Crystal Palace, Brentford, Sunderland, AFC Bournemouth, Brighton, Everton, Leeds United, Fulham, Ipswich Town; CA Osasuna, Valencia CF, RCD Espanyol, Sevilla FC, Getafe CF, RC Deportivo, D. Alavés, Levante UD, Elche CF; ACF Fiorentina, Torino FC, Sassuolo, Udinese Calcio, Venezia FC, Genoa CFC, Cagliari Calcio, Parma Calcio, Frosinone Calcio.

Não há acesso/rebaixamento com as segundas divisões nesta etapa.

## Calendário (62 jornadas, 2 por dia)

Sem data de início fixa: o admin escolhe o dia 0 no painel (`Começar nova temporada`, `Resetar` ou `Definir calendário`). O padrão gerado:

- Dia 0: leilão de pré-temporada 12:00–20:00; mercado 21:40 até o dia 4 às 23:59.
- Jornada 1 no dia 5, às 12:00. Duas jornadas por dia (12:00 e 19:00).
- Sequência: 8 blocos de (liga, liga, europeia) até a 16ª rodada das ligas e as 8 primeiras jornadas da fase de liga europeia; preliminar das copas em volta da 17ª rodada das ligas; 9ª jornada europeia em seguida; **janela do meio depois da jornada 28** (após a 17ª rodada das ligas e o fim da fase de liga europeia): mercado 21:00 desse dia até 3 dias depois às 20:00, leilão no dia seguinte 12:00–20:00, jogos voltam 4 dias depois.
- Depois da janela: repescagem europeia (ida e volta) e oitavas europeias intercaladas com as ligas 18–21; oitavas/quartas/semis das copas intercaladas com ligas 22–29 e com as quartas/semis europeias; ligas 30–34; final da Champions/Europa League (jogo único); final das copas (ida e volta).
- **Janela do fim** no dia seguinte à última jornada (leilão 12:00–21:00, mercado até o outro dia 21:00).

Com início em 01/07/2027 (exemplo): jornada 1 em 06/07, janela do meio 19–22/07 (mercado abre 19/07 às 21:00, jogos voltam 23/07), última jornada em 08/08, janela final 09–10/08. Cerca de 41 dias no total. Agenda automática começa **pausada**.

Os três leilões (pré, meio, fim) não têm lista fixa: o admin monta os lotes na busca FC27. Sem lotes, o leilão é pulado e o mercado abre. Continua valendo: lances visíveis, no máximo 1 por clube, os 5 maiores overs (entre os 54) não dão lance no de pré.

## Transferências e contas

Transferências entre qualquer uma das 3 ligas (os 54 clubes ativos estão no mesmo mercado). Jogadores de fora das 3 ligas só entram se o admin os colocar no leilão. Contas: apelido + PIN. Admins padrão: Robshow e Duque (`admins.js`), mais `ADMIN_APELIDOS`. Clubes são atribuídos na Central da liga.

## O que ficou de fora / pendências

- Prêmio em dinheiro para campeões de copa e das europeias.
- Acesso/rebaixamento e 2ª divisão.
- Ajuste fino da UI (seletor de competição nas abas Campeonato/Tabela ainda é básico).
- Listas fixas de leilão da 1ª temporada: não há; o admin escolhe na busca.
