(() => {
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

            if (drawOverlay.hidden && !roundStarted) {
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

        // Sala normal: integração multiplayer futura.
        : [
            {
                id: 'host',
                nickname: config.nickname,
                score: 0,
                roundHits: 0,
                totalHits: 0,
                eliminated: false
            }
        ];

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
    // ESTADO DA ELIMINAÇÃO
    // ========================================

    // Impede ações após o encerramento da rodada.
    let roundFinished = false;

    // Guarda o vencedor da rodada.
    let roundWinner = null;

    // Guarda os jogadores eliminados em ordem.
    const eliminationHistory = [];

    // ========================================
    // ESTADO DA PONTUAÇÃO
    // ========================================

    // Guarda as rodadas que já concederam uma carta.
    const scoredRounds = new Set();

    // Guarda os jogadores que precisam disputar a morte súbita.
    let pendingRoundTiebreak = [];

    // ========================================
    // ESTADO DAS RESPOSTAS
    // ========================================

    // Guarda as respostas normalizadas da rodada.
    const usedAnswers = new Set();

    // Histórico de respostas confirmadas.
    const answerHistory = [];

    // Última resposta confirmada.
    // Será utilizada pelo sistema de contestação.
    let lastConfirmedAnswer = null;

    // ========================================
    // ESTADO DO CRONÔMETRO
    // ========================================

    // Tempo restante em segundos.
    let remainingTime = config.time;

    // Identificador do intervalo atual.
    let timerInterval = null;

    // Momento exato em que o tempo terminará.
    let timerDeadline = 0;

    // Indica se o cronômetro está em execução.
    let timerRunning = false;

    // Impede ações depois que o tempo acabar.
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
    const matchDeck = shuffleCards(BANCO_CARTAS)
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

        updateRound();

        updateRemainingCards();

        renderPlayers();

        createWheel();

        // Exibe o cronômetro inicialmente parado.
        resetTimer();

        // Mantém o campo de resposta bloqueado.
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

        // Identificação exclusiva do ambiente de teste.
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

        // A rodada precisa estar iniciada.
        if (!roundStarted) return;

        // Impede ações após o encerramento.
        if (roundFinished) return;

        // Impede escolhas após o tempo acabar.
        if (timeExpired) return;

        // Confere o tempo real antes de aceitar a letra.
        if (!validateTimer()) return;

        // Não permite ações de jogadores eliminados.
        if (players[currentPlayerIndex].eliminated) return;

        // Não permite trocar ou cancelar a escolha.
        if (selectedLetter !== null) return;

        // Não permite escolher letras utilizadas.
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

        // Comportamento específico de cada modo.
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

        buttons.forEach((button) => {

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

            // Após escolher uma letra,
            // todas ficam bloqueadas até confirmar.
            // Também bloqueia quando o tempo acabar
            // ou quando a rodada estiver encerrada.
            button.disabled =
                !roundStarted ||
                roundFinished ||
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

        // Campo disponível exclusivamente no SEM CALL.
        if (config.mode !== 'sem-call') return;

        if (!roundStarted || timeExpired) return;

        if (roundFinished) return;

        if (players[currentPlayerIndex].eliminated) return;

        if (!selectedLetter) return;

        answerInput.disabled = false;

        answerSubmit.disabled = false;

        answerInput.placeholder =
            `Resposta com ${selectedLetter}...`;

        answerInput.removeAttribute('aria-invalid');

        // Permite começar a digitar imediatamente.
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

        // Remove espaços desnecessários,
        // preservando a escrita original.
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

        // Impede uma resposta vazia após normalização.
        if (!normalizedAnswer) {

            return {

                valid: false,

                message: 'Digite uma resposta válida!'

            };

        }

        // Normaliza a letra escolhida.
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

        // Reinicia os contadores para recalcular
        // utilizando o histórico de respostas.
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

        // Atualiza os valores antes da classificação.
        updatePlayerHits();

        // Cria uma cópia para não alterar
        // a ordem original dos jogadores na mesa.
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

        // Impede que uma rodada conceda mais de uma carta.
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

            // Preparação para o sistema de morte súbita.
            isTiebreak: false

        };

        // Registra respostas digitadas para evitar repetições.
        if (normalizedAnswer !== null) {

            usedAnswers.add(normalizedAnswer);

        }

        // Guarda a resposta no histórico.
        answerHistory.push(confirmedAnswer);

        // Guarda a última jogada para futura contestação.
        lastConfirmedAnswer = confirmedAnswer;

        // Atualiza os acertos do jogador.
        updatePlayerHits();

        // Informações disponíveis no console durante os testes.
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

        if (!currentCard || !roundStarted) return;

        if (roundFinished) return;

        if (timeExpired) return;

        // Verifica se ainda existe tempo disponível.
        if (!validateTimer()) return;

        // Impede que jogadores eliminados respondam.
        if (players[currentPlayerIndex].eliminated) return;

        // Exige que uma letra esteja selecionada.
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

            // Resposta inválida não reinicia o cronômetro.
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

        // Verifica novamente o prazo antes de registrar.
        if (!validateTimer()) return;

        const confirmedAnswer = registerAnswer(
            answer,
            normalizedAnswer
        );

        // ====================================
        // FINALIZAÇÃO DA JOGADA
        // ====================================

        // Guarda a mensagem da resposta confirmada.
        let confirmationMessage;

        if (config.mode === 'sem-call') {

            confirmationMessage =
                `${confirmedAnswer.playerName}: "${confirmedAnswer.answer}" confirmada! +1 acerto.`;

        } else {

            confirmationMessage =
                `${confirmedAnswer.playerName} confirmou a letra ${confirmedAnswer.letter}! +1 acerto.`;

        }

        // A letra permanece consumida.
        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        // Limpa e bloqueia novamente o campo.
        resetAnswerInput();

        // Libera somente as letras ainda disponíveis.
        updateLetters();

        // Passa automaticamente a vez após uma resposta válida.
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

        // Retorna somente quem ainda está jogando.
        return players.filter(player => {

            return !player.eliminated;

        });

    }

    // ========================================
    // JOGADORES ESPECTADORES
    // ========================================

    function getSpectators() {

        // Jogadores eliminados permanecem na partida.
        return players.filter(player => {

            return player.eliminated;

        });

    }

    // ========================================
    // ELIMINAR JOGADOR DA RODADA
    // ========================================

    function eliminatePlayer(playerIndex, reason) {

        const player =
            players[playerIndex];

        if (!player) return false;

        // Impede eliminar o mesmo jogador duas vezes.
        if (player.eliminated) return false;

        if (roundFinished) return false;

        // A eliminação é exclusiva da rodada atual.
        player.eliminated = true;

        // Define o estado de espectador.
        player.spectator = true;

        // Guarda o motivo da eliminação.
        player.eliminationReason = reason;

        // Os acertos conquistados permanecem registrados.
        // A eliminação não remove pontos anteriores.

        // Registra a eliminação para utilização futura.
        const elimination = {

            round: round,

            playerId: player.id,

            playerName: player.nickname,

            reason: reason,

            letter: selectedLetter,

            theme: currentCard
                ? currentCard.tema
                : null,

            order: eliminationHistory.length + 1

        };

        eliminationHistory.push(elimination);

        // Exibe o novo estado na mesa.
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

        // Não existe um próximo jogador.
        if (totalPlayers < 2) {

            return -1;

        }

        // Percorre a lista de forma circular.
        // Depois do último jogador, volta ao primeiro.
        for (
            let offset = 1;
            offset < totalPlayers;
            offset++
        ) {

            const nextIndex =
                (currentPlayerIndex + offset) % totalPlayers;

            const nextPlayer =
                players[nextIndex];

            // Ignora jogadores eliminados.
            // Espectadores não recebem novas jogadas.
            if (!nextPlayer.eliminated) {

                return nextIndex;

            }

        }

        // Não encontrou outro jogador ativo.
        return -1;

    }

    // ========================================
    // ATUALIZAR INDICADOR DA VEZ
    // ========================================

    function updateTurnIndicator() {

        const currentPlayer = getCurrentPlayer();

        if (!currentPlayer) return;

        if (roundFinished) {

            turnIndicator.textContent =
                'RODADA ENCERRADA';

            return;

        }

        // No ambiente de testes, o desenvolvedor
        // controla manualmente todos os jogadores.
        if (modoTeste) {

            turnIndicator.textContent =
                `VEZ DE ${currentPlayer.nickname.toUpperCase()}`;

            return;

        }

        // Preparação para o multiplayer.
        const localPlayer =
            players.find(player => player.id === 'host');

        if (localPlayer && localPlayer.eliminated) {

            turnIndicator.textContent =
                'ESPECTADOR';

            return;

        }

        turnIndicator.textContent =
            currentPlayer.id === 'host'
                ? 'SUA VEZ'
                : 'AGUARDANDO';

    }

    // ========================================
    // ENCERRAMENTO DA RODADA
    // ========================================

    function finishRound(winner, reason) {

        // Impede múltiplos encerramentos.
        if (roundFinished) return;

        // Encerra definitivamente a rodada atual.
        roundFinished = true;

        roundStarted = false;

        // Guarda o vencedor.
        roundWinner = winner || null;

        // Interrompe o cronômetro.
        stopTimer();

        // Limpa a seleção sem devolver a letra.
        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        // Bloqueia todas as ações de resposta.
        resetAnswerInput();

        stopButton.disabled = true;

        $('stop-label').textContent =
            'ENCERRADA';

        turnIndicator.textContent =
            'RODADA ENCERRADA';

        // Atualiza os acertos antes de atribuir a carta.
        updatePlayerHits();

        // ====================================
        // EXIBIR O VENCEDOR
        // ====================================

        if (roundWinner) {

            // Concede uma carta ao vencedor.
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

        // A janela de resultados e a próxima rodada
        // serão implementadas posteriormente.

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

        // Identifica a maior quantidade de acertos
        // exclusivamente entre os jogadores ativos.
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

        // Se houver empate, guarda os participantes
        // da futura morte súbita.
        pendingRoundTiebreak = tiedPlayers.map(player => player.id);

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

        // A morte súbita será implementada em outra etapa.
        // Nenhum jogador recebe a carta enquanto o empate
        // não for resolvido.

    }

    // ========================================
    // VERIFICAR CONDIÇÕES DE ENCERRAMENTO
    // ========================================

    function checkRoundEnd() {

        if (roundFinished) return true;

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

            // O vencedor será definido pela quantidade
            // de acertos entre os jogadores sobreviventes.
            resolveRoundTiebreak(activePlayers);

            return true;

        }

        return false;

    }

    // ========================================
    // PASSAR PARA O PRÓXIMO JOGADOR
    // ========================================

    function advanceTurn(confirmationMessage = '') {

        // A alternância exige uma rodada iniciada.
        if (!currentCard || !roundStarted) return;

        if (roundFinished) return;

        // Encerra o cronômetro da jogada anterior.
        stopTimer();

        const previousPlayer =
            getCurrentPlayer();

        // ====================================
        // VERIFICAÇÃO DE ENCERRAMENTO
        // ====================================

        // Verifica jogadores restantes e letras disponíveis.
        if (checkRoundEnd()) return;

        // Procura o próximo jogador disponível.
        const nextIndex =
            getNextPlayerIndex();

        // ====================================
        // VERIFICAÇÃO DE JOGADORES DISPONÍVEIS
        // ====================================

        if (nextIndex === -1) {

            finishRound(
                null,
                'Não existem outros jogadores ativos.'
            );

            return;

        }

        // ====================================
        // ALTERNÂNCIA DO JOGADOR
        // ====================================

        currentPlayerIndex = nextIndex;

        const currentPlayer =
            getCurrentPlayer();

        // Limpa apenas a seleção da jogada anterior.
        // As letras utilizadas continuam bloqueadas.
        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        // Prepara o campo de resposta para a nova vez.
        resetAnswerInput();

        // Restaura o estado normal da rodada.
        timeExpired = false;

        // Atualiza o jogador destacado na lista.
        renderPlayers();

        // Atualiza o indicador acima do cronômetro.
        updateTurnIndicator();

        // Atualiza as letras disponíveis.
        updateLetters();

        // Mantém o botão central disponível.
        stopButton.disabled = false;

        $('stop-label').textContent =
            'REINICIAR';

        // ====================================
        // MENSAGEM DA NOVA JOGADA
        // ====================================

        if (confirmationMessage) {

            $('game-status').textContent =
                `${confirmationMessage} Agora é a vez de ${currentPlayer.nickname}.`;

        } else {

            $('game-status').textContent =
                `${currentPlayer.nickname}, escolha uma letra livre.`;

        }

        // ====================================
        // CRONÔMETRO DO PRÓXIMO JOGADOR
        // ====================================

        // O novo jogador recebe todo o tempo configurado.
        startTimer();

        // ====================================
        // REGISTRO PARA TESTES
        // ====================================

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

                if (!roundFinished) {

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

            // ====================================
            // PONTUAÇÃO DO JOGADOR
            // ====================================

            const scoreText =
                `${player.score} ${player.score === 1 ? 'carta' : 'cartas'}`;

            const hitsText =
                `${player.roundHits} ac.`;

            const totalHitsText =
                `${player.totalHits} ${player.totalHits === 1 ? 'acerto total' : 'acertos totais'}`;

            // Guarda todas as informações no título.
            score.title =
                `${scoreText} • ${player.roundHits} acertos na rodada • ${totalHitsText}`;

            // Mostra o estado de espectador.
            if (player.eliminated) {

                score.textContent =
                    `ESPECTADOR · ${hitsText}`;

                name.title =
                    `${player.nickname} — Espectador — ${scoreText} — ${totalHitsText}`;

            } else {

                // Cartas conquistadas e acertos da rodada.
                score.textContent =
                    `${scoreText} · ${hitsText}`;

                name.title =
                    `${player.nickname} — ${scoreText} — ${totalHitsText}`;

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

        const number =
            String(round).padStart(2, '0');

        $('round-number').textContent =
            `RODADA ${number}`;

        $('draw-round').textContent =
            `RODADA ${number}`;

        $('card-number').textContent =
            `CARTA ${number}`;

    }

    function updateRemainingCards() {

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

        // Remove o intervalo existente.
        if (timerInterval !== null) {

            clearInterval(timerInterval);

            timerInterval = null;

        }

        timerRunning = false;

        timerDeadline = 0;

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

        // Não inicia o tempo após encerrar a rodada.
        if (roundFinished) return;

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

    }

    // ========================================
    // ATUALIZAÇÃO DA CONTAGEM REGRESSIVA
    // ========================================

    function updateTimer() {

        if (!timerRunning) return;

        if (roundFinished) return;

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

        if (roundFinished) return false;

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

        // Evita executar o encerramento mais de uma vez.
        if (timeExpired) return;

        if (roundFinished) return;

        if (!roundStarted) return;

        timeExpired = true;

        stopTimer();

        remainingTime = 0;

        updateTimerDisplay();

        turnIndicator.textContent =
            'TEMPO ESGOTADO';

        stopButton.disabled = true;

        $('stop-label').textContent =
            'TEMPO ESGOTADO';

        // ====================================
        // IDENTIFICAÇÃO DO JOGADOR ELIMINADO
        // ====================================

        const eliminatedPlayer =
            getCurrentPlayer();

        // Guarda a letra selecionada antes de limpar.
        const consumedLetter =
            selectedLetter;

        // ====================================
        // ELIMINAÇÃO
        // ====================================

        // O jogador passa para o estado de espectador.
        eliminatePlayer(
            currentPlayerIndex,
            'timeout'
        );

        // ====================================
        // LIMPEZA DA JOGADA
        // ====================================

        // A letra escolhida continua consumida.
        // Não removemos nenhuma letra do usedLetters.
        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        // Descarta respostas que não foram confirmadas.
        resetAnswerInput();

        updateLetters();

        // ====================================
        // MENSAGEM DA ELIMINAÇÃO
        // ====================================

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

        // ====================================
        // VERIFICAR O VENCEDOR
        // ====================================

        // Se restou apenas um jogador,
        // encerra a rodada imediatamente.
        if (checkRoundEnd()) return;

        // ====================================
        // CONTINUAR A RODADA
        // ====================================

        // Passa para o próximo jogador ativo.
        // Jogadores eliminados são ignorados.
        // O próximo recebe o tempo completo.
        advanceTurn(eliminationMessage);

    }

    // ========================================
    // SORTEIO DA CARTA
    // ========================================

    async function drawTheme() {

        if (players.length < 2) return;

        if (isShuffling) return;

        if (currentCard) return;

        if (matchDeck.length === 0) return;

        isShuffling = true;

        drawButton.disabled = true;

        drawButton.textContent =
            'EMBARALHANDO...';

        $('draw-status').textContent =
            'Preparando o próximo desafio...';

        // O fundo já foi preparado na inicialização.
        // O sorteio começa imediatamente, sem esperar pelo html2canvas.
        deck.classList.add('shuffling');

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        setTimeout(() => {

            currentCard = matchDeck.pop();

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

        if (!currentCard || isShuffling) return;

        startRoundButton.disabled = true;

        $('current-theme').textContent =
            currentCard.tema;

        // Prepara o tempo, mas não inicia a contagem.
        resetTimer();

        // Prepara o estado de encerramento.
        roundFinished = false;

        roundWinner = null;

        pendingRoundTiebreak = [];

        // Mantém o total e recalcula os acertos da rodada atual.
        updatePlayerHits();

        // Limpa o conjunto de respostas da rodada.
        usedAnswers.clear();

        // Não existe uma resposta anterior nesta rodada.
        lastConfirmedAnswer = null;

        // Mantém o campo de resposta bloqueado.
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

            // Atualiza a identificação do primeiro jogador.
            updateTurnIndicator();

            $('game-status').textContent =
                `${getCurrentPlayer().nickname}, pressione STOP! para iniciar.`;

            stopButton.focus();

            // Atualiza o fundo em segundo plano para o próximo sorteio.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {

                    // Evita iniciar uma captura durante a contagem.
                    if (!roundStarted) {

                        requestBackgroundCapture();

                    }

                });
            });

        }, reducedMotion ? 0 : 250);

    }

    // ========================================
    // BOTÃO STOP! — CONTROLE DA JOGADA
    // ========================================

    function handleStop() {

        if (!currentCard) return;

        // Impede ações após encerrar a rodada.
        if (roundFinished) return;

        // Impede ações após o tempo esgotar.
        if (timeExpired) return;

        // Impede ações enquanto o botão estiver bloqueado.
        if (stopButton.disabled) return;

        // Impede ações de jogadores eliminados.
        if (players[currentPlayerIndex].eliminated) return;

        // Primeiro clique: inicia a rodada.
        if (!roundStarted) {

            roundStarted = true;

            $('stop-label').textContent =
                'REINICIAR';

            $('game-status').textContent =
                `${getCurrentPlayer().nickname}, escolha uma letra livre.`;

            updateTurnIndicator();

            updateLetters();

            // Inicia a contagem regressiva.
            startTimer();

            return;

        }

        // Confere se o jogador ainda possui tempo.
        if (!validateTimer()) return;

        // Confirma a jogada de acordo com o modo.
        confirmAnswer();

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

    $('back-button').addEventListener('click', () => {

        // Encerra o cronômetro antes de sair.
        stopTimer();

        clearTimeout(backgroundCaptureTimer);

        // O teste não interfere na sala normal.
        if (modoTeste) {

            window.location.href = 'index.html';

            return;

        }

        window.location.href = 'lobby.html';

    });

    // ========================================
    // ENVIO DA RESPOSTA — ENTER OU SETA
    // ========================================

    answerForm.addEventListener('submit', (event) => {

        event.preventDefault();

        // Formulário exclusivo do SEM CALL.
        if (config.mode !== 'sem-call') return;

        // Impede o envio fora da rodada.
        if (!roundStarted || timeExpired) return;

        if (roundFinished) return;

        // Impede o envio por jogador eliminado.
        if (getCurrentPlayer().eliminated) return;

        // Impede o envio sem uma letra escolhida.
        if (!selectedLetter) return;

        if (answerInput.disabled) return;

        // Utiliza a mesma confirmação do botão STOP!.
        confirmAnswer();

    });

    // ========================================
    // ALTERAÇÃO DO CAMPO DE RESPOSTA
    // ========================================

    answerInput.addEventListener('input', () => {

        // Permite corrigir uma resposta inválida.
        if (
            answerInput.getAttribute('aria-invalid') === 'true'
        ) {

            answerInput.removeAttribute('aria-invalid');

            if (
                config.mode === 'sem-call' &&
                selectedLetter &&
                !timeExpired &&
                !roundFinished
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
    // INICIALIZAÇÃO
    // ========================================

    async function initializeGame() {

        // Monta a interface e os elementos da roleta.
        setupInterface();

        // Captura o jogo com a sobreposição ainda escondida.
        // A tela de sorteio só aparece quando a imagem estiver pronta.
        await requestBackgroundCapture();

        // Mostra o sorteio já com o fundo preparado.
        drawOverlay.hidden = false;

        if (!drawButton.disabled) {

            drawButton.focus();

        }

    }

    initializeGame();

})();