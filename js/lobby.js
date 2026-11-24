
// Elementos da sala
const roomName = document.getElementById('room-name');
const roomMode = document.getElementById('room-mode');
const roomCode = document.getElementById('room-code');
const copyCode = document.getElementById('copy-code');

// Elementos dos jogadores
const playersList = document.getElementById('players-list');
const playerCount = document.getElementById('player-count');
const playerSummary = document.getElementById('player-summary');

// Painéis de comunicação
const voicePanel = document.getElementById('voice-panel');
const chatPanel = document.getElementById('chat-panel');

// Botões e mensagens
const startButton = document.getElementById('start-button');
const leaveButton = document.getElementById('leave-button');
const lobbyStatus = document.getElementById('lobby-status');

// Recupera as configurações da sala
let roomConfig;

try {
    roomConfig = JSON.parse(sessionStorage.getItem('roomConfig'));
} catch {
    roomConfig = null;
}

if (!roomConfig || !['com-call', 'sem-call'].includes(roomConfig.mode)) {

    window.location.replace('salas.html');

} else {

    initializeLobby();

}

function initializeLobby() {

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

    }

    // Jogadores presentes na sala local
    const players = [
        {
            nickname: roomConfig.nickname,
            host: true,
            ready: true
        }
    ];

    // Informações da sala
    roomName.textContent = roomConfig.roomName;
    roomCode.textContent = roomConfig.roomCode;

    if (roomConfig.mode === 'com-call') {

        roomMode.textContent = '🎙 COM CALL';

        voicePanel.hidden = false;
        chatPanel.hidden = true;

    } else {

        roomMode.textContent = '▤ SEM CALL';

        voicePanel.hidden = true;
        chatPanel.hidden = false;

    }

    // Salva as configurações localmente
    function saveSettings() {

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

        // Bloqueia os controles ao atingir os limites
        document.querySelectorAll('[data-target]').forEach(button => {

            const target = button.dataset.target;
            const step = Number(button.dataset.step);

            const setting = settings[target];

            const minimum = target === 'players'
                ? Math.max(setting.min, players.length)
                : setting.min;

            const nextValue = setting.value + step;

            button.disabled =
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

        name.textContent = player.host
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

        playersList.replaceChildren();

        players.forEach(player => {

            playersList.appendChild(
                createPlayerRow(player)
            );

        });

        const availableSlots =
            settings.players.value - players.length;

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

        updateLobbyStatus();

    }

    // Atualiza o estado do botão de iniciar
    function updateLobbyStatus() {

        const enoughPlayers = players.length >= 2;

        const everyoneReady = players.every(
            player => player.ready
        );

        startButton.disabled =
            !enoughPlayers || !everyoneReady;

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

        // Alterna o ícone entre cadeado e iniciar
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

    }

    // Botões de aumentar e diminuir configurações
    document.querySelectorAll('[data-target]').forEach(button => {

        button.addEventListener('click', () => {

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

        if (startButton.disabled) {
            return;
        }

        lobbyStatus.textContent =
            'A partida multiplayer ainda não está disponível.';

    });

    // Sair da sala
    leaveButton.addEventListener('click', () => {

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
    updateSettings();
    renderPlayers();

}
