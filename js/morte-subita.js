(() => {

    'use strict';

    // ========================================
    // ESTADO DA MORTE SÚBITA
    // ========================================

    const estado = {

        ativa: false,

        tipo: null,

        tentativa: 0,

        participantes: [],

        acertos: new Map(),

        temasUtilizados: new Set(),

        temaAtual: null,

        vencedor: null

    };

    let impactoTimeout = null;

    // Controle independente da animação de sorteio das letras.

    let sorteioLetraAtivo = false;

    let versaoSorteioLetra = 0;

    let botaoDestaqueSorteio = null;

    // ========================================
    // EMBARALHAR ELEMENTOS
    // ========================================

    function embaralhar(lista) {

        const copia = [...lista];

        for (let i = copia.length - 1; i > 0; i--) {

            const j = Math.floor(
                Math.random() * (i + 1)
            );

            [copia[i], copia[j]] =
                [copia[j], copia[i]];

        }

        return copia;

    }

    // ========================================
    // VERIFICAR ESTADO
    // ========================================

    function estaAtiva() {

        return estado.ativa;

    }

    function obterTipo() {

        return estado.tipo;

    }

    function obterTentativa() {

        return estado.tentativa;

    }

    function obterParticipantes() {

        return [...estado.participantes];

    }

    function obterTemaAtual() {

        return estado.temaAtual;

    }

    function obterVencedor() {

        return estado.vencedor;

    }

    // ========================================
    // INICIALIZAR ACERTOS DO DESEMPATE
    // ========================================

    function resetarAcertos() {

        estado.acertos.clear();

        estado.participantes.forEach(id => {

            estado.acertos.set(id, 0);

        });

    }

    // ========================================
    // INICIAR MORTE SÚBITA
    // ========================================

    function iniciar(tipo, jogadores) {

        // Impede dois desempates simultâneos.

        if (estado.ativa) {

            return false;

        }

        // Tipos permitidos:
        // rodada = disputa pela carta.
        // final = disputa pelo campeonato.

        if (!['rodada', 'final'].includes(tipo)) {

            return false;

        }

        if (!Array.isArray(jogadores)) {

            return false;

        }

        const participantes = [

            ...new Set(

                jogadores

                    .filter(jogador => {

                        return jogador &&
                            typeof jogador.id === 'string' &&
                            jogador.id.trim().length > 0;

                    })

                    .map(jogador => jogador.id)

            )

        ];

        // Exige pelo menos dois participantes.

        if (participantes.length < 2) {

            return false;

        }

        estado.ativa = true;

        estado.tipo = tipo;

        estado.tentativa = 1;

        estado.participantes = participantes;

        estado.temaAtual = null;

        estado.vencedor = null;

        estado.temasUtilizados.clear();

        resetarAcertos();

        return true;

    }

    // ========================================
    // VERIFICAR PARTICIPANTES
    // ========================================

    function jogadorParticipa(id) {

        if (!estado.ativa) {

            return false;

        }

        return estado.participantes.includes(id);

    }

    // ========================================
    // SORTEAR TEMA EXTRA
    // ========================================

    function sortearTema(bancoCartas, cartaOriginalId = null) {

        if (!estado.ativa) {

            return null;

        }

        if (
            !Array.isArray(bancoCartas) ||
            bancoCartas.length === 0
        ) {

            return null;

        }

        // Evita sortear outra vez o tema original
        // enquanto existirem outras possibilidades.

        let cartasPermitidas = bancoCartas.filter(carta => {

            return carta &&
                carta.id !== undefined &&
                typeof carta.tema === 'string' &&
                carta.tema.trim() &&
                carta.id !== cartaOriginalId;

        });

        // Caso exista apenas uma carta válida,
        // permite reutilizar o tema original.

        if (cartasPermitidas.length === 0) {

            cartasPermitidas = bancoCartas.filter(carta => {

                return carta &&
                    carta.id !== undefined &&
                    typeof carta.tema === 'string' &&
                    carta.tema.trim();

            });

        }

        if (cartasPermitidas.length === 0) {

            return null;

        }

        // Evita repetir temas durante o desempate.

        let disponiveis = cartasPermitidas.filter(carta => {

            return !estado.temasUtilizados.has(carta.id);

        });

        // Se todos os temas forem utilizados,
        // permite um novo ciclo de sorteios.

        if (disponiveis.length === 0) {

            const temaAnterior = estado.temaAtual;

            estado.temasUtilizados.clear();

            disponiveis = cartasPermitidas.filter(carta => {

                return !temaAnterior ||
                    carta.id !== temaAnterior.id;

            });

            if (disponiveis.length === 0) {

                disponiveis = cartasPermitidas;

            }

        }

        const indice = Math.floor(

            Math.random() * disponiveis.length

        );

        const cartaSorteada = disponiveis[indice];

        // Cria uma cópia para não modificar
        // o banco principal de cartas.

        estado.temaAtual = {

            ...cartaSorteada,

            isTiebreak: true

        };

        estado.temasUtilizados.add(

            cartaSorteada.id

        );

        return {

            ...estado.temaAtual

        };

    }

    // ========================================
    // SORTEIO AUTOMÁTICO DAS LETRAS
    // ========================================

    /*
        O jogo.js fornece as letras ainda disponíveis.
        Este módulo sorteia uma delas e anima a roleta.
        O consumo da letra e o cronômetro permanecem
        sob responsabilidade do jogo.js.
    */

    function limparDestaqueSorteio() {

        if (botaoDestaqueSorteio) {

            botaoDestaqueSorteio.classList.remove('selected');

            botaoDestaqueSorteio = null;

        }

    }

    function cancelarSorteioLetra() {

        versaoSorteioLetra++;

        sorteioLetraAtivo = false;

        limparDestaqueSorteio();

    }

    function estaSorteandoLetra() {

        return sorteioLetraAtivo;

    }

    async function sortearLetra(letrasDisponiveis) {

        if (!estado.ativa || sorteioLetraAtivo) {

            return null;

        }

        if (!Array.isArray(letrasDisponiveis)) {

            return null;

        }

        // Aceita exclusivamente letras do alfabeto da roleta.

        const letras = [...new Set(letrasDisponiveis.filter(letra => {

            return typeof letra === 'string' && /^[A-Z]$/.test(letra);

        }))];

        if (letras.length === 0) {

            return null;

        }

        // O resultado é escolhido antes da animação.
        // Todas as letras livres possuem a mesma chance.

        const sorteada = letras[Math.floor(Math.random() * letras.length)];

        const tentativaAtual = estado.tentativa;

        const versao = ++versaoSorteioLetra;

        sorteioLetraAtivo = true;

        const sorteioValido = () => {

            return estado.ativa &&
                estado.tentativa === tentativaAtual &&
                versaoSorteioLetra === versao;

        };

        try {

            const movimentoReduzido = window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches;

            // Sem animação quando resta somente uma letra ou
            // quando o jogador prefere movimento reduzido.

            if (!movimentoReduzido && letras.length > 1) {

                const botoes = new Map();

                document.querySelectorAll('#wheel-letters .letter-button')
                    .forEach(botao => {

                        botoes.set(botao.dataset.letter, botao);

                    });

                // Animação curta com desaceleração, sem alterar
                // as posições físicas dos botões da roleta.

                const intervalos = [55, 55, 65, 75, 90, 110, 140, 180];

                let indice = Math.floor(Math.random() * letras.length);

                for (const intervalo of intervalos) {

                    if (!sorteioValido()) return null;

                    limparDestaqueSorteio();

                    indice = (indice + 1) % letras.length;

                    const botao = botoes.get(letras[indice]);

                    if (botao && !botao.classList.contains('selected')) {

                        botao.classList.add('selected');

                        botaoDestaqueSorteio = botao;

                    }

                    await new Promise(resolve => setTimeout(resolve, intervalo));

                }

            }

            if (!sorteioValido()) return null;

            return sorteada;

        } finally {

            // Um sorteio cancelado não interfere em outro posterior.

            if (versaoSorteioLetra === versao) {

                limparDestaqueSorteio();

                sorteioLetraAtivo = false;

            }

        }

    }

    // ========================================
    // DEFINIR ORDEM DOS FINALISTAS
    // ========================================

    function sortearOrdem() {

        if (!estado.ativa) {

            return [];

        }

        return embaralhar(

            estado.participantes

        );

    }

    // ========================================
    // REGISTRAR ACERTO DO DESEMPATE
    // ========================================

    function registrarAcerto(id) {

        if (!estado.ativa) {

            return false;

        }

        if (!jogadorParticipa(id)) {

            return false;

        }

        const acertosAtuais =

            estado.acertos.get(id) || 0;

        estado.acertos.set(

            id,

            acertosAtuais + 1

        );

        // Esses acertos são independentes
        // da pontuação normal da partida.

        return true;

    }

    // ========================================
    // REMOVER ACERTO CONTESTADO
    // ========================================

    /*
        Preparação para o futuro sistema
        de contestação de respostas.
    */

    function removerAcerto(id) {

        if (!estado.ativa) {

            return false;

        }

        if (!jogadorParticipa(id)) {

            return false;

        }

        const acertosAtuais =

            estado.acertos.get(id) || 0;

        if (acertosAtuais === 0) {

            return false;

        }

        estado.acertos.set(

            id,

            acertosAtuais - 1

        );

        return true;

    }

    // ========================================
    // CONSULTAR ACERTOS
    // ========================================

    function obterAcertos(id) {

        return estado.acertos.get(id) || 0;

    }

    // ========================================
    // JOGADORES ATIVOS NO DESEMPATE
    // ========================================

    function obterJogadoresAtivos(jogadores) {

        if (!Array.isArray(jogadores)) {

            return [];

        }

        return jogadores.filter(jogador => {

            return jogador &&

                jogadorParticipa(jogador.id) &&

                !jogador.eliminated;

        });

    }

    // ========================================
    // VERIFICAR RESULTADO DO DESEMPATE
    // ========================================

    function verificarResultado(

        jogadores,

        letrasUtilizadas,

        totalLetras = 26

    ) {

        if (!estado.ativa) {

            return {

                status: 'inativo'

            };

        }

        if (!Array.isArray(jogadores)) {

            return {

                status: 'invalido'

            };

        }

        const ativos =

            obterJogadoresAtivos(jogadores);

        // ====================================
        // APENAS UM SOBREVIVENTE
        // ====================================

        if (ativos.length === 1) {

            return {

                status: 'vencedor',

                jogador: ativos[0],

                motivo: 'Último jogador ativo na morte súbita.'

            };

        }

        // ====================================
        // NENHUM SOBREVIVENTE
        // ====================================

        if (ativos.length === 0) {

            return {

                status: 'sem-vencedor',

                motivo: 'Nenhum participante permaneceu ativo.'

            };

        }

        // ====================================
        // AINDA EXISTEM LETRAS DISPONÍVEIS
        // ====================================

        if (letrasUtilizadas < totalLetras) {

            return {

                status: 'continuar',

                jogadores: ativos

            };

        }

        // ====================================
        // TODAS AS LETRAS FORAM UTILIZADAS
        // ====================================

        const maiorQuantidadeAcertos = Math.max(

            ...ativos.map(jogador => {

                return obterAcertos(jogador.id);

            })

        );

        const empatados = ativos.filter(jogador => {

            return obterAcertos(jogador.id) ===

                maiorQuantidadeAcertos;

        });

        // Existe um vencedor por acertos.

        if (empatados.length === 1) {

            return {

                status: 'vencedor',

                jogador: empatados[0],

                motivo:
                    'Vitória pela maior quantidade de acertos na morte súbita.'

            };

        }

        // Continua empatado.
        // Somente os líderes ativos permanecem.

        return {

            status: 'novo-empate',

            jogadores: empatados,

            acertos: maiorQuantidadeAcertos,

            motivo:
                'O empate continua. Um novo tema será sorteado.'

        };

    }

    // ========================================
    // PREPARAR OUTRA TENTATIVA
    // ========================================

    function repetir(jogadores) {

        if (!estado.ativa) {

            return false;

        }

        if (!Array.isArray(jogadores)) {

            return false;

        }

        const participantes = [

            ...new Set(

                jogadores

                    .filter(jogador => {

                        return jogador &&
                            jogadorParticipa(jogador.id);

                    })

                    .map(jogador => jogador.id)

            )

        ];

        if (participantes.length < 2) {

            return false;

        }

        cancelarSorteioLetra();

        estado.participantes = participantes;

        estado.tentativa++;

        estado.vencedor = null;

        // Reinicia somente os acertos
        // da nova tentativa de desempate.

        resetarAcertos();

        return true;

    }

    // ========================================
    // CLASSIFICAÇÃO DO DESEMPATE
    // ========================================

    function obterClassificacao(jogadores) {

        if (!Array.isArray(jogadores)) {

            return [];

        }

        return jogadores

            .filter(jogador => {

                return jogadorParticipa(jogador.id);

            })

            .map(jogador => ({

                id: jogador.id,

                nickname: jogador.nickname,

                acertos: obterAcertos(jogador.id),

                eliminado: jogador.eliminated

            }))

            .sort((a, b) => {

                // Jogadores ativos aparecem primeiro.

                if (a.eliminado !== b.eliminado) {

                    return a.eliminado ? 1 : -1;

                }

                return b.acertos - a.acertos;

            });

    }

    // ========================================
    // AVATAR DOS FINALISTAS
    // ========================================

    function obterAvatar(jogador) {

        if (!jogador) {

            return '?';

        }

        if (

            typeof jogador.avatar === 'string' &&

            jogador.avatar.trim()

        ) {

            return jogador.avatar;

        }

        return String(

            jogador.nickname || 'Jogador'

        )

            .trim()

            .charAt(0)

            .toUpperCase() || '?';

    }

    // ========================================
    // ATIVAR EFEITOS DRAMÁTICOS
    // ========================================

    function ativarEfeitos() {

        if (!estado.ativa) {

            return false;

        }

        document.body.classList.add(

            'morte-subita-ativa'

        );

        document.body.classList.remove(

            'morte-subita-critica'

        );

        return true;

    }

    // ========================================
    // TREMOR LEVE DA TELA
    // ========================================

    function executarImpacto() {

        if (!estado.ativa) {

            return;

        }

        const movimentoReduzido =

            window.matchMedia(

                '(prefers-reduced-motion: reduce)'

            ).matches;

        if (movimentoReduzido) {

            return;

        }

        clearTimeout(impactoTimeout);

        document.body.classList.remove(

            'morte-subita-impacto'

        );

        // Permite reiniciar a animação.

        void document.body.offsetWidth;

        document.body.classList.add(

            'morte-subita-impacto'

        );

        impactoTimeout = setTimeout(() => {

            document.body.classList.remove(

                'morte-subita-impacto'

            );

            impactoTimeout = null;

        }, 650);

    }

    // ========================================
    // ATUALIZAR INTENSIDADE DA VINHETA
    // ========================================

    function atualizarEfeitosTempo(

        segundos,

        cronometroAtivo

    ) {

        if (!estado.ativa) {

            document.body.classList.remove(

                'morte-subita-critica'

            );

            return;

        }

        const momentoCritico =

            cronometroAtivo &&

            segundos <= 3 &&

            segundos > 0;

        document.body.classList.toggle(

            'morte-subita-critica',

            momentoCritico

        );

    }

    // ========================================
    // DESATIVAR EFEITOS DRAMÁTICOS
    // ========================================

    function desativarEfeitos() {

        cancelarSorteioLetra();

        clearTimeout(impactoTimeout);

        impactoTimeout = null;

        document.body.classList.remove(

            'morte-subita-ativa',

            'morte-subita-critica',

            'morte-subita-impacto'

        );

    }

    // ========================================
    // RENDERIZAR FINALISTAS
    // ========================================

    function renderizarFinalistas(jogadores) {

        const lista = document.getElementById(

            'ms-finalists'

        );

        if (!lista) {

            return;

        }

        lista.replaceChildren();

        const participantes = jogadores.filter(jogador => {

            return jogadorParticipa(jogador.id);

        });

        const fragmento =

            document.createDocumentFragment();

        participantes.forEach(jogador => {

            const card =

                document.createElement('div');

            card.className = 'ms-finalist';

            const avatar =

                document.createElement('span');

            avatar.className = 'ms-finalist-avatar';

            avatar.textContent =

                obterAvatar(jogador);

            const nome =

                document.createElement('strong');

            nome.className = 'ms-finalist-name';

            nome.textContent = jogador.nickname;

            nome.title = jogador.nickname;

            const legenda =

                document.createElement('span');

            legenda.className = 'ms-finalist-label';

            legenda.textContent = 'NA DISPUTA';

            card.append(

                avatar,

                nome,

                legenda

            );

            fragmento.appendChild(card);

        });

        lista.appendChild(fragmento);

    }

    // ========================================
    // EXIBIR INTRODUÇÃO DRAMÁTICA
    // ========================================

    function mostrarIntroducao(jogadores) {

        if (!estado.ativa) {

            return false;

        }

        if (!Array.isArray(jogadores)) {

            return false;

        }

        const intro = document.getElementById(

            'morte-subita-intro'

        );

        const eyebrow = document.getElementById(

            'ms-intro-eyebrow'

        );

        const titulo = document.getElementById(

            'ms-intro-title'

        );

        const subtitulo = document.getElementById(

            'ms-intro-subtitle'

        );

        const descricao = document.getElementById(

            'ms-intro-description'

        );

        const botao = document.getElementById(

            'ms-start-button'

        );

        if (

            !intro ||

            !eyebrow ||

            !titulo ||

            !subtitulo ||

            !descricao ||

            !botao

        ) {

            return false;

        }

        // ====================================
        // IDENTIFICAR O TIPO DE DESEMPATE
        // ====================================

        if (estado.tipo === 'rodada') {

            eyebrow.textContent =

                'DESEMPATE DA RODADA';

            subtitulo.textContent =

                'UMA CARTA. UM VENCEDOR.';

            descricao.textContent =

                'Os jogadores empatados disputarão um tema extra para conquistar a carta da rodada.';

        } else {

            eyebrow.textContent =

                'DESEMPATE DO CAMPEONATO';

            subtitulo.textContent =

                'TUDO OU NADA!';

            descricao.textContent =

                'Cartas e acertos terminaram empatados. Agora, a morte súbita definirá o campeão da partida.';

        }

        titulo.textContent =

            'MORTE SÚBITA!';

        // ====================================
        // IDENTIFICAR TENTATIVAS ADICIONAIS
        // ====================================

        if (estado.tentativa > 1) {

            eyebrow.textContent =

                `DESEMPATE ${String(

                    estado.tentativa

                ).padStart(2, '0')}`;

            descricao.textContent =

                'O empate continua! Um novo tema será sorteado para os jogadores restantes.';

        }

        renderizarFinalistas(jogadores);

        botao.disabled = false;

        botao.textContent =

            'INICIAR DESEMPATE →';

        intro.hidden = false;

        intro.scrollTop = 0;

        botao.focus({

            preventScroll: true

        });

        return true;

    }

    // ========================================
    // ESCONDER INTRODUÇÃO
    // ========================================

    function esconderIntroducao() {

        const intro = document.getElementById(

            'morte-subita-intro'

        );

        const lista = document.getElementById(

            'ms-finalists'

        );

        if (intro) {

            intro.hidden = true;

        }

        if (lista) {

            lista.replaceChildren();

        }

    }

    // ========================================
    // FINALIZAR MORTE SÚBITA
    // ========================================

    function finalizar(vencedor) {

        if (!estado.ativa) {

            return null;

        }

        if (

            !vencedor ||

            !jogadorParticipa(vencedor.id) ||

            vencedor.eliminated

        ) {

            return null;

        }

        // Guarda o resultado antes de encerrar.

        const resultado = {

            tipo: estado.tipo,

            tentativa: estado.tentativa,

            vencedor: {

                ...vencedor

            },

            acertosDesempate:

                obterAcertos(vencedor.id),

            participantes:

                [...estado.participantes],

            tema:

                estado.temaAtual

                    ? estado.temaAtual.tema

                    : null

        };

        estado.vencedor = {

            ...vencedor

        };

        estado.ativa = false;

        desativarEfeitos();

        esconderIntroducao();

        // Não concede cartas diretamente.
        // O jogo.js fará isso de acordo
        // com o tipo de desempate.

        return resultado;

    }

    // ========================================
    // LIMPAR COMPLETAMENTE O DESEMPATE
    // ========================================

    function resetar() {

        desativarEfeitos();

        esconderIntroducao();

        estado.ativa = false;

        estado.tipo = null;

        estado.tentativa = 0;

        estado.participantes = [];

        estado.acertos.clear();

        estado.temasUtilizados.clear();

        estado.temaAtual = null;

        estado.vencedor = null;

    }

    // ========================================
    // CONSULTAR ESTADO ATUAL
    // ========================================

    function obterEstado() {

        return {

            ativa: estado.ativa,

            tipo: estado.tipo,

            tentativa: estado.tentativa,

            participantes: [

                ...estado.participantes

            ],

            acertos:

                Object.fromEntries(estado.acertos),

            temasUtilizados: [

                ...estado.temasUtilizados

            ],

            temaAtual: estado.temaAtual

                ? { ...estado.temaAtual }

                : null,

            vencedor: estado.vencedor

                ? { ...estado.vencedor }

                : null

        };

    }

    // ========================================
    // INTERFACE PÚBLICA DO MÓDULO
    // ========================================

    /*
        Permite que o jogo.js utilize
        a morte súbita sem misturar
        os estados internos dos arquivos.
    */

    // Estado de desempate vindo do Firebase. Não sorteia nem pontua localmente.
    function sincronizarOnline(tentativa, jogadores, bancoCartas) {
        if (!tentativa) { resetar(); return; }
        estado.ativa = true;
        estado.tipo = tentativa.rodada === 0 ? 'final' : 'rodada';
        estado.tentativa = tentativa.numero;
        estado.participantes = jogadores.filter(p => tentativa.participantes?.[p.vaga]).map(p => p.id);
        estado.acertos.clear();
        jogadores.forEach(p => {
            if (estado.participantes.includes(p.id)) estado.acertos.set(p.id, tentativa.jogadas?.acertos?.[p.vaga] || 0);
        });
        const carta = bancoCartas.find(c => c.id === tentativa.sorteio?.cartaId);
        estado.temaAtual = carta ? { ...carta, isTiebreak: true } : null;
        estado.vencedor = jogadores.find(p => p.vaga === tentativa.jogadas?.vencedor) || null;
    }

    window.MorteSubita = Object.freeze({

        sincronizarOnline,

        iniciar,

        finalizar,

        resetar,

        repetir,

        estaAtiva,

        obterTipo,

        obterTentativa,

        obterParticipantes,

        obterTemaAtual,

        obterVencedor,

        obterEstado,

        jogadorParticipa,

        sortearTema,

        sortearLetra,

        estaSorteandoLetra,

        cancelarSorteioLetra,

        sortearOrdem,

        registrarAcerto,

        removerAcerto,

        obterAcertos,

        obterJogadoresAtivos,

        obterClassificacao,

        verificarResultado,

        ativarEfeitos,

        desativarEfeitos,

        executarImpacto,

        atualizarEfeitosTempo,

        mostrarIntroducao,

        esconderIntroducao

    });

})();