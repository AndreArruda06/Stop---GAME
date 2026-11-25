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

        'morte-subita-repetida'

    ];

    // Executa somente quando solicitado pela URL.

    if (!cenariosPermitidos.includes(cenario)) {

        return null;

    }

    // Identifica os testes especiais.

    const testeMorteSubita = cenario !== 'partida';

    const testeFinal = cenario === 'morte-subita-final';

    // Configurações da sala simulada.

    const sala = {

        nickname: 'Desenvolvedor',
        roomName: 'Sala de Teste',
        roomCode: 'TESTE1',

        mode: testeMorteSubita

            ? 'com-call'

            : params.get('modo') === 'com-call'
                ? 'com-call'
                : 'sem-call',

        players: testeMorteSubita ? 2 : 4,

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

    if (testeMorteSubita) {

        jogadores.splice(2);

    }

    console.info('[STOP!] Ambiente de teste ativado.');

    console.info('[STOP!] Cenário:', cenario);

    // Inicia os testes automáticos somente
    // nos cenários especiais.

    if (testeMorteSubita) {

        setTimeout(() => {

            executarTesteMorteSubita(cenario)
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

    await consumirLetrasTeste();

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