(() => {

    'use strict';

    // ========================================
    // ELEMENTOS DA INTERFACE
    // ========================================

    const $ = (id) => document.getElementById(id);

    const championScreen = $('champion-screen');

    const rankingScreen = $('ranking-screen');

    const errorScreen = $('error-screen');

    const advanceButton = $('advance-button');

    const menuButton = $('menu-button');

    const errorMenuButton = $('error-menu-button');

    const rankingList = $('ranking-list');

    const confetti = $('confetti');

    // ========================================
    // AMBIENTE DE TESTES
    // ========================================

    const params = new URLSearchParams(
        window.location.search
    );

    const modoTeste =
        params.get('teste') === 'resultado';

    // Dados exclusivamente ilustrativos.
    // Não interferem nas partidas reais.

    function createTestResult() {

        const testPlayers = [

            {
                id: 'player-1',
                nickname: 'Bia',
                avatar: '🦊',
                score: 4,
                totalHits: 36
            },

            {
                id: 'player-2',
                nickname: 'Rafa',
                avatar: '😺',
                score: 2,
                totalHits: 31
            },

            {
                id: 'player-3',
                nickname: 'Léo',
                avatar: '🐸',
                score: 1,
                totalHits: 29
            },

            {
                id: 'player-4',
                nickname: 'Nina',
                avatar: '🐻',
                score: 1,
                totalHits: 25
            },

            {
                id: 'player-5',
                nickname: 'Duda',
                avatar: '🐧',
                score: 0,
                totalHits: 21
            },

            {
                id: 'player-6',
                nickname: 'Gui',
                avatar: '🐶',
                score: 0,
                totalHits: 19
            },

            {
                id: 'player-7',
                nickname: 'Ana',
                avatar: '🐰',
                score: 0,
                totalHits: 17
            },

            {
                id: 'player-8',
                nickname: 'Pedro',
                avatar: '🐼',
                score: 0,
                totalHits: 15
            },

            {
                id: 'player-9',
                nickname: 'Luca',
                avatar: '🐨',
                score: 0,
                totalHits: 12
            },

            {
                id: 'player-10',
                nickname: 'Mari',
                avatar: '🦉',
                score: 0,
                totalHits: 10
            },

            {
                id: 'player-11',
                nickname: 'João',
                avatar: '🐯',
                score: 0,
                totalHits: 8
            },

            {
                id: 'player-12',
                nickname: 'Desenvolvedor',
                avatar: '🎮',
                score: 0,
                totalHits: 6
            }

        ];

        return {

            roomCode: 'TESTE1',

            mode: 'sem-call',

            totalRounds: 8,

            completedRounds: 8,

            champion: {

                ...testPlayers[0]

            },

            ranking: testPlayers,

            modoTeste: true

        };

    }

    // ========================================
    // RECUPERAR RESULTADO DA PARTIDA
    // ========================================

    function getMatchResult() {

        if (modoTeste) {

            return createTestResult();

        }

        try {

            const savedResult =
                sessionStorage.getItem('matchResult');

            if (!savedResult) {

                return null;

            }

            return JSON.parse(savedResult);

        } catch (error) {

            console.error(
                '[STOP!] Erro ao recuperar resultado:',
                error
            );

            return null;

        }

    }

    const matchResult = getMatchResult();

    // ========================================
    // VALIDAR OS DADOS RECEBIDOS
    // ========================================

    function isValidPlayer(player) {

        return Boolean(

            player &&

            typeof player.id === 'string' &&

            typeof player.nickname === 'string' &&

            player.nickname.trim().length > 0 &&

            Number.isInteger(player.score) &&

            player.score >= 0 &&

            Number.isInteger(player.totalHits) &&

            player.totalHits >= 0

        );

    }

    function validateMatchResult(result) {

        if (!result) return false;

        if (!isValidPlayer(result.champion)) {

            return false;

        }

        if (!Array.isArray(result.ranking)) {

            return false;

        }

        if (
            result.ranking.length < 2 ||
            result.ranking.length > 12
        ) {

            return false;

        }

        if (
            !Number.isInteger(result.totalRounds) ||
            result.totalRounds < 1 ||
            result.totalRounds > 26
        ) {

            return false;

        }

        if (
            result.completedRounds !== result.totalRounds
        ) {

            return false;

        }

        if (!result.ranking.every(isValidPlayer)) {

            return false;

        }

        const championExists =
            result.ranking.some(player => {

                return (
                    player.id === result.champion.id &&
                    player.score === result.champion.score &&
                    player.totalHits === result.champion.totalHits
                );

            });

        if (!championExists) {

            return false;

        }

        // Impede a exibição de resultados incompletos.

        return true;

    }

    // ========================================
    // MOSTRAR TELA DE ERRO
    // ========================================

    function showErrorScreen() {

        championScreen.hidden = true;

        rankingScreen.hidden = true;

        errorScreen.hidden = false;

        errorMenuButton.focus();

    }

    // ========================================
    // AVATAR DO JOGADOR
    // ========================================

    function getPlayerAvatar(player) {

        // Utiliza o avatar quando estiver disponível.

        if (
            typeof player.avatar === 'string' &&
            player.avatar.trim()
        ) {

            return player.avatar;

        }

        // Caso contrário, utiliza a inicial do nome.

        return player.nickname
            .trim()
            .charAt(0)
            .toUpperCase();

    }

    // ========================================
    // EXIBIR DADOS DO CAMPEÃO
    // ========================================

    function renderChampion() {

        const champion = matchResult.champion;

        $('champion-name').textContent =
            champion.nickname;

        $('champion-avatar').textContent =
            getPlayerAvatar(champion);

        $('champion-cards').textContent =
            champion.score;

        $('champion-hits').textContent =
            champion.totalHits;

        document.title =
            `STOP! | ${champion.nickname} venceu!`;

    }

    // ========================================
    // SISTEMA HÍBRIDO DE CLASSIFICAÇÃO
    // ========================================

    function getFinalRanking() {

        const championId =
            matchResult.champion.id;

        // Cria uma cópia para preservar os dados originais.

        const ranking = [...matchResult.ranking];

        ranking.sort((a, b) => {

            // Primeiro critério: cartas conquistadas.

            if (a.score !== b.score) {

                return b.score - a.score;

            }

            // Segundo critério: acertos totais.

            if (a.totalHits !== b.totalHits) {

                return b.totalHits - a.totalHits;

            }

            // Terceiro critério:
            // campeão definido pela morte súbita.

            if (a.id === championId) {

                return -1;

            }

            if (b.id === championId) {

                return 1;

            }

            // Demais jogadores permanecem empatados.

            return 0;

        });

        return ranking;

    }

    // ========================================
    // CRIAR LINHA DO RANKING
    // ========================================

    function createRankingRow(player, position) {

        const row = document.createElement('div');

        row.className = 'ranking-row';

        row.setAttribute('role', 'listitem');

        let medal = '';

        // ====================================
        // IDENTIFICAR POSIÇÕES DO PÓDIO
        // ====================================

        if (position === 1) {

            row.classList.add('gold');

            medal = 'CAMPEÃO';

        } else if (position === 2) {

            row.classList.add('silver');

            medal = 'PRATA';

        } else if (position === 3) {

            row.classList.add('bronze');

            medal = 'BRONZE';

        }

        // ====================================
        // INFORMAÇÕES DO JOGADOR
        // ====================================

        const playerInfo =
            document.createElement('div');

        playerInfo.className = 'ranking-player';

        const positionElement =
            document.createElement('span');

        positionElement.className =
            'ranking-position';

        positionElement.textContent =
            String(position).padStart(2, '0');

        const avatar =
            document.createElement('span');

        avatar.className = 'ranking-avatar';

        avatar.textContent =
            getPlayerAvatar(player);

        const details =
            document.createElement('div');

        details.className =
            'ranking-player-info';

        const name =
            document.createElement('span');

        name.className = 'ranking-name';

        name.textContent = player.nickname;

        name.title = player.nickname;

        details.appendChild(name);

        // Exibe a medalha somente no pódio.

        if (medal) {

            const medalElement =
                document.createElement('span');

            medalElement.className =
                'ranking-medal';

            medalElement.textContent =
                medal;

            details.appendChild(medalElement);

        }

        playerInfo.append(

            positionElement,

            avatar,

            details

        );

        // ====================================
        // CARTAS CONQUISTADAS
        // ====================================

        const cards =
            document.createElement('span');

        cards.className = 'ranking-value';

        cards.textContent = player.score;

        cards.title = 'Cartas conquistadas';

        // ====================================
        // ACERTOS TOTAIS
        // ====================================

        const hits =
            document.createElement('span');

        hits.className = 'ranking-value';

        hits.textContent = player.totalHits;

        hits.title = 'Acertos totais';

        row.append(

            playerInfo,

            cards,

            hits

        );

        return row;

    }

    // ========================================
    // RENDERIZAR CLASSIFICAÇÃO FINAL
    // ========================================

    function renderRanking() {

        rankingList.replaceChildren();

        const ranking = getFinalRanking();

        const totalRounds =
            matchResult.completedRounds;

        const totalPlayers =
            ranking.length;

        $('ranking-info').textContent =

            `${totalRounds} ${totalRounds === 1
                ? 'rodada realizada'
                : 'rodadas realizadas'} • ${totalPlayers} jogadores`;

        let position = 0;

        ranking.forEach((player, index) => {

            const previousPlayer =
                ranking[index - 1];

            // Mantém o campeão definido pela morte súbita
            // em primeiro lugar, mesmo quando os pontos
            // permanecem iguais aos de outro jogador.

            if (

                index === 0 ||

                previousPlayer.id ===
                    matchResult.champion.id ||

                player.score !== previousPlayer.score ||

                player.totalHits !== previousPlayer.totalHits

            ) {

                position = index + 1;

            }

            // Empates fora da disputa pelo campeonato
            // recebem a mesma posição.

            const row =
                createRankingRow(player, position);

            rankingList.appendChild(row);

        });

        rankingList.scrollTop = 0;

        // Mostra a indicação de rolagem quando necessário.

        $('scroll-hint').hidden =
            ranking.length <= 5;

    }

    // ========================================
    // CRIAR CONFETES DECORATIVOS
    // ========================================

    function createConfetti() {

        confetti.replaceChildren();

        const colors = [

            '#ffda28',

            '#f5473e',

            '#8ac8ed',

            '#fcf3da'

        ];

        // Quantidade pequena para manter a leveza.
        // Os elementos não possuem animação infinita.

        const total = 38;

        const fragment =
            document.createDocumentFragment();

        for (let i = 0; i < total; i++) {

            const piece =
                document.createElement('span');

            const isStar = i % 6 === 0;

            piece.className = isStar

                ? 'confetti-star'

                : 'confetti-piece';

            if (isStar) {

                piece.textContent = '✦';

            }

            // Distribui os confetes pelas laterais.
            // Evita cobrir as informações do campeão.

            const leftSide = i % 2 === 0;

            const horizontalPosition = leftSide

                ? 4 + Math.random() * 17

                : 79 + Math.random() * 17;

            const verticalPosition =
                15 + Math.random() * 65;

            piece.style.left =
                `${horizontalPosition}%`;

            piece.style.top =
                `${verticalPosition}%`;

            piece.style.setProperty(

                '--confetti-color',

                colors[i % colors.length]

            );

            piece.style.setProperty(

                '--confetti-angle',

                `${Math.random() * 180}deg`

            );

            piece.style.setProperty(

                '--confetti-delay',

                `${Math.random() * 350}ms`

            );

            fragment.appendChild(piece);

        }

        confetti.appendChild(fragment);

    }

    // ========================================
    // AVANÇAR PARA O RANKING
    // ========================================

    function showRanking() {

        if (championScreen.hidden) return;

        advanceButton.disabled = true;

        championScreen.hidden = true;

        rankingScreen.hidden = false;

        rankingScreen.classList.add(
            'screen-enter'
        );

        // Libera os elementos decorativos
        // da tela anterior.

        confetti.replaceChildren();

        document.body.style.background =
            'var(--cream)';

        document.title =
            'STOP! | Ranking Final';

        window.scrollTo(0, 0);

        menuButton.focus({

            preventScroll: true

        });

    }

    // ========================================
    // VOLTAR AO MENU
    // ========================================

    function returnToMenu() {

        // O ambiente de testes não altera
        // as informações das partidas reais.

        if (!modoTeste) {

            try {

                sessionStorage.removeItem(
                    'matchResult'
                );

                sessionStorage.removeItem(
                    'roomConfig'
                );

                sessionStorage.removeItem(
                    'joinConfig'
                );

            } catch (error) {

                console.warn(
                    '[STOP!] Erro ao limpar sessão:',
                    error
                );

            }

        }

        window.location.href = 'index.html';

    }

    // ========================================
    // EVENTOS
    // ========================================

    advanceButton.addEventListener(

        'click',

        showRanking

    );

    menuButton.addEventListener(

        'click',

        returnToMenu

    );

    errorMenuButton.addEventListener(

        'click',

        returnToMenu

    );

    // ========================================
    // INICIALIZAÇÃO
    // ========================================

    function initializeResults() {

        if (!validateMatchResult(matchResult)) {

            showErrorScreen();

            return;

        }

        championScreen.hidden = false;

        rankingScreen.hidden = true;

        errorScreen.hidden = true;

        renderChampion();

        renderRanking();

        createConfetti();

        if (modoTeste) {

            console.info(

                '[STOP!] Ambiente de teste dos resultados:',

                matchResult

            );

        }

    }

    initializeResults();

})();