(async () => {
    'use strict';

    // ========================================
    // ELEMENTOS DA TELA
    // ========================================

    const $ = (id) => document.getElementById(id);

    const gameScreen = $('game-screen');
    const wheelLetters = $('wheel-letters');

    const drawOverlay = $('draw-overlay');
    const drawButton = $('draw-button');
    const startRoundButton = $('start-round-button');

    const deck = $('deck');
    const drawCard = $('draw-card');

    const stopButton = $('stop-button');

    const timerCard = $('timer-card');
    const timerDisplay = $('timer');
    const turnIndicator = $('turn-indicator');

    const answerForm = $('answer-form');
    const answerInput = $('answer-input');
    const answerSubmit = $('answer-submit');

    // ========================================
    // ELEMENTOS DO ENCERRAMENTO DA RODADA
    // ========================================

    const roundEndOverlay = $('round-end-overlay');
    const roundEndTitle = $('round-end-title');
    const roundEndReason = $('round-end-reason');
    const roundEndPlayer = $('round-end-player');
    const roundResults = $('round-results');

    const nextRoundButton = $('next-round-button');
    const finishGameButton = $('finish-game-button');

    // Novos elementos da celebração.

    const roundWinnerNumber = $('round-winner-number');
    const roundWinnerEyebrow = $('round-winner-eyebrow');
    const roundWinnerMedal = $('round-winner-medal');
    const roundWinnerProfile = $('round-winner-profile');
    const roundWinnerAvatar = $('round-winner-avatar');
    const roundWinnerReward = $('round-winner-reward');
    const roundWinnerStats = $('round-winner-stats');
    const roundWinnerHits = $('round-winner-hits');
    const roundWinnerCards = $('round-winner-cards');
    const roundWinnerTheme = $('round-winner-theme');
    const roundWinnerThemeBox = $('round-winner-theme-box');
    const roundWinnerNext = $('round-winner-next');
    const roundConfetti = $('round-confetti');

    const msStartButton = $('ms-start-button');

    const contestButton = $('contest-button');

    // ========================================
    // CAPTURA ESTÁTICA DO FUNDO
    // ========================================

    const drawBackgroundImage = $('draw-background-image');

    // Mantém a sobreposição escondida enquanto o fundo é preparado.
    // Assim, o usuário não vê o fundo azul durante a captura.

    if (drawOverlay) {
        drawOverlay.hidden = true;
    }

    let backgroundCapturePromise = null;
    let backgroundCaptureTimer = null;

    async function captureGameBackground() {

        if (!gameScreen || !drawBackgroundImage) {
            console.warn('Elemento da captura de fundo não encontrado.');
            return false;
        }

        if (typeof window.html2canvas !== 'function') {
            console.warn('html2canvas não foi carregado. Verifique o HTML.');
            return false;
        }

        try {

            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                });
            });

            // Captura somente a tela principal.

            const originalCanvas = await window.html2canvas(
                gameScreen,
                {
                    backgroundColor: '#fff7df',

                    scale: Math.min(
                        window.devicePixelRatio || 1,
                        1.25
                    ),

                    useCORS: true,
                    allowTaint: false,
                    logging: false,
                    imageTimeout: 10000,
                    scrollX: 0,
                    scrollY: 0
                }
            );

            // Canvas para aplicar o desfoque.

            const blurredCanvas =
                document.createElement('canvas');

            blurredCanvas.width = originalCanvas.width;
            blurredCanvas.height = originalCanvas.height;

            const context = blurredCanvas.getContext('2d');

            if (!context) {
                throw new Error('Não foi possível criar o Canvas.');
            }

            // Desfoque aplicado somente durante a captura.

            context.filter = 'blur(9px)';

            context.drawImage(
                originalCanvas,
                0,
                0
            );

            context.filter = 'none';

            // Conversão para JPEG mais leve.

            const imageData = blurredCanvas.toDataURL(
                'image/jpeg',
                0.82
            );

            // Carrega a imagem no fundo do sorteio.

            await new Promise((resolve, reject) => {

                drawBackgroundImage.onload = resolve;
                drawBackgroundImage.onerror = reject;

                drawBackgroundImage.classList.remove('loaded');

                drawBackgroundImage.src = imageData;

            });

            drawBackgroundImage.classList.add('loaded');

            // Libera a memória dos Canvas temporários.

            originalCanvas.width = 0;
            originalCanvas.height = 0;

            blurredCanvas.width = 0;
            blurredCanvas.height = 0;

            return true;

        } catch (error) {

            console.error(
                'Erro ao capturar o fundo do jogo:',
                error
            );

            return false;

        }

    }

    // Evita capturas simultâneas.

    function requestBackgroundCapture() {

        if (backgroundCapturePromise) {
            return backgroundCapturePromise;
        }

        backgroundCapturePromise = captureGameBackground()
            .finally(() => {
                backgroundCapturePromise = null;
            });

        return backgroundCapturePromise;

    }

    // Atualiza a imagem quando a janela mudar de tamanho.

    window.addEventListener('resize', () => {

        clearTimeout(backgroundCaptureTimer);

        backgroundCaptureTimer = setTimeout(() => {

            if (
                drawOverlay.hidden &&
                roundEndOverlay.hidden &&
                !roundStarted &&
                !isPreparingNextRound &&
                !inTiebreak()
            ) {
                requestBackgroundCapture();
            }

        }, 450);

    });

    // ========================================
    // AMBIENTE DE TESTES DO DESENVOLVEDOR
    // ========================================

    const ambienteTeste =
        typeof criarSalaTeste === 'function'
            ? criarSalaTeste()
            : null;

    const modoTeste = ambienteTeste !== null;

    // ========================================
    // CONFIGURAÇÕES DA SALA
    // ========================================

    let roomConfig;

    if (modoTeste) {

        // Utiliza exclusivamente os dados simulados.

        roomConfig = ambienteTeste.sala;

    } else {

        // Recupera as configurações da sala normal.

        try {

            roomConfig = JSON.parse(
                sessionStorage.getItem('roomConfig')
            );

        } catch {

            roomConfig = null;

        }

    }

    // Impede o acesso sem uma sala válida.

    if (
        !roomConfig ||
        !['com-call', 'sem-call'].includes(roomConfig.mode)
    ) {

        window.location.replace('salas.html');

        return;

    }

    // Preparação online: o Firebase é a fonte dos participantes e configurações.
    // Os testes do desenvolvedor continuam totalmente locais.
    let preparacaoOnline = null;

    if (!modoTeste) {
        try {
            const { database, autenticarJogador } = await import('./firebase-config.js');
            const { ref, get, increment, onValue, set, onDisconnect, update, serverTimestamp } = await import(
                'https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js'
            );
            const usuario = await autenticarJogador();
            const codigo = roomConfig.roomCode;
            if (!/^[A-Z0-9]{6}$/.test(codigo || '')) throw new Error('Código inválido.');
            const referencia = ref(database, `salas/${codigo}`);
            const sala = (await get(referencia)).val();
            if (!sala?.jogadores?.[usuario.uid]) throw new Error('Você não pertence à sala.');
            if (!['preparando', 'encerrada'].includes(sala.status)) {
                window.location.replace('lobby.html');
                return;
            }
            roomConfig = {
                ...roomConfig,
                roomName: sala.nome, mode: sala.modo,
                players: sala.configuracoes.maxJogadores,
                time: sala.configuracoes.tempo,
                cards: sala.configuracoes.quantidadeCartas,
                nickname: sala.jogadores[usuario.uid].nickname,
                playerId: usuario.uid, hostId: sala.anfitriao,
                isHost: sala.anfitriao === usuario.uid
            };
            sessionStorage.setItem('roomConfig', JSON.stringify(roomConfig));
            preparacaoOnline = { database, ref, get, increment, onValue, set, onDisconnect, update, serverTimestamp, referencia, sala, uid: usuario.uid };
        } catch (erro) {
            console.error('[STOP!] Falha ao carregar a preparação:', erro);
            window.location.replace('lobby.html');
            return;
        }
    }

    const config = {

        nickname: roomConfig.nickname || 'Jogador',

        roomCode: roomConfig.roomCode || '------',

        mode: roomConfig.mode,

        time: Math.min(
            120,
            Math.max(
                5,
                Math.floor(Number(roomConfig.time) || 10)
            )
        ),

        cards: Math.min(
            26,
            BANCO_CARTAS.length,
            Math.max(
                1,
                Math.floor(Number(roomConfig.cards) || 10)
            )
        )

    };

    // ========================================
    // JOGADORES DA PARTIDA
    // ========================================

    const players = modoTeste

        // Jogadores fornecidos pelo teste.js.

        ? ambienteTeste.jogadores.map(player => ({
            ...player,
            roundHits: 0,
            totalHits: 0
        }))

        // Participantes reais, na ordem das vagas reservadas.

        : Object.values(preparacaoOnline.sala.jogadores)
            .sort((a, b) => a.vaga - b.vaga)
            .map(jogador => ({
                id: jogador.id,
                vaga: jogador.vaga,
                nickname: jogador.nickname,
                score: 0,
                roundHits: 0,
                totalHits: 0,
                eliminated: false
            }));

    // ========================================
    // ESTADO DA PARTIDA
    // ========================================

    let round = 1;

    let currentPlayerIndex = 0;

    let currentCard = null;

    let selectedLetter = null;

    let isShuffling = false;

    let roundStarted = false;

    const usedLetters = new Set();

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // ========================================
    // CONTROLE DAS RODADAS
    // ========================================

    let isPreparingNextRound = false;

    let matchFinished = false;

    const roundHistory = [];

    let pendingMatchTiebreak = [];

    // ========================================
    // INTEGRAÇÃO DO MÓDULO MORTE SÚBITA
    // ========================================

    const ms = window.MorteSubita;

    let originalRound = null;

    let finalChampion = null;

    const tiebreakHistory = [];

    const inTiebreak = () => Boolean(ms && ms.estaAtiva());

    // ========================================
    // ESTADO DA ELIMINAÇÃO
    // ========================================

    let roundFinished = false;

    let roundWinner = null;

    const eliminationHistory = [];

    // ========================================
    // ESTADO DA PONTUAÇÃO
    // ========================================

    // Impede que uma rodada conceda mais de uma carta.

    const scoredRounds = new Set();

    // Guarda os participantes de uma futura morte súbita.

    let pendingRoundTiebreak = [];

    // ========================================
    // ESTADO DAS RESPOSTAS
    // ========================================

    const usedAnswers = new Set();

    const answerHistory = [];

    let lastConfirmedAnswer = null;

    // ========================================
    // INTEGRAÇÃO DA CONTESTAÇÃO
    // ========================================

    const contestacao = window.Contestacao;

    const inContest = () => Boolean(contestacao && contestacao.estaAtiva());

    let finalContestWindow = false;

    let pausedContestTurn = null;

    // ========================================
    // ESTADO DO CRONÔMETRO
    // ========================================

    let remainingTime = config.time;

    let timerInterval = null;

    let timerDeadline = 0;

    let timerRunning = false;

    let timeExpired = false;

    // ========================================
    // EMBARALHAMENTO DO BANCO DE CARTAS
    // ========================================

    function shuffleCards(cards) {

        const shuffled = [...cards];

        for (let i = shuffled.length - 1; i > 0; i--) {

            const j = Math.floor(
                Math.random() * (i + 1)
            );

            [shuffled[i], shuffled[j]] =
                [shuffled[j], shuffled[i]];

        }

        return shuffled;

    }

    // Seleciona somente a quantidade configurada.

    const matchDeck = (preparacaoOnline ? BANCO_CARTAS : shuffleCards(BANCO_CARTAS))
        .slice(0, config.cards);

    // ========================================
    // CONFIGURAÇÃO DA INTERFACE
    // ========================================

    function setupInterface() {

        $('room-code').textContent =
            `SALA ${config.roomCode}`;

        $('room-mode').textContent =
            config.mode === 'com-call'
                ? 'COM CALL'
                : 'SEM CALL';

        $('timer').textContent = config.time;

        $('player-count').textContent = players.length;

        $('match-info').textContent =
            `${players.length} jogadores • ${config.time} segundos por vez`;

        $('answer-panel').hidden =
            config.mode !== 'sem-call';

        $('voice-panel').hidden =
            config.mode !== 'com-call';

        // Garante que a tela de vitória comece escondida.

        roundEndOverlay.hidden = true;

        nextRoundButton.disabled = true;

        finishGameButton.disabled = true;

        finishGameButton.hidden = true;

        resetRoundWinnerInterface();

        if (contestacao) contestacao.resetar();

        updateContestButton();

        updateRound();

        updateRemainingCards();

        renderPlayers();

        createWheel();

        resetTimer();

        resetAnswerInput();

        // Exige pelo menos dois jogadores.

        drawButton.disabled = players.length < 2;

        if (players.length < 2) {

            $('draw-status').textContent =
                'São necessários pelo menos dois jogadores.';

            return;

        }

        $('draw-status').textContent =
            `${players[currentPlayerIndex].nickname} realizará o sorteio.`;

        if (modoTeste) {

            $('match-info').textContent +=
                ' • MODO DE TESTE';

        }

    }

    // ========================================
    // CRIAÇÃO DA ROLETA
    // ========================================

    function createWheel() {

        wheelLetters.replaceChildren();

        const radius = 43;

        const totalLetters = alphabet.length;

        for (let i = 0; i < totalLetters; i++) {

            const letter = alphabet[i];

            const angle =
                (360 / totalLetters) * i;

            const radians =
                (angle - 90) * Math.PI / 180;

            const x =
                50 + radius * Math.cos(radians);

            const y =
                50 + radius * Math.sin(radians);

            const button =
                document.createElement('button');

            button.type = 'button';

            button.className = 'letter-button';

            button.textContent = letter;

            button.dataset.letter = letter;

            button.setAttribute(
                'aria-label',
                `Letra ${letter}`
            );

            button.setAttribute(
                'aria-pressed',
                'false'
            );

            button.style.left = `${x}%`;

            button.style.top = `${y}%`;

            button.style.setProperty(
                '--letter-angle',
                `${angle}deg`
            );

            button.disabled = true;

            button.addEventListener('click', () => {

                selectLetter(letter);

            });

            wheelLetters.appendChild(button);

        }

    }

    // ========================================
    // SELEÇÃO DEFINITIVA DAS LETRAS
    // ========================================

    function selectLetter(letter) {

        if (preparacaoOnline) {
            if (chaveDesempateOnline) return;
            enviarJogadaOnline('letra', letter);
            return;
        }

        if (inContest() || finalContestWindow) return;

        // Na morte súbita, somente o sistema escolhe a letra.

        if (inTiebreak()) return;

        if (!roundStarted) return;

        if (roundFinished || matchFinished) return;

        if (timeExpired) return;

        if (!validateTimer()) return;

        if (players[currentPlayerIndex].eliminated) return;

        if (selectedLetter !== null) return;

        if (usedLetters.has(letter)) return;

        // A escolha é definitiva.

        selectedLetter = letter;

        // A letra é consumida imediatamente.
        // Mesmo que o jogador seja eliminado,
        // ela continuará indisponível na rodada.

        usedLetters.add(letter);

        $('selected-letter-box').hidden = false;

        $('selected-letter').textContent = letter;

        updateLetters();

        if (config.mode === 'sem-call') {

            $('game-status').textContent =
                `Letra ${letter} escolhida! Digite sua resposta.`;

            enableAnswerInput();

        } else {

            $('game-status').textContent =
                `Letra ${letter} escolhida! Fale a resposta e pressione STOP!`;

        }

    }

    // ========================================
    // ATUALIZAÇÃO DAS LETRAS
    // ========================================

    function updateLetters() {

        const buttons =
            wheelLetters.querySelectorAll('.letter-button');

        buttons.forEach(button => {

            const letter = button.dataset.letter;

            const selected = selectedLetter === letter;

            const used = usedLetters.has(letter);

            button.classList.toggle(
                'used',
                used && !selected
            );

            button.classList.toggle(
                'selected',
                selected
            );

            button.setAttribute(
                'aria-pressed',
                String(selected)
            );

            button.disabled =
                (preparacaoOnline && !podeJogarOnline()) ||
                inContest() ||
                finalContestWindow ||
                inTiebreak() ||
                !roundStarted ||
                roundFinished ||
                matchFinished ||
                isPreparingNextRound ||
                timeExpired ||
                players[currentPlayerIndex].eliminated ||
                used ||
                selectedLetter !== null;

        });

    }

    // ========================================
    // NORMALIZAÇÃO DAS RESPOSTAS
    // ========================================

    function normalizeAnswer(answer) {

        return answer

            // Separa letras e sinais de acentuação.

            .normalize('NFD')

            // Remove os acentos.

            .replace(/[\u0300-\u036f]/g, '')

            // Ignora maiúsculas e minúsculas.

            .toLowerCase()

            // Remove espaços duplicados.

            .replace(/\s+/g, ' ')

            // Remove espaços nas extremidades.

            .trim();

    }

    // ========================================
    // LIBERAR O CAMPO DE RESPOSTA
    // ========================================

    function enableAnswerInput() {

        if (inContest() || finalContestWindow) return;

        if (config.mode !== 'sem-call') return;

        if (!roundStarted || timeExpired) return;

        if (roundFinished || matchFinished) return;

        if (players[currentPlayerIndex].eliminated) return;

        if (!selectedLetter) return;

        answerInput.disabled = false;

        answerSubmit.disabled = false;

        answerInput.placeholder =
            `Resposta com ${selectedLetter}...`;

        answerInput.removeAttribute('aria-invalid');

        answerInput.focus();

    }

    // ========================================
    // BLOQUEAR E LIMPAR O CAMPO DE RESPOSTA
    // ========================================

    function resetAnswerInput() {

        answerInput.value = '';

        answerInput.disabled = true;

        answerSubmit.disabled = true;

        answerInput.placeholder =
            'Digite sua resposta...';

        answerInput.removeAttribute('aria-invalid');

    }

    // ========================================
    // EXIBIR ERRO DE VALIDAÇÃO
    // ========================================

    function showAnswerError(message) {

        $('game-status').textContent = message;

        answerInput.setAttribute(
            'aria-invalid',
            'true'
        );

        if (!answerInput.disabled) {

            answerInput.focus();

        }

    }

    // ========================================
    // VALIDAÇÃO AUTOMÁTICA — SEM CALL
    // ========================================

    function validateTextAnswer() {

        const originalAnswer =
            answerInput.value.trim()
                .replace(/\s+/g, ' ');

        // Impede respostas vazias.

        if (!originalAnswer) {

            return {

                valid: false,

                message: 'Digite uma resposta antes de confirmar!'

            };

        }

        // Respeita o limite do campo de resposta.

        if (originalAnswer.length > 100) {

            return {

                valid: false,

                message: 'A resposta deve ter até 100 caracteres.'

            };

        }

        const normalizedAnswer =
            normalizeAnswer(originalAnswer);

        if (!normalizedAnswer) {

            return {

                valid: false,

                message: 'Digite uma resposta válida!'

            };

        }

        const normalizedLetter =
            selectedLetter.toLowerCase();

        // Verifica se a resposta começa com a letra.

        if (!normalizedAnswer.startsWith(normalizedLetter)) {

            return {

                valid: false,

                message:
                    `Sua resposta precisa começar com a letra ${selectedLetter}!`

            };

        }

        // Impede respostas repetidas na mesma rodada.

        if (usedAnswers.has(normalizedAnswer)) {

            return {

                valid: false,

                message: 'Essa resposta já foi utilizada nesta rodada!'

            };

        }

        // A validação técnica foi aprovada.
        // O significado será avaliado pelos jogadores.

        return {

            valid: true,

            answer: originalAnswer,

            normalized: normalizedAnswer

        };

    }

    // ========================================
    // SISTEMA HÍBRIDO DE PONTUAÇÃO
    // ========================================

    function updatePlayerHits() {

        // Recalcula os acertos utilizando o histórico.

        players.forEach(player => {

            player.roundHits = 0;

            player.totalHits = 0;

        });

        answerHistory.forEach(confirmedAnswer => {

            // Somente respostas aceitas são contabilizadas.

            if (confirmedAnswer.status !== 'accepted') {
                return;
            }

            // Respostas da morte súbita não aumentam
            // a pontuação normal da partida.

            if (confirmedAnswer.isTiebreak) {
                return;
            }

            const player = players.find(item => {

                return item.id === confirmedAnswer.playerId;

            });

            if (!player) return;

            // Acumula todos os acertos da partida.

            player.totalHits++;

            // Contabiliza os acertos da rodada atual.

            if (confirmedAnswer.round === round) {

                player.roundHits++;

            }

        });

    }

    // ========================================
    // CLASSIFICAÇÃO GERAL
    // ========================================

    function getMatchRanking() {

        updatePlayerHits();

        // Cria uma cópia para preservar a ordem da mesa.

        const ranking = [...players];

        ranking.sort((a, b) => {

            // Primeiro critério: cartas conquistadas.

            if (a.score !== b.score) {

                return b.score - a.score;

            }

            // Segundo critério: acertos totais.

            return b.totalHits - a.totalHits;

        });

        return ranking;

    }

    // ========================================
    // REGISTRAR PONTUAÇÃO DO VENCEDOR
    // ========================================

    function awardRoundCard(winner) {

        if (!winner) return false;

        if (scoredRounds.has(round)) return false;

        winner.score++;

        scoredRounds.add(round);

        if (modoTeste) {

            console.info(
                '[STOP!] Carta conquistada:',
                {
                    rodada: round,
                    jogador: winner.nickname,
                    cartas: winner.score,
                    acertosRodada: winner.roundHits,
                    acertosTotais: winner.totalHits
                }
            );

        }

        return true;

    }

    // ========================================
    // CLASSIFICAÇÃO NO CONSOLE
    // ========================================

    function logMatchRanking() {

        if (!modoTeste) return;

        console.table(

            getMatchRanking().map(player => ({

                jogador: player.nickname,

                cartas: player.score,

                acertosRodada: player.roundHits,

                acertosTotais: player.totalHits,

                estado: player.eliminated
                    ? 'Espectador'
                    : 'Ativo'

            }))

        );

    }

    // ========================================
    // REGISTRAR A RESPOSTA CONFIRMADA
    // ========================================

    function registerAnswer(answer, normalizedAnswer) {

        const player = players[currentPlayerIndex];

        const confirmedAnswer = {

            id: answerHistory.length + 1,

            round: round,

            playerId: player.id,

            playerName: player.nickname,

            cardId: currentCard.id,

            theme: currentCard.tema,

            letter: selectedLetter,

            mode: config.mode,

            answer: answer,

            normalizedAnswer: normalizedAnswer,

            // Aceitação provisória até uma possível contestação.

            status: 'accepted',

            contested: false,

            // Identifica respostas exclusivas da morte súbita.

            isTiebreak: inTiebreak(),

            tiebreakType: inTiebreak() ? ms.obterTipo() : null,

            tiebreakAttempt: inTiebreak() ? ms.obterTentativa() : null

        };

        if (normalizedAnswer !== null) {

            usedAnswers.add(normalizedAnswer);

        }

        answerHistory.push(confirmedAnswer);

        lastConfirmedAnswer = confirmedAnswer;

        // Os acertos do desempate não entram na pontuação normal.

        if (inTiebreak()) {

            ms.registrarAcerto(player.id);

        }

        updatePlayerHits();

        if (modoTeste) {

            console.info(
                '[STOP!] Resposta confirmada:',
                confirmedAnswer
            );

            console.info(
                '[STOP!] Pontuação atualizada:',
                {

                    jogador: player.nickname,

                    cartas: player.score,

                    acertosRodada: player.roundHits,

                    acertosTotais: player.totalHits

                }
            );

            logMatchRanking();

        }

        return confirmedAnswer;

    }

    // ========================================
    // CONFIRMAÇÃO DA RESPOSTA
    // ========================================

    function confirmAnswer() {

        if (preparacaoOnline) {
            enviarJogadaOnline('resposta');
            return;
        }

        if (inContest() || finalContestWindow) return;

        if (!currentCard || !roundStarted) return;

        if (roundFinished || matchFinished) return;

        if (timeExpired) return;

        if (!validateTimer()) return;

        if (players[currentPlayerIndex].eliminated) return;

        if (!selectedLetter) {

            $('game-status').textContent =
                'Escolha uma letra primeiro.';

            return;

        }

        let answer = null;

        let normalizedAnswer = null;

        // ====================================
        // MODO SEM CALL
        // ====================================

        if (config.mode === 'sem-call') {

            const validation = validateTextAnswer();

            if (!validation.valid) {

                showAnswerError(validation.message);

                return;

            }

            answer = validation.answer;

            normalizedAnswer = validation.normalized;

        }

        // ====================================
        // MODO COM CALL
        // ====================================

        // A resposta falada é confirmada manualmente.
        // Não utilizamos reconhecimento de voz.
        // O julgamento será realizado por contestação.

        if (!validateTimer()) return;

        const confirmedAnswer = registerAnswer(
            answer,
            normalizedAnswer
        );

        let confirmationMessage;

        const reward = inTiebreak()
            ? '+1 acerto no desempate.'
            : '+1 acerto.';

        if (config.mode === 'sem-call') {

            confirmationMessage =
                `${confirmedAnswer.playerName}: "${confirmedAnswer.answer}" confirmada! ${reward}`;

        } else {

            confirmationMessage =
                `${confirmedAnswer.playerName} confirmou a letra ${confirmedAnswer.letter}! ${reward}`;

        }

        // A letra permanece consumida.

        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        resetAnswerInput();

        updateLetters();

        // Passa automaticamente a vez.

        // A última resposta também pode ser contestada antes da premiação.

        if (usedLetters.size >= alphabet.length && openFinalContestWindow()) return;

        advanceTurn(confirmationMessage);

    }

    // ========================================
    // JOGADOR ATUAL
    // ========================================

    function getCurrentPlayer() {

        return players[currentPlayerIndex];

    }

    // ========================================
    // JOGADORES ATIVOS
    // ========================================

    function getActivePlayers() {

        return players.filter(player => {

            return !player.eliminated;

        });

    }

    // ========================================
    // JOGADORES ESPECTADORES
    // ========================================

    function getSpectators() {

        return players.filter(player => {

            return player.eliminated;

        });

    }

    // ========================================
    // ELIMINAR JOGADOR DA RODADA
    // ========================================

    function eliminatePlayer(playerIndex, reason, letter = selectedLetter) {

        const player =
            players[playerIndex];

        if (!player) return false;

        if (player.eliminated) return false;

        if (roundFinished || matchFinished) return false;

        // A eliminação é exclusiva da rodada atual.

        player.eliminated = true;

        player.spectator = true;

        player.eliminationReason = reason;

        // Os acertos conquistados permanecem registrados.

        const elimination = {

            round: round,

            playerId: player.id,

            playerName: player.nickname,

            reason: reason,

            letter: letter,

            theme: currentCard
                ? currentCard.tema
                : null,

            isTiebreak: inTiebreak(),

            tiebreakAttempt: inTiebreak() ? ms.obterTentativa() : null,

            order: eliminationHistory.length + 1

        };

        eliminationHistory.push(elimination);

        renderPlayers();

        if (modoTeste) {

            console.info(
                '[STOP!] Jogador eliminado:',
                elimination
            );

            console.info(
                '[STOP!] Jogadores ativos:',
                getActivePlayers().length
            );

            console.info(
                '[STOP!] Espectadores:',
                getSpectators().length
            );

        }

        return true;

    }

    // ========================================
    // LOCALIZAR O PRÓXIMO JOGADOR ATIVO
    // ========================================

    function getNextPlayerIndex() {

        const totalPlayers = players.length;

        if (totalPlayers < 2) {

            return -1;

        }

        // Percorre a lista de forma circular.

        for (
            let offset = 1;
            offset < totalPlayers;
            offset++
        ) {

            const nextIndex =
                (currentPlayerIndex + offset) % totalPlayers;

            const nextPlayer =
                players[nextIndex];

            // Espectadores não recebem novas jogadas.

            if (!nextPlayer.eliminated) {

                return nextIndex;

            }

        }

        return -1;

    }

    // ========================================
    // ATUALIZAR INDICADOR DA VEZ
    // ========================================

    function updateTurnIndicator() {

        const currentPlayer = getCurrentPlayer();

        if (!currentPlayer) return;

        if (matchFinished) {

            turnIndicator.textContent =
                'PARTIDA ENCERRADA';

            return;

        }

        if (roundFinished) {

            turnIndicator.textContent =
                'RODADA ENCERRADA';

            return;

        }

        // No teste, o desenvolvedor controla todos os jogadores.

        if (modoTeste) {

            turnIndicator.textContent =
                `VEZ DE ${currentPlayer.nickname.toUpperCase()}`;

            return;

        }

        // Preparação para o multiplayer.

        const localPlayer =
            players.find(player => player.id === preparacaoOnline?.uid);

        if (localPlayer && localPlayer.eliminated) {

            turnIndicator.textContent =
                'ESPECTADOR';

            return;

        }

        turnIndicator.textContent =
            currentPlayer.id === preparacaoOnline?.uid
                ? 'SUA VEZ'
                : 'AGUARDANDO';

    }

    // ========================================
    // REGISTRAR RESULTADO DA RODADA
    // ========================================

    function saveRoundResult(winner, reason) {

        // Não registra rodadas ainda empatadas.

        if (pendingRoundTiebreak.length > 0) return;

        const alreadySaved = roundHistory.some(result => {

            return result.round === round;

        });

        if (alreadySaved) return;

        updatePlayerHits();

        const result = {

            round: round,

            cardId: currentCard
                ? currentCard.id
                : null,

            theme: currentCard
                ? currentCard.tema
                : null,

            winnerId: winner
                ? winner.id
                : null,

            winnerName: winner
                ? winner.nickname
                : null,

            reason: reason,

            usedLetters: [...usedLetters],

            players: players.map(player => ({

                id: player.id,

                nickname: player.nickname,

                score: player.score,

                roundHits: player.roundHits,

                totalHits: player.totalHits,

                eliminated: player.eliminated

            }))

        };

        roundHistory.push(result);

        if (modoTeste) {

            console.info(
                '[STOP!] Resultado da rodada registrado:',
                result
            );

        }

    }

    // ========================================
    // NOVO: AVATAR DO VENCEDOR
    // ========================================

    function getPlayerAvatar(player) {

        if (!player) return '?';

        // Utiliza o avatar personalizado quando disponível.

        if (
            typeof player.avatar === 'string' &&
            player.avatar.trim()
        ) {

            return player.avatar;

        }

        // Caso contrário, utiliza a inicial do jogador.

        return player.nickname
            .trim()
            .charAt(0)
            .toUpperCase() || '?';

    }

    // ========================================
    // NOVO: CONFETES DA RODADA
    // ========================================

    function createRoundConfetti() {

        roundConfetti.replaceChildren();

        const colors = [

            '#ffda28',

            '#f5473e',

            '#1065a7',

            '#8ac8ed'

        ];

        // Quantidade reduzida para manter o desempenho.

        const total = 32;

        const fragment =
            document.createDocumentFragment();

        for (let i = 0; i < total; i++) {

            const piece =
                document.createElement('span');

            const isStar = i % 6 === 0;

            piece.className = isStar

                ? 'round-confetti-star'

                : 'round-confetti-piece';

            if (isStar) {

                piece.textContent = '✦';

            }

            // Distribui os elementos pelas laterais.

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

                `${Math.random() * 250}ms`

            );

            fragment.appendChild(piece);

        }

        roundConfetti.appendChild(fragment);

    }

    // ========================================
    // NOVO: LIMPAR A CELEBRAÇÃO ANTERIOR
    // ========================================

    function resetRoundWinnerInterface() {

        roundEndOverlay.classList.remove(
            'is-tiebreak',
            'no-winner'
        );

        roundConfetti.replaceChildren();

        roundWinnerMedal.hidden = false;

        roundWinnerProfile.hidden = false;

        roundWinnerReward.hidden = false;

        roundWinnerStats.hidden = false;

        roundWinnerThemeBox.hidden = false;

        roundWinnerEyebrow.textContent =
            'MAIS UMA CARTA CONQUISTADA!';

        roundEndTitle.textContent =
            'VENCEDOR DA RODADA!';

        roundEndReason.textContent = '';

        roundEndPlayer.textContent = '';

        roundWinnerAvatar.textContent = '?';

        roundWinnerHits.textContent = '0';

        roundWinnerCards.textContent = '0';

        roundWinnerTheme.textContent = '—';

        roundWinnerNext.textContent = '';

        // Remove a antiga classificação intermediária.

        if (roundResults) {

            roundResults.replaceChildren();

            roundResults.hidden = true;

        }

    }

    // ========================================
    // NOVO: PREENCHER DADOS DO VENCEDOR
    // ========================================

    function renderRoundWinner(winner, reason) {

        resetRoundWinnerInterface();

        const roundNumber =
            String(round).padStart(2, '0');

        const totalRounds =
            String(config.cards).padStart(2, '0');

        roundWinnerNumber.textContent =
            `RODADA ${roundNumber}/${totalRounds}`;

        // Exibe o tema realmente disputado.

        roundWinnerTheme.textContent =
            currentCard
                ? currentCard.tema
                : '—';

        // ====================================
        // ESTADO DE EMPATE
        // ====================================

        if (pendingRoundTiebreak.length > 0) {

            roundEndOverlay.classList.add(
                'is-tiebreak'
            );

            roundWinnerEyebrow.textContent =
                'O DESAFIO AINDA NÃO ACABOU!';

            roundEndTitle.textContent =
                'MORTE SÚBITA!';

            roundEndReason.textContent =
                reason;

            roundEndPlayer.textContent =
                'Temos um empate!';

            roundWinnerMedal.hidden = true;

            roundWinnerReward.hidden = true;

            roundWinnerStats.hidden = true;

            roundWinnerNext.textContent =
                'A carta será conquistada após o desempate.';

            return;

        }

        // ====================================
        // ESTADO SEM VENCEDOR
        // ====================================

        if (!winner) {

            roundEndOverlay.classList.add(
                'no-winner'
            );

            roundWinnerEyebrow.textContent =
                'FIM DO DESAFIO';

            roundEndTitle.textContent =
                'RODADA ENCERRADA!';

            roundEndReason.textContent =
                reason;

            roundEndPlayer.textContent =
                'Rodada sem vencedor';

            roundWinnerMedal.hidden = true;

            roundWinnerReward.hidden = true;

            roundWinnerStats.hidden = true;

            roundWinnerNext.textContent =
                matchDeck.length > 0

                    ? 'Prepare-se para a próxima rodada.'

                    : 'Confira o resultado da partida.';

            return;

        }

        // ====================================
        // VENCEDOR CONFIRMADO
        // ====================================

        updatePlayerHits();

        roundWinnerEyebrow.textContent =
            'MAIS UMA CARTA CONQUISTADA!';

        roundEndTitle.textContent =
            'VENCEDOR DA RODADA!';

        roundEndReason.textContent =
            reason;

        // Nome real do vencedor.

        roundEndPlayer.textContent =
            winner.nickname;

        // Avatar ou inicial.

        roundWinnerAvatar.textContent =
            getPlayerAvatar(winner);

        // Acertos exclusivos desta rodada.

        roundWinnerHits.textContent =
            winner.roundHits;

        // Total de cartas acumuladas.

        roundWinnerCards.textContent =
            winner.score;

        // A interface apenas apresenta a recompensa.
        // A carta já foi concedida por awardRoundCard().

        roundWinnerReward.textContent =
            '+1 CARTA CONQUISTADA!';

        // Define a mensagem abaixo do botão.

        if (matchDeck.length > 0) {

            roundWinnerNext.textContent =
                `${winner.nickname} realizará o próximo sorteio.`;

        } else {

            roundWinnerNext.textContent =
                'Última rodada concluída. Descubra o campeão da partida!';

        }

        createRoundConfetti();

    }

    // ========================================
    // NOVO: TELA DE ENCERRAMENTO DA RODADA
    // ========================================

    function showRoundEndOverlay(reason) {

        const hasTiebreak =
            pendingRoundTiebreak.length > 0;

        // Preenche a nova celebração.

        renderRoundWinner(
            roundWinner,
            reason
        );

        // Restaura a disponibilidade dos botões.

        nextRoundButton.hidden = true;

        nextRoundButton.disabled = true;

        finishGameButton.hidden = true;

        finishGameButton.disabled = true;

        // ====================================
        // EMPATE NA RODADA
        // ====================================

        if (hasTiebreak) {

            nextRoundButton.hidden = false;

            nextRoundButton.textContent =
                'MORTE SÚBITA';

            // Permite iniciar o desempate sem avançar a rodada.

            nextRoundButton.disabled = !ms;

        }

        // ====================================
        // EXISTE OUTRA RODADA
        // ====================================

        else if (matchDeck.length > 0) {

            nextRoundButton.hidden = false;

            nextRoundButton.disabled = false;

            nextRoundButton.textContent =
                'PRÓXIMA RODADA →';

        }

        // ====================================
        // ÚLTIMA RODADA
        // ====================================

        else {

            finishGameButton.hidden = false;

            finishGameButton.disabled = false;

            finishGameButton.textContent =
                'VER RESULTADO FINAL →';

        }

        // Impede interação com a roleta.

        gameScreen.setAttribute(
            'inert',
            ''
        );

        // Exibe a celebração em tela inteira.

        roundEndOverlay.hidden = false;

        roundEndOverlay.scrollTop = 0;

        // Posiciona o foco no botão disponível.

        if (!nextRoundButton.disabled) {

            nextRoundButton.focus({
                preventScroll: true
            });

        } else if (!finishGameButton.disabled) {

            finishGameButton.focus({
                preventScroll: true
            });

        } else {

            roundEndOverlay.setAttribute(
                'tabindex',
                '-1'
            );

            roundEndOverlay.focus({
                preventScroll: true
            });

        }

    }

    // ========================================
    // ENCERRAMENTO DA RODADA
    // ========================================

    function finishRound(winner, reason) {

        clearContestOpportunity();

        // Impede múltiplos encerramentos.

        if (roundFinished || matchFinished) return;

        roundFinished = true;

        roundStarted = false;

        roundWinner = winner || null;

        // Interrompe o cronômetro.

        stopTimer();

        clearTimeout(backgroundCaptureTimer);

        // Limpa a seleção sem devolver a letra.

        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        resetAnswerInput();

        stopButton.disabled = true;

        $('stop-label').textContent =
            'ENCERRADA';

        turnIndicator.textContent =
            'RODADA ENCERRADA';

        // Atualiza os acertos antes de atribuir a carta.

        updatePlayerHits();

        if (roundWinner) {

            // Concede exatamente uma carta ao vencedor.

            awardRoundCard(roundWinner);

            const winnerIndex =
                players.findIndex(player => {

                    return player.id === roundWinner.id;

                });

            if (winnerIndex !== -1) {

                currentPlayerIndex = winnerIndex;

            }

            $('game-status').textContent =
                `${roundWinner.nickname} venceu a rodada e conquistou 1 carta!`;

        } else {

            $('game-status').textContent = reason;

        }

        // Atualiza a interface.

        renderPlayers();

        updateLetters();

        updateTimerDisplay();

        // Registra o resultado antes de exibi-lo.

        saveRoundResult(
            roundWinner,
            reason
        );

        // Abre a nova tela de vencedor.

        showRoundEndOverlay(reason);

        if (modoTeste) {

            console.info(
                '[STOP!] Rodada encerrada:',
                {

                    round: round,

                    winner: roundWinner
                        ? roundWinner.nickname
                        : null,

                    reason: reason,

                    activePlayers: getActivePlayers().length,

                    spectators: getSpectators().length,

                    usedLetters: usedLetters.size

                }
            );

            logMatchRanking();

        }

    }

    // ========================================
    // DESEMPATE DA RODADA
    // ========================================

    function resolveRoundTiebreak(activePlayers) {

        updatePlayerHits();

        const highestHits = Math.max(

            ...activePlayers.map(player => player.roundHits)

        );

        const tiedPlayers = activePlayers.filter(player => {

            return player.roundHits === highestHits;

        });

        // Se apenas um sobrevivente tiver mais acertos,
        // ele conquista a carta da rodada.

        if (tiedPlayers.length === 1) {

            finishRound(
                tiedPlayers[0],
                'Letras esgotadas. Vitória por quantidade de acertos.'
            );

            return;

        }

        // Guarda os participantes da futura morte súbita.

        pendingRoundTiebreak = tiedPlayers.map(player => {

            return player.id;

        });

        const tiedNames = tiedPlayers

            .map(player => player.nickname)

            .join(', ');

        finishRound(

            null,

            `Empate entre ${tiedNames}! Morte súbita necessária.`

        );

        turnIndicator.textContent =
            'MORTE SÚBITA';

        $('stop-label').textContent =
            'DESEMPATE';

        if (modoTeste) {

            console.info(
                '[STOP!] Morte súbita necessária:',
                {

                    jogadores: tiedNames,

                    acertos: highestHits,

                    participantes: pendingRoundTiebreak

                }
            );

        }

        // O botão MORTE SÚBITA abrirá a introdução dramática.
        // Nenhum jogador recebe a carta enquanto o empate
        // não for resolvido.

    }

    // ========================================
    // VERIFICAR CONDIÇÕES DE ENCERRAMENTO
    // ========================================

    function checkRoundEnd() {

        if (roundFinished || matchFinished) return true;

        // O desempate utiliza os próprios critérios de vitória.

        if (inTiebreak()) {

            return checkTiebreakEnd();

        }

        const activePlayers =
            getActivePlayers();

        // Restou apenas um jogador ativo.

        if (activePlayers.length === 1) {

            finishRound(
                activePlayers[0],
                'Restou apenas um jogador ativo.'
            );

            return true;

        }

        // Segurança para situações sem jogadores ativos.

        if (activePlayers.length === 0) {

            finishRound(
                null,
                'Não existem jogadores ativos.'
            );

            return true;

        }

        // Todas as letras foram consumidas.

        if (usedLetters.size >= alphabet.length) {

            resolveRoundTiebreak(activePlayers);

            return true;

        }

        return false;

    }

    // ========================================
    // PASSAR PARA O PRÓXIMO JOGADOR
    // ========================================

    function advanceTurn(confirmationMessage = '') {

        if (!currentCard || !roundStarted) return;

        if (roundFinished || matchFinished) return;

        // Encerra o cronômetro da jogada anterior.

        stopTimer();

        const previousPlayer =
            getCurrentPlayer();

        if (checkRoundEnd()) return;

        // Procura o próximo jogador disponível.

        const nextIndex =
            getNextPlayerIndex();

        if (nextIndex === -1) {

            finishRound(
                null,
                'Não existem outros jogadores ativos.'
            );

            return;

        }

        // Alterna o jogador.

        currentPlayerIndex = nextIndex;

        const currentPlayer =
            getCurrentPlayer();

        // Limpa apenas a seleção anterior.
        // As letras utilizadas continuam bloqueadas.

        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        resetAnswerInput();

        timeExpired = false;

        renderPlayers();

        updateTurnIndicator();

        updateLetters();

        stopButton.disabled = false;

        $('stop-label').textContent =
            'REINICIAR';

        if (confirmationMessage) {

            $('game-status').textContent =
                `${confirmationMessage} Agora é a vez de ${currentPlayer.nickname}.`;

        } else {

            $('game-status').textContent =
                `${currentPlayer.nickname}, escolha uma letra livre.`;

        }

        // O novo jogador recebe todo o tempo configurado.

        if (inTiebreak()) {

            startAutomaticTiebreakTurn();

        } else {

            startTimer();

        }

        if (modoTeste) {

            console.info(
                '[STOP!] Alternância de jogadores:',
                {
                    anterior: previousPlayer.nickname,
                    atual: currentPlayer.nickname,
                    indice: currentPlayerIndex,
                    tempo: config.time
                }
            );

        }

    }

    // ========================================
    // EXIBIÇÃO DOS JOGADORES
    // ========================================

    function renderPlayers() {

        const playersList = $('players-list');

        // Preserva a posição da rolagem da lista.

        const previousScroll =
            playersList.scrollTop;

        playersList.replaceChildren();

        players.forEach((player, index) => {

            const item =
                document.createElement('li');

            item.className = 'player-item';

            if (
                index === currentPlayerIndex &&
                !player.eliminated
            ) {

                item.classList.add('active');

                if (!roundFinished && !matchFinished) {

                    item.setAttribute(
                        'aria-current',
                        'true'
                    );

                }

            }

            // Jogadores eliminados ficam visualmente apagados.

            if (player.eliminated) {

                item.classList.add('eliminated');

                item.dataset.status = 'spectator';

                item.setAttribute(
                    'aria-label',
                    `${player.nickname}, espectador, ${player.score} cartas, ${player.roundHits} acertos na rodada, ${player.totalHits} acertos totais`
                );

            } else {

                item.dataset.status = 'playing';

            }

            const avatar =
                document.createElement('span');

            avatar.className = 'player-avatar';

            avatar.textContent =
                player.nickname.charAt(0).toUpperCase();

            const name =
                document.createElement('span');

            name.className = 'player-name';

            name.textContent = player.nickname;

            name.title = player.nickname;

            const score =
                document.createElement('span');

            score.className = 'player-score';

            // Pontuação do jogador.

            const scoreText =
                `${player.score} ${player.score === 1 ? 'carta' : 'cartas'}`;

            const hitsText =
                `${player.roundHits} ac.`;

            const totalHitsText =
                `${player.totalHits} ${player.totalHits === 1 ? 'acerto total' : 'acertos totais'}`;

            score.title =
                `${scoreText} • ${player.roundHits} acertos na rodada • ${totalHitsText}`;

            if (player.eliminated) {

                score.textContent =
                    `ESPECTADOR · ${hitsText}`;

                name.title =
                    `${player.nickname} — Espectador — ${scoreText} — ${totalHitsText}`;

            } else {

                score.textContent =
                    `${scoreText} · ${hitsText}`;

                name.title =
                    `${player.nickname} — ${scoreText} — ${totalHitsText}`;

            }

            // Durante a morte súbita, exibe os acertos independentes.

            if (inTiebreak()) {

                const hits = ms.obterAcertos(player.id);

                score.textContent = !ms.jogadorParticipa(player.id)
                    ? 'ESPECTADOR'
                    : player.eliminated
                        ? `ESPECTADOR · ${hits} ac.`
                        : `${hits} ac.`;

                score.title = `${hits} acertos no desempate`;

                item.setAttribute('aria-label',
                    `${player.nickname}, ${player.eliminated ? 'espectador' : 'finalista'}, ${hits} acertos no desempate`);

            }

            item.append(
                avatar,
                name,
                score
            );

            playersList.appendChild(item);

        });

        // Restaura a posição original da lista.

        playersList.scrollTop = previousScroll;

        $('current-player').textContent =
            players[currentPlayerIndex].nickname;

    }

    // ========================================
    // INFORMAÇÕES DA RODADA
    // ========================================

    function updateRound() {

        if (inTiebreak()) {

            $('round-number').textContent = ms.obterTipo() === 'final'
                ? 'MORTE SÚBITA FINAL'
                : 'MORTE SÚBITA';

            $('draw-round').textContent =
                `DESEMPATE ${String(ms.obterTentativa()).padStart(2, '0')}`;

            $('card-number').textContent = 'TEMA EXTRA';

            return;

        }

        const number =
            String(round).padStart(2, '0');

        const total =
            String(config.cards).padStart(2, '0');

        $('round-number').textContent =
            `RODADA ${number}/${total}`;

        $('draw-round').textContent =
            `RODADA ${number}/${total}`;

        $('card-number').textContent =
            `CARTA ${number}`;

    }

    function updateRemainingCards() {

        if (inTiebreak()) {

            $('remaining-cards').textContent =
                'TEMA EXTRA — SEM CONSUMIR CARTAS';

            return;

        }

        const total = matchDeck.length;

        $('remaining-cards').textContent =
            `${total} ${total === 1
                ? 'carta restante'
                : 'cartas restantes'}`;

    }

    // ========================================
    // INTERFACE DO CRONÔMETRO
    // ========================================

    function updateTimerDisplay() {

        if (inTiebreak()) {

            ms.atualizarEfeitosTempo(remainingTime, timerRunning);

        }

        const displayValue = String(remainingTime);

        // Evita atualizar o DOM desnecessariamente.

        if (timerDisplay.textContent !== displayValue) {

            timerDisplay.textContent = displayValue;

        }

        // Amarelo nos últimos cinco segundos.

        timerCard.classList.toggle(

            'warning',

            timerRunning &&
            remainingTime <= 5 &&
            remainingTime > 3

        );

        // Vermelho nos últimos três segundos.

        timerCard.classList.toggle(

            'danger',

            timeExpired ||
            (
                timerRunning &&
                remainingTime <= 3
            )

        );

    }

    // ========================================
    // PARAR O CRONÔMETRO
    // ========================================

    function stopTimer() {

        if (timerInterval !== null) {

            clearInterval(timerInterval);

            timerInterval = null;

        }

        timerRunning = false;

        timerDeadline = 0;

        updateContestButton();

        if (inTiebreak()) {

            ms.atualizarEfeitosTempo(remainingTime, false);

        }

    }

    // ========================================
    // RESTAURAR O TEMPO INICIAL
    // ========================================

    function resetTimer() {

        stopTimer();

        remainingTime = config.time;

        timeExpired = false;

        updateTimerDisplay();

    }

    // ========================================
    // INICIAR OU REINICIAR A CONTAGEM
    // ========================================

    function startTimer() {

        if (roundFinished || matchFinished) return;

        // Evita dois cronômetros simultâneos.

        stopTimer();

        remainingTime = config.time;

        timeExpired = false;

        timerRunning = true;

        // Calcula o momento exato do encerramento.

        timerDeadline =
            performance.now() + (config.time * 1000);

        updateTimerDisplay();

        // Verifica o relógio real sem depender do FPS.

        timerInterval = setInterval(() => {

            updateTimer();

        }, 100);

        updateContestButton();

    }

    // ========================================
    // ATUALIZAÇÃO DA CONTAGEM REGRESSIVA
    // ========================================

    function updateTimer() {

        if (preparacaoOnline) {
            atualizarCronometroOnline();
            return;
        }

        if (!timerRunning) return;

        if (roundFinished || matchFinished) return;

        const millisecondsLeft = Math.max(
            0,
            timerDeadline - performance.now()
        );

        const nextTime = Math.ceil(
            millisecondsLeft / 1000
        );

        // Só altera a interface quando o segundo mudar.

        if (nextTime !== remainingTime) {

            remainingTime = nextTime;

            updateTimerDisplay();

        }

        // Encerra quando chegar a zero.

        if (millisecondsLeft <= 0) {

            handleTimeExpired();

        }

    }

    // ========================================
    // VALIDAÇÃO DO TEMPO REAL
    // ========================================

    function validateTimer() {

        if (inContest() || finalContestWindow) return false;

        if (roundFinished || matchFinished) return false;

        if (timeExpired) return false;

        if (!timerRunning) return false;

        // Impede respostas depois do prazo,
        // mesmo se o navegador atrasar o intervalo.

        if (performance.now() >= timerDeadline) {

            handleTimeExpired();

            return false;

        }

        return true;

    }

    // ========================================
    // TEMPO ESGOTADO E ELIMINAÇÃO
    // ========================================

    function handleTimeExpired() {

        if (inContest()) return;

        if (timeExpired) return;

        if (roundFinished || matchFinished) return;

        if (!roundStarted) return;

        // O prazo de contestação final não elimina ninguém por tempo.

        if (finalContestWindow) {

            closeFinalContestWindow();

            return;

        }

        clearContestOpportunity();

        timeExpired = true;

        stopTimer();

        remainingTime = 0;

        updateTimerDisplay();

        turnIndicator.textContent =
            'TEMPO ESGOTADO';

        stopButton.disabled = true;

        $('stop-label').textContent =
            'TEMPO ESGOTADO';

        // Identifica o jogador eliminado.

        const eliminatedPlayer =
            getCurrentPlayer();

        // Guarda a letra selecionada antes de limpar.

        const consumedLetter =
            selectedLetter;

        // O jogador passa para o estado de espectador.

        eliminatePlayer(
            currentPlayerIndex,
            'timeout'
        );

        if (inTiebreak()) {

            ms.executarImpacto();

        }

        // A letra escolhida continua consumida.

        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        // Descarta respostas que não foram confirmadas.

        resetAnswerInput();

        updateLetters();

        let eliminationMessage =
            `${eliminatedPlayer.nickname} ficou sem tempo e virou espectador!`;

        if (consumedLetter) {

            eliminationMessage +=
                ` Letra ${consumedLetter} consumida.`;

        }

        $('game-status').textContent =
            eliminationMessage;

        if (modoTeste) {

            console.info(
                '[STOP!] Tempo esgotado:',
                eliminatedPlayer.nickname
            );

            console.info(
                '[STOP!] Letra consumida:',
                consumedLetter
            );

        }

        // Se restou apenas um jogador, encerra a rodada.

        if (checkRoundEnd()) return;

        // Passa para o próximo jogador ativo.

        advanceTurn(eliminationMessage);

    }

    // ========================================
    // REATIVAR TODOS OS JOGADORES
    // ========================================

    function reactivatePlayers() {

        players.forEach(player => {

            // Remove a condição de eliminado.

            player.eliminated = false;

            player.spectator = false;

            player.eliminationReason = null;

            // Reinicia apenas os acertos da rodada.

            player.roundHits = 0;

            // score e totalHits não são apagados.

        });

        updatePlayerHits();

        if (modoTeste) {

            console.info(
                '[STOP!] Todos os jogadores foram reativados.'
            );

        }

    }

    // ========================================
    // RESETAR A ROLETA
    // ========================================

    function resetWheel() {

        clearContestOpportunity();

        // Libera novamente todas as letras.

        usedLetters.clear();

        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        updateLetters();

        // As letras permanecem desabilitadas
        // até o primeiro clique no STOP da nova rodada.

    }

    // ========================================
    // RESETAR A INTERFACE DO SORTEIO
    // ========================================

    function resetDrawInterface() {

        // Remove estados das animações anteriores.

        deck.classList.remove('shuffling');

        drawCard.classList.remove('revealed');

        drawOverlay.classList.remove('closing');

        $('drawn-theme').textContent = '';

        drawButton.hidden = false;

        drawButton.disabled = true;

        drawButton.textContent =
            inTiebreak() ? 'SORTEAR TEMA EXTRA' : 'SORTEAR CARTA';

        startRoundButton.hidden = true;

        startRoundButton.disabled = true;

        startRoundButton.textContent = inTiebreak()
            ? 'COMEÇAR DESEMPATE →'
            : 'COMEÇAR RODADA →';

        $('draw-status').textContent =
            `${getCurrentPlayer().nickname} realizará o sorteio.`;

        updateRemainingCards();

    }

    // ========================================
    // PREPARAR A PRÓXIMA RODADA
    // ========================================

    async function prepareNextRound() {

        if (preparacaoOnline) return avancarRodadaOnline();

        if (!roundFinished) return;

        if (matchFinished) return;

        if (isPreparingNextRound) return;

        // Não permite avançar com um empate pendente.

        if (inTiebreak()) return;

        if (pendingRoundTiebreak.length > 0) {

            const finalists = players.filter(player => {

                return pendingRoundTiebreak.includes(player.id);

            });

            beginTiebreak('rodada', finalists);

            return;

        }

        if (round >= config.cards) return;

        if (matchDeck.length === 0) return;

        isPreparingNextRound = true;

        nextRoundButton.disabled = true;

        finishGameButton.disabled = true;

        nextRoundButton.textContent =
            'PREPARANDO...';

        // ====================================
        // GUARDAR O VENCEDOR ANTERIOR
        // ====================================

        const previousWinner = roundWinner;

        // O vencedor realiza o próximo sorteio
        // e será o primeiro jogador da nova rodada.

        if (previousWinner) {

            const winnerIndex = players.findIndex(player => {

                return player.id === previousWinner.id;

            });

            if (winnerIndex !== -1) {

                currentPlayerIndex = winnerIndex;

            }

        } else {

            currentPlayerIndex =
                (currentPlayerIndex + 1) % players.length;

        }

        // ====================================
        // INCREMENTAR A RODADA
        // ====================================

        round++;

        currentCard = null;

        roundStarted = false;

        roundFinished = false;

        roundWinner = null;

        isShuffling = false;

        pendingRoundTiebreak = [];

        // ====================================
        // RESTAURAR JOGADORES E RESPOSTAS
        // ====================================

        reactivatePlayers();

        usedAnswers.clear();

        lastConfirmedAnswer = null;

        // ====================================
        // RESETAR ROLETA E CRONÔMETRO
        // ====================================

        resetWheel();

        resetTimer();

        resetAnswerInput();

        stopButton.disabled = true;

        $('stop-label').textContent =
            'AGUARDE';

        $('current-theme').textContent =
            'Aguardando sorteio...';

        turnIndicator.textContent =
            'PREPARANDO RODADA';

        $('game-status').textContent =
            `${getCurrentPlayer().nickname} realizará o próximo sorteio.`;

        // ====================================
        // ATUALIZAR A INTERFACE
        // ====================================

        updateRound();

        updateRemainingCards();

        renderPlayers();

        resetDrawInterface();

        // ====================================
        // PREPARAR O FUNDO DO NOVO SORTEIO
        // ====================================

        clearTimeout(backgroundCaptureTimer);

        // Mantém a celebração visível durante a captura.
        // Evita exibir uma tela azul ou uma roleta vazia.

        gameScreen.setAttribute('inert', '');

        try {

            // Finaliza uma eventual captura anterior.

            if (backgroundCapturePromise) {

                await backgroundCapturePromise;

            }

            // Captura o jogo já resetado.

            await requestBackgroundCapture();

        } finally {

            // Fecha a celebração.

            roundEndOverlay.hidden = true;

            // Libera a memória dos confetes antigos.

            roundConfetti.replaceChildren();

            resetRoundWinnerInterface();

            // Abre o sorteio com o fundo preparado.

            drawOverlay.hidden = false;

            drawButton.disabled = false;

            isPreparingNextRound = false;

            drawButton.focus();

        }

        if (modoTeste) {

            console.info(
                '[STOP!] Nova rodada preparada:',
                {

                    rodada: round,

                    totalRodadas: config.cards,

                    responsavel: getCurrentPlayer().nickname,

                    cartasRestantes: matchDeck.length,

                    letrasUtilizadas: usedLetters.size,

                    jogadoresAtivos: getActivePlayers().length

                }
            );

            logMatchRanking();

        }

    }

    // ========================================
    // SORTEIO DA CARTA
    // ========================================

    async function drawTheme() {

        if (preparacaoOnline) {
            await enviarSorteioOnline('sorteada');
            return;
        }

        if (players.length < 2) return;

        if (isShuffling) return;

        if (isPreparingNextRound) return;

        if (roundFinished || matchFinished) return;

        if (drawButton.disabled) return;

        if (currentCard) return;

        if (!inTiebreak() && matchDeck.length === 0) return;

        isShuffling = true;

        drawButton.disabled = true;

        drawButton.textContent =
            'EMBARALHANDO...';

        $('draw-status').textContent =
            'Preparando o próximo desafio...';

        // O fundo já foi preparado anteriormente.
        // O sorteio não espera pelo html2canvas.

        deck.classList.add('shuffling');

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        setTimeout(() => {

            // O tema extra é sorteado fora do baralho principal.

            currentCard = inTiebreak()
                ? ms.sortearTema(BANCO_CARTAS, originalRound?.card?.id)
                : matchDeck.pop();

            if (!currentCard) {

                deck.classList.remove('shuffling');

                isShuffling = false;

                drawButton.disabled = false;

                drawButton.textContent = 'TENTAR NOVAMENTE';

                $('draw-status').textContent = 'Nenhum tema disponível.';

                return;

            }

            deck.classList.remove('shuffling');

            $('drawn-theme').textContent =
                currentCard.tema;

            drawCard.classList.add('revealed');

            updateRemainingCards();

            setTimeout(() => {

                drawButton.hidden = true;

                startRoundButton.hidden = false;

                startRoundButton.disabled = false;

                $('draw-status').textContent =
                    'Tema sorteado! Prepare-se.';

                isShuffling = false;

                startRoundButton.focus();

            }, reducedMotion ? 0 : 550);

        }, reducedMotion ? 0 : 960);

    }

    // ========================================
    // LIBERAR A TELA DA ROLETA
    // ========================================

    function startRound() {

        if (preparacaoOnline) {
            enviarSorteioOnline('aberta');
            return;
        }

        if (!currentCard || isShuffling) return;

        if (matchFinished || roundFinished) return;

        if (isPreparingNextRound) return;

        if (startRoundButton.disabled) return;

        startRoundButton.disabled = true;

        $('current-theme').textContent =
            currentCard.tema;

        // Prepara o tempo sem iniciar a contagem.

        resetTimer();

        roundFinished = false;

        roundWinner = null;

        if (!inTiebreak()) {

            pendingRoundTiebreak = [];

        }

        updatePlayerHits();

        usedAnswers.clear();

        lastConfirmedAnswer = null;

        resetAnswerInput();

        drawOverlay.classList.add('closing');

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        setTimeout(() => {

            drawOverlay.hidden = true;

            drawOverlay.classList.remove('closing');

            gameScreen.removeAttribute('inert');

            stopButton.disabled = false;

            $('stop-label').textContent =
                'INICIAR';

            updateTurnIndicator();

            renderPlayers();

            $('game-status').textContent =
                `${getCurrentPlayer().nickname}, pressione STOP! para iniciar.`;

            stopButton.focus();

            if (inTiebreak()) {

                ms.executarImpacto();

            }

            // Atualiza o fundo em segundo plano.

            requestAnimationFrame(() => {

                requestAnimationFrame(() => {

                    // Evita iniciar captura durante a contagem.

                    if (
                        !roundStarted &&
                        !roundFinished &&
                        !matchFinished &&
                        !isPreparingNextRound &&
                        !inTiebreak()
                    ) {

                        requestBackgroundCapture();

                    }

                });

            });

        }, reducedMotion ? 0 : 250);

    }

    // ========================================
    // BOTÃO STOP! — CONTROLE DA JOGADA
    // ========================================

    // ========================================
    // SORTEIO AUTOMÁTICO DA LETRA NO DESEMPATE
    // ========================================

    async function startAutomaticTiebreakTurn() {

        if (!inTiebreak() || !roundStarted) return;

        if (roundFinished || matchFinished || isPreparingNextRound) return;

        if (ms.estaSorteandoLetra() || selectedLetter !== null) return;

        const player = getCurrentPlayer();

        const attempt = ms.obterTentativa();

        const card = currentCard;

        if (!player || player.eliminated) return;

        // O tempo de animação não é descontado do jogador.

        resetTimer();

        resetAnswerInput();

        stopButton.disabled = true;

        $('stop-label').textContent = 'SORTEANDO...';

        $('game-status').textContent =
            `${player.nickname}, aguardando o sorteio da letra...`;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        updateLetters();

        const available = [...alphabet].filter(letter => !usedLetters.has(letter));

        if (available.length === 0) {

            checkRoundEnd();

            return;

        }

        let letter;

        try {

            letter = await ms.sortearLetra(available);

        } catch (error) {

            console.error('[STOP!] Erro no sorteio automático:', error);

        }

        // Impede que uma animação antiga altere outra tentativa.

        if (!inTiebreak() || !roundStarted || roundFinished || matchFinished ||
            ms.obterTentativa() !== attempt || currentCard !== card ||
            getCurrentPlayer() !== player || player.eliminated) return;

        // Se a animação falhar, sorteia sem efeito visual.

        if (!available.includes(letter) || usedLetters.has(letter)) {

            const remaining = available.filter(item => !usedLetters.has(item));

            if (!remaining.length) {

                checkRoundEnd();

                return;

            }

            letter = remaining[Math.floor(Math.random() * remaining.length)];

        }

        // Consome a letra sorteada sem liberar seleção manual.

        selectedLetter = letter;

        usedLetters.add(letter);

        $('selected-letter-box').hidden = false;

        $('selected-letter').textContent = letter;

        updateLetters();

        stopButton.disabled = false;

        $('stop-label').textContent = 'CONFIRMAR';

        $('game-status').textContent = config.mode === 'sem-call'
            ? `Letra ${letter} sorteada! Digite sua resposta.`
            : `Letra ${letter} sorteada! Fale a resposta e pressione STOP!`;

        // Inicia o cronômetro somente após revelar a letra.

        startTimer();

        if (config.mode === 'sem-call') {

            enableAnswerInput();

        } else {

            stopButton.focus({ preventScroll: true });

        }

    }

    function handleStop() {

        if (preparacaoOnline) {
            enviarJogadaOnline(turnoAtualOnline ? 'resposta' : 'iniciar');
            return;
        }

        if (inContest() || finalContestWindow) return;

        if (!currentCard) return;

        if (roundFinished || matchFinished) return;

        if (isPreparingNextRound) return;

        if (timeExpired) return;

        if (stopButton.disabled) return;

        if (players[currentPlayerIndex].eliminated) return;

        // Primeiro clique: inicia a rodada.

        if (!roundStarted) {

            roundStarted = true;

            $('stop-label').textContent =
                'REINICIAR';

            $('game-status').textContent =
                inTiebreak()
                    ? `${getCurrentPlayer().nickname}, aguarde o sorteio.`
                    : `${getCurrentPlayer().nickname}, escolha uma letra livre.`;

            updateTurnIndicator();

            updateLetters();

            if (inTiebreak()) {

                startAutomaticTiebreakTurn();

            } else {

                startTimer();

            }

            return;

        }

        if (!validateTimer()) return;

        // Confirma a jogada de acordo com o modo.

        confirmAnswer();

    }

    // ========================================
    // IDENTIFICAR FINALISTAS EMPATADOS
    // ========================================

    function getMatchFinalists() {

        const ranking = getMatchRanking();

        if (ranking.length === 0) return [];

        const leader = ranking[0];

        // Identifica jogadores empatados nos dois critérios.

        return ranking.filter(player => {

            return (

                player.score === leader.score &&

                player.totalHits === leader.totalHits

            );

        });

    }

    // ========================================
    // NOVO: EXIBIR EMPATE PELO CAMPEONATO
    // ========================================

    function showFinalTiebreak(finalists) {

        pendingMatchTiebreak =
            finalists.map(player => player.id);

        const names = finalists

            .map(player => player.nickname)

            .join(', ');

        // Limpa a celebração do último vencedor.

        resetRoundWinnerInterface();

        roundEndOverlay.classList.add(
            'is-tiebreak'
        );

        roundWinnerNumber.textContent =
            'DESEMPATE FINAL';

        roundWinnerEyebrow.textContent =
            'O CAMPEONATO AINDA NÃO ACABOU!';

        roundEndTitle.textContent =
            'MORTE SÚBITA FINAL!';

        roundEndPlayer.textContent =
            'Temos um empate pelo campeonato!';

        roundEndReason.textContent =
            `${names} terminaram empatados em cartas e acertos totais.`;

        roundWinnerMedal.hidden = true;

        roundWinnerReward.hidden = true;

        roundWinnerStats.hidden = true;

        roundWinnerThemeBox.hidden = true;

        roundWinnerNext.textContent =
            'A morte súbita definirá o verdadeiro campeão.';

        nextRoundButton.hidden = true;

        nextRoundButton.disabled = true;

        finishGameButton.hidden = false;

        finishGameButton.disabled = !ms;

        finishGameButton.textContent =
            'INICIAR MORTE SÚBITA →';

        turnIndicator.textContent =
            'MORTE SÚBITA';

        roundEndOverlay.scrollTop = 0;

        roundEndOverlay.setAttribute(
            'tabindex',
            '-1'
        );

        roundEndOverlay.focus({
            preventScroll: true
        });

        if (modoTeste) {

            console.info(
                '[STOP!] Morte súbita final necessária:',
                pendingMatchTiebreak
            );

        }

        // Não declara um campeão arbitrariamente.
        // O botão acima abre o desempate decisivo.

        if (!finishGameButton.disabled) {

            finishGameButton.focus();

        }

    }

    // ========================================
    // NOVO: ENCERRAMENTO DA PARTIDA
    // ========================================

    function finishMatch() {

        if (preparacaoOnline) { prepararResultadoFinalOnline(); return; }

        // Exige que a última rodada esteja encerrada.

        if (!roundFinished) return;

        if (matchFinished) return;

        if (isPreparingNextRound) return;

        if (pendingRoundTiebreak.length > 0) return;

        if (inTiebreak()) return;

        if (matchDeck.length > 0) return;

        if (round !== config.cards) return;

        // Confere se todas as rodadas foram registradas.

        if (roundHistory.length !== config.cards) {

            roundWinnerNext.textContent =
                'Não foi possível confirmar todas as rodadas da partida.';

            return;

        }

        if (pendingMatchTiebreak.length > 0 && !finalChampion) {

            const tiedPlayers = players.filter(player => {

                return pendingMatchTiebreak.includes(player.id);

            });

            beginTiebreak('final', tiedPlayers);

            return;

        }

        // ====================================
        // CLASSIFICAÇÃO FINAL
        // ====================================

        const finalists = finalChampion
            ? [finalChampion]
            : getMatchFinalists();

        // Caso exista empate absoluto,
        // será necessário realizar uma morte súbita.

        if (finalists.length > 1) {

            showFinalTiebreak(finalists);

            return;

        }

        if (finalists.length === 0) {

            roundWinnerNext.textContent =
                'Não foi possível identificar o campeão.';

            return;

        }

        const champion = finalists[0];

        const ranking = getMatchRanking();

        // Preserva os critérios normais e coloca o campeão
        // da morte súbita à frente dos demais empatados.

        if (finalChampion) {

            ranking.sort((a, b) => {

                return b.score - a.score ||
                    b.totalHits - a.totalHits ||
                    Number(b.id === champion.id) - Number(a.id === champion.id);

            });

        }

        // ====================================
        // DADOS DO RESULTADO FINAL
        // ====================================

        const matchResult = {

            roomCode: config.roomCode,

            mode: config.mode,

            totalRounds: config.cards,

            completedRounds: roundHistory.length,

            champion: {

                id: champion.id,

                nickname: champion.nickname,

                avatar: getPlayerAvatar(champion),

                score: champion.score,

                totalHits: champion.totalHits

            },

            ranking: ranking.map(player => ({

                id: player.id,

                nickname: player.nickname,

                avatar: getPlayerAvatar(player),

                score: player.score,

                totalHits: player.totalHits

            })),

            rounds: roundHistory,

            tiebreaks: tiebreakHistory,

            contestacoes: contestacao ? contestacao.obterHistorico() : [],

            decidedByTiebreak: Boolean(finalChampion),

            modoTeste: modoTeste

        };

        // ====================================
        // SALVAR RESULTADO REAL DA PARTIDA
        // ====================================

        try {

            sessionStorage.setItem(
                'matchResult',
                JSON.stringify(matchResult)
            );

        } catch (error) {

            console.error(
                '[STOP!] Erro ao salvar resultado:',
                error
            );

            roundWinnerNext.textContent =
                'Não foi possível salvar o resultado da partida. Tente novamente.';

            return;

        }

        // Bloqueia novas ações depois de salvar o resultado.

        matchFinished = true;

        stopTimer();

        clearTimeout(backgroundCaptureTimer);

        nextRoundButton.hidden = true;

        nextRoundButton.disabled = true;

        finishGameButton.disabled = true;

        finishGameButton.textContent =
            'CARREGANDO RESULTADO...';

        roundWinnerNext.textContent =
            'Preparando a classificação final...';

        turnIndicator.textContent =
            'PARTIDA ENCERRADA';

        $('stop-label').textContent =
            'FINALIZADO';

        $('game-status').textContent =
            `${champion.nickname} venceu a partida!`;

        // Libera a memória dos confetes.

        roundConfetti.replaceChildren();

        if (modoTeste) {

            console.info(
                '[STOP!] Partida encerrada:',
                matchResult
            );

            logMatchRanking();

        }

        // ====================================
        // ABRIR A TELA REAL DO CAMPEÃO
        // ====================================

        // Não acrescenta ?teste=resultado.
        // Assim, resultado.html recebe os dados reais
        // da partida, inclusive quando jogada no teste.

        window.location.href =
            'resultado.html';

    }

    // ========================================
    // INTEGRAÇÃO DA MORTE SÚBITA
    // ========================================

    function setTiebreakLabels(active) {

        $('ms-status-badge').hidden = !active;

        $('game-eyebrow').textContent = active
            ? 'DESEMPATE DECISIVO' : '02 / PARTIDA';

        $('game-title').textContent = active
            ? 'Tudo ou nada!' : 'Uma letra. Mil respostas!';

        $('game-description').textContent = active
            ? 'Uma letra pode decidir tudo.' : 'Pense na resposta e escolha uma letra livre.';

        $('theme-section-title').textContent = active
            ? 'TEMA EXTRA' : 'TEMA DA RODADA';

        $('players-heading-title').textContent = active
            ? 'FINALISTAS' : 'NA MESA';

        $('players-score-label').textContent = active
            ? 'ACERTOS NO DESEMPATE' : 'PONTOS EM CARTAS';

        $('draw-title').textContent = active
            ? 'Qual será o tema decisivo?' : 'Qual vai ser o desafio?';

        $('draw-description').textContent = active
            ? 'Um tema extra. Uma última disputa.' : 'Uma carta. Um tema. Mil possibilidades.';

        $('draw-card-caption').textContent = active
            ? 'TEMA EXTRA' : 'TEMA DA RODADA';

        $('game-footer-message').textContent = active
            ? 'APENAS UM SAIRÁ VENCEDOR.' : 'PENSE RÁPIDO. JOGUE JUNTO. DÊ STOP!';

    }

    // Interrompe a partida enquanto a introdução estiver visível.

    function pauseForTiebreak() {

        clearContestOpportunity();

        if (ms) ms.cancelarSorteioLetra();

        stopTimer();

        clearTimeout(backgroundCaptureTimer);

        roundStarted = false;

        roundFinished = true;

        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        stopButton.disabled = true;

        nextRoundButton.disabled = true;

        finishGameButton.disabled = true;

        resetAnswerInput();

        updateLetters();

        gameScreen.setAttribute('inert', '');

        drawOverlay.hidden = true;

        roundEndOverlay.hidden = true;

        roundConfetti.replaceChildren();

        turnIndicator.textContent = 'MORTE SÚBITA';

    }

    // Preserva a rodada original antes de utilizar o tema extra.

    function beginTiebreak(type, finalists) {

        if (!ms || !ms.iniciar(type, finalists)) {

            roundWinnerNext.textContent =
                'Não foi possível iniciar o desempate. Verifique morte-subita.js.';

            return false;

        }

        originalRound = {

            card: currentCard,

            letters: [...usedLetters],

            winner: roundWinner,

            playerIndex: currentPlayerIndex,

            players: players.map(player => ({

                id: player.id,

                eliminated: player.eliminated,

                spectator: player.spectator,

                eliminationReason: player.eliminationReason

            }))

        };

        pauseForTiebreak();

        if (!ms.mostrarIntroducao(players)) {

            ms.resetar();

            originalRound = null;

            roundEndOverlay.hidden = false;

            if (type === 'rodada') {

                nextRoundButton.disabled = false;

            } else {

                finishGameButton.disabled = false;

            }

            roundWinnerNext.textContent = 'Verifique a introdução no jogo.html.';

            return false;

        }

        return true;

    }

    // Prepara a tentativa usando a roleta e o cronômetro originais.

    async function prepareTiebreak() {

        if (preparacaoOnline) return;

        if (!inTiebreak() || isPreparingNextRound || matchFinished) return;

        if (msStartButton.disabled) return;

        msStartButton.disabled = true;

        isPreparingNextRound = true;

        roundFinished = false;

        roundStarted = false;

        roundWinner = null;

        currentCard = null;

        isShuffling = false;

        const finalists = ms.obterParticipantes();

        // Mantém a ordem circular da mesa, começando pelo
        // próximo finalista disponível.

        for (let offset = 1; offset <= players.length; offset++) {

            const index = (currentPlayerIndex + offset) % players.length;

            if (finalists.includes(players[index].id)) {

                currentPlayerIndex = index;

                break;

            }

        }

        players.forEach(player => {

            player.eliminated = !ms.jogadorParticipa(player.id);

            player.spectator = player.eliminated;

            player.eliminationReason = player.eliminated ? 'not-finalist' : null;

        });

        usedAnswers.clear();

        lastConfirmedAnswer = null;

        resetWheel();

        resetTimer();

        resetAnswerInput();

        stopButton.disabled = true;

        $('stop-label').textContent = 'AGUARDE';

        $('current-theme').textContent = 'Aguardando tema extra...';

        $('game-status').textContent =
            `${getCurrentPlayer().nickname} realizará o sorteio decisivo.`;

        setTiebreakLabels(true);

        ms.ativarEfeitos();

        updateRound();

        renderPlayers();

        resetDrawInterface();

        try {

            if (backgroundCapturePromise) {

                await backgroundCapturePromise;

            }

            await requestBackgroundCapture();

        } finally {

            ms.esconderIntroducao();

            drawOverlay.hidden = false;

            drawButton.disabled = false;

            isPreparingNextRound = false;

            drawButton.focus();

        }

    }

    // Repete a disputa quando os finalistas permanecem empatados.

    function repeatTiebreak(finalists) {

        if (!ms.repetir(finalists)) return false;

        pauseForTiebreak();

        ms.desativarEfeitos();

        ms.mostrarIntroducao(players);

        return true;

    }

    function checkTiebreakEnd() {

        const result = ms.verificarResultado(
            players,
            usedLetters.size,
            alphabet.length
        );

        if (result.status === 'vencedor') {

            completeTiebreak(result.jogador, result.motivo);

            return true;

        }

        if (result.status === 'novo-empate') {

            return repeatTiebreak(result.jogadores);

        }

        if (result.status === 'sem-vencedor') {

            return repeatTiebreak(players.filter(player => {

                return ms.jogadorParticipa(player.id);

            }));

        }

        return false;

    }

    // Restaura a partida original após definir o vencedor.

    function completeTiebreak(winner, reason) {

        const result = ms.finalizar(winner);

        if (!result) return;

        tiebreakHistory.push({ ...result, round, reason });

        pauseForTiebreak();

        currentCard = originalRound.card;

        usedLetters.clear();

        originalRound.letters.forEach(letter => usedLetters.add(letter));

        players.forEach(player => {

            const saved = originalRound.players.find(item => item.id === player.id);

            player.eliminated = saved.eliminated;

            player.spectator = saved.spectator;

            player.eliminationReason = saved.eliminationReason;

        });

        roundWinner = originalRound.winner;

        currentPlayerIndex = originalRound.playerIndex;

        originalRound = null;

        pendingRoundTiebreak = [];

        pendingMatchTiebreak = [];

        usedAnswers.clear();

        lastConfirmedAnswer = null;

        setTiebreakLabels(false);

        ms.resetar();

        updateRound();

        updateRemainingCards();

        $('current-theme').textContent = currentCard?.tema || '—';

        resetTimer();

        updateLetters();

        renderPlayers();

        if (result.tipo === 'rodada') {

            // A carta e o histórico pertencem à rodada original.

            roundFinished = false;

            finishRound(winner, `Vitória na morte súbita! ${reason}`);

        } else {

            // Nenhuma carta ou acerto normal adicional é concedido.

            finalChampion = winner;

            roundFinished = true;

            resetRoundWinnerInterface();

            roundWinnerNumber.textContent = 'DESEMPATE FINAL';

            roundEndTitle.textContent = 'CAMPEÃO DEFINIDO!';

            roundEndReason.textContent = 'Vitória na morte súbita final!';

            roundEndPlayer.textContent = winner.nickname;

            roundWinnerAvatar.textContent = getPlayerAvatar(winner);

            roundWinnerReward.hidden = true;

            roundWinnerStats.hidden = true;

            roundWinnerThemeBox.hidden = true;

            roundEndOverlay.hidden = false;

            finishGameButton.hidden = false;

            finishGameButton.disabled = false;

            finishGameButton.textContent = 'VER RESULTADO FINAL →';

            finishMatch();

        }

    }

    if (msStartButton) {

        msStartButton.addEventListener('click', prepareTiebreak);

    }

    // ========================================
    // CONTROLE DA CONTESTAÇÃO NA PARTIDA
    // ========================================

    function getContestadorId() {

        if (!contestacao || !lastConfirmedAnswer) return null;

        if (!roundStarted || roundFinished || matchFinished ||
            isPreparingNextRound || inContest()) return null;

        // O teste local controla todos os jogadores. Na futura sala online,
        // somente a identidade do jogador local poderá iniciar a votação.
        // Espectadores também são elegíveis: o módulo recebe todos da sala.

        if (modoTeste) {

            const current = getCurrentPlayer();

            if (current && contestacao.podeContestar(lastConfirmedAnswer, current.id, players)) {

                return current.id;

            }

            const eligible = players.find(player =>
                contestacao.podeContestar(lastConfirmedAnswer, player.id, players)
            );

            return eligible ? eligible.id : null;

        }

        return contestacao.podeContestar(lastConfirmedAnswer, 'host', players)
            ? 'host' : null;

    }

    function updateContestButton() {

        if (!contestButton) return;

        if (preparacaoOnline) {
            contestButton.disabled = !podeContestarOnline();
            contestButton.title = contestButton.disabled ? 'Aguardando uma resposta contestável.' : 'Contestar a última resposta.';
            return;
        }

        const allowed = Boolean(timerRunning && getContestadorId());

        contestButton.disabled = !allowed;

        contestButton.title = allowed
            ? `Contestar a resposta de ${lastConfirmedAnswer.playerName}`
            : players.length < 3
                ? 'São necessários pelo menos três participantes na sala.'
                : 'Aguardando uma resposta que possa ser contestada.';

    }

    function clearContestOpportunity() {

        lastConfirmedAnswer = null;

        finalContestWindow = false;

        updateContestButton();

    }

    // A última letra exige uma oportunidade de contestação antes de
    // decidir o vencedor. O prazo é o mesmo tempo configurado na sala.

    function openFinalContestWindow() {

        if (!getContestadorId()) return false;

        finalContestWindow = true;

        resetAnswerInput();

        stopButton.disabled = true;

        $('stop-label').textContent = 'AGUARDE';

        turnIndicator.textContent = 'CONTESTAÇÃO FINAL';

        $('game-status').textContent =
            `Última resposta: ${lastConfirmedAnswer.playerName}. Conteste antes que o prazo termine.`;

        updateLetters();

        renderPlayers();

        startTimer();

        return true;

    }

    function closeFinalContestWindow() {

        clearContestOpportunity();

        stopTimer();

        checkRoundEnd();

    }

    // Pausa o relógio com precisão de milissegundos. O jogador não
    // recebe tempo adicional após a votação e mantém a resposta digitada.

    function openContest() {

        if (preparacaoOnline) { abrirContestacaoOnline(); return; }

        const contestadorId = getContestadorId();

        if (!contestadorId || !timerRunning || !contestButton || contestButton.disabled) return;

        if (!$('contestacao-overlay')) return;

        const milliseconds = timerDeadline - performance.now();

        if (milliseconds <= 0) {

            handleTimeExpired();

            return;

        }

        const response = lastConfirmedAnswer;

        const paused = {

            milliseconds,

            playerId: getCurrentPlayer().id,

            selectedLetter,

            stopDisabled: stopButton.disabled,

            inputDisabled: answerInput.disabled,

            submitDisabled: answerSubmit.disabled,

            status: $('game-status').textContent,

            label: $('stop-label').textContent,

            turn: turnIndicator.textContent,

            finalWindow: finalContestWindow

        };

        const started = contestacao.iniciar({

            resposta: response,

            contestadorId,

            jogadores: players,

            jogadorLocalId: modoTeste ? contestadorId : 'host',

            modoTeste,

            aoFinalizar: result => applyContestResult(response, result),

            aoContinuar: resumeAfterContest

        });

        if (!started) return;

        pausedContestTurn = paused;

        response.contested = true;

        stopTimer();

        remainingTime = Math.ceil(milliseconds / 1000);

        updateTimerDisplay();

        stopButton.disabled = true;

        answerInput.disabled = true;

        answerSubmit.disabled = true;

        $('stop-label').textContent = 'PAUSADO';

        turnIndicator.textContent = 'EM VOTAÇÃO';

        gameScreen.setAttribute('inert', '');

        updateLetters();

        updateContestButton();

    }

    function applyContestResult(response, result) {

        if (!response || result.respostaId !== response.id) return;

        response.contested = true;

        response.contestResult = { ...result };

        if (result.rejeitada && response.status === 'accepted') {

            response.status = 'rejected';

            if (response.normalizedAnswer !== null) {

                usedAnswers.delete(response.normalizedAnswer);

            }

            // Os acertos da morte súbita são contabilizados separadamente.

            if (response.isTiebreak && inTiebreak()) {

                ms.removerAcerto(response.playerId);

            }

            updatePlayerHits();

            const index = players.findIndex(player => player.id === response.playerId);

            if (index !== -1) {

                eliminatePlayer(index, 'contestacao', response.letter);

            }

            // A letra contestada permanece consumida.

        }

        updatePlayerHits();

        renderPlayers();

        if (modoTeste) {

            console.info('[STOP!] Resultado da contestação:', result);

            logMatchRanking();

        }

    }

    function resumeAfterContest(result) {

        const paused = pausedContestTurn;

        pausedContestTurn = null;

        clearContestOpportunity();

        if (!paused || roundFinished || matchFinished) return;

        gameScreen.removeAttribute('inert');

        // O resultado da votação da última letra precisa ser aplicado
        // antes de atribuir uma carta ou iniciar um desempate.

        if (paused.finalWindow) {

            stopTimer();

            checkRoundEnd();

            return;

        }

        // Não verifica as letras esgotadas aqui: a última letra pode
        // estar selecionada, mas ainda não ter sido respondida.

        if (getActivePlayers().length <= 1) {

            checkRoundEnd();

            return;

        }

        if (getCurrentPlayer().id !== paused.playerId || getCurrentPlayer().eliminated) {

            advanceTurn('Votação encerrada.');

            return;

        }

        selectedLetter = paused.selectedLetter;

        stopButton.disabled = paused.stopDisabled;

        answerInput.disabled = paused.inputDisabled;

        answerSubmit.disabled = paused.submitDisabled;

        $('stop-label').textContent = paused.label;

        turnIndicator.textContent = paused.turn;

        $('game-status').textContent = result.rejeitada
            ? `${result.jogadorNome} foi eliminado. ${paused.status}`
            : `Resposta aceita. ${paused.status}`;

        // Restaura o prazo original, sem reiniciar o turno.

        stopTimer();

        timerRunning = true;

        timeExpired = false;

        timerDeadline = performance.now() + paused.milliseconds;

        remainingTime = Math.ceil(paused.milliseconds / 1000);

        updateTimerDisplay();

        timerInterval = setInterval(updateTimer, 100);

        updateLetters();

        renderPlayers();

        updateContestButton();

        if (!answerInput.disabled) {

            answerInput.focus({ preventScroll: true });

        } else if (!stopButton.disabled) {

            stopButton.focus({ preventScroll: true });

        }

    }

    if (contestButton) {

        contestButton.addEventListener('click', openContest);

    }

    // ========================================
    // EVENTOS
    // ========================================

    drawButton.addEventListener(

        'click',

        drawTheme

    );

    startRoundButton.addEventListener(

        'click',

        startRound

    );

    stopButton.addEventListener(

        'click',

        handleStop

    );

    // Avança para a próxima rodada.

    nextRoundButton.addEventListener(

        'click',

        prepareNextRound

    );

    // Finaliza a partida e abre resultado.html.

    finishGameButton.addEventListener(

        'click',

        finishMatch

    );

    $('back-button').addEventListener('click', async () => {

        if (preparacaoOnline) {
            if (!roomConfig.isHost || $('back-button').disabled || placarFinalOnline || finalizandoOnline) return;
            $('back-button').disabled = true;
            preparacaoOnline.cancelando = true;
            atualizarBotoesSorteioOnline();
            try {
                const raiz = preparacaoOnline.ref(preparacaoOnline.database);
                const caminho = `salas/${config.roomCode}`;
                await preparacaoOnline.update(raiz, {
                    [`${caminho}/status`]: 'aguardando',
                    [`${caminho}/rodadas`]: null,
                    [`${caminho}/cartasUsadas`]: null,
                    [`${caminho}/desempates`]: null,
                    [`votosDesempate/${config.roomCode}`]: null,
                    [`votosContestacao/${config.roomCode}`]: null
                });
                window.location.replace('lobby.html');
            } catch (erro) {
                preparacaoOnline.cancelando = false;
                console.error('[STOP!] Erro ao retornar ao lobby:', erro);
                $('game-status').textContent = 'Não foi possível retornar. Tente novamente.';
                $('back-button').disabled = false;
                atualizarBotoesSorteioOnline();
            }
            return;
        }

        if (contestacao) contestacao.resetar();

        clearContestOpportunity();

        stopTimer();

        clearTimeout(backgroundCaptureTimer);

        if (ms) {

            ms.resetar();

        }

        if (modoTeste) {

            window.location.href = 'index.html';

            return;

        }

        window.location.href = 'lobby.html';

    });

    // ========================================
    // ENVIO DA RESPOSTA — ENTER OU SETA
    // ========================================

    answerForm.addEventListener('submit', event => {

        event.preventDefault();

        if (config.mode !== 'sem-call') return;

        if (!roundStarted || timeExpired) return;

        if (roundFinished || matchFinished) return;

        if (getCurrentPlayer().eliminated) return;

        if (!selectedLetter) return;

        if (answerInput.disabled) return;

        // Utiliza a mesma confirmação do botão STOP!.

        confirmAnswer();

    });

    // ========================================
    // ALTERAÇÃO DO CAMPO DE RESPOSTA
    // ========================================

    answerInput.addEventListener('input', () => {

        if (
            answerInput.getAttribute('aria-invalid') === 'true'
        ) {

            answerInput.removeAttribute('aria-invalid');

            if (
                config.mode === 'sem-call' &&
                selectedLetter &&
                !timeExpired &&
                !roundFinished &&
                !matchFinished
            ) {

                $('game-status').textContent =
                    `Digite uma resposta com a letra ${selectedLetter}.`;

            }

        }

    });

    // Confere o tempo ao retornar para a aba.

    document.addEventListener('visibilitychange', () => {

        if (!document.hidden && timerRunning) {

            updateTimer();

        }

    });

    // ========================================
    // SORTEIO ONLINE — RODADAS SINCRONIZADAS
    // ========================================

    let sorteioOnline = null;
    let sorteioConectado = false;
    let sorteioEnviando = false;
    let sorteioCapturado = false;
    let sorteioAnimando = false;
    let sorteioPrimeiraLeitura = true;
    let sorteioGeracao = 0;
    let voltarSorteio = null;

    // ========================================
    // ROLETA E TURNOS ONLINE — RODADAS SINCRONIZADAS
    // ========================================

    // Cada turno é registrado uma única vez. O relógio é calculado
    // localmente a partir do horário de início gravado pelo servidor.
    let jogadasOnline = null;
    let turnoAtualOnline = null;
    let assinaturaJogadasOnline = null;
    let jogadaEnviando = false;
    let deslocamentoServidor = 0;
    let relogioOnlinePronto = false;
    let intervaloOnline = null;
    let proximaTentativaExpiracao = 0;
    let voltarResultadoOnline = null;
    let rodadasOnline = {};
    let cartasUsadasOnline = {};
    let iniciadorOnline = 1;
    let desempatesOnline = {};
    let chaveDesempateOnline = null;
    let tentativaDesempateOnline = null;
    let msEnviando = false;
    let proximaTentativaMs = 0;
    let placarFinalOnline = null;
    let resultadoFinalOnline = null;
    let finalizandoOnline = false;
    let proximaTentativaFinal = 0;

    // Cada carta tem peso superior ao máximo de acertos da partida (26 x 26).
    // A comparação de um inteiro preserva exatamente os dois critérios do ranking.
    const PESO_CARTA_ONLINE = 677;
    function calcularPlacarFinalOnline(ultimaVaga) {
        const valores = {};
        for (const jogador of players) {
            let pontos = 0;
            for (let n = 1; n <= config.cards; n++) {
                const dados = rodadasOnline[n]?.jogadas;
                if (!dados?.fim) throw new Error('Rodada incompleta: ' + n);
                const vencedor = n === config.cards ? ultimaVaga : dados.vencedor;
                if (!vencedor) throw new Error('Rodada sem vencedor: ' + n);
                pontos += (vencedor === jogador.vaga ? PESO_CARTA_ONLINE : 0) + (dados.acertos?.[jogador.vaga] || 0);
            }
            valores[jogador.vaga] = pontos;
        }
        return { valores, lider: Math.max(...Object.values(valores)) };
    }

    function lideresFinalOnline() {
        if (!placarFinalOnline) return [];
        return players.filter(p => placarFinalOnline.valores?.[p.vaga] === placarFinalOnline.lider);
    }

    async function prepararResultadoFinalOnline() {
        if (!roundFinished || round !== config.cards || !roundWinner || placarFinalOnline ||
            roundWinner.id !== preparacaoOnline.uid || !sorteioConectado || finalizandoOnline || preparacaoOnline.cancelando) return;
        finalizandoOnline = true;
        finishGameButton.disabled = true;
        try {
            const vaga = roundWinner.vaga;
            const placar = calcularPlacarFinalOnline(vaga);
            await preparacaoOnline.update(preparacaoOnline.referencia, {
                [`rodadas/${round}/jogadas/vencedor`]: vaga,
                placarFinal: placar
            });
        } catch (erro) {
            console.error('[STOP!] Falha ao confirmar o placar final:', erro);
            roundWinnerNext.textContent = 'Não foi possível confirmar a classificação. Tente novamente.';
        } finally {
            finalizandoOnline = false;
            atualizarControlesJogadaOnline();
            avancarFinalOnline();
        }
    }

    // O desempate pelo campeonato usa rodada 0, sem consumir uma carta.
    async function avancarFinalOnline() {
        if (!placarFinalOnline || chaveDesempateOnline || resultadoFinalOnline || finalizandoOnline ||
            !sorteioConectado || !relogioOnlinePronto || Date.now() < proximaTentativaFinal) return;
        const lideres = lideresFinalOnline();
        if (lideres.length === 1) { publicarResultadoOnline(lideres[0]); return; }
        if (lideres.length < 2) return;
        finalizandoOnline = true;
        proximaTentativaFinal = Date.now() + 1800;
        try {
            await preparacaoOnline.set(preparacaoOnline.ref(preparacaoOnline.database,
                `salas/${config.roomCode}/desempates/0-1`), {
                rodada: 0, numero: 1, origem: 'placarFinal', maiorAcerto: placarFinalOnline.lider,
                participantes: Object.fromEntries(lideres.map(p => [p.vaga, true])), iniciador: lideres[0].vaga
            });
        } catch (erro) {
            console.debug('[STOP!] Desempate pelo campeonato:', erro.code || erro.message);
        } finally { finalizandoOnline = false; }
    }

    async function publicarResultadoOnline(vencedor, chave = null) {
        if (resultadoFinalOnline || finalizandoOnline || !sorteioConectado || Date.now() < proximaTentativaFinal) return;
        finalizandoOnline = true;
        proximaTentativaFinal = Date.now() + 1800;
        try {
            const resultado = { vaga: vencedor.vaga };
            if (chave) resultado.desempate = chave;
            await preparacaoOnline.update(preparacaoOnline.referencia, { resultadoFinal: resultado, status: 'encerrada' });
        } catch (erro) {
            console.debug('[STOP!] Encerramento da partida:', erro.code || erro.message);
        } finally {
            finalizandoOnline = false;
            if (resultadoFinalOnline) abrirResultadoFinalOnline();
        }
    }

    function abrirResultadoFinalOnline() {
        if (matchFinished || finalizandoOnline || !placarFinalOnline || !resultadoFinalOnline) return;
        const ranking = players.map(p => {
            const valor = placarFinalOnline.valores?.[p.vaga];
            if (!Number.isInteger(valor) || valor < 0) return null;
            return { id: p.id, nickname: p.nickname, avatar: getPlayerAvatar(p),
                score: Math.floor(valor / PESO_CARTA_ONLINE), totalHits: valor % PESO_CARTA_ONLINE };
        });
        if (ranking.some(p => !p)) return;
        const campeaoId = players.find(p => p.vaga === resultadoFinalOnline.vaga)?.id;
        const champion = ranking.find(p => p.id === campeaoId);
        if (!champion) return;
        ranking.sort((a,b) => b.score-a.score || b.totalHits-a.totalHits || Number(b.id===campeaoId)-Number(a.id===campeaoId));
        try {
            sessionStorage.setItem('matchResult', JSON.stringify({ roomCode: config.roomCode, mode: config.mode,
                totalRounds: config.cards, completedRounds: config.cards, champion, ranking,
                decidedByTiebreak: Boolean(resultadoFinalOnline.desempate), modoTeste: false, online: true }));
        } catch (erro) {
            console.error('[STOP!] Não foi possível salvar o resultado:', erro);
            $('game-status').textContent = 'Não foi possível salvar o resultado. Atualize a página para tentar novamente.';
            return;
        }
        matchFinished = true;
        stopTimer();
        clearInterval(intervaloOnline);
        contestacao?.sincronizarOnline(null);
        ms?.resetar();
        window.location.replace('resultado.html');
    }


    function caminhoSequenciaOnline() {
        return chaveDesempateOnline ? `desempates/${chaveDesempateOnline}` : `rodadas/${round}`;
    }

    function raizSequenciaOnline() {
        return `salas/${config.roomCode}/${caminhoSequenciaOnline()}`;
    }

    function sorteioLetraOnline() {
        const livres = [...alphabet].filter(letra => !usedLetters.has(letra));
        if (!livres.length) throw new Error('Não há letras livres.');
        const indice = new Uint32Array(1);
        crypto.getRandomValues(indice);
        return livres[indice[0] % livres.length];
    }

    function anexarTurnoOnline(alteracoes, numero, vaga, anteriorVaga) {
        const turno = { numero, vaga, anteriorVaga, inicioEm: preparacaoOnline.serverTimestamp() };
        if (chaveDesempateOnline) {
            turno.letra = sorteioLetraOnline();
            alteracoes[`jogadas/letras/${turno.letra}`] = numero;
        }
        alteracoes[`jogadas/turnos/${numero}`] = turno;
        alteracoes['jogadas/atual'] = numero;
    }

    function lideresSequenciaOnline(dados, tentativa = null) {
        const ativos = players.filter(p => (!tentativa || tentativa.participantes?.[p.vaga]) && !dados?.eliminados?.[p.vaga]);
        const maior = Math.max(0, ...ativos.map(p => dados?.acertos?.[p.vaga] || 0));
        return { maior, lideres: ativos.filter(p => (dados?.acertos?.[p.vaga] || 0) === maior) };
    }

    async function criarDesempateOnline(lideres, maior) {
        if (msEnviando || !sorteioConectado || preparacaoOnline.cancelando || Date.now() < proximaTentativaMs) return;
        const numero = (tentativaDesempateOnline?.numero || 0) + 1;
        const rodada = tentativaDesempateOnline?.rodada === 0 ? 0 : round;
        const chave = `${rodada}-${numero}`;
        const origem = caminhoSequenciaOnline();
        const participantes = Object.fromEntries(lideres.map(p => [p.vaga, true]));
        const iniciador = lideres.find(p => p.vaga > (turnoAtualOnline?.vaga || 0))?.vaga || lideres[0].vaga;
        msEnviando = true;
        proximaTentativaMs = Date.now() + 1800;
        $('game-status').textContent = 'Empate! Sincronizando a morte súbita...';
        try {
            await preparacaoOnline.set(preparacaoOnline.ref(preparacaoOnline.database, `salas/${config.roomCode}/desempates/${chave}`), {
                rodada, numero, origem, maiorAcerto: maior, participantes, iniciador
            });
        } catch (erro) {
            console.debug('[STOP!] Criação do desempate:', erro.code || erro.message);
        } finally { msEnviando = false; }
    }

    async function registrarVencedorDesempateOnline(vencedor) {
        if (msEnviando || !sorteioConectado || preparacaoOnline.cancelando || Date.now() < proximaTentativaMs) return;
        const chave = chaveDesempateOnline;
        const rodada = round;
        msEnviando = true;
        proximaTentativaMs = Date.now() + 1800;
        try {
            if (!jogadasOnline.vencedor) {
                await preparacaoOnline.set(preparacaoOnline.ref(preparacaoOnline.database, `salas/${config.roomCode}/desempates/${chave}/jogadas/vencedor`), vencedor.vaga);
            }
            if (tentativaDesempateOnline?.rodada === 0) {
                // O vencedor extra não recebe carta nem acertos da partida.
                proximaTentativaFinal = 0;
                await publicarResultadoOnline(vencedor, chave);
            } else {
                await preparacaoOnline.set(preparacaoOnline.ref(preparacaoOnline.database, `salas/${config.roomCode}/rodadas/${rodada}/desempate`), chave);
            }
        } catch (erro) {
            console.debug('[STOP!] Confirmação do vencedor do desempate:', erro.code || erro.message);
        } finally { msEnviando = false; }
    }

    function referenciaRodadaOnline(numero = round) {
        return preparacaoOnline.ref(preparacaoOnline.database,
            `salas/${config.roomCode}/${chaveDesempateOnline ? `desempates/${chaveDesempateOnline}` : `rodadas/${numero}`}`);
    }

    function jogadorIniciadorOnline() {
        return players.find(p => p.vaga === iniciadorOnline);
    }

    function podeSortearOnline() {
        return jogadorIniciadorOnline()?.id === preparacaoOnline.uid;
    }

    function registrosRodadaOnline(dados) {
        return Object.values(dados?.turnos || {}).filter(Boolean)
            .sort((a, b) => a.numero - b.numero);
    }

    function vencedorDosRegistrosOnline(dados) {
        if (!dados?.fim) return null;
        if (dados.vencedor) return players.find(p => p.vaga === dados.vencedor) || null;
        const ativos = players.filter(p => !dados.eliminados?.[p.vaga]);
        const maior = Math.max(...ativos.map(p => dados.acertos?.[p.vaga] || 0));
        const lideres = ativos.filter(p => (dados.acertos?.[p.vaga] || 0) === maior);
        return lideres.length === 1 ? lideres[0] : null;
    }

    function reconstruirHistoricoOnline() {
        answerHistory.length = 0;
        eliminationHistory.length = 0;
        roundHistory.length = 0;
        scoredRounds.clear();
        players.forEach(p => { p.score = 0; });
        for (let n = 1; n < round; n++) {
            const anterior = rodadasOnline[n];
            const dados = anterior?.jogadas;
            const carta = BANCO_CARTAS.find(c => c.id === anterior?.sorteio?.cartaId);
            const vencedor = vencedorDosRegistrosOnline(dados);
            if (!carta || !dados?.fim || !vencedor) continue;
            vencedor.score++;
            scoredRounds.add(n);
            for (const t of registrosRodadaOnline(dados)) {
                const autor = players.find(p => p.vaga === t.vaga);
                if (!autor) continue;
                if (typeof t.resposta === 'string') {
                    answerHistory.push({ id: answerHistory.length + 1, round: n,
                        playerId: autor.id, playerName: autor.nickname, cardId: carta.id,
                        theme: carta.tema, letter: t.letra, mode: config.mode,
                        answer: config.mode === 'sem-call' ? t.resposta : null,
                        normalizedAnswer: config.mode === 'sem-call' ? normalizeAnswer(t.resposta) : null,
                        status: dados.contestacoes?.[t.numero]?.resultado?.rejeitada ? 'rejected' : 'accepted',
                        contested: Boolean(dados.contestacoes?.[t.numero]), isTiebreak: false,
                        tiebreakType: null, tiebreakAttempt: null });
                }
                if (t.expirou || dados.contestacoes?.[t.numero]?.resultado?.rejeitada) eliminationHistory.push({ round: n, playerId: autor.id,
                    playerName: autor.nickname, reason: t.expirou ? 'tempo' : 'contestacao', letter: t.letra || null,
                    theme: carta.tema, isTiebreak: false, tiebreakAttempt: null,
                    order: eliminationHistory.length + 1 });
            }
            updatePlayerHits();
            roundHistory.push({ round: n, cardId: carta.id, theme: carta.tema,
                winnerId: vencedor.id, winnerName: vencedor.nickname,
                reason: 'Rodada online concluída.', usedLetters: Object.keys(dados.letras || {}),
                players: players.map(p => ({ id: p.id, nickname: p.nickname, score: p.score,
                    roundHits: dados.acertos?.[p.vaga] || 0, totalHits: p.totalHits,
                    eliminated: Boolean(dados.eliminados?.[p.vaga]) })) });
        }
        updatePlayerHits();
    }

    function ajustarBaralhoOnline() {
        const restantes = Math.max(0, config.cards - round + (rodadasOnline[round]?.sorteio ? 0 : 1));
        const livres = BANCO_CARTAS.filter(c => !cartasUsadasOnline[c.id]);
        matchDeck.splice(0, matchDeck.length, ...livres.slice(0, restantes));
        updateRemainingCards();
    }

    function receberRodadasOnline(sala, inicial = false) {
        rodadasOnline = sala.rodadas || {};
        cartasUsadasOnline = sala.cartasUsadas || {};
        const numero = Math.max(1, ...Object.keys(rodadasOnline).map(Number));
        const dadosNormais = rodadasOnline[numero];
        desempatesOnline = sala.desempates || {};
        placarFinalOnline = sala.placarFinal || null;
        resultadoFinalOnline = sala.resultadoFinal || null;
        if (sala.status === 'encerrada' && resultadoFinalOnline) {
            abrirResultadoFinalOnline();
            return;
        }
        const ultimo = (placarFinalOnline || !dadosNormais?.desempate) && Object.entries(desempatesOnline)
            .filter(([, d]) => d?.rodada === (placarFinalOnline ? 0 : numero))
            .sort((a, b) => b[1].numero - a[1].numero)[0];
        const novaChave = ultimo ? ultimo[0] : null;
        const mudouSequencia = novaChave !== chaveDesempateOnline;
        chaveDesempateOnline = novaChave;
        tentativaDesempateOnline = ultimo ? ultimo[1] : null;
        const dados = tentativaDesempateOnline || dadosNormais;
        const novo = dados?.sorteio || null;
        const mudouRodada = inicial || numero !== round || mudouSequencia;
        const mudouSorteio = mudouRodada || novo?.cartaId !== sorteioOnline?.cartaId || novo?.fase !== sorteioOnline?.fase;
        const animar = !inicial && !mudouRodada && !sorteioPrimeiraLeitura && !sorteioOnline && novo?.fase === 'sorteada';
        sorteioOnline = novo;
        jogadasOnline = dados?.jogadas || null;
        iniciadorOnline = dados?.iniciador || 1;
        sorteioPrimeiraLeitura = false;
        if (mudouRodada) {
            round = numero;
            proximaTentativaMs = 0;
            if (chaveDesempateOnline) {
                ms.sincronizarOnline(tentativaDesempateOnline, players, BANCO_CARTAS);
                setTiebreakLabels(true);
                if (tentativaDesempateOnline.rodada === 0) $('game-eyebrow').textContent = 'DESEMPATE PELO CAMPEONATO';
                ms.ativarEfeitos();
            } else if (ms?.estaAtiva()) {
                ms.resetar();
                setTiebreakLabels(false);
            }
            roundFinished = false;
            roundStarted = false;
            roundWinner = null;
            pendingRoundTiebreak = [];
            turnoAtualOnline = null;
            assinaturaJogadasOnline = null;
            proximaTentativaExpiracao = 0;
            currentCard = null;
            currentPlayerIndex = Math.max(0, players.findIndex(p => p.vaga === iniciadorOnline));
            contestacao?.sincronizarOnline(null);
            reconstruirHistoricoOnline();
            if (placarFinalOnline) players.forEach(p => { p.score = Math.floor(placarFinalOnline.valores[p.vaga] / PESO_CARTA_ONLINE); });
            reactivatePlayers();
            if (tentativaDesempateOnline) players.forEach(p => {
                p.eliminated = !tentativaDesempateOnline.participantes?.[p.vaga];
                p.spectator = p.eliminated;
            });
            usedAnswers.clear();
            lastConfirmedAnswer = null;
            resetWheel();
            resetTimer();
            resetAnswerInput();
            stopButton.disabled = true;
            $('stop-label').textContent = 'AGUARDE';
            $('current-theme').textContent = 'Aguardando sorteio...';
            turnIndicator.textContent = 'PREPARANDO RODADA';
            $('game-status').textContent = `${getCurrentPlayer().nickname} realizará o sorteio.`;
            roundEndOverlay.hidden = true;
            resetRoundWinnerInterface();
            if (voltarResultadoOnline) voltarResultadoOnline.hidden = true;
            nextRoundButton.disabled = true;
            finishGameButton.disabled = true;
            resetDrawInterface();
            updateRound();
            renderPlayers();
            if (!inicial && sorteioCapturado) requestBackgroundCapture();
        }
        ajustarBaralhoOnline();
        if (placarFinalOnline && !chaveDesempateOnline) {
            finishGameButton.disabled = true;
            roundWinnerNext.textContent = 'Confirmando o campeão ou o desempate final...';
            avancarFinalOnline();
            return;
        }
        if (mudouSorteio) aplicarSorteioOnline(novo, animar);
        else aplicarJogadasOnline(jogadasOnline);
    }

    async function avancarRodadaOnline() {
        if (!roundFinished || !roundWinner || round >= config.cards ||
            pendingRoundTiebreak.length || !sorteioConectado || sorteioEnviando ||
            jogadaEnviando || preparacaoOnline.cancelando ||
            roundWinner.id !== preparacaoOnline.uid) return;
        sorteioEnviando = true;
        atualizarControlesJogadaOnline();
        try {
            const numero = round;
            const vaga = roundWinner.vaga;
            await preparacaoOnline.update(preparacaoOnline.referencia, {
                [`rodadas/${numero}/jogadas/vencedor`]: vaga,
                [`rodadas/${numero + 1}`]: { numero: numero + 1, iniciador: vaga }
            });
        } catch (erro) {
            console.error('[STOP!] Próxima rodada recusada:', erro);
            roundWinnerNext.textContent = 'Não foi possível avançar. Tente novamente.';
        } finally {
            sorteioEnviando = false;
            atualizarBotoesSorteioOnline();
        }
    }

    // ========================================
    // CONTESTAÇÃO ONLINE — VOTOS PRIVADOS DURANTE A VOTAÇÃO
    // ========================================

    let contestacaoEnviando = false;
    let proximaTentativaContestacao = 0;

    function contestacaoPendenteOnline() {
        if (!jogadasOnline) return null;
        const ativa = Object.entries(jogadasOnline.contestacoes || {})
            .find(([, c]) => c && !c.retomadaEm);
        return ativa ? { ...ativa[1], alvo: Number(ativa[0]) } : null;
    }

    function prazoTurnoOnline() {
        if (!turnoAtualOnline) return 0;
        const c = jogadasOnline?.contestacoes?.[turnoAtualOnline.numero - 1];
        return turnoAtualOnline.inicioEm + config.time * 1000 +
            (c?.retomadaEm ? c.retomadaEm - c.inicioEm : 0);
    }

    function janelaFinalOnline() {
        if (!jogadasOnline?.fim || !turnoAtualOnline || players.length < 3 ||
            typeof turnoAtualOnline.resposta !== 'string' ||
            jogadasOnline.contestacoes?.[turnoAtualOnline.numero]) return false;
        return !relogioOnlinePronto || horarioServidorOnline() < jogadasOnline.fimEm + config.time * 1000;
    }

    function alvoContestavelOnline() {
        if (!turnoAtualOnline || !jogadasOnline) return null;
        const alvo = jogadasOnline.fim ? (janelaFinalOnline() ? turnoAtualOnline.numero : 0) : turnoAtualOnline.numero - 1;
        const t = jogadasOnline.turnos?.[alvo];
        if (!t || typeof t.resposta !== 'string' || jogadasOnline.contestacoes?.[alvo] ||
            jogadasOnline.eliminados?.[t.vaga]) return null;
        return t;
    }

    function podeContestarOnline() {
        if (!preparacaoOnline || !contestacao || !sorteioCapturado || !sorteioConectado || !relogioOnlinePronto ||
            roundFinished || players.length < 3 || jogadaEnviando || contestacaoEnviando ||
            sorteioEnviando || contestacaoPendenteOnline() || preparacaoOnline.cancelando) return false;
        const t = alvoContestavelOnline();
        return Boolean(t && players.find(p => p.vaga === t.vaga)?.id !== preparacaoOnline.uid &&
            (jogadasOnline.fim ? janelaFinalOnline() : horarioServidorOnline() < prazoTurnoOnline()));
    }

    async function abrirContestacaoOnline() {
        if (!podeContestarOnline()) return;
        const t = alvoContestavelOnline();
        const local = players.find(p => p.id === preparacaoOnline.uid);
        await executarContestacaoOnline(async () => {
            await preparacaoOnline.update(referenciaRodadaOnline(), {
                [`jogadas/contestacoes/${t.numero}`]: { inicioEm: preparacaoOnline.serverTimestamp(), contestador: local.vaga }
            });
        });
    }

    async function executarContestacaoOnline(acao) {
        if (contestacaoEnviando || !sorteioConectado || preparacaoOnline.cancelando) return;
        contestacaoEnviando = true;
        sincronizarContestacaoOnline(); atualizarControlesJogadaOnline();
        try { await acao(); }
        catch (erro) { console.debug('[STOP!] Contestação online:', erro.code || erro.message); }
        finally {
            contestacaoEnviando = false;
            aplicarJogadasOnline(jogadasOnline, true);
            sincronizarContestacaoOnline(); atualizarControlesJogadaOnline();
        }
    }

    function caminhoVotosOnline(c) {
        return `${chaveDesempateOnline ? "votosDesempate" : "votosContestacao"}/${config.roomCode}/${chaveDesempateOnline || round}/${c.alvo}/${c.inicioEm}`;
    }

    function sincronizarContestacaoOnline() {
        if (!contestacao || !preparacaoOnline) return;
        const c = contestacaoPendenteOnline();
        if (!c) {
            const estava = contestacao.estaAtiva();
            contestacao.sincronizarOnline(null);
            if (estava && !roundFinished) gameScreen.removeAttribute('inert');
            return;
        }
        const t = jogadasOnline.turnos[c.alvo];
        const autor = players.find(p => p.vaga === t.vaga);
        const contestador = players.find(p => p.vaga === c.contestador);
        if (!autor || !contestador) return;
        gameScreen.setAttribute('inert', '');
        contestacao.sincronizarOnline({
            chave: `${caminhoSequenciaOnline()}/${c.alvo}/${c.inicioEm}`, jogadores: players,
            jogadorLocalId: preparacaoOnline.uid, contestador,
            resposta: { id: c.alvo, playerId: autor.id, playerName: autor.nickname, round,
                theme: currentCard.tema, letter: t.letra, mode: config.mode, answer: t.resposta,
                isTiebreak: Boolean(chaveDesempateOnline), tiebreakAttempt: tentativaDesempateOnline?.numero || null },
            votaram: players.filter(p => c.votaram?.[p.vaga]).map(p => p.id),
            falta: c.inicioEm + 10000 - horarioServidorOnline(), resultado: c.resultado || null,
            ocupado: contestacaoEnviando || !sorteioConectado,
            votar: votarOnline, continuar: continuarContestacaoOnline
        });
        stopButton.disabled = true; answerInput.disabled = true; answerSubmit.disabled = true;
        $('stop-label').textContent = 'PAUSADO'; turnIndicator.textContent = 'EM VOTAÇÃO';
        updateLetters(); updateContestButton();
    }

    async function votarOnline(voto) {
        const c = contestacaoPendenteOnline();
        const local = players.find(p => p.id === preparacaoOnline.uid);
        if (!c || c.resultado || !local || c.votaram?.[local.vaga] ||
            jogadasOnline.turnos[c.alvo].vaga === local.vaga ||
            horarioServidorOnline() >= c.inicioEm + 10000 || !['valida', 'invalida'].includes(voto)) return;
        await executarContestacaoOnline(() => preparacaoOnline.update(preparacaoOnline.ref(preparacaoOnline.database), {
            [`${caminhoVotosOnline(c)}/escolhas/${local.vaga}`]: voto,
            [`${caminhoVotosOnline(c)}/totais/${voto}`]: preparacaoOnline.increment(1),
            [`${raizSequenciaOnline()}/jogadas/contestacoes/${c.alvo}/votaram/${local.vaga}`]: true
        }));
    }

    async function finalizarVotacaoOnline() {
        const c = contestacaoPendenteOnline();
        if (!c || c.resultado || contestacaoEnviando || !sorteioConectado || !relogioOnlinePronto ||
            Date.now() < proximaTentativaContestacao || (horarioServidorOnline() < c.inicioEm + 10000 &&
            Object.keys(c.votaram || {}).length < players.length - 1)) return;
        proximaTentativaContestacao = Date.now() + 1000;
        await executarContestacaoOnline(async () => {
            const { database, ref, get, update, serverTimestamp } = preparacaoOnline;
            const totais = (await get(ref(database, `${caminhoVotosOnline(c)}/totais`))).val() || {};
            const invalidos = totais.invalida || 0;
            const validos = totais.valida || 0;
            const rejeitada = invalidos >= 2 && invalidos > (players.length - 1) / 2;
            const t = jogadasOnline.turnos[c.alvo];
            const alteracoes = { [`jogadas/contestacoes/${c.alvo}/resultado`]: { validos, invalidos, rejeitada } };
            if (rejeitada) {
                alteracoes[`jogadas/acertos/${t.vaga}`] = jogadasOnline.acertos[t.vaga] - 1;
                alteracoes[`jogadas/eliminados/${t.vaga}`] = t.numero;
                if (!jogadasOnline.fim && getActivePlayers().length === 2) {
                    alteracoes['jogadas/fim'] = turnoAtualOnline.numero;
                    alteracoes['jogadas/fimEm'] = serverTimestamp();
                }
            }
            await update(referenciaRodadaOnline(), alteracoes);
        });
    }

    async function continuarContestacaoOnline() {
        const c = contestacaoPendenteOnline();
        if (!c?.resultado) return;
        await executarContestacaoOnline(() => preparacaoOnline.update(preparacaoOnline.ref(preparacaoOnline.database), {
            [`${raizSequenciaOnline()}/jogadas/contestacoes/${c.alvo}/retomadaEm`]: preparacaoOnline.serverTimestamp(),
            [caminhoVotosOnline(c)]: null
        }));
    }

    function horarioServidorOnline() {
        return Date.now() + deslocamentoServidor;
    }

    function terminouSequenciaOnline() {
        return Boolean(turnoAtualOnline && jogadasOnline?.fim === turnoAtualOnline.numero);
    }

    function podeInteragirOnline() {
        return Boolean(preparacaoOnline && sorteioOnline?.fase === 'aberta' &&
            sorteioCapturado && sorteioConectado && relogioOnlinePronto &&
            !roundFinished && !jogadasOnline?.fim && !contestacaoPendenteOnline() && !contestacaoEnviando &&
            !jogadaEnviando && !sorteioEnviando && !preparacaoOnline.cancelando &&
            players[currentPlayerIndex]?.id === preparacaoOnline.uid);
    }

    function podeJogarOnline() {
        return podeInteragirOnline() && Boolean(turnoAtualOnline) &&
            turnoAtualOnline.expirou !== true && typeof turnoAtualOnline.resposta !== 'string' &&
            horarioServidorOnline() < prazoTurnoOnline();
    }

    function atualizarControlesJogadaOnline() {
        if (!preparacaoOnline || sorteioOnline?.fase !== 'aberta' || !sorteioCapturado) return;
        if (roundFinished) {
            finishGameButton.disabled = !roundWinner || round !== config.cards || Boolean(placarFinalOnline) ||
                roundWinner.id !== preparacaoOnline.uid || !sorteioConectado || finalizandoOnline || Boolean(preparacaoOnline.cancelando);
            stopButton.disabled = true;
            answerInput.disabled = true;
            answerSubmit.disabled = true;
            $('back-button').disabled = Boolean(placarFinalOnline) || finalizandoOnline || !roomConfig.isHost || !sorteioConectado || jogadaEnviando || Boolean(preparacaoOnline.cancelando);
            if (voltarResultadoOnline) voltarResultadoOnline.disabled = $('back-button').disabled;
            nextRoundButton.disabled = !roundWinner || round >= config.cards ||
                pendingRoundTiebreak.length > 0 || roundWinner.id !== preparacaoOnline.uid ||
                !sorteioConectado || sorteioEnviando || jogadaEnviando || Boolean(preparacaoOnline.cancelando);
            return;
        }
        if (contestacaoPendenteOnline()) { sincronizarContestacaoOnline(); return; }
        const autorizado = podeJogarOnline();
        stopButton.disabled = turnoAtualOnline ? !autorizado : !podeInteragirOnline();
        $('stop-label').textContent = terminouSequenciaOnline() ? 'AGUARDE' :
            timeExpired ? 'TEMPO ESGOTADO' : turnoAtualOnline ? 'REINICIAR' : 'INICIAR';
        updateLetters();
        const responder = autorizado && Boolean(selectedLetter) && config.mode === 'sem-call';
        answerInput.disabled = !responder;
        answerSubmit.disabled = !responder;
        updateContestButton();
        $('back-button').disabled = Boolean(placarFinalOnline) || finalizandoOnline || !roomConfig.isHost || !sorteioConectado || jogadaEnviando || Boolean(preparacaoOnline.cancelando);
    }

    function atualizarCronometroOnline() {
        if (!preparacaoOnline || !sorteioCapturado || matchFinished) return;
        if (resultadoFinalOnline) { abrirResultadoFinalOnline(); return; }
        if (placarFinalOnline && !chaveDesempateOnline) { avancarFinalOnline(); return; }
        if (sorteioOnline?.fase !== 'aberta' || roundFinished) return;
        if (contestacaoPendenteOnline()) {
            const c = contestacaoPendenteOnline();
            remainingTime = Math.max(0, Math.ceil((prazoTurnoOnline() - c.inicioEm) / 1000));
            timerRunning = false; timeExpired = false;
            updateTimerDisplay(); sincronizarContestacaoOnline();
            finalizarVotacaoOnline();
            return;
        }
        if (terminouSequenciaOnline()) {
            timerRunning = false; timeExpired = false;
            if (janelaFinalOnline()) {
                remainingTime = Math.max(0, Math.ceil((jogadasOnline.fimEm + config.time * 1000 - horarioServidorOnline()) / 1000));
                $('game-status').textContent = 'Última resposta: você ainda pode contestar.';
                updateTimerDisplay(); atualizarControlesJogadaOnline();
            } else if (relogioOnlinePronto && !jogadaEnviando && !contestacaoEnviando) {
                concluirRodadaOnline();
            }
            return;
        }
        const expiradoAntes = timeExpired;
        const tempoAntes = remainingTime;
        const rodandoAntes = timerRunning;
        if (!turnoAtualOnline || !relogioOnlinePronto) {
            remainingTime = config.time;
            timerRunning = false;
            timeExpired = false;
        } else if (terminouSequenciaOnline()) {
            remainingTime = 0;
            timerRunning = false;
            timeExpired = false;
        } else {
            const falta = Math.max(0, prazoTurnoOnline() - horarioServidorOnline());
            remainingTime = Math.min(config.time, Math.ceil(falta / 1000));
            timerRunning = falta > 0;
            timeExpired = falta === 0;
        }
        if (tempoAntes !== remainingTime || rodandoAntes !== timerRunning || expiradoAntes !== timeExpired) {
            updateTimerDisplay();
        }
        if (expiradoAntes !== timeExpired || rodandoAntes !== timerRunning) {
            atualizarControlesJogadaOnline();
        }
        if (timeExpired) {
            const aviso = `Tempo de ${getCurrentPlayer().nickname} esgotado! Confirmando eliminação...`;
            if ($('game-status').textContent !== aviso) $('game-status').textContent = aviso;
            registrarExpiracaoOnline();
        }
    }

    function registrarHistoricoSequenciaOnline(dados, carta, extra = false, tentativa = null) {
        if (!carta) return;
        for (const t of registrosRodadaOnline(dados)) {
            const autor = players.find(p => p.vaga === t.vaga);
            if (!autor) continue;
            const rejeitada = dados?.contestacoes?.[t.numero]?.resultado?.rejeitada === true;
            if (typeof t.resposta === 'string') {
                const normalizada = config.mode === 'sem-call' ? normalizeAnswer(t.resposta) : null;
                answerHistory.push({ id: answerHistory.length + 1, round, playerId: autor.id, playerName: autor.nickname,
                    cardId: carta.id, theme: carta.tema, letter: t.letra, mode: config.mode,
                    answer: config.mode === 'sem-call' ? t.resposta : null, normalizedAnswer: normalizada,
                    status: rejeitada ? 'rejected' : 'accepted', contested: Boolean(dados?.contestacoes?.[t.numero]),
                    isTiebreak: extra, tiebreakType: extra ? (tentativaDesempateOnline?.rodada === 0 ? 'final' : 'rodada') : null, tiebreakAttempt: tentativa });
            }
            if (t.expirou || rejeitada) eliminationHistory.push({ round, playerId: autor.id, playerName: autor.nickname,
                reason: t.expirou ? 'tempo' : 'contestacao', letter: t.letra || null, theme: carta.tema,
                isTiebreak: extra, tiebreakAttempt: tentativa, order: eliminationHistory.length + 1 });
        }
    }

    function aplicarJogadasOnline(dados, forcar = false) {
        if (!sorteioCapturado || sorteioOnline?.fase !== 'aberta' || preparacaoOnline.cancelando) return;
        if (roundFinished) return;
        const assinatura = JSON.stringify(dados || null);
        if (!forcar && assinatura === assinaturaJogadasOnline) return;
        assinaturaJogadasOnline = assinatura;
        const anterior = turnoAtualOnline;
        const registros = Object.values(dados?.turnos || {}).filter(Boolean)
            .sort((a, b) => a.numero - b.numero);
        turnoAtualOnline = registros.at(-1) || null;
        const eliminados = new Set(Object.keys(dados?.eliminados || {}).map(Number));
        players.forEach(p => { p.eliminated = eliminados.has(p.vaga) || Boolean(tentativaDesempateOnline && !tentativaDesempateOnline.participantes?.[p.vaga]); p.spectator = p.eliminated; });
        if (tentativaDesempateOnline) ms.sincronizarOnline(tentativaDesempateOnline, players, BANCO_CARTAS);
        eliminationHistory.splice(0, eliminationHistory.length, ...eliminationHistory.filter(e => e.round < round));
        const indice = players.findIndex(p => p.vaga === (turnoAtualOnline?.vaga || iniciadorOnline));
        if (indice < 0) {
            $('game-status').textContent = 'Turno inválido. Retorne ao lobby.';
            return;
        }
        currentPlayerIndex = indice;
        roundStarted = Boolean(turnoAtualOnline);
        selectedLetter = turnoAtualOnline && turnoAtualOnline.expirou !== true && typeof turnoAtualOnline.resposta !== 'string'
            ? turnoAtualOnline.letra || null : null;
        usedLetters.clear();
        Object.keys(dados?.letras || {}).forEach(letra => usedLetters.add(letra));
        usedAnswers.clear();
        answerHistory.splice(0, answerHistory.length, ...answerHistory.filter(a => a.round < round));
        const normal = rodadasOnline[round];
        registrarHistoricoSequenciaOnline(normal?.jogadas, BANCO_CARTAS.find(c => c.id === normal?.sorteio?.cartaId));
        Object.values(desempatesOnline).filter(d => d.rodada === (tentativaDesempateOnline?.rodada === 0 ? 0 : round)).sort((a,b) => a.numero-b.numero).forEach(d => {
            registrarHistoricoSequenciaOnline(d.jogadas, BANCO_CARTAS.find(c => c.id === d.sorteio?.cartaId), true, d.numero);
        });
        const respostasAtuais = answerHistory.filter(a => a.round === round && (tentativaDesempateOnline
            ? a.isTiebreak && a.tiebreakAttempt === tentativaDesempateOnline.numero : !a.isTiebreak));
        respostasAtuais.filter(a => a.status === 'accepted' && a.normalizedAnswer).forEach(a => usedAnswers.add(a.normalizedAnswer));
        lastConfirmedAnswer = respostasAtuais.at(-1) || null;
        updatePlayerHits();
        sincronizarContestacaoOnline();
        if (terminouSequenciaOnline() && !contestacaoPendenteOnline() && !janelaFinalOnline()) {
            if (!jogadaEnviando && !contestacaoEnviando && relogioOnlinePronto) concluirRodadaOnline();
            return;
        }
        const mudouSelecao = anterior?.numero !== turnoAtualOnline?.numero || anterior?.letra !== turnoAtualOnline?.letra;
        if (mudouSelecao) {
            resetAnswerInput();
            if (chaveDesempateOnline && selectedLetter) ms.executarImpacto();
        }
        $('selected-letter-box').hidden = !selectedLetter;
        $('selected-letter').textContent = selectedLetter || '—';
        if (selectedLetter) answerInput.placeholder = `Resposta com ${selectedLetter}...`;
        renderPlayers();
        updateTurnIndicator();
        const nome = getCurrentPlayer().nickname;
        const ultima = lastConfirmedAnswer;
        const aviso = ultima ? `${ultima.playerName}: ${ultima.answer || 'resposta por voz'} confirmada. ` : '';
        $('game-status').textContent = terminouSequenciaOnline()
            ? 'Última resposta: aguarde a janela de contestação.'
            : !turnoAtualOnline ? `${nome}, pressione STOP! para iniciar.`
            : selectedLetter ? `${chaveDesempateOnline ? 'Letra sorteada: ' + selectedLetter + '. Vez de ' + nome : nome + ' escolheu ' + selectedLetter}. ${config.mode === 'sem-call' ? 'Aguardando resposta.' : 'Confirme com STOP!.'}`
            : `${aviso}Agora é a vez de ${nome}. Escolha uma letra livre.`;
        atualizarCronometroOnline();
        atualizarControlesJogadaOnline();
        updateTimerDisplay();
        if (mudouSelecao && !answerInput.disabled) answerInput.focus({ preventScroll: true });
    }

    async function enviarJogadaOnline(acao, letra = null) {
        if (!podeInteragirOnline()) return;
        const { update, serverTimestamp } = preparacaoOnline;
        const referencia = referenciaRodadaOnline();
        const alteracoes = {};
        const rascunho = answerInput.value;
        if (acao === 'iniciar') {
            if (turnoAtualOnline || stopButton.disabled) return;
            anexarTurnoOnline(alteracoes, 1, iniciadorOnline, 0);
        } else {
            if (!podeJogarOnline()) return;
            const t = turnoAtualOnline;
            const caminho = `jogadas/turnos/${t.numero}`;
            if (acao === 'letra') {
                if (chaveDesempateOnline || selectedLetter || usedLetters.has(letra) || !/^[A-Z]$/.test(letra || '')) return;
                alteracoes[`${caminho}/letra`] = letra;
                alteracoes[`jogadas/letras/${letra}`] = t.numero;
            } else if (acao === 'resposta') {
                if (!selectedLetter) {
                    $('game-status').textContent = 'Escolha uma letra primeiro.';
                    return;
                }
                let resposta = '';
                if (config.mode === 'sem-call') {
                    const validacao = validateTextAnswer();
                    if (!validacao.valid) { showAnswerError(validacao.message); return; }
                    resposta = validacao.answer;
                }
                alteracoes[`${caminho}/resposta`] = resposta;
                alteracoes[`jogadas/acertos/${t.vaga}`] = (jogadasOnline?.acertos?.[t.vaga] || 0) + 1;
                if (usedLetters.size < alphabet.length) {
                    const proximo = players[getNextPlayerIndex()];
                    anexarTurnoOnline(alteracoes, t.numero + 1, proximo.vaga, t.vaga);
                } else {
                    alteracoes['jogadas/fim'] = t.numero;
                    alteracoes['jogadas/fimEm'] = serverTimestamp();
                }
            } else return;
        }
        jogadaEnviando = true;
        atualizarControlesJogadaOnline();
        try {
            await update(referencia, alteracoes);
        } catch (erro) {
            console.error('[STOP!] Jogada online recusada:', erro);
            if (acao === 'resposta' && selectedLetter) answerInput.value = rascunho;
            $('game-status').textContent = 'Jogada não confirmada pelo servidor. Verifique a conexão e o tempo.';
        } finally {
            jogadaEnviando = false;
            aplicarJogadasOnline(jogadasOnline, true);
            atualizarCronometroOnline();
            atualizarControlesJogadaOnline();
            if (!answerInput.disabled && acao === 'letra') answerInput.focus({ preventScroll: true });
        }
    }


    // Registra o estouro e, quando necessário, o próximo turno atomicamente.
    async function registrarExpiracaoOnline() {
        const t = turnoAtualOnline;
        if (!t || roundFinished || jogadaEnviando || !sorteioConectado ||
            !relogioOnlinePronto || preparacaoOnline.cancelando || contestacaoPendenteOnline() || contestacaoEnviando || jogadasOnline?.fim || t.expirou ||
            typeof t.resposta === 'string' || Date.now() < proximaTentativaExpiracao ||
            horarioServidorOnline() < prazoTurnoOnline()) return;
        // Qualquer participante conectado pode confirmar um prazo vencido.
        const { update, serverTimestamp } = preparacaoOnline;
        const referencia = referenciaRodadaOnline();
        const alteracoes = { [`jogadas/turnos/${t.numero}/expirou`]: true,
            [`jogadas/eliminados/${t.vaga}`]: t.numero };
        if (getActivePlayers().length > 2 && usedLetters.size < alphabet.length) {
            const proximo = players[getNextPlayerIndex()];
            anexarTurnoOnline(alteracoes, t.numero + 1, proximo.vaga, t.vaga);
        } else {
            alteracoes['jogadas/fim'] = t.numero;
            alteracoes['jogadas/fimEm'] = serverTimestamp();
        }
        jogadaEnviando = true;
        proximaTentativaExpiracao = Date.now() + 1500;
        atualizarControlesJogadaOnline();
        try {
            await update(referencia, alteracoes);
        } catch (erro) {
            // Outro navegador pode ter confirmado o mesmo estouro primeiro.
            console.debug('[STOP!] Confirmação de prazo:', erro.code);
        } finally {
            jogadaEnviando = false;
            aplicarJogadasOnline(jogadasOnline, true);
            atualizarControlesJogadaOnline();
        }
    }

    function concluirRodadaOnline() {
        if (placarFinalOnline && !chaveDesempateOnline) { avancarFinalOnline(); return; }
        const normal = rodadasOnline[round];
        const chaveResolvida = normal?.desempate;
        if (chaveDesempateOnline) {
            const { lideres, maior } = lideresSequenciaOnline(jogadasOnline, tentativaDesempateOnline);
            if (lideres.length === 1) registrarVencedorDesempateOnline(lideres[0]);
            else if (lideres.length > 1) criarDesempateOnline(lideres, maior);
            return;
        }
        const { lideres } = lideresSequenciaOnline(jogadasOnline);
        const vencedor = chaveResolvida
            ? players.find(p => p.vaga === desempatesOnline[chaveResolvida]?.jogadas?.vencedor)
            : lideres.length === 1 ? lideres[0] : null;
        if (!vencedor) {
            if (lideres.length > 1 && !chaveResolvida) criarDesempateOnline(lideres, Math.max(...lideres.map(p => jogadasOnline.acertos?.[p.vaga] || 0)));
            return;
        }
        const motivo = chaveResolvida ? 'Vitória na morte súbita!'
            : getActivePlayers().length === 1 ? 'Restou apenas um jogador ativo.' : 'Letras esgotadas. Vitória por acertos.';
        // O histórico compartilhado determina o resultado; não há incremento remoto duplicável.
        ajustarBaralhoOnline();
        finishRound(vencedor, motivo);
        finishGameButton.disabled = true;
        if (!vencedor) {
            nextRoundButton.disabled = true;
            roundWinnerNext.textContent = 'Desempate online ainda indisponível.';
        } else if (round < config.cards) {
            nextRoundButton.hidden = false;
            nextRoundButton.textContent = 'PRÓXIMA RODADA →';
            roundWinnerNext.textContent = vencedor.id === preparacaoOnline.uid
                ? 'Você realizará o próximo sorteio.'
                : `Aguardando ${vencedor.nickname} avançar para a próxima rodada.`;
        } else {
            nextRoundButton.hidden = true;
            finishGameButton.hidden = false;
            finishGameButton.textContent = 'FINALIZAR PARTIDA →';
            roundWinnerNext.textContent = vencedor.id === preparacaoOnline.uid
                ? 'Confirme o resultado final da partida.'
                : `Aguardando ${vencedor.nickname} confirmar o resultado final.`;
        }
        if (roomConfig.isHost && !voltarResultadoOnline) {
            voltarResultadoOnline = document.createElement('button');
            voltarResultadoOnline.type = 'button';
            voltarResultadoOnline.className = 'primary-button';
            voltarResultadoOnline.textContent = 'VOLTAR AO LOBBY';
            voltarResultadoOnline.addEventListener('click', () => $('back-button').click());
            roundWinnerNext.after(voltarResultadoOnline);
        }
        if (voltarResultadoOnline) voltarResultadoOnline.hidden = round === config.cards;
        atualizarControlesJogadaOnline();
    }

    function atualizarBotoesSorteioOnline() {
        const autorizado = podeSortearOnline() && sorteioConectado &&
            sorteioCapturado && !sorteioEnviando && !sorteioAnimando &&
            !preparacaoOnline.cancelando;
        drawButton.disabled = !autorizado || Boolean(sorteioOnline);
        startRoundButton.disabled = !autorizado || sorteioOnline?.fase !== 'sorteada';
        $('back-button').disabled = Boolean(placarFinalOnline) || finalizandoOnline || !roomConfig.isHost || !sorteioConectado || Boolean(preparacaoOnline.cancelando);
        if (voltarSorteio) voltarSorteio.disabled = $('back-button').disabled;
        atualizarControlesJogadaOnline();
    }

    async function enviarSorteioOnline(fase) {
        if (!podeSortearOnline() || !sorteioConectado || !sorteioCapturado ||
            sorteioEnviando || sorteioAnimando || preparacaoOnline.cancelando) return;
        if (fase === 'sorteada' && (sorteioOnline || drawButton.disabled)) return;
        if (fase === 'aberta' && (sorteioOnline?.fase !== 'sorteada' || startRoundButton.disabled)) return;
        const { set, update, referencia } = preparacaoOnline;
        const numero = round;
        const temaOriginal = rodadasOnline[round]?.sorteio?.cartaId;
        const temaAnterior = tentativaDesempateOnline?.numero > 1 ? desempatesOnline[`${tentativaDesempateOnline.rodada}-${tentativaDesempateOnline.numero - 1}`]?.sorteio?.cartaId : null;
        const livres = chaveDesempateOnline
            ? BANCO_CARTAS.filter(c => c.id !== temaOriginal && c.id !== temaAnterior)
            : BANCO_CARTAS.filter(c => !cartasUsadasOnline[c.id]);
        if (fase === 'sorteada' && !livres.length) return;
        const cartaId = fase === 'sorteada'
            ? shuffleCards(livres)[0].id
            : sorteioOnline.cartaId;
        sorteioEnviando = true;
        atualizarBotoesSorteioOnline();
        try {
            if (!chaveDesempateOnline && !rodadasOnline[numero]) {
                await set(referenciaRodadaOnline(numero), { numero, iniciador: iniciadorOnline });
            }
            const alteracoes = { [`${caminhoSequenciaOnline()}/sorteio`]: { cartaId, fase } };
            if (fase === 'sorteada' && !chaveDesempateOnline) alteracoes[`cartasUsadas/${cartaId}`] = numero;
            await update(referencia, alteracoes);
        } catch (erro) {
            console.error('[STOP!] Falha no sorteio online:', erro);
            $('draw-status').textContent = 'Não foi possível concluir. Tente novamente.';
            $('game-status').textContent = 'Não foi possível concluir o sorteio.';
        } finally {
            sorteioEnviando = false;
            atualizarBotoesSorteioOnline();
        }
    }

    function aplicarSorteioOnline(sorteio, animar = false) {
        if (!sorteioCapturado || preparacaoOnline.cancelando) return;
        const geracao = ++sorteioGeracao;
        sorteioAnimando = false;
        deck.classList.remove('shuffling');
        drawOverlay.classList.remove('closing');
        if (!sorteio) {
            currentCard = null;
            drawCard.classList.remove('revealed');
            $('drawn-theme').textContent = '';
            drawButton.hidden = false;
            drawButton.textContent = 'EMBARALHAR E SORTEAR';
            startRoundButton.hidden = true;
            drawOverlay.hidden = false;
            gameScreen.setAttribute('inert', '');
            $('draw-status').textContent = podeSortearOnline()
                ? 'Você realizará o sorteio.'
                : `Aguardando ${jogadorIniciadorOnline().nickname} sortear a carta.`;
            ajustarBaralhoOnline();
            atualizarBotoesSorteioOnline();
            return;
        }
        const carta = BANCO_CARTAS.find(item => item.id === sorteio.cartaId);
        if (!carta) {
            $('draw-status').textContent = 'Carta desconhecida. Atualize o jogo.';
            drawButton.disabled = true;
            startRoundButton.disabled = true;
            return;
        }
        currentCard = carta;
        ajustarBaralhoOnline();
        if (sorteio.fase === 'aberta') {
            drawOverlay.hidden = true;
            gameScreen.removeAttribute('inert');
            $('current-theme').textContent = carta.tema;
            aplicarJogadasOnline(jogadasOnline, true);
            atualizarBotoesSorteioOnline();
            return;
        }
        drawOverlay.hidden = false;
        gameScreen.setAttribute('inert', '');
        const revelar = () => {
            if (geracao !== sorteioGeracao) return;
            deck.classList.remove('shuffling');
            $('drawn-theme').textContent = carta.tema;
            drawCard.classList.add('revealed');
            const concluir = () => {
                if (geracao !== sorteioGeracao) return;
                drawButton.hidden = true;
                startRoundButton.hidden = false;
                sorteioAnimando = false;
                $('draw-status').textContent = podeSortearOnline()
                    ? 'Tema sorteado! Prepare-se.'
                    : `Tema sorteado! Aguarde ${jogadorIniciadorOnline().nickname}.`;
                atualizarBotoesSorteioOnline();
            };
            if (animar) setTimeout(concluir, 550); else concluir();
        };
        if (animar && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            sorteioAnimando = true;
            drawButton.textContent = 'EMBARALHANDO...';
            drawButton.disabled = true;
            $('draw-status').textContent = 'Preparando o próximo desafio...';
            deck.classList.add('shuffling');
            setTimeout(revelar, 960);
        } else {
            animar = false;
            revelar();
        }
    }

    // ========================================
    // INICIALIZAÇÃO
    // ========================================

    async function initializeGame() {

        // Monta a interface e os elementos da roleta.

        setupInterface();

        if (preparacaoOnline) {
            // Sorteio, roleta e turnos compartilhados; demais fases ainda bloqueadas.
            drawOverlay.hidden = true;
            gameScreen.querySelectorAll('button, input, textarea, select').forEach(elemento => {
                if (elemento.id !== 'back-button') elemento.disabled = true;
            });
            [drawButton, startRoundButton, stopButton, nextRoundButton, finishGameButton, answerInput, answerSubmit, contestButton, msStartButton]
                .filter(Boolean).forEach(elemento => { elemento.disabled = true; });
            $('back-button').disabled = !roomConfig.isHost;
            turnIndicator.textContent = 'PREPARANDO PARTIDA ONLINE';
            $('game-status').textContent = 'Aguardando o sorteio online.';
            // Mantém o retorno ao lobby disponível mesmo com a sobreposição aberta.
            if (roomConfig.isHost) {
                voltarSorteio = document.createElement('button');
                voltarSorteio.type = 'button';
                voltarSorteio.className = 'primary-button draw-button';
                voltarSorteio.textContent = 'VOLTAR AO LOBBY';
                voltarSorteio.addEventListener('click', () => $('back-button').click());
                $('draw-status').after(voltarSorteio);
            }
            receberRodadasOnline(preparacaoOnline.sala, true);
            if (matchFinished) return;
            const { database, ref, onValue, set, onDisconnect, referencia, uid } = preparacaoOnline;
            const presenca = ref(database, `salas/${config.roomCode}/jogadores/${uid}/conectado`);
            let geracaoPresenca = 0;
            let saindo = false;
            const pararSala = onValue(referencia, snapshot => {
                const sala = snapshot.val();
                if (!sala || !sala.jogadores?.[uid]) {
                    sessionStorage.removeItem('roomConfig');
                    sessionStorage.removeItem('joinConfig');
                    window.location.replace(`salas.html?modo=${encodeURIComponent(config.mode)}`);
                } else if (sala.status === 'aguardando' && !preparacaoOnline.cancelando) {
                    window.location.replace('lobby.html');
                } else if (['preparando', 'encerrada'].includes(sala.status)) {
                    receberRodadasOnline(sala);
                }
            }, erro => {
                console.error('[STOP!] Falha ao observar preparação:', erro);
                sorteioConectado = false;
                atualizarBotoesSorteioOnline();
                $('draw-status').textContent = 'Não foi possível sincronizar o sorteio.';
            });
            const pararRelogio = onValue(ref(database, '.info/serverTimeOffset'), snapshot => {
                const valor = snapshot.val();
                if (typeof valor !== 'number') return;
                deslocamentoServidor = valor;
                relogioOnlinePronto = true;
                atualizarCronometroOnline();
                atualizarControlesJogadaOnline();
            });
            const pararPresenca = onValue(ref(database, '.info/connected'), async snapshot => {
                const tentativa = ++geracaoPresenca;
                sorteioConectado = false;
                atualizarBotoesSorteioOnline();
                if (saindo || snapshot.val() !== true) return;
                try {
                    await onDisconnect(presenca).set(false);
                    if (saindo || tentativa !== geracaoPresenca) return;
                    await set(presenca, true);
                    if (saindo || tentativa !== geracaoPresenca) return;
                    sorteioConectado = true;
                    atualizarBotoesSorteioOnline();
                } catch (erro) {
                    console.error('[STOP!] Falha na presença da preparação:', erro);
                }
            });
            window.addEventListener('pagehide', () => {
                saindo = true;
                geracaoPresenca++;
                pararSala();
                pararPresenca();
                pararRelogio();
                clearInterval(intervaloOnline);
            }, { once: true });
            window.addEventListener('pageshow', evento => {
                if (evento.persisted) window.location.reload();
            });
            await requestBackgroundCapture();
            if (saindo) return;
            sorteioCapturado = true;
            aplicarSorteioOnline(sorteioOnline);
            intervaloOnline = setInterval(atualizarCronometroOnline, 100);
            return;
        }

        // Captura o jogo com a sobreposição escondida.

        await requestBackgroundCapture();

        // Mostra o sorteio com o fundo preparado.

        drawOverlay.hidden = false;

        if (!drawButton.disabled) {

            drawButton.focus();

        }

    }

    initializeGame();

})();