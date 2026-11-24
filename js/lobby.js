
// Elementos da sala
const roomName = document.getElementById('room-name');
const roomMode = document.getElementById('room-mode');
const roomCode = document.getElementById('room-code');
const copyCode = document.getElementById('copy-code');

// Elementos dos jogadores
const playersList = document.getElementById('players-list');
const playerCount = document.getElementById('player-count');
const playerSummary = document.getElementById('player-summary');
const roleMessage = document.getElementById('role-message');
const settingsMessage = document.getElementById('settings-message');

// Painéis de comunicação
const voicePanel = document.getElementById('voice-panel');
const chatPanel = document.getElementById('chat-panel');

// Botões e mensagens
const startButton = document.getElementById('start-button');
const readyButton = document.getElementById('ready-button');
const leaveButton = document.getElementById('leave-button');
const lobbyStatus = document.getElementById('lobby-status');

// Parâmetros da página
const params = new URLSearchParams(window.location.search);

// Modo temporário para testar a visão do convidado
const guestTest = params.get('teste') === 'jogador';

// Recupera as configurações da sala
let roomConfig;

try {
    roomConfig = JSON.parse(sessionStorage.getItem('roomConfig'));
} catch {
    roomConfig = null;
}

// Verifica se existe uma configuração válida
if (!roomConfig || !['com-call', 'sem-call'].includes(roomConfig.mode)) {

    window.location.replace('salas.html');

} else {

    initializeLobby();

}

function initializeLobby() {

    // Identifica o papel do participante
    const isHost = !guestTest;

    // Configurações e limites
    const settings = {
        players: {
            value: roomConfig.players,
            min: 2,
            max: 12
        },

        time: {
            value: roomConfig.time,
            min: 5,
            max: 120
        },

        cards: {
            value: roomConfig.cards,
            min: 1,
            max: 26
        }
    };

    // Valida as configurações recuperadas
    Object.values(settings).forEach(setting => {

        if (!Number.isInteger(setting.value)) {
            setting.value = setting.min;
        }

        setting.value = Math.max(
            setting.min,
            Math.min(setting.max, setting.value)
        );

    });

    // Gera um código provisório para testes locais
    function generateRoomCode() {

        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        let code = '';

        for (let i = 0; i < 6; i++) {

            const index = Math.floor(
                Math.random() * characters.length
            );

            code += characters[index];

        }

        return code;

    }

    // Mantém o código ao atualizar a página
    if (!roomConfig.roomCode) {

        roomConfig.roomCode = generateRoomCode();

        sessionStorage.setItem(
            'roomConfig',
            JSON.stringify(roomConfig)
        );

    }

    // Jogadores presentes na sala local
    const players = [
        {
            id: 'host',
            nickname: roomConfig.nickname,
            host: true,
            ready: true
        }
    ];

    // Identificação do jogador atual
    const currentPlayerId = isHost
        ? 'host'
        : 'guest-test';

    // Participante fictício exclusivo do modo de teste
    if (guestTest) {

        players.push({
            id: 'guest-test',
            nickname: 'Jogador teste',
            host: false,
            ready: false
        });

    }

    // Recupera o jogador atual
    const currentPlayer = players.find(
        player => player.id === currentPlayerId
    );

    // Informações da sala
    roomName.textContent = roomConfig.roomName;
    roomCode.textContent = roomConfig.roomCode;

    // Identifica a modalidade
    if (roomConfig.mode === 'com-call') {

        roomMode.textContent = '🎙 COM CALL';

        voicePanel.hidden = false;
        chatPanel.hidden = true;

    } else {

        roomMode.textContent = '▤ SEM CALL';

        voicePanel.hidden = true;
        chatPanel.hidden = false;

    }

    // Configura a interface conforme o papel do jogador
    function updateRole() {

        document.body.classList.toggle(
            'guest-view',
            !isHost
        );

        // Alterna os botões principais
        startButton.hidden = !isHost;
        readyButton.hidden = isHost;

        // Exibe os cadeados para convidados
        document.querySelectorAll('.setting-lock')
            .forEach(lock => {

                lock.hidden = isHost;

            });

        // Mensagem de identificação
        if (isHost) {

            roleMessage.textContent =
                'Você é o anfitrião desta sala.';

        } else {

            roleMessage.textContent =
                'Você é um jogador desta sala.';

        }

        // Preserva o ícone da mensagem de configurações
        const lockIcon = settingsMessage.querySelector('svg');

        settingsMessage.replaceChildren();

        if (lockIcon) {
            settingsMessage.appendChild(lockIcon);
        }

        settingsMessage.append(
            document.createTextNode(
                isHost
                    ? 'Só você pode editar.'
                    : 'Somente o anfitrião pode editar.'
            )
        );

        // Identifica explicitamente a simulação local
        if (guestTest) {

            roleMessage.textContent +=
                ' (Modo de teste local)';

        }

    }

    // Salva as configurações localmente
    function saveSettings() {

        // Convidados não podem alterar configurações
        if (!isHost) {
            return;
        }

        roomConfig.players = settings.players.value;
        roomConfig.time = settings.time.value;
        roomConfig.cards = settings.cards.value;

        sessionStorage.setItem(
            'roomConfig',
            JSON.stringify(roomConfig)
        );

    }

    // Atualiza os valores das configurações
    function updateSettings() {

        document.getElementById('players').textContent =
            settings.players.value;

        document.getElementById('time').textContent =
            `${settings.time.value} s`;

        document.getElementById('cards').textContent =
            settings.cards.value;

        // Bloqueia os controles conforme permissões e limites
        document.querySelectorAll('[data-target]')
            .forEach(button => {

                const target = button.dataset.target;
                const step = Number(button.dataset.step);

                const setting = settings[target];

                const minimum = target === 'players'
                    ? Math.max(setting.min, players.length)
                    : setting.min;

                const nextValue = setting.value + step;

                button.disabled =
                    !isHost ||
                    nextValue < minimum ||
                    nextValue > setting.max;

            });

        saveSettings();

    }

    // Cria a linha de um jogador
    function createPlayerRow(player) {

        const row = document.createElement('li');
        row.className = 'player-row';

        const avatar = document.createElement('span');
        avatar.className = 'player-avatar';

        if (player.host) {

            avatar.classList.add('host');

        }

        avatar.textContent = '☺';

        const name = document.createElement('span');
        name.className = 'player-name';

        // Identifica corretamente o próprio jogador
        name.textContent = player.id === currentPlayerId
            ? `${player.nickname} (você)`
            : player.nickname;

        row.append(avatar, name);

        // Identificação do anfitrião
        if (player.host) {

            const crown = document.createElement('span');

            crown.className = 'host-crown';
            crown.textContent = '♔';
            crown.title = 'Anfitrião';

            row.appendChild(crown);

        }

        // Estado do jogador
        const status = document.createElement('span');

        status.className = player.ready
            ? 'player-status ready'
            : 'player-status waiting';

        status.textContent = player.ready
            ? 'Pronto'
            : 'Aguardando';

        row.appendChild(status);

        return row;

    }

    // Cria uma vaga disponível
    function createEmptySlot() {

        const row = document.createElement('li');
        row.className = 'empty-slot';

        const plus = document.createElement('span');
        plus.className = 'plus';
        plus.textContent = '+';

        const text = document.createElement('span');
        text.textContent = 'Vaga disponível';

        row.append(plus, text);

        return row;

    }

    // Atualiza a lista de jogadores
    function renderPlayers() {

        // Preserva a posição da rolagem
        const scrollPosition = playersList.scrollTop;

        playersList.replaceChildren();

        players.forEach(player => {

            playersList.appendChild(
                createPlayerRow(player)
            );

        });

        const availableSlots = Math.max(
            0,
            settings.players.value - players.length
        );

        for (let i = 0; i < availableSlots; i++) {

            playersList.appendChild(
                createEmptySlot()
            );

        }

        playerCount.textContent =
            `${players.length}/${settings.players.value}`;

        const connectedText = players.length === 1
            ? '1 conectado'
            : `${players.length} conectados`;

        const availableText = availableSlots === 1
            ? '1 vaga disponível'
            : `${availableSlots} vagas disponíveis`;

        playerSummary.textContent =
            `${connectedText} • ${availableText}`;

        document.getElementById('chat-online').textContent =
            `${players.length} local`;

        playersList.scrollTop = scrollPosition;

        updateLobbyStatus();

    }

    // Atualiza o botão de confirmação do convidado
    function updateReadyButton() {

        if (isHost) {
            return;
        }

        readyButton.setAttribute(
            'aria-pressed',
            String(currentPlayer.ready)
        );

        // Jogador pronto: permite cancelar a confirmação
        if (currentPlayer.ready) {

            readyButton.innerHTML = `
                <svg width="18" height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">

                    <path d="M6 6L18 18M18 6L6 18"/>

                </svg>

                CANCELAR
            `;

        } else {

            // Jogador aguardando: permite confirmar presença
            readyButton.innerHTML = `
                <svg width="18" height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">

                    <path d="M5 12l4 4L19 6"/>

                </svg>

                ESTOU PRONTO
            `;

        }

    }

    // Atualiza o estado do Lobby
    function updateLobbyStatus() {

        const enoughPlayers = players.length >= 2;

        const everyoneReady = players.every(
            player => player.ready
        );

        // Estado do anfitrião
        startButton.disabled =
            !isHost ||
            !enoughPlayers ||
            !everyoneReady;

        if (isHost) {

            if (!enoughPlayers) {

                lobbyStatus.textContent =
                    'Esperando a turma: são necessários pelo menos 2 jogadores.';

            } else if (!everyoneReady) {

                lobbyStatus.textContent =
                    'Aguardando os jogadores ficarem prontos...';

            } else {

                lobbyStatus.textContent =
                    'A turma está pronta. Que comece o desafio!';

            }

        } else {

            // Estado do convidado
            if (currentPlayer.ready) {

                lobbyStatus.textContent =
                    'Você está pronto! Aguardando o anfitrião iniciar a partida.';

            } else {

                lobbyStatus.textContent =
                    'Confirme que está pronto para começar!';

            }

        }

        // Alterna o ícone do botão de iniciar
        const icon = startButton.querySelector('svg');

        if (startButton.disabled) {

            icon.innerHTML = `
                <rect x="5" y="11" width="14"
                    height="10" rx="2"/>
                <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
            `;

        } else {

            icon.innerHTML = `
                <path d="M8 5l12 7-12 7z"/>
            `;

        }

        updateReadyButton();

    }

    // Botões de aumentar e diminuir configurações
    document.querySelectorAll('[data-target]')
        .forEach(button => {

            button.addEventListener('click', () => {

                // Impede alterações feitas por convidados
                if (!isHost) {
                    return;
                }

                const target = button.dataset.target;
                const step = Number(button.dataset.step);

                const setting = settings[target];

                const minimum = target === 'players'
                    ? Math.max(setting.min, players.length)
                    : setting.min;

                const nextValue = setting.value + step;

                if (
                    nextValue >= minimum &&
                    nextValue <= setting.max
                ) {

                    setting.value = nextValue;

                    updateSettings();
                    renderPlayers();

                }

            });

        });

    // Confirmação de presença do convidado
    readyButton.addEventListener('click', () => {

        if (isHost) {
            return;
        }

        // Alterna entre pronto e aguardando
        currentPlayer.ready = !currentPlayer.ready;

        renderPlayers();

    });

    // Copia o código provisório da sala
    copyCode.addEventListener('click', async () => {

        try {

            await navigator.clipboard.writeText(
                roomConfig.roomCode
            );

            const originalContent = copyCode.innerHTML;

            copyCode.textContent = 'COPIADO!';
            copyCode.disabled = true;

            setTimeout(() => {

                copyCode.innerHTML = originalContent;
                copyCode.disabled = false;

            }, 1500);

        } catch {

            lobbyStatus.textContent =
                'Não foi possível copiar. Copie o código manualmente.';

        }

    });

    // Iniciar partida
    startButton.addEventListener('click', () => {

        if (!isHost || startButton.disabled) {
            return;
        }

        lobbyStatus.textContent =
            'A partida multiplayer ainda não está disponível.';

    });

    // Sair da sala
    leaveButton.addEventListener('click', () => {

        // Encerra somente a simulação do convidado
        if (guestTest) {

            window.location.href = 'lobby.html';

            return;

        }

        // Remove as configurações da sala local
        sessionStorage.removeItem('roomConfig');

        window.location.href =
            `salas.html?modo=${encodeURIComponent(roomConfig.mode)}`;

    });

    // Impede envio de mensagens antes da integração online
    document.getElementById('chat-form')
        .addEventListener('submit', event => {

            event.preventDefault();

        });

    // Inicialização
    updateRole();
    updateSettings();
    renderPlayers();

}
