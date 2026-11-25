// ========================================
// AMBIENTE DE TESTES DO DESENVOLVEDOR
// ========================================

// Teste normal:
// jogo.html?teste=partida
// jogo.html?teste=partida&modo=com-call

// Testes da morte súbita:
// jogo.html?teste=morte-subita
// jogo.html?teste=morte-subita-final
// jogo.html?teste=morte-subita-repetida

// Testes da contestação:
// jogo.html?teste=contestacao-aceita
// jogo.html?teste=contestacao-rejeitada
// jogo.html?teste=contestacao-empate
// jogo.html?teste=contestacao-tempo
// jogo.html?teste=contestacao-dois
// jogo.html?teste=contestacao-morte-subita
// jogo.html?teste=contestacao-pausa
// jogo.html?teste=contestacao-espectadores

// Modo exclusivo para desenvolvimento.
// Não interfere nas partidas normais.

function criarSalaTeste() {

    const params = new URLSearchParams(
        window.location.search
    );

    const cenario = params.get('teste');

    const cenariosPermitidos = [

        'partida',

        'morte-subita',

        'morte-subita-final',

        'morte-subita-repetida',

        'contestacao-aceita',

        'contestacao-rejeitada',

        'contestacao-empate',

        'contestacao-tempo',

        'contestacao-dois',

        'contestacao-morte-subita',

        'contestacao-pausa',

        'contestacao-espectadores'

    ];

    // Executa somente quando solicitado pela URL.

    if (!cenariosPermitidos.includes(cenario)) {

        return null;

    }

    // Identifica os testes especiais.

    const testeMorteSubita = cenario.startsWith('morte-subita');

    const testeContestacao = cenario.startsWith('contestacao-');

    const testeDois = cenario === 'contestacao-dois';

    const testeFinal = cenario === 'morte-subita-final';

    // Configurações da sala simulada.

    const sala = {

        nickname: 'Desenvolvedor',
        roomName: 'Sala de Teste',
        roomCode: 'TESTE1',

        mode: cenario === 'contestacao-pausa' || (testeContestacao && cenario !== 'contestacao-morte-subita' && params.get('modo') === 'sem-call')

            ? 'sem-call'

            : testeMorteSubita || testeContestacao

            ? 'com-call'

            : params.get('modo') === 'com-call'
                ? 'com-call'
                : 'sem-call',

        players: testeMorteSubita || testeDois ? 2 : 4,

        time: testeFinal ? 5 : 10,

        cards: testeFinal ? 2 : 1

    };

    // Jogadores simulados.

    const jogadores = [

        {
            id: 'host',
            nickname: sala.nickname,
            host: true,
            ready: true,
            score: 0,
            eliminated: false
        },

        {
            id: 'player-2',
            nickname: 'Bia',
            host: false,
            ready: true,
            score: 0,
            eliminated: false
        },

        {
            id: 'player-3',
            nickname: 'Gui',
            host: false,
            ready: true,
            score: 0,
            eliminated: false
        },

        {
            id: 'player-4',
            nickname: 'Léo',
            host: false,
            ready: true,
            score: 0,
            eliminated: false
        }

    ];

    // Nos testes especiais, utiliza dois jogadores.
    // Assim, as 26 letras podem gerar 13 acertos
    // para cada participante.

    if (testeMorteSubita || testeDois) {

        jogadores.splice(2);

    }

    console.info('[STOP!] Ambiente de teste ativado.');

    console.info('[STOP!] Cenário:', cenario);

    // Inicia os testes automáticos somente
    // nos cenários especiais.

    if (testeMorteSubita || testeContestacao) {

        setTimeout(() => {

            (testeContestacao
                ? executarTesteContestacao(cenario)
                : executarTesteMorteSubita(cenario))
                .catch(error => {

                    console.error(
                        '[STOP! TESTE] Falha no teste:',
                        error
                    );

                });

        }, 0);

    }

    return {
        sala,
        jogadores
    };

}

// ========================================
// AUXILIAR: AGUARDAR
// ========================================

function aguardarTeste(ms) {

    return new Promise(resolve => {

        setTimeout(resolve, ms);

    });

}

// ========================================
// AUXILIAR: AGUARDAR CONDIÇÃO
// ========================================

async function aguardarCondicaoTeste(

    condicao,

    descricao,

    limite = 60000

) {

    const inicio = performance.now();

    while (performance.now() - inicio < limite) {

        if (condicao()) {

            return true;

        }

        await aguardarTeste(100);

    }

    throw new Error(

        `Tempo limite atingido: ${descricao}`

    );

}

// ========================================
// AUXILIAR: VERIFICAR VISIBILIDADE
// ========================================

function elementoVisivelTeste(elemento) {

    if (!elemento) {

        return false;

    }

    if (elemento.closest('[hidden]')) {

        return false;

    }

    return elemento.getClientRects().length > 0;

}

// ========================================
// AUXILIAR: CLICAR EM BOTÃO
// ========================================

async function clicarBotaoTeste(id) {

    await aguardarCondicaoTeste(

        () => {

            const botao =
                document.getElementById(id);

            return botao &&

                elementoVisivelTeste(botao) &&

                !botao.disabled &&

                !botao.closest('[inert]');

        },

        `Aguardando botão ${id}`

    );

    const botao =
        document.getElementById(id);

    botao.click();

}

// ========================================
// INICIAR RODADA AUTOMATICAMENTE
// ========================================

async function iniciarRodadaTeste() {

    console.info(

        '[STOP! TESTE] Sorteando carta...'

    );

    await clicarBotaoTeste('draw-button');

    await clicarBotaoTeste('start-round-button');

    await clicarBotaoTeste('stop-button');

    console.info(

        '[STOP! TESTE] Rodada iniciada.'

    );

}

// ========================================
// CONSUMIR AS 26 LETRAS
// ========================================

async function consumirLetrasTeste() {

    const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (const letra of alfabeto) {

        await aguardarCondicaoTeste(

            () => {

                const botao = document.querySelector(

                    `.letter-button[data-letter="${letra}"]`

                );

                return botao &&

                    elementoVisivelTeste(botao) &&

                    !botao.disabled &&

                    !botao.closest('[inert]');

            },

            `Aguardando letra ${letra}`

        );

        const botao = document.querySelector(

            `.letter-button[data-letter="${letra}"]`

        );

        // Seleciona a letra normalmente.

        botao.click();

        // Confirma a resposta utilizando STOP!.

        await clicarBotaoTeste('stop-button');

        console.info(

            `[STOP! TESTE] Letra ${letra} confirmada.`

        );

        await aguardarTeste(100);

    }

    console.info(

        '[STOP! TESTE] Todas as 26 letras foram utilizadas.'

    );

}

// ========================================
// AGUARDAR INTRODUÇÃO DA MORTE SÚBITA
// ========================================

async function aguardarIntroducaoTeste() {

    await aguardarCondicaoTeste(

        () => {

            const intro = document.getElementById(

                'morte-subita-intro'

            );

            const botao = document.getElementById(

                'ms-start-button'

            );

            return intro &&

                elementoVisivelTeste(intro) &&

                botao &&

                !botao.disabled;

        },

        'Aguardando introdução da morte súbita'

    );

    console.info(

        '[STOP! TESTE] Introdução exibida com sucesso.'

    );

}

// ========================================
// TESTE 1: MORTE SÚBITA DA RODADA
// ========================================

async function testarMorteSubitaRodada() {

    console.info(

        '[STOP! TESTE] Testando empate da rodada.'

    );

    // Inicia uma rodada normal.

    await iniciarRodadaTeste();

    // Cada jogador conquista 13 acertos.

    await consumirLetrasTeste();

    // O jogo identifica o empate.

    await clicarBotaoTeste('next-round-button');

    await aguardarIntroducaoTeste();

    // A partir daqui, o desenvolvedor
    // controla a morte súbita manualmente.

    console.info(

        '[STOP! TESTE] Empate provocado com sucesso.'

    );

}

// ========================================
// TESTE 2: MORTE SÚBITA DO CAMPEONATO
// ========================================

async function testarMorteSubitaFinal() {

    console.info(

        '[STOP! TESTE] Testando empate do campeonato.'

    );

    // PRIMEIRA RODADA
    // O primeiro jogador perde por tempo.
    // O segundo conquista uma carta.

    await iniciarRodadaTeste();

    await clicarBotaoTeste('next-round-button');

    // SEGUNDA RODADA
    // O vencedor anterior começa jogando.
    // Ele perde por tempo e o outro ganha.

    await iniciarRodadaTeste();

    // Ambos terminam com uma carta
    // e zero acertos totais.

    await clicarBotaoTeste('finish-game-button');

    // Abre a introdução da morte súbita final.

    await clicarBotaoTeste('finish-game-button');

    await aguardarIntroducaoTeste();

    console.info(

        '[STOP! TESTE] Empate final provocado com sucesso.'

    );

}

// ========================================
// TESTE 3: MORTE SÚBITA REPETIDA
// ========================================

async function testarMorteSubitaRepetida() {

    console.info(

        '[STOP! TESTE] Testando desempates consecutivos.'

    );

    // Provoca o primeiro empate.

    await testarMorteSubitaRodada();

    // Inicia a primeira morte súbita.

    await clicarBotaoTeste('ms-start-button');

    await iniciarRodadaTeste();

    // Consome novamente todas as letras,
    // provocando outro empate de 13 a 13.

    await consumirLetrasAutomaticasTeste();

    // O jogo deverá apresentar
    // uma nova tentativa de desempate.

    await aguardarIntroducaoTeste();

    if (

        window.MorteSubita &&

        window.MorteSubita.obterTentativa() === 2

    ) {

        console.info(

            '[STOP! TESTE] Segunda morte súbita confirmada.'

        );

    } else {

        throw new Error(

            'A segunda tentativa não foi identificada.'

        );

    }

}

// ========================================
// EXECUTOR DOS TESTES ESPECIAIS
// ========================================

async function executarTesteMorteSubita(cenario) {

    console.info(

        '[STOP! TESTE] Iniciando cenário automático.'

    );

    switch (cenario) {

        case 'morte-subita':

            await testarMorteSubitaRodada();

            break;

        case 'morte-subita-final':

            await testarMorteSubitaFinal();

            break;

        case 'morte-subita-repetida':

            await testarMorteSubitaRepetida();

            break;

    }

    console.info(

        '[STOP! TESTE] Cenário preparado.'

    );

    console.info(

        '[STOP! TESTE] Continue jogando manualmente.'

    );

}

// ========================================
// TESTES DA CONTESTAÇÃO
// ========================================

function verificarTeste(condicao, descricao) {

    if (!condicao) {

        throw new Error(descricao);

    }

    console.info(`[STOP! TESTE] OK: ${descricao}`);

}

function textoTeste(id) {

    return document.getElementById(id).textContent.trim();

}

// Confirma uma resposta usando os controles reais.
// No modo SEM CALL, utiliza texto simulado com a inicial correta.
// A validade temática continua sendo decidida pela votação.

async function confirmarLetraTeste(letra) {

    await aguardarCondicaoTeste(() => {

        const botao = document.querySelector(
            `.letter-button[data-letter="${letra}"]`
        );

        return botao && !botao.disabled &&
            elementoVisivelTeste(botao) && !botao.closest('[inert]');

    }, `Letra ${letra} disponível`);

    document.querySelector(
        `.letter-button[data-letter="${letra}"]`
    ).click();

    const campo = document.getElementById('answer-input');

    if (elementoVisivelTeste(campo) && !campo.disabled) {

        campo.value = `${letra} resposta de teste`;

        campo.dispatchEvent(new Event('input', { bubbles: true }));

    }

    await clicarBotaoTeste('stop-button');

}

// Na morte súbita não escolhe letras manualmente.

async function confirmarLetraAutomaticaTeste() {

    await aguardarCondicaoTeste(() => {

        const caixa = document.getElementById('selected-letter-box');
        const botao = document.getElementById('stop-button');

        return elementoVisivelTeste(caixa) &&
            elementoVisivelTeste(botao) && !botao.disabled &&
            !botao.closest('[inert]') &&
            /^[A-Z]$/.test(textoTeste('selected-letter'));

    }, 'Aguardando sorteio automático');

    const letra = textoTeste('selected-letter');

    await clicarBotaoTeste('stop-button');

    return letra;

}

async function consumirLetrasAutomaticasTeste() {

    const utilizadas = new Set();

    for (let i = 0; i < 26; i++) {

        const letra = await confirmarLetraAutomaticaTeste();

        verificarTeste(!utilizadas.has(letra), `Letra automática ${letra} sem repetição`);

        utilizadas.add(letra);

    }

}

function obterItemJogadorTeste(nome) {

    return [...document.querySelectorAll('#players-list .player-item')]
        .find(item => item.querySelector('.player-name')?.textContent.trim() === nome);

}

async function abrirVotacaoTeste() {

    await clicarBotaoTeste('contest-button');

    await aguardarCondicaoTeste(() =>
        window.Contestacao?.estaVotando() &&
        elementoVisivelTeste(document.getElementById('contestacao-overlay')),
        'Votação aberta');

    verificarTeste(document.getElementById('game-screen').hasAttribute('inert'),
        'Partida bloqueada durante votação');

}

async function votarTeste(votos) {

    for (const voto of votos) {

        await clicarBotaoTeste(voto === 'valida'
            ? 'contestacao-vote-valid'
            : 'contestacao-vote-invalid');

    }

}

async function aguardarResultadoContestacaoTeste(rejeitada) {

    await aguardarCondicaoTeste(() =>
        window.Contestacao?.obterFase() === 'resultado' &&
        elementoVisivelTeste(document.getElementById('contestacao-result')),
        'Resultado da votação');

    const resultado = window.Contestacao.obterResultado();

    verificarTeste(resultado.rejeitada === rejeitada,
        rejeitada ? 'Resposta rejeitada' : 'Resposta aceita');

    const autor = obterItemJogadorTeste(resultado.jogadorNome);

    verificarTeste(Boolean(autor) && autor.classList.contains('eliminated') === rejeitada,
        'Estado do jogador após votação');

    verificarTeste(autor.querySelector('.player-score').textContent.includes(rejeitada ? '0 ac.' : '1 ac.'),
        'Pontuação do autor preservada ou removida corretamente');

    return resultado;

}

// Três finalistas com oito acertos cada. O quarto jogador
// confirma duas respostas e é eliminado por tempo.

async function prepararContestacaoMorteSubitaTeste() {

    await iniciarRodadaTeste();

    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (const letra of letras.slice(0, 11)) {

        await confirmarLetraTeste(letra);

    }

    await aguardarCondicaoTeste(() =>
        obterItemJogadorTeste('Léo')?.classList.contains('eliminated'),
        'Eliminação do quarto jogador por tempo');

    for (const letra of letras.slice(11)) {

        await confirmarLetraTeste(letra);

    }

    // Aguarda também o prazo para contestar a última resposta.

    await clicarBotaoTeste('next-round-button');
    await aguardarIntroducaoTeste();

    verificarTeste(window.MorteSubita.obterParticipantes().length === 3,
        'Três finalistas na morte súbita');

    await clicarBotaoTeste('ms-start-button');
    await iniciarRodadaTeste();
    await confirmarLetraAutomaticaTeste();

}

// Dois jogadores perdem por tempo sem consumir letras.
// Os outros dois continuam a rodada normalmente.

async function prepararContestacaoEspectadoresTeste() {

    await iniciarRodadaTeste();

    await aguardarCondicaoTeste(() =>
        obterItemJogadorTeste('Desenvolvedor')?.classList.contains('eliminated') &&
        obterItemJogadorTeste('Bia')?.classList.contains('eliminated') &&
        textoTeste('current-player') === 'Gui',
        'Dois espectadores e dois jogadores ativos');

    verificarTeste(document.querySelectorAll('#players-list .player-item.eliminated').length === 2,
        'Exatamente dois espectadores antes da contestação');

    await confirmarLetraTeste('A');

    verificarTeste(!document.getElementById('contest-button').disabled,
        'Contestação disponível com dois ativos em uma sala de quatro participantes');

}

// Vota por meio dos botões reais e confirma a participação dos espectadores.
// No modo de teste, a interface alterna automaticamente entre os eleitores.

async function votarComEspectadoresTeste(espectadoresEsperados) {

    const modulo = window.Contestacao;
    const estado = modulo.obterEstado();

    verificarTeste(estado.totalEleitores === 3,
        'Todos os três participantes, exceto o autor, podem votar');

    verificarTeste(!modulo.podeVotar(estado.resposta.playerId),
        'Autor não pode votar na própria resposta');

    let espectadores = 0;
    let invalidos = 0;
    let finalistaRejeitou = false;

    for (let i = 0; i < estado.totalEleitores; i++) {

        const eleitor = modulo.obterVotanteAtual();
        verificarTeste(Boolean(eleitor), 'Eleitor disponível');

        const item = obterItemJogadorTeste(eleitor.nickname);
        verificarTeste(Boolean(item), 'Eleitor pertence à sala');

        const espectador = item.classList.contains('eliminated');

        if (espectador) espectadores++;

        // Espectadores rejeitam. Na morte súbita, o primeiro
        // finalista elegível também rejeita para formar maioria.
        const rejeitar = espectador ||
            (espectadoresEsperados === 1 && !finalistaRejeitou);

        if (!espectador && rejeitar) finalistaRejeitou = true;

        if (rejeitar) invalidos++;

        await clicarBotaoTeste(rejeitar
            ? 'contestacao-vote-invalid'
            : 'contestacao-vote-valid');

        verificarTeste(!modulo.podeVotar(eleitor.id),
            `${eleitor.nickname} não pode votar novamente`);

        if (espectador) {
            verificarTeste(item.classList.contains('eliminated'),
                `${eleitor.nickname} votou como espectador`);
        }

    }

    verificarTeste(espectadores === espectadoresEsperados,
        `${espectadoresEsperados} espectador(es) participaram da votação`);

    verificarTeste(invalidos >= 2, 'Maioria de votos inválidos registrada');

}

async function executarTesteContestacao(cenario) {

    verificarTeste(Boolean(window.Contestacao), 'Módulo de contestação carregado');

    if (cenario === 'contestacao-morte-subita') {

        await prepararContestacaoMorteSubitaTeste();

    } else if (cenario === 'contestacao-espectadores') {

        await prepararContestacaoEspectadoresTeste();

    } else {

        await iniciarRodadaTeste();
        await confirmarLetraTeste('A');

    }

    if (cenario === 'contestacao-dois') {

        verificarTeste(document.getElementById('contest-button').disabled,
            'Contestação bloqueada com dois jogadores');

        return;

    }

    const pausa = cenario === 'contestacao-pausa';
    let respostaDigitada = '';

    if (pausa) {

        await aguardarTeste(1200);

        document.querySelector('.letter-button[data-letter="B"]').click();

        const campo = document.getElementById('answer-input');

        respostaDigitada = 'Banana';
        campo.value = respostaDigitada;
        campo.dispatchEvent(new Event('input', { bubbles: true }));

    }

    await abrirVotacaoTeste();

    const tempoPausado = textoTeste('timer');

    if (pausa) {

        await aguardarTeste(1800);

        verificarTeste(textoTeste('timer') === tempoPausado,
            'Cronômetro da partida permanece pausado');

    }

    switch (cenario) {

        case 'contestacao-rejeitada':
            await votarTeste(['invalida', 'invalida', 'valida']);
            break;

        case 'contestacao-empate':
            // Um voto de cada lado e uma abstenção.
            await votarTeste(['valida', 'invalida']);
            break;

        case 'contestacao-tempo':
            // Nenhum voto: aguarda o prazo de dez segundos.
            break;

        case 'contestacao-morte-subita':
            await votarComEspectadoresTeste(1);
            break;

        case 'contestacao-espectadores':
            await votarComEspectadoresTeste(2);
            break;

        default:
            await votarTeste(['valida', 'valida', 'invalida']);
            break;

    }

    const rejeitada = cenario === 'contestacao-rejeitada' ||
        cenario === 'contestacao-morte-subita' ||
        cenario === 'contestacao-espectadores';

    const resultado = await aguardarResultadoContestacaoTeste(rejeitada);

    if (cenario === 'contestacao-empate') {

        verificarTeste(resultado.validos === 1 && resultado.invalidos === 1 &&
            resultado.abstencoes === 1, 'Empate e abstenção contabilizados');

    }

    if (cenario === 'contestacao-tempo') {

        verificarTeste(resultado.totalVotos === 0 && resultado.abstencoes === 3,
            'Prazo encerrado sem votos');

    }

    if (cenario === 'contestacao-morte-subita') {

        verificarTeste(resultado.isTiebreak && window.MorteSubita.obterAcertos(resultado.jogadorId) === 0,
            'Acerto do desempate removido');

    }

    if (cenario === 'contestacao-espectadores') {

        verificarTeste(resultado.invalidos === 2 && resultado.validos === 1,
            'Dois espectadores rejeitaram a resposta e o outro jogador ativo aceitou');

        verificarTeste(document.querySelectorAll('#players-list .player-item.eliminated').length === 3,
            'Espectadores permanecem eliminados e o autor vira espectador');

        await clicarBotaoTeste('contestacao-continue');

        await aguardarCondicaoTeste(() =>
            elementoVisivelTeste(document.getElementById('round-end-overlay')),
            'Rodada encerrada após a eliminação do penúltimo jogador');

        verificarTeste(textoTeste('round-end-player') === 'Léo',
            'Último jogador ativo vence a rodada');

    }

    if (pausa) {

        await clicarBotaoTeste('contestacao-continue');

        verificarTeste(document.getElementById('answer-input').value === respostaDigitada,
            'Resposta em digitação preservada');

        verificarTeste(!document.getElementById('answer-input').disabled &&
            !document.getElementById('game-screen').hasAttribute('inert'),
            'Controles restaurados');

        verificarTeste(Math.abs(Number(textoTeste('timer')) - Number(tempoPausado)) <= 1,
            'Tempo restante restaurado');

    }

    console.info('[STOP! TESTE] Cenário de contestação concluído.');

}
