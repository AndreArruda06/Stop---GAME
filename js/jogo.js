
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

            if (drawOverlay.hidden) {

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
            ...player
        }))

        // Sala normal: integração multiplayer futura.
        : [
            {
                id: 'host',
                nickname: config.nickname,
                score: 0,
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

        $('game-status').textContent =
            `Letra ${letter} escolhida! Não é possível voltar atrás.`;

        updateLetters();

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
            button.disabled =
                !roundStarted ||
                used ||
                selectedLetter !== null;

        });

    }

    // ========================================
    // EXIBIÇÃO DOS JOGADORES
    // ========================================

    function renderPlayers() {

        const playersList = $('players-list');

        playersList.replaceChildren();

        players.forEach((player, index) => {

            const item =
                document.createElement('li');

            item.className = 'player-item';

            if (index === currentPlayerIndex) {

                item.classList.add('active');

            }

            if (player.eliminated) {

                item.classList.add('eliminated');

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

            score.textContent =
                `${player.score} ${player.score === 1 ? 'carta' : 'cartas'}`;

            item.append(
                avatar,
                name,
                score
            );

            playersList.appendChild(item);

        });

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

            $('turn-indicator').textContent =
                'SUA VEZ';

            $('game-status').textContent =
                'Pressione STOP! para iniciar.';

            stopButton.focus();

            // Atualiza o fundo em segundo plano para o próximo sorteio.
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    requestBackgroundCapture();
                });
            });

        }, reducedMotion ? 0 : 250);

    }

    // ========================================
    // BOTÃO STOP! — TESTE INICIAL
    // ========================================

    function handleStop() {

        if (!currentCard) return;

        if (!roundStarted) {

            roundStarted = true;

            $('stop-label').textContent =
                'REINICIAR';

            $('game-status').textContent =
                'Escolha uma letra livre.';

            updateLetters();

            return;

        }

        // Confirmação provisória para testar
        // o bloqueio definitivo das letras.

        if (!selectedLetter) {

            $('game-status').textContent =
                'Escolha uma letra primeiro.';

            return;

        }

        // A letra já foi consumida no momento
        // em que o jogador realizou a escolha.

        $('game-status').textContent =
            `Letra ${selectedLetter} utilizada.`;

        selectedLetter = null;

        $('selected-letter-box').hidden = true;

        $('selected-letter').textContent = '—';

        updateLetters();

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

        // O teste não interfere na sala normal.
        if (modoTeste) {

            window.location.href = 'index.html';

            return;

        }

        window.location.href = 'lobby.html';

    });

    $('answer-form').addEventListener('submit', (event) => {

        event.preventDefault();

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
