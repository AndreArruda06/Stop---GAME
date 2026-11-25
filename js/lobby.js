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

    if (guestTest) {
        initializeLobby();
    } else {
        initializeOnlineLobby();
    }

}

// Conecta o lobby real sem carregar o Firebase no teste local.
async function initializeOnlineLobby() {

    const codigo = roomConfig.roomCode;

    startButton.disabled = true;
    readyButton.disabled = true;
    copyCode.disabled = true;
    leaveButton.disabled = true;
    document.querySelectorAll('[data-target]').forEach(button => {
        button.disabled = true;
    });
    lobbyStatus.textContent = 'Carregando sala online...';

    try {
        if (typeof codigo !== 'string' || !/^[A-Z0-9]{6}$/.test(codigo)) {
            throw new Error('Código de sala inválido.');
        }

        const { database, autenticarJogador } = await import('./firebase-config.js');
        const { ref, get, onValue, set, onDisconnect, push, query, orderByKey, limitToLast, serverTimestamp, update } = await import(
            'https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js'
        );
        const usuario = await autenticarJogador();
        const referencia = ref(database, `salas/${codigo}`);

        const snapshot = await get(referencia);
        const sala = snapshot.val();

        if (!sala || !sala.jogadores?.[usuario.uid]) {
            throw new Error('Sala indisponível para este jogador.');
        }

        const { sairSalaOnline } = await import('./salas-online.js');
        const presenca = ref(database, `salas/${codigo}/jogadores/${usuario.uid}/conectado`);
        let conectado = false;
        let encerrando = false;
        let geracao = 0;
        let atualizarConexao = () => {};
        let pararSala = () => {};
        let pararPresenca = () => {};
        let pararChat = () => {};
        const chatRef = ref(database, `chats/${codigo}`);

        function voltarParaSalas() {
            encerrando = true;
            pararSala();
            pararPresenca();
            pararChat();
            sessionStorage.removeItem('roomConfig');
            sessionStorage.removeItem('joinConfig');
            window.location.replace(`salas.html?modo=${encodeURIComponent(roomConfig.mode)}`);
        }

        const atualizarSala = initializeLobby({
            uid: usuario.uid,
            sala,
            estaConectado: () => conectado && !encerrando,
            registrarAtualizacaoConexao: callback => { atualizarConexao = callback; },
            sair: async () => {
                if (!conectado || encerrando) throw new Error('Aguarde a reconexão para sair.');
                encerrando = true;
                geracao++;
                try {
                    if (sala.anfitriao === usuario.uid) {
                        // Exclui a sala e o chat em uma operação atômica.
                        await update(ref(database), {
                            [`salas/${codigo}`]: null,
                            [`chats/${codigo}`]: null
                        });
                    } else {
                        await sairSalaOnline(codigo);
                    }
                    voltarParaSalas();
                } catch (erro) {
                    encerrando = false;
                    atualizarConexao();
                    throw erro;
                }
            },
            enviarMensagem: texto => set(push(chatRef), {
                uid: usuario.uid,
                nickname: sala.jogadores[usuario.uid].nickname,
                texto,
                criadoEm: serverTimestamp()
            }),
            observarChat: (callback, erro) => {
                pararChat = onValue(query(chatRef, orderByKey(), limitToLast(50)), callback, erro);
            },
            salvarConfiguracao: (campo, valor) => set(
                ref(database, `salas/${codigo}/configuracoes/${campo}`),
                valor
            ),
            salvarPronto: pronto => set(
                ref(database, `salas/${codigo}/jogadores/${usuario.uid}/pronto`),
                pronto
            )
        });
        copyCode.disabled = false;
        leaveButton.disabled = false;

        pararSala = onValue(referencia, snapshotAtual => {
            if (encerrando) return;
            const salaAtual = snapshotAtual.val();
            if (!salaAtual || !salaAtual.jogadores?.[usuario.uid]) {
                voltarParaSalas();
                return;
            }
            atualizarSala(salaAtual);
        }, erro => {
            console.error('[STOP!] Falha na sincronização:', erro);
            lobbyStatus.textContent = 'Não foi possível atualizar a sala.';
            document.querySelectorAll('[data-target]').forEach(button => { button.disabled = true; });
            startButton.disabled = true;
            readyButton.disabled = true;
        });

        // O servidor marca a desconexão sem excluir a vaga.
        pararPresenca = onValue(ref(database, '.info/connected'), async snapshotConexao => {
            const tentativa = ++geracao;
            conectado = false;
            atualizarConexao();
            if (encerrando || snapshotConexao.val() !== true) return;
            try {
                // Registra a ação antes de indicar presença online.
                await onDisconnect(presenca).set(false);
                if (encerrando || tentativa !== geracao) return;
                await set(presenca, true);
                if (encerrando || tentativa !== geracao) return;
                conectado = true;
                atualizarConexao();
            } catch (erro) {
                console.error('[STOP!] Erro ao registrar presença:', erro);
                lobbyStatus.textContent = 'Não foi possível registrar a conexão.';
            }
        });

        // Não remove a sala nem o jogador ao atualizar a página.
        window.addEventListener('pagehide', () => {
            pararSala();
            pararPresenca();
            pararChat();
        }, { once: true });
        window.addEventListener('pageshow', evento => {
            if (evento.persisted) window.location.reload();
        });

    } catch (erro) {
        console.error('[STOP!] Erro ao carregar sala:', erro);
        lobbyStatus.textContent = 'Não foi possível carregar a sala online.';
        leaveButton.disabled = false;
        leaveButton.addEventListener('click', () => {
            sessionStorage.removeItem('roomConfig');
            window.location.href = `salas.html?modo=${encodeURIComponent(roomConfig.mode)}`;
        }, { once: true });
    }
}

function initializeLobby(online = null) {

    const isOnline = online !== null;
    let saindoSala = false;
    let salvandoPronto = false;
    let salvandoConfiguracao = false;
    const camposOnline = { players: "maxJogadores", time: "tempo", cards: "quantidadeCartas" };
    let statusSala = isOnline ? online.sala.status : 'aguardando';

    function sincronizarConfig(sala) {
        roomConfig.roomName = sala.nome;
        roomConfig.mode = sala.modo;
        roomConfig.privacy = sala.privacidade;
        roomConfig.players = sala.configuracoes.maxJogadores;
        roomConfig.time = sala.configuracoes.tempo;
        roomConfig.cards = sala.configuracoes.quantidadeCartas;
        roomConfig.playerId = online.uid;
        roomConfig.hostId = sala.anfitriao;
        roomConfig.isHost = sala.anfitriao === online.uid;
        roomConfig.nickname = sala.jogadores[online.uid].nickname;
        sessionStorage.setItem('roomConfig', JSON.stringify(roomConfig));
    }

    if (isOnline) sincronizarConfig(online.sala);

    // Identifica o papel do participante
    let isHost = isOnline ? online.sala.anfitriao === online.uid : !guestTest;

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
    if (!isOnline && !roomConfig.roomCode) {

        roomConfig.roomCode = generateRoomCode();

        sessionStorage.setItem(
            'roomConfig',
            JSON.stringify(roomConfig)
        );

    }

    // Jogadores presentes na sala local
    const players = isOnline ? converterJogadores(online.sala) : [
        {
            id: 'host',
            nickname: roomConfig.nickname,
            host: true,
            ready: true
        }
    ];

    // Identificação do jogador atual
    const currentPlayerId = isOnline
        ? online.uid
        : isHost
            ? 'host'
            : 'guest-test';

    function converterJogadores(sala) {
        return Object.entries(sala.jogadores || {}).map(([id, jogador]) => ({
            id,
            nickname: jogador.nickname,
            host: id === sala.anfitriao,
            ready: jogador.pronto === true,
            connected: jogador.conectado === true,
            vaga: jogador.vaga
        })).sort((a, b) => Number(b.host) - Number(a.host) || (a.vaga || 0) - (b.vaga || 0));
    }

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
    let currentPlayer = players.find(
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
        if (isOnline || !isHost) {
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
                    ? Math.max(setting.min, players.length, ...players.map(player => player.vaga || 0))
                    : setting.min;

                const nextValue = setting.value + step;

                button.disabled =
                    (isOnline && (salvandoConfiguracao || saindoSala || !online.estaConectado() || statusSala !== 'aguardando')) ||
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

        status.textContent = isOnline && !player.connected
            ? 'Desconectado'
            : player.ready ? 'Pronto' : 'Aguardando';

        if (isOnline && !player.connected) status.className = 'player-status waiting';

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

        const connectedText = isOnline
            ? `${players.filter(player => player.connected).length} conectados`
            : players.length === 1
                ? '1 conectado'
                : `${players.length} conectados`;

        const availableText = availableSlots === 1
            ? '1 vaga disponível'
            : `${availableSlots} vagas disponíveis`;

        playerSummary.textContent =
            `${connectedText} • ${availableText}`;

        document.getElementById('chat-online').textContent =
            isOnline ? `${players.filter(player => player.connected).length} online` : `${players.length} local`;

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
            player => player.ready && (!isOnline || player.connected)
        );

        // Estado do anfitrião
        startButton.disabled =
            isOnline ||
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

        if (isOnline) {
            readyButton.disabled = isHost || salvandoPronto || saindoSala || !online.estaConectado() || !currentPlayer || statusSala !== 'aguardando';
            leaveButton.disabled = saindoSala || !online.estaConectado();
            if (isHost && enoughPlayers && everyoneReady) {
                lobbyStatus.textContent = 'Todos prontos! Início da partida em desenvolvimento.';
            }
            if (!online.estaConectado()) {
                lobbyStatus.textContent = 'Conexão indisponível. Aguardando reconexão...';
            } else if (players.some(player => player.host && !player.connected)) {
                lobbyStatus.textContent = 'Anfitrião desconectado. Aguardando reconexão...';
            } else if (players.some(player => !player.connected)) {
                lobbyStatus.textContent = 'Há jogadores desconectados. As vagas continuam reservadas.';
            }
        }

    }

    // Botões de aumentar e diminuir configurações
    document.querySelectorAll('[data-target]')
        .forEach(button => {

            button.addEventListener('click', async () => {

                // Impede alterações feitas por convidados
                if (!isHost || button.disabled || (isOnline && (salvandoConfiguracao || saindoSala || !online.estaConectado() || statusSala !== 'aguardando'))) {
                    return;
                }

                const target = button.dataset.target;
                const step = Number(button.dataset.step);

                const setting = settings[target];

                const minimum = target === 'players'
                    ? Math.max(setting.min, players.length, ...players.map(player => player.vaga || 0))
                    : setting.min;

                const nextValue = setting.value + step;

                if (
                    nextValue >= minimum &&
                    nextValue <= setting.max
                ) {

                    if (isOnline) {
                        salvandoConfiguracao = true;
                        updateSettings();
                        try {
                            await online.salvarConfiguracao(camposOnline[target], nextValue);
                        } catch (erro) {
                            console.error('[STOP!] Erro ao salvar configuração:', erro);
                            lobbyStatus.textContent = 'Não foi possível alterar a configuração. Tente novamente.';
                        } finally {
                            salvandoConfiguracao = false;
                            updateSettings();
                        }
                        return;
                    }

                    setting.value = nextValue;

                    updateSettings();
                    renderPlayers();

                }

            });

        });

    // Confirmação de presença do convidado
    readyButton.addEventListener('click', async () => {

        if (isHost || !currentPlayer || salvandoPronto) {
            return;
        }

        if (isOnline) {
            if (statusSala !== 'aguardando' || readyButton.disabled) return;
            salvandoPronto = true;
            readyButton.disabled = true;
            try {
                await online.salvarPronto(!currentPlayer.ready);
            } catch (erro) {
                console.error('[STOP!] Erro ao confirmar presença:', erro);
                lobbyStatus.textContent = 'Não foi possível atualizar sua confirmação. Tente novamente.';
            } finally {
                salvandoPronto = false;
                readyButton.disabled = isHost || saindoSala || !online.estaConectado() || statusSala !== 'aguardando' || !currentPlayer;
            }
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
    leaveButton.addEventListener('click', async () => {

        if (isOnline) {
            if (saindoSala || !online.estaConectado()) return;
            saindoSala = true;
            atualizarChat();
            updateSettings();
            updateLobbyStatus();
            try {
                await online.sair();
            } catch (erro) {
                console.error('[STOP!] Erro ao sair:', erro);
                saindoSala = false;
                atualizarChat();
                updateSettings();
                updateLobbyStatus();
                lobbyStatus.textContent = 'Não foi possível sair da sala. Tente novamente.';
            }
            return;
        }

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

    // Chat online do lobby (somente SEM CALL).
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendMessage = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    let enviandoMensagem = false;
    let chatCarregado = false;
    let ultimoEnvio = 0;
    let cooldownChat = null;
    const chatNote = document.createElement('p');
    chatNote.className = 'communication-note';
    chatNote.setAttribute('role', 'status');
    chatForm.after(chatNote);

    function atualizarChat() {
        const permitido = isOnline && roomConfig.mode === 'sem-call' &&
            chatCarregado && online.estaConectado() && !saindoSala &&
            statusSala === 'aguardando';
        chatInput.disabled = !permitido || enviandoMensagem;
        sendMessage.disabled = !permitido || enviandoMensagem ||
            !chatInput.value.trim() || chatInput.value.trim().length > 200 ||
            Date.now() - ultimoEnvio < 1000;
    }

    function renderChat(snapshot) {
        const pertoDoFim = chatMessages.scrollHeight - chatMessages.scrollTop -
            chatMessages.clientHeight < 40;
        const primeiro = !chatCarregado;
        const fragmento = document.createDocumentFragment();
        snapshot.forEach(item => {
            const mensagem = item.val();
            const linha = document.createElement('p');
            linha.style.cssText = 'margin:0 0 8px; overflow-wrap:anywhere; white-space:pre-wrap;';
            const autor = document.createElement('strong');
            autor.textContent = mensagem.uid === currentPlayerId
                ? `${mensagem.nickname} (você): ` : `${mensagem.nickname}: `;
            linha.append(autor, document.createTextNode(mensagem.texto));
            fragmento.appendChild(linha);
        });
        if (!snapshot.exists()) {
            const vazio = document.createElement('p');
            vazio.className = 'chat-empty';
            vazio.textContent = 'Nenhuma mensagem ainda. Dê um oi para a turma!';
            fragmento.appendChild(vazio);
        }
        chatMessages.replaceChildren(fragmento);
        if (primeiro || pertoDoFim) chatMessages.scrollTop = chatMessages.scrollHeight;
        chatCarregado = true;
        atualizarChat();
    }

    chatInput.addEventListener('input', atualizarChat);
    chatForm.addEventListener('submit', async event => {
        event.preventDefault();
        atualizarChat();
        if (sendMessage.disabled) return;
        const texto = chatInput.value.trim();
        enviandoMensagem = true;
        atualizarChat();
        chatNote.textContent = '';
        try {
            await online.enviarMensagem(texto);
            chatInput.value = '';
            ultimoEnvio = Date.now();
            clearTimeout(cooldownChat);
            cooldownChat = setTimeout(atualizarChat, 1000);
        } catch (erro) {
            console.error('[STOP!] Erro no chat:', erro);
            chatNote.textContent = 'Não foi possível enviar. Tente novamente.';
        } finally {
            enviandoMensagem = false;
            atualizarChat();
            if (!chatInput.disabled) chatInput.focus();
        }
    });

    if (isOnline && roomConfig.mode === 'sem-call') {
        online.observarChat(renderChat, erro => {
            console.error('[STOP!] Erro ao consultar chat:', erro);
            chatCarregado = false;
            atualizarChat();
            chatNote.textContent = 'Chat indisponível. Recarregue a página.';
        });
    }
    atualizarChat();

    // Inicialização
    updateRole();
    updateSettings();
    renderPlayers();

    if (isOnline) online.registrarAtualizacaoConexao(() => {
        updateSettings();
        updateLobbyStatus();
        atualizarChat();
    });

    // Atualiza a interface com os dados reais, sem registrar eventos duplicados.
    return function atualizarSala(sala) {
        if (!isOnline) return;
        sincronizarConfig(sala);
        statusSala = sala.status;
        isHost = sala.anfitriao === currentPlayerId;
        players.splice(0, players.length, ...converterJogadores(sala));
        currentPlayer = players.find(player => player.id === currentPlayerId);
        settings.players.value = roomConfig.players;
        settings.time.value = roomConfig.time;
        settings.cards.value = roomConfig.cards;
        roomName.textContent = roomConfig.roomName;
        roomMode.textContent = roomConfig.mode === 'com-call' ? '🎙 COM CALL' : '▤ SEM CALL';
        voicePanel.hidden = roomConfig.mode !== 'com-call';
        chatPanel.hidden = roomConfig.mode === 'com-call';
        updateRole();
        updateSettings();
        renderPlayers();
        atualizarChat();
    };

}
