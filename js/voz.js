
// STOP! — Comunicação por voz WebRTC
// Interface circular inspirada no Discord.

export function iniciarVoz({
    database,
    ref,
    onValue,
    set,
    onDisconnect,
    serverTimestamp,
    codigo,
    uid
}) {

    const painel = document.getElementById('voice-panel');
    const mic = document.getElementById('microphone-button');
    const contador = document.getElementById('voice-count');
    const falantes = document.getElementById('speaker-status');

    if (!painel || !mic || !contador || !falantes || painel.hidden) return;

    if (painel.dataset.vozInicializada) return;

    painel.dataset.vozInicializada = 'true';

    const partida = Boolean(document.getElementById('game-screen'));

    const base = `voz/${codigo}`;
    const r = caminho => ref(database, `${base}/${caminho}`);

    const chaveCall = `stop-voz-${codigo}-${uid}`;
    const chaveMic = 'stop-microfone';

    let sessao = null;
    let stream = null;
    let contexto = null;
    let conectado = false;
    let sala = null;
    let presencas = {};
    let sinais = {};
    let ocupado = false;
    let morto = false;

    let cancelarPresencas = null;
    let cancelarSinais = null;
    let analiseLocal = null;

    let reconexaoTentada = false;
    let assinaturaAvatares = '';

    let mensagem = 'Entre na call para conversar com a turma.';

    const peers = new Map();

    const AudioCtx =
        window.AudioContext || window.webkitAudioContext;

    const suportado = Boolean(
        window.RTCPeerConnection &&
        window.isSecureContext
    );

    const ativo = () => Boolean(sessao);

    const podeEntrar = () =>
        conectado &&
        sala?.modo === 'com-call' &&
        ['aguardando', 'preparando'].includes(sala.status) &&
        Boolean(sala.jogadores?.[uid]);

    const faixa = () =>
        stream?.getAudioTracks()
            .find(t => t.readyState === 'live') || null;

    const ligado = () => faixa()?.enabled === true;

    const nome = id =>
        sala?.jogadores?.[id]?.nickname || 'Jogador';

    // ========================================
    // ÍCONES
    // ========================================

    const icones = {

        mic: `
            <rect x="9" y="2" width="6" height="12" rx="3"/>
            <path d="M5 10v2a7 7 0 0 0 14 0v-2"/>
            <path d="M12 19v3M8 22h8"/>
        `,

        mute: `
            <path d="M9 9v2a3 3 0 0 0 5 2"/>
            <path d="M9 5a3 3 0 0 1 6 0v3"/>
            <path d="M5 10v2a7 7 0 0 0 12 5"/>
            <path d="M19 10v2"/>
            <path d="M12 19v3M8 22h8M3 3l18 18"/>
        `,

        ouvir: `
            <path d="M3 14v-3a9 9 0 0 1 18 0v3"/>
            <rect x="3" y="12" width="5" height="8" rx="2"/>
            <rect x="16" y="12" width="5" height="8" rx="2"/>
        `,

        config: `
            <path d="M4 6h16M4 12h16M4 18h16"/>
            <circle cx="8" cy="6" r="2" fill="currentColor"/>
            <circle cx="16" cy="12" r="2" fill="currentColor"/>
            <circle cx="10" cy="18" r="2" fill="currentColor"/>
        `,

        sair: `
            <path d="M3 15c0-7 18-7 18 0"/>
            <path d="M3 15v3h5v-5M21 15v3h-5v-5"/>
        `,

        audio: `
            <path d="M3 9v6h4l5 4V5L7 9z"/>
            <path d="M16 8a6 6 0 0 1 0 8"/>
            <path d="M19 5a10 10 0 0 1 0 14"/>
        `

    };

    function svg(icone) {

        return `
            <svg viewBox="0 0 24 24"
                width="21"
                height="21"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true">
                ${icones[icone]}
            </svg>
        `;

    }

    // ========================================
    // ESTILIZAÇÃO DA CALL
    // ========================================

    if (!document.getElementById('stop-voice-style')) {

        const estilo = document.createElement('style');

        estilo.id = 'stop-voice-style';

        estilo.textContent = `

            #voice-panel.stop-voice-panel {
                box-sizing: border-box;
                background: #eee7d0;
                border: 2px solid #d9d0b5;
                border-radius: 18px;
                padding: 14px;
                color: #14558c;
            }

            #voice-panel [hidden] {
                display: none !important;
            }

            #voice-panel .voice-avatars {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 12px 5px;
                margin: 14px 0;
            }

            #voice-panel .voice-person {
                min-width: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
            }

            #voice-panel .voice-avatar {
                position: relative;
                display: flex;
                justify-content: center;
                align-items: center;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 3px solid #eee7d0;
                outline: 3px solid #c7c0a9;
                box-sizing: border-box;
                background: #14558c;
                color: white;
                font-family: Fredoka, sans-serif;
                font-size: 22px;
                font-weight: 600;
            }

            #voice-panel .voice-avatar.speaking {
                outline-color: #25bd67;
            }

            #voice-panel .voice-avatar.connecting {
                opacity: .55;
                outline-style: dashed;
            }

            #voice-panel .voice-nickname {
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-family: Nunito, sans-serif;
                font-size: 11px;
                font-weight: 800;
            }

            #voice-panel .voice-muted {
                position: absolute;
                right: -5px;
                bottom: -3px;
                width: 19px;
                height: 19px;
                display: flex;
                justify-content: center;
                align-items: center;
                border: 2px solid #eee7d0;
                border-radius: 50%;
                background: #df4740;
                color: white;
            }

            #voice-panel .voice-muted svg {
                width: 12px;
                height: 12px;
            }

            #voice-panel .voice-controls {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
                padding: 13px 0 5px;
                border-top: 1px solid #d3cbb1;
            }

            #voice-panel .voice-circle-button {
                width: 44px;
                height: 44px;
                min-width: 44px;
                padding: 0;
                display: inline-flex;
                justify-content: center;
                align-items: center;
                border: 0;
                border-radius: 50%;
                background: #14558c;
                color: #fff;
                cursor: pointer;
                transition: background-color .15s, transform .15s;
            }

            #voice-panel .voice-circle-button:hover:not(:disabled) {
                transform: translateY(-2px);
                background: #2076b5;
            }

            #voice-panel .voice-circle-button:disabled {
                opacity: .4;
                cursor: not-allowed;
            }

            #voice-panel .voice-circle-button.is-muted,
            #voice-panel .voice-circle-button.voice-disconnect {
                background: #df4740;
            }

            #voice-panel .voice-settings {
                padding: 10px;
                margin-top: 10px;
                background: #fff7df;
                border-radius: 10px;
                font-family: Nunito, sans-serif;
            }

            #voice-panel .voice-settings label {
                display: block;
                margin-bottom: 8px;
                font-size: 11px;
                font-weight: 900;
            }

            #voice-panel .voice-settings select {
                box-sizing: border-box;
                width: 100%;
                padding: 9px;
                background: white;
                color: #14558c;
                border: 1px solid #d3cbb1;
                border-radius: 8px;
                font-family: Nunito, sans-serif;
                font-size: 12px;
            }

            #voice-panel .voice-settings button {
                width: 100%;
                margin-top: 8px;
                padding: 8px;
                border: 0;
                border-radius: 8px;
                background: #14558c;
                color: white;
                font-weight: 700;
                cursor: pointer;
            }

            #voice-panel .communication-note {
                margin: 8px 0 0;
                text-align: center;
                font-family: Nunito, sans-serif;
                font-size: 11px;
                line-height: 1.4;
            }

            #voice-panel .voice-empty {
                grid-column: 1 / -1;
                text-align: center;
                font-size: 12px;
                padding: 8px;
            }

            #voice-panel.voice-floating {
                position: fixed;
                right: 18px;
                bottom: 18px;
                width: 290px;
                max-width: calc(100vw - 36px);
                max-height: 60vh;
                overflow-y: auto;
                z-index: 100000;
                box-shadow: 0 5px 0 rgba(0,0,0,.12);
            }

            #voice-panel .voice-collapse {
                border: none;
                background: transparent;
                color: #14558c;
                font-weight: 900;
                font-size: 18px;
                cursor: pointer;
            }

            #voice-panel.voice-collapsed .voice-body {
                display: none;
            }

            @media (prefers-reduced-motion: reduce) {

                #voice-panel .voice-circle-button {
                    transition: none;
                }

            }

        `;

        document.head.appendChild(estilo);

    }

    // ========================================
    // CONSTRUÇÃO DA INTERFACE
    // ========================================

    painel.classList.add('stop-voice-panel');

    const cabecalho = document.createElement('div');

    cabecalho.className = 'communication-heading';

    const titulo = document.createElement('strong');

    titulo.textContent = 'CALL DA TURMA';

    cabecalho.append(titulo, contador);

    const corpo = document.createElement('div');

    corpo.className = 'voice-body';

    const avatares = document.createElement('div');

    avatares.className = 'voice-avatars';

    const controles = document.createElement('div');

    controles.className = 'voice-controls';

    function criarBotao(icone, titulo) {

        const botao = document.createElement('button');

        botao.type = 'button';
        botao.className = 'voice-circle-button';

        configurarBotao(botao, icone, titulo);

        return botao;

    }

    function configurarBotao(botao, icone, titulo) {

        botao.innerHTML = svg(icone);
        botao.title = titulo;
        botao.setAttribute('aria-label', titulo);

    }

    mic.className = 'voice-circle-button';

    configurarBotao(mic, 'mic', 'Ativar microfone');

    const ouvir = criarBotao(
        'ouvir',
        'Entrar sem microfone'
    );

    const configuracoes = criarBotao(
        'config',
        'Configurações de áudio'
    );

    const sair = criarBotao(
        'sair',
        'Sair da call'
    );

    sair.classList.add('voice-disconnect');

    const desbloquear = criarBotao(
        'audio',
        'Liberar áudio'
    );

    controles.append(
        mic,
        ouvir,
        configuracoes,
        sair,
        desbloquear
    );

    const nota = document.createElement('p');

    nota.id = 'microphone-status';

    nota.className = 'communication-note';

    nota.setAttribute('role', 'status');

    falantes.className = 'communication-note';

    // Configurações do microfone.

    const ajustes = document.createElement('div');

    ajustes.className = 'voice-settings';

    ajustes.hidden = true;

    const labelDispositivo = document.createElement('label');

    labelDispositivo.textContent = 'DISPOSITIVO DE ENTRADA';

    labelDispositivo.htmlFor = 'voice-device';

    const seletor = document.createElement('select');

    seletor.id = 'voice-device';

    const atualizarDispositivos = document.createElement('button');

    atualizarDispositivos.type = 'button';

    atualizarDispositivos.textContent = 'DETECTAR MICROFONES';

    ajustes.append(
        labelDispositivo,
        seletor,
        atualizarDispositivos
    );

    corpo.append(
        avatares,
        falantes,
        controles,
        ajustes,
        nota
    );

    painel.replaceChildren(cabecalho, corpo);

    // Durante a partida, o painel fica fora das
    // sobreposições que bloqueiam a roleta.

    if (partida) {

        painel.classList.add('voice-floating');

        document.body.appendChild(painel);

        const minimizar = document.createElement('button');

        minimizar.type = 'button';

        minimizar.className = 'voice-collapse';

        minimizar.textContent = '−';

        minimizar.title = 'Minimizar call';

        minimizar.setAttribute(
            'aria-label',
            'Minimizar call'
        );

        minimizar.setAttribute('aria-expanded', 'true');

        minimizar.addEventListener('click', () => {

            const fechado = painel.classList.toggle(
                'voice-collapsed'
            );

            minimizar.textContent = fechado ? '+' : '−';

            minimizar.title = fechado
                ? 'Expandir call'
                : 'Minimizar call';

            minimizar.setAttribute(
                'aria-label',
                minimizar.title
            );

            minimizar.setAttribute(
                'aria-expanded',
                String(!fechado)
            );

        });

        cabecalho.appendChild(minimizar);

    }

    // ========================================
    // PREFERÊNCIAS LOCAIS
    // ========================================

    function salvarEstadoCall() {

        if (!ativo()) return;

        sessionStorage.setItem(
            chaveCall,
            JSON.stringify({
                entrou: true,
                microfone: ligado()
            })
        );

    }

    function recuperarEstadoCall() {

        try {

            return JSON.parse(
                sessionStorage.getItem(chaveCall)
            );

        } catch {

            return null;

        }

    }

    // ========================================
    // DISPOSITIVOS DE ÁUDIO
    // ========================================

    async function listarMicrofones() {

        const escolhido =
            localStorage.getItem(chaveMic) || '';

        seletor.replaceChildren();

        const padrao = document.createElement('option');

        padrao.value = '';
        padrao.textContent = 'Microfone padrão';

        seletor.appendChild(padrao);

        if (!navigator.mediaDevices?.enumerateDevices) return;

        try {

            const dispositivos =
                await navigator.mediaDevices.enumerateDevices();

            let numero = 0;

            for (const dispositivo of dispositivos) {

                if (dispositivo.kind !== 'audioinput') continue;

                if (dispositivo.deviceId === 'default') continue;

                if (dispositivo.deviceId === 'communications') continue;

                numero++;

                if (!dispositivo.deviceId) continue;

                const opcao = document.createElement('option');

                opcao.value = dispositivo.deviceId;

                opcao.textContent =
                    dispositivo.label || `Microfone ${numero}`;

                seletor.appendChild(opcao);

            }

            if ([...seletor.options].some(o => o.value === escolhido)) {

                seletor.value = escolhido;

            }

        } catch (erro) {

            console.warn('[STOP! voz] Dispositivos:', erro);

        }

    }

    configuracoes.addEventListener('click', () => {

        ajustes.hidden = !ajustes.hidden;

        if (!ajustes.hidden) listarMicrofones();

    });

    atualizarDispositivos.addEventListener('click', async () => {

        let temporario = null;

        try {

            if (!faixa()) {

                temporario =
                    await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: false
                    });

            }

            await listarMicrofones();

        } catch (erro) {

            mensagem = 'Não foi possível detectar os microfones.';

            atualizar();

        } finally {

            temporario?.getTracks().forEach(t => t.stop());

        }

    });

    seletor.addEventListener('change', async () => {

        const anterior = localStorage.getItem(chaveMic) || '';

        localStorage.setItem(chaveMic, seletor.value);

        if (!ativo() || !ligado()) return;

        if (ocupado) return;

        ocupado = true;

        atualizar();

        try {

            await obterMicrofone();

            mensagem = 'Microfone alterado.';

        } catch (erro) {

            localStorage.setItem(chaveMic, anterior);

            seletor.value = anterior;

            mensagem = 'Não foi possível utilizar esse microfone.';

            console.warn('[STOP! voz]', erro);

        } finally {

            ocupado = false;

            atualizar();

        }

    });

    // ========================================
    // DETECÇÃO DE VOZ
    // ========================================

    function analisar(s) {

        if (!contexto || contexto.state === 'closed') return null;

        try {

            const fonte =
                contexto.createMediaStreamSource(s);

            const medidor =
                contexto.createAnalyser();

            medidor.fftSize = 512;

            fonte.connect(medidor);

            return {

                fonte,
                medidor,
                dados: new Uint8Array(medidor.fftSize)

            };

        } catch {

            return null;

        }

    }

    function soltarAnalise(a) {

        if (!a) return;

        a.fonte.disconnect();
        a.medidor.disconnect();

    }

    function falando(a) {

        if (!a || contexto?.state !== 'running') return false;

        a.medidor.getByteTimeDomainData(a.dados);

        let soma = 0;

        for (const v of a.dados) {

            soma += ((v - 128) / 128) ** 2;

        }

        return Math.sqrt(
            soma / a.dados.length
        ) > 0.025;

    }

    // ========================================
    // AVATARES DOS PARTICIPANTES
    // ========================================

    const cores = [
        '#14558c',
        '#e54b42',
        '#c99520',
        '#287a70',
        '#7956a1'
    ];

    function corJogador(id) {

        let hash = 0;

        for (const caractere of id) {

            hash = (hash * 31 + caractere.charCodeAt(0)) >>> 0;

        }

        return cores[hash % cores.length];

    }

    function renderizarAvatares() {

        const lista = [];

        if (ativo()) {

            lista.push({

                id: uid,
                nome: 'Você',
                microfone: ligado(),
                conectado: true

            });

            for (const p of peers.values()) {

                lista.push({

                    id: p.id,
                    nome: nome(p.id),

                    microfone:
                        presencas?.[p.id]?.[p.remoto]?.microfone === true,

                    conectado:
                        p.pc.connectionState === 'connected'

                });

            }

        }

        const assinatura = JSON.stringify(lista);

        if (assinatura === assinaturaAvatares) return;

        assinaturaAvatares = assinatura;

        avatares.replaceChildren();

        if (!lista.length) {

            const vazio = document.createElement('p');

            vazio.className = 'voice-empty';

            vazio.textContent = 'Você ainda não entrou na call.';

            avatares.appendChild(vazio);

            return;

        }

        for (const jogador of lista) {

            const pessoa = document.createElement('div');

            pessoa.className = 'voice-person';

            const avatar = document.createElement('div');

            avatar.className = 'voice-avatar';

            avatar.dataset.uid = jogador.id;

            avatar.style.background = corJogador(jogador.id);

            avatar.textContent =
                nome(jogador.id).trim().charAt(0).toUpperCase() || '?';

            avatar.classList.toggle(
                'connecting',
                !jogador.conectado
            );

            const nickname = document.createElement('span');

            nickname.className = 'voice-nickname';

            nickname.textContent = jogador.nome;

            nickname.title = jogador.nome;

            if (!jogador.microfone) {

                const status = document.createElement('span');

                status.className = 'voice-muted';

                status.innerHTML = svg('mute');

                status.title = 'Microfone desligado';

                avatar.appendChild(status);

            }

            pessoa.append(avatar, nickname);

            avatares.appendChild(pessoa);

        }

    }

    // ========================================
    // ATUALIZAÇÃO DA INTERFACE
    // ========================================

    function atualizar() {

        const lista = [...peers.values()];

        const ligados = lista.filter(
            p => p.pc.connectionState === 'connected'
        );

        contador.textContent =
            `${ativo() ? 1 + ligados.length : 0} na call`;

        mic.disabled =
            !suportado || ocupado || !podeEntrar();

        configurarBotao(

            mic,

            ligado() ? 'mic' : 'mute',

            ligado()
                ? 'Silenciar microfone'
                : 'Ativar microfone'

        );

        mic.classList.toggle(
            'is-muted',
            ativo() && !ligado()
        );

        mic.setAttribute(
            'aria-pressed',
            String(ligado())
        );

        ouvir.hidden = ativo();

        ouvir.disabled = mic.disabled;

        sair.hidden = !ativo();

        sair.disabled = ocupado;

        seletor.disabled = ocupado;

        desbloquear.hidden =
            !lista.some(p => p.audioBloqueado) &&
            contexto?.state !== 'suspended';

        const falhas = lista.filter(
            p => ['failed', 'closed'].includes(
                p.pc.connectionState
            ) || p.erro
        ).length;

        nota.textContent = !suportado

            ? 'A call precisa de HTTPS ou localhost.'

            : falhas

                ? 'Algumas conexões falharam. Tente entrar novamente.'

                : mensagem;

        renderizarAvatares();

    }

    const medicao = setInterval(() => {

        if (!ativo()) {

            falantes.textContent = 'Ninguém está falando...';

            return;

        }

        const falandoAgora = new Set();

        const nomes = [];

        if (ligado() && falando(analiseLocal)) {

            falandoAgora.add(uid);

            nomes.push('Você');

        }

        for (const p of peers.values()) {

            if (
                p.pc.connectionState === 'connected' &&
                presencas?.[p.id]?.[p.remoto]?.microfone === true &&
                falando(p.analise)
            ) {

                falandoAgora.add(p.id);

                nomes.push(nome(p.id));

            }

        }

        for (const avatar of avatares.querySelectorAll('.voice-avatar')) {

            avatar.classList.toggle(
                'speaking',
                falandoAgora.has(avatar.dataset.uid)
            );

        }

        falantes.textContent = nomes.length

            ? `${nomes.join(', ')} falando...`

            : 'Ninguém está falando...';

    }, 150);

    // ========================================
    // CONEXÕES WEBRTC
    // ========================================

    function removerPeer(p) {

        peers.delete(p.id);

        p.pc.ontrack = null;

        p.pc.onconnectionstatechange = null;

        p.pc.close();

        p.audio.pause();

        p.audio.srcObject = null;

        p.audio.remove();

        soltarAnalise(p.analise);

        if (p.publicado) {

            set(p.refSinal, null).catch(() => {});

        }

    }

    function corrente(p) {

        return !morto &&
            sessao === p.local &&
            peers.get(p.id) === p;

    }

    function aguardarICE(pc) {

        if (pc.iceGatheringState === 'complete') {

            return Promise.resolve();

        }

        return new Promise(resolve => {

            const finalizar = () => {

                clearTimeout(timeout);

                pc.removeEventListener(
                    'icegatheringstatechange',
                    evento
                );

                resolve();

            };

            const evento = () => {

                if (pc.iceGatheringState === 'complete') {

                    finalizar();

                }

            };

            const timeout = setTimeout(finalizar, 8000);

            pc.addEventListener(
                'icegatheringstatechange',
                evento
            );

            evento();

        });

    }

    async function publicar(p) {

        await aguardarICE(p.pc);

        if (!corrente(p)) return;

        const d = p.pc.localDescription;

        if (!d || d.sdp.length > 20000) {

            throw new Error('Sinal de voz inválido.');

        }

        await onDisconnect(p.refSinal).remove();

        if (!corrente(p)) return;

        p.publicado = true;

        await set(p.refSinal, {

            tipo: d.type,
            sdp: d.sdp

        });

    }

    function falha(p, erro) {

        if (!corrente(p)) return;

        p.erro = true;

        console.warn('[STOP! voz] Conexão:', erro);

        atualizar();

    }

    async function tocar(p) {

        try {

            await p.audio.play();

            p.audioBloqueado = false;

        } catch {

            p.audioBloqueado = true;

        }

        if (corrente(p)) atualizar();

    }

    async function anexarFaixa(p, track = faixa()) {

        const t = p.pc.getTransceivers().find(
            x => x.receiver.track.kind === 'audio'
        );

        if (t) {

            await t.sender.replaceTrack(track);

        }

    }

    function novoPeer(id, remoto) {

        const local = sessao;

        const pc = new RTCPeerConnection({

            iceServers: [

                {
                    urls: 'stun:stun.l.google.com:19302'
                }

            ]

        });

        const audio = document.createElement('audio');

        audio.autoplay = true;
        audio.playsInline = true;
        audio.hidden = true;
        audio.muted = false;
        audio.volume = 1;

        painel.appendChild(audio);

        const p = {

            id,
            remoto,
            local,
            pc,
            audio,

            analise: null,
            processando: false,
            recebido: false,
            publicado: false,
            audioBloqueado: false,
            erro: false,

            refSinal: r(
                `sinais/${id}/${remoto}/${uid}/${local}`
            )

        };

        peers.set(id, p);

        pc.ontrack = evento => {

            if (!corrente(p)) return;

            if (evento.track.kind !== 'audio') return;

            const s =
                evento.streams[0] ||
                new MediaStream([evento.track]);

            audio.srcObject = s;

            soltarAnalise(p.analise);

            p.analise = analisar(s);

            tocar(p);

        };

        pc.onconnectionstatechange = () => {

            if (corrente(p)) atualizar();

        };

        if (uid < id) {

            p.processando = true;

            (async () => {

                pc.addTransceiver('audio', {
                    direction: 'sendrecv'
                });

                await anexarFaixa(p);

                await pc.setLocalDescription(
                    await pc.createOffer()
                );

                await publicar(p);

            })()

                .catch(erro => falha(p, erro))

                .finally(() => {

                    p.processando = false;

                    processar(p);

                });

        }

        return p;

    }

    function processar(p) {

        if (
            !corrente(p) ||
            p.processando ||
            p.recebido ||
            p.erro
        ) return;

        const s = sinais?.[p.id]?.[p.remoto];

        if (
            !s ||
            typeof s.sdp !== 'string' ||
            s.tipo !== (uid < p.id ? 'answer' : 'offer')
        ) return;

        if (
            uid < p.id &&
            p.pc.signalingState !== 'have-local-offer'
        ) return;

        p.processando = true;

        p.recebido = true;

        (async () => {

            await p.pc.setRemoteDescription({

                type: s.tipo,
                sdp: s.sdp

            });

            if (!corrente(p)) return;

            if (s.tipo === 'offer') {

                const t = p.pc.getTransceivers().find(
                    x => x.receiver.track.kind === 'audio'
                );

                if (!t) {

                    throw new Error('Oferta sem áudio.');

                }

                t.direction = 'sendrecv';

                await anexarFaixa(p);

                await pcResposta(p);

            }

        })()

            .catch(erro => falha(p, erro))

            .finally(() => {

                p.processando = false;

            });

    }

    async function pcResposta(p) {

        await p.pc.setLocalDescription(
            await p.pc.createAnswer()
        );

        await publicar(p);

    }

    function sincronizar() {

        if (!sessao || morto) return;

        const desejados = new Map();

        for (const [id, sessoes] of Object.entries(presencas || {})) {

            if (id === uid || !sala?.jogadores?.[id]) continue;

            const recentes = Object.entries(sessoes || {})
                .filter(([k, v]) =>
                    /^[a-f0-9]{32}$/.test(k) &&
                    Number.isFinite(v?.criadoEm)
                );

            recentes.sort((a, b) =>

                b[1].criadoEm - a[1].criadoEm ||
                b[0].localeCompare(a[0])

            );

            if (recentes.length) {

                desejados.set(id, recentes[0][0]);

            }

        }

        for (const p of [...peers.values()]) {

            if (desejados.get(p.id) !== p.remoto) {

                removerPeer(p);

            }

        }

        for (const [id, remoto] of desejados) {

            try {

                processar(
                    peers.get(id) || novoPeer(id, remoto)
                );

            } catch (erro) {

                console.warn('[STOP! voz]', erro);

                mensagem = 'Não foi possível conectar um jogador.';

            }

        }

        atualizar();

    }

    // ========================================
    // CAPTURA DO MICROFONE
    // ========================================

    async function obterMicrofone() {

        if (!navigator.mediaDevices?.getUserMedia) {

            throw new Error('Microfone indisponível.');

        }

        const dispositivo =
            localStorage.getItem(chaveMic);

        const audio = {

            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true

        };

        if (dispositivo) {

            audio.deviceId = {
                exact: dispositivo
            };

        }

        const novo =
            await navigator.mediaDevices.getUserMedia({

                audio,
                video: false

            });

        if (morto || !podeEntrar()) {

            novo.getTracks().forEach(t => t.stop());

            throw new Error('Sala indisponível.');

        }

        const novaFaixa = novo.getAudioTracks()[0];

        const antiga = stream;

        const antigaFaixa = faixa();

        const substituidos = [];

        try {

            for (const p of peers.values()) {

                await anexarFaixa(p, novaFaixa);

                substituidos.push(p);

            }

        } catch (erro) {

            await Promise.allSettled(

                substituidos.map(
                    p => anexarFaixa(p, antigaFaixa)
                )

            );

            novo.getTracks().forEach(t => t.stop());

            throw erro;

        }

        stream = novo;

        antiga?.getTracks().forEach(t => t.stop());

        soltarAnalise(analiseLocal);

        analiseLocal = analisar(stream);

        novaFaixa.addEventListener('ended', () => {

            if (!sessao || morto || stream !== novo) return;

            mensagem = 'Microfone desconectado. Ative novamente.';

            set(
                r(`presenca/${uid}/${sessao}/microfone`),
                false
            ).catch(() => {});

            salvarEstadoCall();

            atualizar();

        });

        await listarMicrofones();

    }

    // ========================================
    // ENTRADA E SAÍDA DA CALL
    // ========================================

    function desconectar(texto, preservar = false) {

        if (preservar) {

            salvarEstadoCall();

        } else {

            sessionStorage.removeItem(chaveCall);

        }

        const antiga = sessao;

        sessao = null;

        cancelarPresencas?.();

        cancelarSinais?.();

        cancelarPresencas = null;

        cancelarSinais = null;

        for (const p of [...peers.values()]) {

            removerPeer(p);

        }

        stream?.getTracks().forEach(t => t.stop());

        stream = null;

        soltarAnalise(analiseLocal);

        analiseLocal = null;

        if (contexto && contexto.state !== 'closed') {

            contexto.close().catch(() => {});

        }

        contexto = null;

        presencas = {};

        sinais = {};

        if (antiga) {

            set(
                r(`presenca/${uid}/${antiga}`),
                null
            ).catch(() => {});

            set(
                r(`sinais/${uid}/${antiga}`),
                null
            ).catch(() => {});

        }

        mensagem = texto;

        atualizar();

    }

    async function entrar(comMic) {

        if (
            ocupado ||
            ativo() ||
            !podeEntrar() ||
            !suportado
        ) return;

        ocupado = true;

        atualizar();

        try {

            if (AudioCtx) {

                contexto = new AudioCtx();

                contexto.resume().catch(() => {});

            }

            if (comMic) {

                await obterMicrofone();

            }

            const id = Array.from(

                crypto.getRandomValues(
                    new Uint8Array(16)
                ),

                b => b.toString(16).padStart(2, '0')

            ).join('');

            if (morto || !podeEntrar()) {

                throw new Error('Sala indisponível.');

            }

            sessao = id;

            const propria =
                r(`presenca/${uid}/${id}`);

            const caixa =
                r(`sinais/${uid}/${id}`);

            await onDisconnect(propria).remove();

            await onDisconnect(caixa).remove();

            if (sessao !== id || !podeEntrar()) {

                throw new Error('Conexão interrompida.');

            }

            await set(propria, {

                criadoEm: serverTimestamp(),

                microfone: ligado()

            });

            if (sessao !== id || !podeEntrar()) {

                throw new Error('Conexão interrompida.');

            }

            cancelarSinais = onValue(

                caixa,

                snap => {

                    if (sessao === id) {

                        sinais = snap.val() || {};

                        sincronizar();

                    }

                },

                () => {

                    if (sessao === id) {

                        desconectar(
                            'Não foi possível receber os sinais.'
                        );

                    }

                }

            );

            cancelarPresencas = onValue(

                r('presenca'),

                snap => {

                    if (sessao === id) {

                        presencas = snap.val() || {};

                        sincronizar();

                    }

                },

                () => {

                    if (sessao === id) {

                        desconectar(
                            'Não foi possível entrar na call.'
                        );

                    }

                }

            );

            if (sessao !== id) return;

            mensagem = comMic

                ? 'Microfone ligado.'

                : 'Você está ouvindo sem transmitir áudio.';

            salvarEstadoCall();

        } catch (erro) {

            console.warn('[STOP! voz]', erro);

            desconectar(

                erro.name === 'NotAllowedError'

                    ? 'Permissão negada. Ative o microfone manualmente.'

                    : erro.name === 'NotFoundError' ||
                      erro.name === 'OverconstrainedError'

                        ? 'Microfone indisponível. Confira as configurações.'

                        : 'Não foi possível entrar na call.'

            );

        } finally {

            ocupado = false;

            atualizar();

        }

    }

    // ========================================
    // CONTROLES
    // ========================================

    mic.addEventListener('click', async () => {

        if (!ativo()) {

            entrar(true);

            return;

        }

        if (ocupado || !podeEntrar()) return;

        ocupado = true;

        atualizar();

        const id = sessao;

        try {

            contexto?.resume().catch(() => {});

            if (ligado()) {

                faixa().enabled = false;

                mensagem = 'Microfone silenciado.';

            } else {

                const dispositivo =
                    localStorage.getItem(chaveMic) || '';

                const atual =
                    faixa()?.getSettings().deviceId || '';

                if (
                    !faixa() ||
                    (dispositivo && dispositivo !== atual)
                ) {

                    await obterMicrofone();

                }

                if (sessao !== id) return;

                faixa().enabled = true;

                await Promise.allSettled(

                    [...peers.values()].map(
                        p => anexarFaixa(p)
                    )

                );

                mensagem = 'Microfone ligado.';

            }

            if (sessao === id) {

                await set(

                    r(`presenca/${uid}/${id}/microfone`),

                    ligado()

                );

                salvarEstadoCall();

            }

        } catch (erro) {

            mensagem = 'Não foi possível alterar o microfone.';

            console.warn('[STOP! voz]', erro);

        } finally {

            ocupado = false;

            atualizar();

        }

    });

    ouvir.addEventListener('click', () => {

        entrar(false);

    });

    sair.addEventListener('click', () => {

        desconectar('Você saiu da call.');

    });

    desbloquear.addEventListener('click', () => {

        contexto?.resume().catch(() => {});

        for (const p of peers.values()) {

            tocar(p);

        }

        atualizar();

    });

    // ========================================
    // RECONEXÃO AUTOMÁTICA
    // ========================================

    function tentarReconectar() {

        if (
            !partida ||
            reconexaoTentada ||
            !podeEntrar() ||
            ativo() ||
            ocupado
        ) return;

        reconexaoTentada = true;

        const anterior = recuperarEstadoCall();

        if (anterior?.entrou) {

            mensagem = 'Reconectando à call da turma...';

            atualizar();

            entrar(anterior.microfone === true);

        }

    }

    // ========================================
    // SINCRONIZAÇÃO COM O FIREBASE
    // ========================================

    const pararSala = onValue(

        ref(database, `salas/${codigo}`),

        snap => {

            sala = snap.val();

            if (ativo() && !podeEntrar()) {

                desconectar('A call foi encerrada.');

            } else {

                sincronizar();

            }

            if (sala?.status === 'encerrada') {

                sessionStorage.removeItem(chaveCall);

                painel.hidden = true;

            }

            atualizar();

            tentarReconectar();

        },

        () => {

            sala = null;

            desconectar('Sala indisponível.');

        }

    );

    const pararConexao = onValue(

        ref(database, '.info/connected'),

        snap => {

            conectado = snap.val() === true;

            if (!conectado && ativo()) {

                desconectar(
                    'Conexão perdida. Entre novamente na call.'
                );

            }

            atualizar();

            tentarReconectar();

        }

    );

    // ========================================
    // ENCERRAMENTO E TROCA DE PÁGINA
    // ========================================

    window.addEventListener('pagehide', () => {

        const preservar =

            !partida &&
            sala?.status === 'preparando' &&
            ativo();

        morto = true;

        desconectar(
            'Call encerrada.',
            preservar
        );

        clearInterval(medicao);

        pararSala();

        pararConexao();

    }, { once: true });

    window.addEventListener('pageshow', evento => {

        if (evento.persisted) {

            window.location.reload();

        }

    });

    listarMicrofones();

    atualizar();

}
