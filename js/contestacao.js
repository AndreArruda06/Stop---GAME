(() => {

    'use strict';

    // ========================================
    // CONFIGURAÇÕES DA CONTESTAÇÃO
    // ========================================

    const TEMPO_VOTACAO = 10;

    const MINIMO_JOGADORES = 3;

    // ========================================
    // ESTADO DA CONTESTAÇÃO
    // ========================================

    const estado = {

        ativa: false,

        fase: 'inativa',

        resposta: null,

        contestador: null,

        eleitores: [],

        votos: new Map(),

        tempoRestante: TEMPO_VOTACAO,

        prazo: 0,

        resultado: null,

        modoTeste: false,

        jogadorLocalId: null,

        aoFinalizar: null,

        aoContinuar: null

    };

    let intervalo = null;
    let controleOnline = null;

    const respostasContestadas = new Set();

    const historico = [];

    const $ = id => document.getElementById(id);

    // ========================================
    // VERIFICAR ESTADO
    // ========================================

    function estaAtiva() {

        return estado.ativa;

    }

    function estaVotando() {

        return estado.ativa &&

            estado.fase === 'votacao';

    }

    function obterFase() {

        return estado.fase;

    }

    function obterTempoRestante() {

        return estado.tempoRestante;

    }

    // ========================================
    // OBTER JOGADORES ATIVOS
    // ========================================

    function obterJogadoresAtivos(jogadores) {

        if (!Array.isArray(jogadores)) {

            return [];

        }

        return jogadores.filter(jogador => {

            return jogador &&

                typeof jogador.id === 'string' &&

                !jogador.eliminated &&

                !jogador.spectator;

        });

    }

    // ========================================
    // OBTER PARTICIPANTES COM DIREITO A VOTO
    // ========================================

    function obterParticipantes(jogadores) {

        if (!Array.isArray(jogadores)) return [];

        // Inclui espectadores da partida, inclusive no desempate.
        // Cada participante possui apenas um voto.

        return Array.from(new Map(jogadores.filter(jogador => {

            return jogador && typeof jogador.id === 'string' &&
                jogador.id.trim() !== '';

        }).map(jogador => [jogador.id, jogador])).values());

    }

    // ========================================
    // IDENTIFICAR RESPOSTA
    // ========================================

    function obterChaveResposta(resposta) {

        if (!resposta || resposta.id == null) {

            return null;

        }

        return String(resposta.id);

    }

    // ========================================
    // VERIFICAR SE PODE CONTESTAR
    // ========================================

    function podeContestar(

        resposta,

        jogadorId,

        jogadores

    ) {

        // Impede duas contestações simultâneas.

        if (estado.ativa) {

            return false;

        }

        if (!resposta) {

            return false;

        }

        if (resposta.status !== 'accepted') {

            return false;

        }

        if (resposta.contested) {

            return false;

        }

        const chave = obterChaveResposta(resposta);

        if (chave === null) {

            return false;

        }

        // Cada resposta pode ser contestada
        // somente uma vez.

        if (respostasContestadas.has(chave)) {

            return false;

        }

        // Não permite contestar a própria resposta.

        if (resposta.playerId === jogadorId) {

            return false;

        }

        const ativos = obterJogadoresAtivos(jogadores);

        const participantes = obterParticipantes(jogadores);

        // Bloqueia somente salas com menos de três participantes.
        // Espectadores também podem contestar e votar.

        if (participantes.length < MINIMO_JOGADORES) {

            return false;

        }

        const autorAtivo = ativos.some(jogador => {

            return jogador.id === resposta.playerId;

        });

        if (!autorAtivo) {

            return false;

        }

        return participantes.some(jogador => {

            return jogador.id === jogadorId;

        });

    }

    // ========================================
    // OBTER ELEITORES
    // ========================================

    function obterEleitores(resposta, jogadores) {

        const participantes = obterParticipantes(jogadores);

        const eleitores = participantes.filter(jogador => {

            // O autor da resposta não pode votar.

            return jogador.id !== resposta.playerId;

        });

        // Evita eleitores duplicados.

        return Array.from(

            new Map(

                eleitores.map(jogador => [

                    jogador.id,

                    {

                        id: jogador.id,

                        nickname: jogador.nickname

                    }

                ])

            ).values()

        );

    }

    // ========================================
    // INICIAR CONTESTAÇÃO
    // ========================================

    function iniciar(opcoes) {

        if (!opcoes || typeof opcoes !== 'object') {

            return false;

        }

        const {

            resposta,

            contestadorId,

            jogadores,

            jogadorLocalId = null,

            modoTeste = false,

            aoFinalizar = null,

            aoContinuar = null

        } = opcoes;

        if (!podeContestar(

            resposta,

            contestadorId,

            jogadores

        )) {

            return false;

        }

        const eleitores = obterEleitores(

            resposta,

            jogadores

        );

        // Exige pelo menos dois eleitores.

        if (eleitores.length < 2) {

            return false;

        }

        const contestador = jogadores.find(jogador => {

            return jogador.id === contestadorId;

        });

        estado.ativa = true;

        estado.fase = 'votacao';

        estado.resposta = { ...resposta };

        estado.contestador = {

            id: contestador.id,

            nickname: contestador.nickname

        };

        estado.eleitores = eleitores;

        estado.votos.clear();

        estado.tempoRestante = TEMPO_VOTACAO;

        estado.resultado = null;

        estado.modoTeste = Boolean(modoTeste);

        estado.jogadorLocalId = jogadorLocalId;

        estado.aoFinalizar =

            typeof aoFinalizar === 'function'

                ? aoFinalizar

                : null;

        estado.aoContinuar =

            typeof aoContinuar === 'function'

                ? aoContinuar

                : null;

        // A abertura da contestação não representa
        // automaticamente um voto inválido.

        respostasContestadas.add(

            obterChaveResposta(resposta)

        );

        mostrarInterface();

        iniciarCronometro();

        return true;

    }

    // ========================================
    // VERIFICAR DIREITO DE VOTO
    // ========================================

    function podeVotar(jogadorId) {

        if (!estaVotando()) {

            return false;

        }

        if (performance.now() >= estado.prazo) {

            return false;

        }

        if (estado.votos.has(jogadorId)) {

            return false;

        }

        return estado.eleitores.some(eleitor => {

            return eleitor.id === jogadorId;

        });

    }

    // ========================================
    // REGISTRAR VOTO
    // ========================================

    function votar(jogadorId, voto) {

        if (!estaVotando()) {

            return false;

        }

        // Impede votos após o prazo real.

        if (performance.now() >= estado.prazo) {

            finalizar();

            return false;

        }

        if (!['valida', 'invalida'].includes(voto)) {

            return false;

        }

        if (!podeVotar(jogadorId)) {

            return false;

        }

        estado.votos.set(jogadorId, voto);

        atualizarProgresso();

        // Encerra antes do prazo quando
        // todos os eleitores já votaram.

        if (

            estado.votos.size ===

            estado.eleitores.length

        ) {

            finalizar();

            return true;

        }

        atualizarInterfaceVotacao();

        return true;

    }

    // ========================================
    // OBTER VOTANTE DA INTERFACE
    // ========================================

    function obterVotanteAtual() {

        if (!estaVotando()) {

            return null;

        }

        // No ambiente de testes, o desenvolvedor
        // controla os jogadores individualmente.

        if (estado.modoTeste) {

            return estado.eleitores.find(eleitor => {

                return !estado.votos.has(eleitor.id);

            }) || null;

        }

        // Na partida normal, somente o jogador
        // local pode utilizar esta interface.

        return estado.eleitores.find(eleitor => {

            return eleitor.id === estado.jogadorLocalId &&

                !estado.votos.has(eleitor.id);

        }) || null;

    }

    // ========================================
    // REGISTRAR VOTO PELA INTERFACE
    // ========================================

    function votarPelaInterface(voto) {

        if (controleOnline) return controleOnline.votar(voto);

        const votante = obterVotanteAtual();

        if (!votante) {

            return false;

        }

        return votar(votante.id, voto);

    }

    // ========================================
    // INICIAR CRONÔMETRO DA VOTAÇÃO
    // ========================================

    function iniciarCronometro() {

        pararCronometro();

        estado.tempoRestante = TEMPO_VOTACAO;

        estado.prazo =

            performance.now() +

            TEMPO_VOTACAO * 1000;

        atualizarCronometro();

        intervalo = setInterval(() => {

            verificarCronometro();

        }, 100);

    }

    // ========================================
    // VERIFICAR TEMPO REAL
    // ========================================

    function verificarCronometro() {

        if (controleOnline) return;

        if (!estaVotando()) {

            return;

        }

        const restante = Math.max(

            0,

            estado.prazo - performance.now()

        );

        const segundos = Math.ceil(

            restante / 1000

        );

        if (segundos !== estado.tempoRestante) {

            estado.tempoRestante = segundos;

            atualizarCronometro();

        }

        if (restante <= 0) {

            finalizar();

        }

    }

    // ========================================
    // PARAR CRONÔMETRO
    // ========================================

    function pararCronometro() {

        if (intervalo !== null) {

            clearInterval(intervalo);

            intervalo = null;

        }

    }

    // ========================================
    // CALCULAR RESULTADO DA VOTAÇÃO
    // ========================================

    function calcularResultado() {

        let validos = 0;

        let invalidos = 0;

        estado.votos.forEach(voto => {

            if (voto === 'valida') {

                validos++;

            } else if (voto === 'invalida') {

                invalidos++;

            }

        });

        const totalEleitores =

            estado.eleitores.length;

        const totalVotos = validos + invalidos;

        const abstencoes =

            totalEleitores - totalVotos;

        // Maioria absoluta dos jogadores
        // com direito a voto.

        const maioriaNecessaria =

            Math.floor(totalEleitores / 2) + 1;

        // Impede que apenas uma pessoa
        // elimine outro jogador.
        //
        // Empates e ausência de maioria
        // mantêm a resposta válida.

        const rejeitada =

            invalidos >= maioriaNecessaria &&

            invalidos >= 2;

        return {

            respostaId: estado.resposta.id,

            jogadorId: estado.resposta.playerId,

            jogadorNome: estado.resposta.playerName,

            contestador: {

                ...estado.contestador

            },

            rodada: estado.resposta.round,

            tema: estado.resposta.theme,

            letra: estado.resposta.letter,

            resposta: estado.resposta.answer,

            isTiebreak: Boolean(

                estado.resposta.isTiebreak

            ),

            tiebreakAttempt:

                estado.resposta.tiebreakAttempt || null,

            status: rejeitada

                ? 'rejected'

                : 'accepted',

            rejeitada,

            validos,

            invalidos,

            abstencoes,

            totalVotos,

            totalEleitores,

            maioriaNecessaria,

            motivo: rejeitada

                ? 'A maioria considerou a resposta inválida.'

                : totalVotos === 0

                    ? 'Nenhum voto foi registrado.'

                    : validos === invalidos

                        ? 'A votação terminou empatada.'

                        : 'Não houve maioria suficiente para rejeitar.'

        };

    }

    // ========================================
    // FINALIZAR VOTAÇÃO
    // ========================================

    function finalizar() {

        if (!estaVotando()) {

            return null;

        }

        // Impede encerramentos duplicados.

        estado.fase = 'resultado';

        pararCronometro();

        estado.resultado = calcularResultado();

        historico.push({

            ...estado.resultado,

            contestador: {

                ...estado.resultado.contestador

            }

        });

        mostrarResultado();

        // O jogo.js será responsável por:
        //
        // 1. Atualizar o histórico de respostas.
        // 2. Remover o acerto, se necessário.
        // 3. Eliminar o autor, se necessário.
        // 4. Verificar as condições de vitória.
        //
        // O cronômetro da partida continuará
        // pausado até o botão CONTINUAR.

        if (estado.aoFinalizar) {

            estado.aoFinalizar({

                ...estado.resultado

            });

        }

        return {

            ...estado.resultado

        };

    }

    // ========================================
    // PREENCHER TEXTO COM SEGURANÇA
    // ========================================

    function definirTexto(id, texto) {

        const elemento = $(id);

        if (elemento) {

            elemento.textContent = texto;

        }

    }

    // ========================================
    // CONTROLAR VISIBILIDADE
    // ========================================

    function definirVisibilidade(id, visivel) {

        const elemento = $(id);

        if (elemento) {

            elemento.hidden = !visivel;

        }

    }

    // ========================================
    // ATUALIZAR CRONÔMETRO VISUAL
    // ========================================

    function atualizarCronometro() {

        const timer = $('contestacao-timer');

        if (!timer) {

            return;

        }

        timer.textContent =

            `00:${String(

                estado.tempoRestante

            ).padStart(2, '0')}`;

        timer.classList.toggle(

            'is-critical',

            estado.tempoRestante <= 3

        );

    }

    // ========================================
    // ATUALIZAR PROGRESSO DOS VOTOS
    // ========================================

    function atualizarProgresso() {

        const total = estado.eleitores.length;

        const registrados = estado.votos.size;

        const porcentagem = total > 0

            ? registrados / total * 100

            : 0;

        definirTexto(

            'contestacao-progress-text',

            `${registrados} de ${total} jogadores votaram`

        );

        const preenchimento =

            $('contestacao-progress-fill');

        if (preenchimento) {

            preenchimento.style.width =

                `${porcentagem}%`;

        }

        // Nenhum voto individual é exibido.

    }

    // ========================================
    // ATUALIZAR INTERFACE DA VOTAÇÃO
    // ========================================

    function atualizarInterfaceVotacao() {

        if (!estaVotando()) {

            return;

        }

        const votante = obterVotanteAtual();

        const botaoValido =

            $('contestacao-vote-valid');

        const botaoInvalido =

            $('contestacao-vote-invalid');

        const autorizado = Boolean(votante);

        definirVisibilidade(

            'contestacao-voting',

            autorizado

        );

        definirVisibilidade(

            'contestacao-waiting',

            !autorizado

        );

        if (botaoValido) {

            botaoValido.disabled = !autorizado;

        }

        if (botaoInvalido) {

            botaoInvalido.disabled = !autorizado;

        }

        if (autorizado) {

            definirTexto(

                'contestacao-voter',

                estado.modoTeste

                    ? `Votando como: ${votante.nickname}`

                    : 'Registre seu voto secreto.'

            );

        } else {

            const autor =

                estado.jogadorLocalId ===

                estado.resposta.playerId;

            definirTexto(

                'contestacao-waiting-title',

                autor

                    ? 'Sua resposta está em votação!'

                    : 'Aguardando os jogadores...'

            );

            definirTexto(

                'contestacao-waiting-text',

                autor

                    ? 'Você não pode votar na própria resposta.'

                    : 'Aguarde o resultado da votação.'

            );

        }

    }

    // ========================================
    // MOSTRAR INTERFACE DA CONTESTAÇÃO
    // ========================================

    function mostrarInterface() {

        const resposta = estado.resposta;

        const overlay = $('contestacao-overlay');

        if (!overlay) {

            return false;

        }

        definirTexto(

            'contestacao-title',

            'Essa resposta vale?'

        );

        definirTexto(

            'contestacao-description',

            `${estado.contestador.nickname} contestou esta resposta.`

        );

        definirTexto(

            'contestacao-author-name',

            resposta.playerName

        );

        definirTexto(

            'contestacao-avatar',

            String(

                resposta.playerName || '?'

            ).charAt(0).toUpperCase()

        );

        definirTexto(

            'contestacao-theme',

            resposta.theme

        );

        definirTexto(

            'contestacao-letter',

            resposta.letter

        );

        const campoResposta = $('contestacao-answer');

        if (campoResposta) {

            const respostaFalada =
                resposta.mode === 'com-call';

            campoResposta.classList.toggle(

                'is-voice',

                respostaFalada

            );

            campoResposta.textContent =

                respostaFalada

                    ? 'Resposta apresentada por voz durante a jogada.'

                    : resposta.answer || 'Resposta não informada.';

        }

        definirVisibilidade(

            'contestacao-result',

            false

        );

        definirVisibilidade(

            'contestacao-timer',

            true

        );

        definirVisibilidade(

            'contestacao-progress',

            true

        );

        const resultado = $('contestacao-result');

        if (resultado) {

            resultado.classList.remove(

                'is-rejected'

            );

        }

        atualizarCronometro();

        atualizarProgresso();

        atualizarInterfaceVotacao();

        overlay.hidden = false;

        overlay.scrollTop = 0;

        overlay.focus({

            preventScroll: true

        });

        return true;

    }

    // ========================================
    // MOSTRAR RESULTADO
    // ========================================

    function mostrarResultado() {

        const resultado = estado.resultado;

        if (!resultado) {

            return;

        }

        definirVisibilidade(

            'contestacao-voting',

            false

        );

        definirVisibilidade(

            'contestacao-waiting',

            false

        );

        definirVisibilidade(

            'contestacao-timer',

            false

        );

        definirVisibilidade(

            'contestacao-progress',

            false

        );

        definirVisibilidade(

            'contestacao-result',

            true

        );

        const painel = $('contestacao-result');

        if (painel) {

            painel.classList.toggle(

                'is-rejected',

                resultado.rejeitada

            );

        }

        definirTexto(

            'contestacao-title',

            'Votação encerrada!'

        );

        definirTexto(

            'contestacao-description',

            resultado.motivo

        );

        definirTexto(

            'contestacao-result-icon',

            resultado.rejeitada ? '✕' : '✓'

        );

        definirTexto(

            'contestacao-result-title',

            resultado.rejeitada

                ? 'RESPOSTA REJEITADA!'

                : 'RESPOSTA ACEITA!'

        );

        definirTexto(

            'contestacao-result-message',

            resultado.rejeitada

                ? `${resultado.jogadorNome} perdeu o acerto e foi eliminado da rodada.`

                : `${resultado.jogadorNome} mantém seu acerto. A partida continua!`

        );

        definirTexto(

            'contestacao-count-valid',

            resultado.validos

        );

        definirTexto(

            'contestacao-count-invalid',

            resultado.invalidos

        );

        definirTexto(

            'contestacao-count-abstentions',

            `${resultado.abstencoes} abstenção(ões)`

        );

        const continuar = $('contestacao-continue');

        if (continuar) {

            continuar.disabled = false;

            continuar.focus({

                preventScroll: true

            });

        }

    }

    // ========================================
    // ESCONDER INTERFACE
    // ========================================

    function esconderInterface() {

        definirVisibilidade(

            'contestacao-overlay',

            false

        );

    }

    // ========================================
    // CONTINUAR PARTIDA
    // ========================================

    function continuar() {

        if (controleOnline) return controleOnline.continuar();

        if (!estado.ativa) {

            return false;

        }

        if (estado.fase !== 'resultado') {

            return false;

        }

        const resultado = {

            ...estado.resultado

        };

        const callback = estado.aoContinuar;

        limparVotacao();

        esconderInterface();

        // O jogo.js retomará a partida
        // e restaurará o cronômetro.

        if (callback) {

            callback(resultado);

        }

        return true;

    }

    // ========================================
    // LIMPAR VOTAÇÃO ATUAL
    // ========================================

    function limparVotacao() {

        controleOnline = null;

        pararCronometro();

        estado.ativa = false;

        estado.fase = 'inativa';

        estado.resposta = null;

        estado.contestador = null;

        estado.eleitores = [];

        estado.votos.clear();

        estado.tempoRestante = TEMPO_VOTACAO;

        estado.prazo = 0;

        estado.resultado = null;

        estado.modoTeste = false;

        estado.jogadorLocalId = null;

        estado.aoFinalizar = null;

        estado.aoContinuar = null;

    }

    // ========================================
    // LIMPAR CONTESTAÇÕES DA PARTIDA
    // ========================================

    function resetar() {

        limparVotacao();

        esconderInterface();

        respostasContestadas.clear();

        historico.length = 0;

    }

    // ========================================
    // CONSULTAR RESULTADO
    // ========================================

    function obterResultado() {

        return estado.resultado

            ? {

                ...estado.resultado,

                contestador: {

                    ...estado.resultado.contestador

                }

            }

            : null;

    }

    // ========================================
    // CONSULTAR HISTÓRICO
    // ========================================

    function obterHistorico() {

        return historico.map(resultado => ({

            ...resultado,

            contestador: {

                ...resultado.contestador

            }

        }));

    }

    // ========================================
    // CONSULTAR ESTADO PÚBLICO
    // ========================================

    function obterEstado() {

        return {

            ativa: estado.ativa,

            fase: estado.fase,

            resposta: estado.resposta

                ? { ...estado.resposta }

                : null,

            contestador: estado.contestador

                ? { ...estado.contestador }

                : null,

            totalEleitores:

                estado.eleitores.length,

            totalVotos:

                estado.votos.size,

            tempoRestante:

                estado.tempoRestante,

            resultado:

                obterResultado()

        };

        // Não disponibiliza votos individuais.

    }

    // ========================================
    // EVENTOS DA INTERFACE
    // ========================================

    let eventosConfigurados = false;

    function configurarEventos() {

        if (eventosConfigurados) {

            return;

        }

        const valido =

            $('contestacao-vote-valid');

        const invalido =

            $('contestacao-vote-invalid');

        const continuarBotao =

            $('contestacao-continue');

        if (!valido || !invalido || !continuarBotao) {

            return;

        }

        valido.addEventListener('click', () => {

            votarPelaInterface('valida');

        });

        invalido.addEventListener('click', () => {

            votarPelaInterface('invalida');

        });

        continuarBotao.addEventListener('click', () => {

            continuar();

        });

        eventosConfigurados = true;

    }

    // ========================================
    // VERIFICAR TEMPO AO RETORNAR À ABA
    // ========================================

    document.addEventListener(

        'visibilitychange',

        () => {

            if (!document.hidden && estaVotando()) {

                verificarCronometro();

            }

        }

    );

    // ========================================
    // INICIALIZAÇÃO DA INTERFACE
    // ========================================

    if (document.readyState === 'loading') {

        document.addEventListener(

            'DOMContentLoaded',

            configurarEventos,

            { once: true }

        );

    } else {

        configurarEventos();

    }

    // Interface online: somente o servidor define votos, prazo e resultado.
    function sincronizarOnline(opcoes) {
        if (!opcoes) {
            if (controleOnline) { limparVotacao(); esconderInterface(); }
            return;
        }
        const nova = !controleOnline || controleOnline.chave !== opcoes.chave;
        const faseAnterior = estado.fase;
        controleOnline = opcoes;
        pararCronometro();
        estado.ativa = true;
        estado.fase = opcoes.resultado ? 'resultado' : 'votacao';
        estado.resposta = { ...opcoes.resposta };
        estado.contestador = { ...opcoes.contestador };
        estado.eleitores = obterEleitores(estado.resposta, opcoes.jogadores);
        estado.jogadorLocalId = opcoes.jogadorLocalId;
        estado.modoTeste = false;
        // Os marcadores públicos indicam apenas quem já votou, nunca a escolha.
        estado.votos = new Map(opcoes.votaram.map(id => [id, 'registrado']));
        estado.prazo = performance.now() + Math.max(0, opcoes.falta);
        estado.tempoRestante = Math.ceil(Math.max(0, opcoes.falta) / 1000);
        if (nova) mostrarInterface();
        if (opcoes.resultado) {
            const { validos, invalidos, rejeitada } = opcoes.resultado;
            estado.resultado = {
                validos, invalidos, rejeitada,
                jogadorNome: estado.resposta.playerName,
                abstencoes: estado.eleitores.length - validos - invalidos,
                motivo: rejeitada ? 'A maioria considerou a resposta inválida.' : 'Não houve maioria suficiente para rejeitar.'
            };
            if (nova || faseAnterior !== 'resultado') mostrarResultado();
            $('contestacao-continue').disabled = opcoes.ocupado;
        } else {
            estado.resultado = null;
            atualizarCronometro();
            atualizarProgresso();
            atualizarInterfaceVotacao();
            const bloqueado = opcoes.ocupado || opcoes.falta <= 0 || !obterVotanteAtual();
            $('contestacao-vote-valid').disabled = bloqueado;
            $('contestacao-vote-invalid').disabled = bloqueado;
        }
    }

    // ========================================
    // INTERFACE PÚBLICA DO MÓDULO
    // ========================================

    window.Contestacao = Object.freeze({

        iniciar,

        finalizar,

        continuar,

        resetar,

        estaAtiva,

        estaVotando,

        obterFase,

        podeContestar,

        podeVotar,

        votar,

        obterVotanteAtual,

        obterTempoRestante,

        obterResultado,

        obterHistorico,

        obterEstado,

        configurarEventos,
        sincronizarOnline

    });

})();