// ========================================
// SISTEMA DE SALAS ONLINE - STOP!
// ========================================

import {
    database,
    autenticarJogador
} from './firebase-config.js';

import {
    ref,
    set,
    get,
    update,
    remove,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js';

// ========================================
// CONFIGURAÇÕES
// ========================================

const CARACTERES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const TAMANHO_CODIGO = 6;

// ========================================
// GERAR CÓDIGO DA SALA
// ========================================

function gerarCodigoSala() {

    let codigo = '';

    const numeros = crypto.getRandomValues(
        new Uint32Array(TAMANHO_CODIGO)
    );

    for (let i = 0; i < TAMANHO_CODIGO; i++) {

        codigo += CARACTERES[
            numeros[i] % CARACTERES.length
        ];

    }

    return codigo;

}

// ========================================
// VALIDAR CONFIGURAÇÕES DA SALA
// ========================================

function validarConfiguracoes(config) {

    if (!config || typeof config !== 'object') {

        throw new Error('Configurações inválidas.');

    }

    if (
        typeof config.nickname !== 'string' ||
        !config.nickname.trim() ||
        config.nickname.trim().length > 20
    ) {

        throw new Error('Apelido inválido.');

    }

    if (
        typeof config.roomName !== 'string' ||
        !config.roomName.trim() ||
        config.roomName.trim().length > 30
    ) {

        throw new Error('Nome da sala inválido.');

    }

    if (!['com-call', 'sem-call'].includes(config.mode)) {

        throw new Error('Modalidade inválida.');

    }

    if (
        !Number.isInteger(config.players) ||
        config.players < 2 ||
        config.players > 12
    ) {

        throw new Error('Quantidade de jogadores inválida.');

    }

    if (
        !Number.isInteger(config.time) ||
        config.time < 5 ||
        config.time > 120
    ) {

        throw new Error('Tempo inválido.');

    }

    if (
        !Number.isInteger(config.cards) ||
        config.cards < 1 ||
        config.cards > 26
    ) {

        throw new Error('Quantidade de cartas inválida.');

    }

    if (
        config.privacy !== undefined &&
        !['publica', 'privada'].includes(config.privacy)
    ) {

        throw new Error('Privacidade inválida.');

    }

}

// ========================================
// CRIAR SALA ONLINE
// ========================================

async function criarSalaOnline(config) {

    validarConfiguracoes(config);

    // Autentica o anfitrião anonimamente.

    const jogador = await autenticarJogador();

    // Gera o código da sala.

    const codigo = gerarCodigoSala();

    // Organiza os dados da nova sala.

    const sala = {

        codigo: codigo,

        anfitriao: jogador.uid,

        nome: config.roomName.trim(),

        modo: config.mode,

        privacidade: config.privacy || 'privada',

        status: 'aguardando',

        criadoEm: serverTimestamp(),

        configuracoes: {

            maxJogadores: config.players,

            tempo: config.time,

            quantidadeCartas: config.cards

        },

        jogadores: {

            [jogador.uid]: {

                id: jogador.uid,

                nickname: config.nickname.trim(),

                pronto: true,

                conectado: true,

                vaga: 1,

                entrouEm: serverTimestamp()

            }

        },

        vagas: {

            '1': jogador.uid

        }

    };

    // Referência da sala no Firebase.

    const referencia = ref(
        database,
        `salas/${codigo}`
    );

    // Grava a sala.
    // As regras do Firebase deverão impedir
    // a substituição de uma sala existente.

    await set(referencia, sala);

    // Retorna os dados necessários para o lobby.

    return {

        roomCode: codigo,

        playerId: jogador.uid,

        hostId: jogador.uid,

        isHost: true,

        privacy: sala.privacidade

    };

}

// ========================================
// VALIDAR ENTRADA NA SALA
// ========================================

function validarEntrada(config) {

    if (!config || typeof config !== 'object') {

        throw new Error('Dados de entrada inválidos.');

    }

    if (
        typeof config.nickname !== 'string' ||
        !config.nickname.trim() ||
        config.nickname.trim().length > 20
    ) {

        throw new Error('Apelido inválido.');

    }

    if (
        typeof config.roomCode !== 'string' ||
        !/^[A-Z0-9]{6}$/.test(config.roomCode)
    ) {

        throw new Error('Código da sala inválido.');

    }

    if (!['com-call', 'sem-call'].includes(config.mode)) {

        throw new Error('Modalidade inválida.');

    }

}

// ========================================
// MONTAR CONFIGURAÇÃO PARA O LOBBY
// ========================================

function montarConfiguracaoLobby(sala, uid) {

    const jogador = sala.jogadores[uid];

    return {

        nickname: jogador.nickname,

        roomName: sala.nome,

        roomCode: sala.codigo,

        mode: sala.modo,

        players: sala.configuracoes.maxJogadores,

        time: sala.configuracoes.tempo,

        cards: sala.configuracoes.quantidadeCartas,

        privacy: sala.privacidade,

        playerId: uid,

        hostId: sala.anfitriao,

        isHost: sala.anfitriao === uid

    };

}

// ========================================
// ENTRAR EM UMA SALA ONLINE
// ========================================

async function entrarSalaOnline(config) {

    validarEntrada(config);

    // Autentica o jogador.

    const jogador = await autenticarJogador();

    const uid = jogador.uid;

    const codigo = config.roomCode;

    const referencia = ref(
        database,
        `salas/${codigo}`
    );

    // Permite novas tentativas caso outro
    // jogador ocupe uma vaga simultaneamente.

    for (let tentativa = 0; tentativa < 12; tentativa++) {

        const snapshot = await get(referencia);

        if (!snapshot.exists()) {

            throw new Error('Sala não encontrada.');

        }

        const sala = snapshot.val();

        // Verifica a modalidade.

        if (sala.modo !== config.mode) {

            throw new Error(
                'Esta sala pertence a outra modalidade.'
            );

        }

        // Impede entrada em partidas iniciadas.

        if (sala.status !== 'aguardando') {

            throw new Error(
                'Esta partida não está aceitando jogadores.'
            );

        }

        // Impede jogadores duplicados.

        if (sala.jogadores?.[uid]) {

            return montarConfiguracaoLobby(
                sala,
                uid
            );

        }

        // Verifica a estrutura de vagas.

        if (!sala.vagas) {

            throw new Error(
                'Esta sala utiliza uma versão antiga. Crie outra sala.'
            );

        }

        // Procura uma vaga disponível.

        const maxJogadores =
            sala.configuracoes.maxJogadores;

        let vagaDisponivel = null;

        for (let vaga = 1; vaga <= maxJogadores; vaga++) {

            if (!sala.vagas[String(vaga)]) {

                vagaDisponivel = vaga;

                break;

            }

        }

        if (vagaDisponivel === null) {

            throw new Error('Esta sala está cheia.');

        }

        // Dados do novo participante.

        const novoJogador = {

            id: uid,

            nickname: config.nickname.trim(),

            pronto: false,

            conectado: true,

            vaga: vagaDisponivel,

            entrouEm: serverTimestamp()

        };

        // Registra o jogador e reserva a vaga
        // em uma única atualização atômica.

        const atualizacoes = {};

        atualizacoes[`jogadores/${uid}`] =
            novoJogador;

        atualizacoes[`vagas/${vagaDisponivel}`] =
            uid;

        try {

            await update(
                referencia,
                atualizacoes
            );

            const snapshotAtualizado =
                await get(referencia);

            return montarConfiguracaoLobby(
                snapshotAtualizado.val(),
                uid
            );

        } catch (erro) {

            // Verifica se houve disputa pela vaga.

            if (
                !/permission.denied/i.test(
                    `${erro.code} ${erro.message}`
                )
            ) {

                throw erro;

            }

            const snapshotAtual = await get(referencia);

            const salaAtual = snapshotAtual.val();

            if (salaAtual?.jogadores?.[uid]) {

                return montarConfiguracaoLobby(
                    salaAtual,
                    uid
                );

            }

            if (
                salaAtual?.vagas?.[String(vagaDisponivel)] &&
                salaAtual.vagas[String(vagaDisponivel)] !== uid
            ) {

                continue;

            }

            throw erro;

        }

    }

    throw new Error(
        'Não foi possível reservar uma vaga. Tente novamente.'
    );

}

// ========================================
// SAIR DA SALA ONLINE
// ========================================

async function sairSalaOnline(codigo) {

    if (typeof codigo !== 'string' || !/^[A-Z0-9]{6}$/.test(codigo)) {
        throw new Error('Código da sala inválido.');
    }

    const usuario = await autenticarJogador();
    const referencia = ref(database, `salas/${codigo}`);
    const sala = (await get(referencia)).val();

    if (!sala || !sala.jogadores?.[usuario.uid]) return;

    if (sala.status !== 'aguardando') {
        throw new Error('A sala não está mais no lobby.');
    }

    if (sala.anfitriao === usuario.uid) {
        await remove(referencia);
        return;
    }

    const vaga = sala.jogadores[usuario.uid].vaga;

    // Libera a vaga e remove o jogador na mesma operação.
    await update(referencia, {
        [`jogadores/${usuario.uid}`]: null,
        [`vagas/${vaga}`]: null
    });

}

// ========================================
// EXPORTAÇÃO DAS FUNÇÕES
// ========================================

export {

    criarSalaOnline,

    entrarSalaOnline,

    sairSalaOnline,

    gerarCodigoSala

};