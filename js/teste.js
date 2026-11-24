
// ========================================
// AMBIENTE DE TESTES DO DESENVOLVEDOR
// ========================================

// Acesso: jogo.html?teste=partida
//Acesso2:jogo.html?teste=partida&modo=com-call
// Modo exclusivo para desenvolvimento.
// Não interfere nas partidas normais.

function criarSalaTeste() {

    const params = new URLSearchParams(
        window.location.search
    );

    // Executa somente quando solicitado pela URL.
    if (params.get('teste') !== 'partida') {

        return null;

    }

    // Configurações da sala simulada.
    const sala = {

        nickname: 'Desenvolvedor',
        roomName: 'Sala de Teste',
        roomCode: 'TESTE1',

        mode: params.get('modo') === 'com-call'
            ? 'com-call'
            : 'sem-call',

        players: 4,
        time: 10,
        cards: 10

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

    console.info('[STOP!] Ambiente de teste ativado.');

    return {
        sala,
        jogadores
    };

}
