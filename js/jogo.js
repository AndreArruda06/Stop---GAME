
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
    // CONFIGURAÇÕES DA SALA
    // ========================================

    let roomConfig;

    try {

        roomConfig = JSON.parse(
            sessionStorage.getItem('roomConfig')
        );

    } catch {

        roomConfig = null;

    }

    // Configurações provisórias para testes locais

    const config = {

        nickname: roomConfig?.nickname || 'Jogador',

        roomCode: roomConfig?.roomCode || 'TESTE1',

        mode: roomConfig?.mode === 'com-call'
            ? 'com-call'
            : 'sem-call',

        time: Math.min(
            120,
            Math.max(5, Math.floor(Number(roomConfig?.time) || 10))
        ),

        cards: Math.min(
            26,
            BANCO_CARTAS.length,
            Math.max(1, Math.floor(Number(roomConfig?.cards) || 10))
        )

    };

    // ========================================
    // JOGADORES SIMULADOS
    // ========================================

    const players = [

        {
            id: 'host',
            nickname: config.nickname,
            score: 0,
            eliminated: false
        },

        {
            id: 'player-2',
            nickname: 'Bia',
            score: 0,
            eliminated: false
        },

        {
            id: 'player-3',
            nickname: 'Gui',
            score: 0,
            eliminated: false
        },

        {
            id: 'player-4',
            nickname: 'Léo',
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

    // Seleciona somente a quantidade configurada

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

        drawButton.disabled = false;

        $('draw-status').textContent =
            `${players[currentPlayerIndex].nickname} realizará o sorteio.`;

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

    function drawTheme() {

        if (isShuffling) return;

        if (currentCard) return;

        if (matchDeck.length === 0) return;

        isShuffling = true;

        drawButton.disabled = true;

        drawButton.textContent =
            'EMBARALHANDO...';

        $('draw-status').textContent =
            'Preparando o próximo desafio...';

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

        window.location.href = roomConfig
            ? 'lobby.html'
            : 'salas.html';

    });

    $('answer-form').addEventListener('submit', (event) => {

        event.preventDefault();

    });

    // ========================================
    // INICIALIZAÇÃO
    // ========================================

    setupInterface();

    drawButton.focus();

})();
