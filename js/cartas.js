
// ================================================
// STOP! — BANCO DE 1.000 CARTAS
// Dificuldade: Fácil e Normal
// ================================================

// Cartas originais — IDs preservados.

const BANCO_CARTAS = [

    // CONHECIMENTOS GERAIS

    { id: 1, tema: "Uma profissão", categoria: "geral" },
    { id: 2, tema: "Um país", categoria: "geral" },
    { id: 3, tema: "Uma cidade brasileira", categoria: "geral" },
    { id: 4, tema: "Uma invenção", categoria: "geral" },
    { id: 5, tema: "Um esporte", categoria: "geral" },

    // NATUREZA

    { id: 6, tema: "Uma fruta", categoria: "natureza" },
    { id: 7, tema: "Um animal", categoria: "natureza" },
    { id: 8, tema: "Uma planta", categoria: "natureza" },

    // ALIMENTAÇÃO

    { id: 9, tema: "Uma comida", categoria: "alimentacao" },
    { id: 10, tema: "Uma bebida", categoria: "alimentacao" },

    // ENTRETENIMENTO

    { id: 11, tema: "Um filme", categoria: "entretenimento" },
    { id: 12, tema: "Um personagem fictício", categoria: "entretenimento" },
    { id: 13, tema: "Um videogame", categoria: "entretenimento" },
    { id: 14, tema: "Um cantor ou cantora", categoria: "entretenimento" },
    { id: 15, tema: "Uma música", categoria: "entretenimento" },

    // COTIDIANO

    { id: 16, tema: "Algo que tem na cozinha", categoria: "cotidiano" },
    { id: 17, tema: "Algo que cabe no bolso", categoria: "cotidiano" },
    { id: 18, tema: "Algo encontrado na escola", categoria: "cotidiano" },
    { id: 19, tema: "Algo que faz barulho", categoria: "cotidiano" },
    { id: 20, tema: "Algo que você levaria em uma viagem", categoria: "cotidiano" },

    // FORA DA CAIXA

    { id: 21, tema: "Algo que dá medo", categoria: "criatividade" },
    { id: 22, tema: "Uma desculpa para chegar atrasado", categoria: "criatividade" },
    { id: 23, tema: "Algo que você esconderia", categoria: "criatividade" },
    { id: 24, tema: "Algo que não deveria estar na geladeira", categoria: "criatividade" },
    { id: 25, tema: "Algo que levaria para uma ilha deserta", categoria: "criatividade" },
    { id: 26, tema: "Algo que um alienígena acharia estranho", categoria: "criatividade" }

];

// ================================================
// FUNÇÃO DE REGISTRO DAS NOVAS CARTAS
// ================================================

function adicionarCartas(categoria, temas) {

    temas.trim().split("|").forEach(tema => {

        const texto = tema.trim();

        if (!texto) return;

        BANCO_CARTAS.push({

            id: BANCO_CARTAS.length + 1,
            tema: texto,
            categoria: categoria

        });

    });

}

// ================================================
// CONHECIMENTOS GERAIS — 100 NOVAS CARTAS
// ================================================

adicionarCartas("geral", `

Um nome masculino |
Um nome feminino |
Um sobrenome |
Um apelido |
Uma cor |
Uma capital |
Uma cidade estrangeira |
Um ponto turístico |
Uma língua ou idioma |
Uma nacionalidade |

Uma matéria escolar |
Um curso de faculdade |
Um local de trabalho |
Uma profissão que usa uniforme |
Uma profissão que trabalha com crianças |
Uma profissão que trabalha ao ar livre |
Uma profissão que utiliza computadores |
Uma profissão que atende clientes |
Uma profissão que trabalha à noite |
Uma profissão que exige criatividade |

Um meio de transporte |
Uma marca de carro |
Uma peça de veículo |
Um tipo de comércio |
Um estabelecimento público |
Um tipo de moradia |
Um lugar para estudar |
Um lugar para trabalhar |
Um lugar para passar férias |
Um lugar para praticar esportes |

Um time de futebol |
Um jogador de futebol |
Um atleta famoso |
Um clube esportivo |
Um esporte coletivo |
Um esporte individual |
Um esporte aquático |
Um equipamento esportivo |
Algo usado por um goleiro |
Algo encontrado em um estádio |

Uma marca famosa |
Uma empresa conhecida |
Uma loja conhecida |
Um aplicativo de celular |
Um site da internet |
Uma rede social |
Um equipamento eletrônico |
Uma função de um celular |
Algo que utiliza energia elétrica |
Algo que funciona com bateria |

Uma data comemorativa |
Uma festa tradicional |
Uma tradição brasileira |
Uma lembrança de infância |
Uma personalidade histórica |
Um personagem do folclore |
Uma palavra em inglês |
Uma unidade de medida |
Um instrumento musical |
Um símbolo conhecido |

Uma ferramenta de trabalho |
Um material de construção |
Um objeto feito de madeira |
Um objeto feito de metal |
Um objeto feito de plástico |
Um objeto feito de vidro |
Algo fabricado com papel |
Algo feito de tecido |
Algo que pode ser reciclado |
Algo produzido em uma fábrica |

Uma forma de ganhar dinheiro |
Uma coisa que custa caro |
Uma coisa que costuma ser barata |
Algo vendido por quilo |
Algo vendido por litro |
Algo vendido em pares |
Algo comprado pela internet |
Algo encontrado em uma feira |
Algo que precisa de licença |
Algo que exige treinamento |

Uma atividade física |
Uma atividade de lazer |
Uma habilidade útil |
Um talento artístico |
Um tipo de dança |
Um tipo de competição |
Um jogo de tabuleiro |
Uma brincadeira infantil |
Um passatempo |
Um trabalho voluntário |

Uma qualidade de uma pessoa |
Um defeito de uma pessoa |
Uma emoção |
Um sentimento positivo |
Uma atitude educada |
Uma atitude irresponsável |
Uma palavra de elogio |
Uma forma de cumprimentar alguém |
Uma regra de convivência |
Algo importante para uma amizade

`);

// ================================================
// NATUREZA — 100 NOVAS CARTAS
// ================================================

adicionarCartas("natureza", `

Um animal doméstico |
Um animal selvagem |
Um animal de fazenda |
Um animal marinho |
Um animal que voa |
Um animal que nada |
Um animal que vive em rios |
Um animal que vive na floresta |
Um animal que vive no deserto |
Um animal encontrado no Brasil |

Um animal que possui penas |
Um animal que possui pelos |
Um animal que possui escamas |
Um animal que possui cauda |
Um animal que possui chifres |
Um animal que possui asas |
Um animal que possui garras |
Um animal com dentes grandes |
Um animal com orelhas grandes |
Um animal que possui manchas |

Um inseto |
Uma ave |
Um peixe |
Um réptil |
Um mamífero |
Um animal pequeno |
Um animal gigante |
Um animal veloz |
Um animal lento |
Um animal que vive em grupo |

Um animal perigoso |
Um animal considerado fofo |
Um animal que você teria em casa |
Um animal que você não teria em casa |
Um animal encontrado em um zoológico |
Um animal que consegue se camuflar |
Um animal que pula |
Um animal que rasteja |
Um animal que cava buracos |
Um animal que faz um som conhecido |

Uma flor |
Uma árvore |
Uma erva |
Uma semente |
Uma planta de jardim |
Uma planta utilizada na culinária |
Algo que cresce em árvores |
Algo que cresce debaixo da terra |
Algo encontrado em uma horta |
Algo encontrado em um pomar |

Uma fruta doce |
Uma fruta azeda |
Uma fruta tropical |
Uma fruta com casca |
Uma fruta usada para fazer suco |
Uma fruta que possui sementes |
Uma fruta usada em sobremesas |
Um vegetal |
Uma verdura |
Um legume |

Algo encontrado em uma praia |
Algo encontrado em uma floresta |
Algo encontrado em uma montanha |
Algo encontrado no fundo do mar |
Algo encontrado em uma caverna |
Algo encontrado no campo |
Algo encontrado em um lago |
Algo encontrado em um jardim |
Algo encontrado na terra |
Algo encontrado em uma cachoeira |

Algo que existe no espaço |
Algo que aparece no céu |
Algo que brilha naturalmente |
Algo que flutua na água |
Algo que afunda na água |
Algo que derrete com o calor |
Algo que congela |
Algo que precisa de água para viver |
Algo que possui raízes |
Algo que se movimenta com o vento |

Um fenômeno da natureza |
Algo relacionado à chuva |
Algo relacionado ao inverno |
Algo relacionado ao verão |
Algo relacionado à primavera |
Algo relacionado ao outono |
Algo que você encontra durante uma trilha |
Algo que pode ser encontrado em um rio |
Algo que causa poluição |
Algo que ajuda o meio ambiente |

Uma fonte de energia natural |
Algo que possui cheiro agradável na natureza |
Algo que possui cheiro desagradável na natureza |
Algo que você plantaria em casa |
Algo que você colheria em uma fazenda |
Algo utilizado para cuidar de plantas |
Algo necessário para cuidar de um animal |
Um alimento de origem animal |
Um alimento de origem vegetal |
Algo que você fotografaria na natureza

`);

// ================================================
// ALIMENTAÇÃO — 150 NOVAS CARTAS
// ================================================

adicionarCartas("alimentacao", `

Um doce |
Um salgado |
Uma sobremesa |
Um lanche |
Um biscoito |
Um tipo de pão |
Um tipo de queijo |
Um tipo de carne |
Um tipo de massa |
Um tipo de molho |

Um sabor de pizza |
Um sabor de sorvete |
Um sabor de bolo |
Um sabor de suco |
Um sabor de milk-shake |
Um sabor de pastel |
Um sabor de brigadeiro |
Um sabor de iogurte |
Um recheio de chocolate |
Um recheio de sanduíche |

Algo servido no café da manhã |
Algo servido no almoço |
Algo servido no jantar |
Algo servido no café da tarde |
Algo servido em uma festa infantil |
Algo servido em um casamento |
Algo servido em uma padaria |
Algo servido em uma lanchonete |
Algo servido em uma pizzaria |
Algo servido em um restaurante |

Algo vendido em uma sorveteria |
Algo vendido em uma confeitaria |
Algo vendido em um açougue |
Algo vendido em uma feira de alimentos |
Algo vendido em um supermercado |
Algo vendido em uma loja de doces |
Algo vendido em uma barraquinha |
Algo vendido em um carrinho de comida |
Algo vendido em um cinema |
Algo encontrado em um buffet |

Uma comida brasileira |
Uma comida italiana |
Uma comida asiática |
Uma comida típica de festa junina |
Uma comida típica de Natal |
Uma comida típica de Páscoa |
Uma comida de rua |
Uma comida caseira |
Uma comida de restaurante chique |
Uma comida de boteco |

Uma bebida quente |
Uma bebida gelada |
Uma bebida sem gás |
Uma bebida com gás |
Uma bebida feita com frutas |
Uma bebida servida em festas |
Uma bebida encontrada em uma cafeteria |
Uma bebida que você tomaria no verão |
Uma bebida que você tomaria no inverno |
Um ingrediente para preparar uma bebida |

Algo doce e crocante |
Algo doce e gelado |
Algo doce e quente |
Algo salgado e crocante |
Algo salgado e macio |
Algo com recheio |
Algo com cobertura |
Algo que pode ser servido frio |
Algo com gosto amargo |
Algo que possui sabor azedo |

Algo preparado na frigideira |
Algo preparado no forno |
Algo preparado no micro-ondas |
Algo preparado na churrasqueira |
Algo preparado no liquidificador |
Algo preparado na panela |
Algo que pode ser feito na air fryer |
Algo preparado em banho-maria |
Algo que pode ser cozido no vapor |
Algo que pode ser consumido cru |

Um ingrediente de salada |
Um ingrediente de sopa |
Um ingrediente de pizza |
Um ingrediente de hambúrguer |
Um ingrediente de bolo |
Um ingrediente de torta |
Um ingrediente de feijoada |
Um ingrediente de macarrão |
Um ingrediente de farofa |
Um ingrediente de omelete |

Um tempero |
Uma especiaria |
Um acompanhamento para arroz |
Um acompanhamento para churrasco |
Um acompanhamento para carne |
Um acompanhamento para peixe |
Um acompanhamento para hambúrguer |
Um acompanhamento para pão |
Um acompanhamento para café |
Um acompanhamento para sorvete |

Uma comida que você levaria em um piquenique |
Uma comida que você levaria para a escola |
Uma comida que você levaria para o trabalho |
Uma comida que você comeria na praia |
Uma comida que você pediria por delivery |
Uma comida que você prepararia em um encontro |
Uma comida que você ofereceria a uma visita |
Uma comida que você levaria a uma festa |
Uma comida que você levaria em um acampamento |
Uma comida que você faria para impressionar alguém |

Uma comida que se come com as mãos |
Uma comida que se come com colher |
Uma comida que se come com palitos |
Uma comida que precisa ser cortada |
Uma comida que pode ser compartilhada |
Uma comida que pode ser congelada |
Uma comida que demora para preparar |
Uma comida rápida de preparar |
Uma comida que faz muita sujeira |
Uma comida que deixa cheiro na casa |

Algo que tem chocolate |
Algo que tem morango |
Algo que tem queijo |
Algo que tem leite |
Algo que tem ovos |
Algo que tem farinha |
Algo que tem milho |
Algo que tem batata |
Algo que tem coco |
Algo que tem banana |

Uma marca de alimento |
Uma marca de refrigerante |
Uma marca de chocolate |
Uma marca de biscoito |
Uma rede de fast-food |
Um alimento vendido em lata |
Um alimento vendido em pacote |
Um alimento vendido em pote |
Um alimento encontrado no congelador |
Um alimento encontrado na despensa |

Uma comida que lembra a infância |
Uma comida que você não gosta |
Uma comida que você comeria todos os dias |
Uma comida que costuma sobrar em festas |
Uma comida que você experimentaria pela primeira vez |
Uma comida que você prepararia para um aniversário |
Uma comida que você pediria de madrugada |
Uma comida que você dividiria com um amigo |
Uma comida que você levaria para uma maratona de filmes |
Uma comida que você gostaria de ganhar de presente

`);

// ================================================
// ENTRETENIMENTO — 150 NOVAS CARTAS
// ================================================

adicionarCartas("entretenimento", `

Uma série |
Uma novela |
Um desenho animado |
Um anime |
Um livro |
Uma história infantil |
Um conto de fadas |
Um programa de televisão |
Um reality show |
Um canal de televisão |

Um filme de comédia |
Um filme de ação |
Um filme de terror |
Um filme de romance |
Um filme de aventura |
Um filme de animação |
Um filme de ficção científica |
Um filme de fantasia |
Um filme com animais |
Um filme com super-heróis |

Um personagem de desenho animado |
Um personagem de anime |
Um personagem de videogame |
Um personagem de novela |
Um personagem de série |
Um personagem de filme de terror |
Um personagem da Disney |
Um personagem da Pixar |
Um personagem da Marvel |
Um personagem da DC |

Um super-herói |
Um supervilão |
Um personagem que usa máscara |
Um personagem que usa chapéu |
Um personagem que possui poderes |
Um personagem que não é humano |
Um personagem engraçado |
Um personagem assustador |
Um personagem inteligente |
Um personagem atrapalhado |

Um jogo de corrida |
Um jogo de luta |
Um jogo de aventura |
Um jogo de terror |
Um jogo de futebol |
Um jogo de sobrevivência |
Um jogo de mundo aberto |
Um jogo de celular |
Um jogo multiplayer |
Um jogo cooperativo |

Um jogo que você jogaria com amigos |
Um jogo que você jogava na infância |
Um jogo que possui animais |
Um jogo que possui monstros |
Um jogo que possui veículos |
Um jogo que possui construção |
Um jogo que possui fases |
Um jogo que possui chefões |
Um jogo que possui personagens famosos |
Um jogo que você gostaria de jogar novamente |

Um item de videogame |
Uma ferramenta de videogame |
Um poder de videogame |
Um inimigo de videogame |
Um veículo de videogame |
Um local encontrado em videogames |
Um recurso utilizado em jogos |
Um objeto encontrado em Minecraft |
Um animal encontrado em Minecraft |
Um personagem de Pokémon |

Um acessório para jogar |
Algo que existe em um setup gamer |
Algo encontrado em um jogo de RPG |
Algo encontrado em um jogo medieval |
Algo encontrado em um jogo de corrida |
Algo encontrado em um jogo de sobrevivência |
Algo que pode ser construído em um jogo |
Algo que pode ser coletado em um jogo |
Algo que você compraria em um jogo |
Algo que você gostaria de desbloquear em um jogo |

Um ator |
Uma atriz |
Um comediante |
Um apresentador de televisão |
Um influenciador digital |
Um youtuber |
Um streamer |
Um famoso brasileiro |
Um famoso internacional |
Uma dupla famosa |

Uma banda musical |
Uma dupla sertaneja |
Um estilo musical |
Uma música brasileira |
Uma música internacional |
Uma música infantil |
Uma música romântica |
Uma música que você cantaria no karaokê |
Uma música que lembra sua infância |
Uma música que tocaria em uma festa |

Um instrumento de cordas |
Um objeto utilizado por músicos |
Algo encontrado em um show |
Algo encontrado em um festival |
Algo encontrado em um estúdio |
Algo encontrado em um videoclipe |
Algo encontrado em um teatro |
Algo encontrado em um parque de diversões |
Algo encontrado em um circo |
Algo encontrado em um cinema |

Um brinquedo |
Um brinquedo eletrônico |
Um brinquedo que utiliza pilhas |
Um brinquedo que você teve na infância |
Uma brincadeira de rua |
Uma brincadeira de festa |
Uma brincadeira de escola |
Um jogo de cartas |
Um jogo que não utiliza eletricidade |
Uma atividade para um dia chuvoso |

Algo encontrado em uma história de fantasia |
Algo encontrado em uma história de terror |
Algo encontrado em um filme de ação |
Algo encontrado em um filme medieval |
Algo encontrado em um filme de piratas |
Algo encontrado em um filme espacial |
Algo encontrado em uma história de detetive |
Algo encontrado em uma história de romance |
Algo encontrado em uma história de aventura |
Algo encontrado em uma história de super-heróis |

Um objeto que aparece em desenhos animados |
Um animal famoso da ficção |
Um robô da ficção |
Um monstro da ficção |
Um personagem que utiliza magia |
Um personagem que usa uniforme |
Um personagem que vive uma aventura |
Um personagem que utiliza tecnologia |
Um personagem que você gostaria de conhecer |
Um personagem que seria um bom amigo |

Algo que você assistiria antes de dormir |
Algo que você faria para se divertir sozinho |
Algo que você faria em uma festa do pijama |
Algo que você faria em um parque |
Algo que você faria em um encontro com amigos |
Algo que você faria em um domingo livre |
Algo que você colecionaria por diversão |
Algo que você publicaria em uma rede social |
Algo que você faria em um canal do YouTube |
Algo que você aprenderia assistindo a um vídeo

`);

// ================================================
// COTIDIANO — 200 NOVAS CARTAS
// ================================================

adicionarCartas("cotidiano", `

Algo encontrado no quarto |
Algo encontrado no banheiro |
Algo encontrado na sala |
Algo encontrado na garagem |
Algo encontrado na lavanderia |
Algo encontrado na varanda |
Algo encontrado no quintal |
Algo encontrado em uma gaveta |
Algo encontrado em um armário |
Algo encontrado embaixo da cama |

Algo que fica na parede |
Algo que fica no teto |
Algo que fica no chão |
Algo que fica sobre uma mesa |
Algo que fica perto da porta |
Algo que fica perto da janela |
Algo que fica ao lado da cama |
Algo que fica dentro de uma caixa |
Algo que fica atrás do sofá |
Algo que fica em uma prateleira |

Algo utilizado para limpar a casa |
Algo utilizado para lavar roupas |
Algo utilizado para lavar louça |
Algo utilizado para cozinhar |
Algo utilizado para dormir |
Algo utilizado para tomar banho |
Algo utilizado para escovar os dentes |
Algo utilizado para organizar objetos |
Algo utilizado para decorar a casa |
Algo utilizado para consertar alguma coisa |

Uma peça de roupa |
Um tipo de calçado |
Um acessório de moda |
Algo que você usa na cabeça |
Algo que você usa nas mãos |
Algo que você usa nos pés |
Algo que você usa no pescoço |
Algo que você usa no pulso |
Algo que você usa no rosto |
Algo que você usa na cintura |

Algo que você usa no verão |
Algo que você usa no inverno |
Algo que você usa quando chove |
Algo que você usa para praticar esportes |
Algo que você usa para sair de casa |
Algo que você usa em uma festa |
Algo que você usa para trabalhar |
Algo que você usa para estudar |
Algo que você usa para ir à praia |
Algo que você usa para ficar em casa |

Algo encontrado em uma mochila |
Algo encontrado em uma bolsa |
Algo encontrado em uma carteira |
Algo encontrado em uma mala |
Algo encontrado em um estojo |
Algo encontrado em uma sacola |
Algo encontrado em uma caixa de ferramentas |
Algo encontrado em um porta-luvas |
Algo encontrado em um cesto de roupas |
Algo encontrado em uma lixeira |

Algo encontrado em uma sala de aula |
Algo encontrado em uma biblioteca |
Algo encontrado em uma secretaria |
Algo encontrado em um laboratório |
Algo encontrado em uma quadra esportiva |
Algo encontrado em um parquinho |
Algo encontrado em uma cantina |
Algo encontrado em uma faculdade |
Algo encontrado em uma papelaria |
Algo encontrado em um escritório |

Algo encontrado em um hospital |
Algo encontrado em uma farmácia |
Algo encontrado em uma academia |
Algo encontrado em um salão de beleza |
Algo encontrado em uma barbearia |
Algo encontrado em um hotel |
Algo encontrado em um aeroporto |
Algo encontrado em uma rodoviária |
Algo encontrado em um posto de gasolina |
Algo encontrado em uma oficina mecânica |

Algo encontrado em uma loja de roupas |
Algo encontrado em uma loja de brinquedos |
Algo encontrado em uma loja de eletrônicos |
Algo encontrado em uma loja de móveis |
Algo encontrado em uma loja de ferramentas |
Algo encontrado em uma loja de animais |
Algo encontrado em uma floricultura |
Algo encontrado em uma joalheria |
Algo encontrado em uma loja de presentes |
Algo encontrado em uma loja de esportes |

Algo encontrado em um carro |
Algo encontrado em um ônibus |
Algo encontrado em um avião |
Algo encontrado em um barco |
Algo encontrado em um trem |
Algo encontrado em uma bicicleta |
Algo encontrado em uma moto |
Algo encontrado em um caminhão |
Algo encontrado em um metrô |
Algo encontrado em um estacionamento |

Algo encontrado em uma praça |
Algo encontrado em uma calçada |
Algo encontrado em uma avenida |
Algo encontrado em uma estrada |
Algo encontrado em uma cidade pequena |
Algo encontrado em uma cidade grande |
Algo encontrado em uma chácara |
Algo encontrado em um sítio |
Algo encontrado em um condomínio |
Algo encontrado em uma construção |

Algo que pode ser aberto |
Algo que pode ser fechado |
Algo que pode ser dobrado |
Algo que pode ser enrolado |
Algo que pode ser rasgado |
Algo que pode ser cortado |
Algo que pode ser amassado |
Algo que pode ser pintado |
Algo que pode ser colado |
Algo que pode ser desmontado |

Algo que gira |
Algo que possui rodas |
Algo que possui botões |
Algo que possui alças |
Algo que possui tampa |
Algo que possui chave |
Algo que possui tela |
Algo que possui espelho |
Algo que possui zíper |
Algo que possui bolsos |

Algo que é redondo |
Algo que é quadrado |
Algo que é comprido |
Algo que é pontudo |
Algo que é transparente |
Algo que é pesado |
Algo que é leve |
Algo que é flexível |
Algo que é frágil |
Algo que é resistente |

Algo que possui cheiro forte |
Algo que possui cheiro agradável |
Algo que é pegajoso |
Algo que é escorregadio |
Algo que é áspero |
Algo que é macio |
Algo que costuma estar molhado |
Algo que costuma estar quente |
Algo que costuma estar gelado |
Algo que produz fumaça |

Algo que é vermelho |
Algo que é azul |
Algo que é amarelo |
Algo que é verde |
Algo que é branco |
Algo que é preto |
Algo que é rosa |
Algo que é laranja |
Algo que é roxo |
Algo que é marrom |

Algo que você faz ao acordar |
Algo que você faz antes de dormir |
Algo que você faz após o almoço |
Algo que você faz no fim de semana |
Algo que você faz quando está entediado |
Algo que você faz quando está cansado |
Algo que você faz quando está feliz |
Algo que você faz quando está nervoso |
Algo que você faz quando está sozinho |
Algo que você faz quando está com pressa |

Algo que você costuma esquecer |
Algo que você costuma perder |
Algo que você costuma emprestar |
Algo que você costuma pedir emprestado |
Algo que você costuma guardar |
Algo que você costuma jogar fora |
Algo que você costuma carregar |
Algo que você costuma lavar |
Algo que você costuma comprar |
Algo que você costuma pesquisar |

Algo que você fotografa |
Algo que você grava em vídeo |
Algo que você envia pelo celular |
Algo que você procura na internet |
Algo que você salva no computador |
Algo que você imprime |
Algo que você escreve à mão |
Algo que você utiliza para estudar |
Algo que você utiliza para se comunicar |
Algo que você utiliza para ouvir música |

Algo que você faria durante as férias |
Algo que você faria antes de uma prova |
Algo que você faria depois de uma prova |
Algo que você faria ao receber uma visita |
Algo que você faria antes de uma viagem |
Algo que você faria ao chegar em casa |
Algo que você faria em um feriado |
Algo que você faria durante uma mudança |
Algo que você faria em uma reunião de família |
Algo que você faria em um dia sem internet

`);

// ================================================
// FORA DA CAIXA — 274 NOVAS CARTAS
// ================================================

adicionarCartas("criatividade", `

Algo que você levaria para um apocalipse zumbi |
Algo que você usaria para distrair um zumbi |
Um lugar para se esconder de zumbis |
Algo que seria inútil em um apocalipse zumbi |
Uma profissão útil durante um apocalipse |
Algo que você procuraria em uma cidade abandonada |
Algo que você colocaria em um kit de sobrevivência |
Algo que você protegeria durante um apocalipse |
Um personagem que você gostaria de ter no seu grupo de sobreviventes |
Algo que você sentiria falta após o fim do mundo |

Algo que você levaria para o espaço |
Algo que você mostraria a um alienígena |
Algo que você ensinaria a um alienígena |
Uma comida que você daria a um extraterrestre |
Algo que você esconderia de um extraterrestre |
Um lugar que você mostraria a um visitante de outro planeta |
Algo que faria um alienígena gostar da Terra |
Algo que faria um alienígena querer ir embora |
Algo que você perguntaria a um extraterrestre |
Algo que você colocaria em uma nave espacial |

Um superpoder que você gostaria de ter |
Um superpoder completamente inútil |
Um nome para um super-herói |
Um nome para um supervilão |
Algo que um super-herói deveria carregar |
Algo que você faria se pudesse voar |
Algo que você faria se fosse invisível |
Algo que você faria se pudesse parar o tempo |
Algo que você faria se pudesse se teletransportar |
Algo que você faria se tivesse superforça |

Algo que você compraria se fosse milionário |
Algo que você faria se ganhasse na loteria |
Algo que você colocaria em uma mansão |
Algo que você compraria apenas por diversão |
Algo que você nunca compraria mesmo sendo rico |
Algo que você teria em uma casa dos sonhos |
Algo que você colocaria em uma piscina particular |
Algo que você colecionaria se tivesse muito dinheiro |
Algo que você daria de presente se fosse rico |
Um negócio que você abriria se tivesse dinheiro infinito |

Algo que você não deveria falar em um encontro |
Algo que estragaria um primeiro encontro |
Algo que faria você abandonar um encontro |
Uma desculpa para cancelar um encontro |
Algo que você faria para impressionar alguém |
Algo que você não gostaria de ganhar de um namorado |
Algo que deixaria um encontro constrangedor |
Algo que você levaria para um encontro romântico |
Algo que seria estranho receber como declaração de amor |
Um lugar péssimo para um pedido de casamento |

Uma desculpa para não fazer a lição de casa |
Uma desculpa para faltar ao trabalho |
Uma desculpa para não atender o telefone |
Uma desculpa para não ir à academia |
Uma desculpa para não lavar a louça |
Uma desculpa para não emprestar dinheiro |
Uma desculpa para não sair de casa |
Uma desculpa para não fazer uma prova |
Uma desculpa para sair de uma festa |
Uma desculpa para não responder uma mensagem |

Algo que você não gostaria de encontrar dentro do sapato |
Algo que você não gostaria de encontrar na sua cama |
Algo que você não gostaria de encontrar na comida |
Algo que você não gostaria de encontrar no banheiro |
Algo que você não gostaria de encontrar dentro do carro |
Algo que você não gostaria de encontrar na mochila |
Algo que você não gostaria de encontrar debaixo do sofá |
Algo que você não gostaria de encontrar no elevador |
Algo que você não gostaria de encontrar em uma piscina |
Algo que você não gostaria de encontrar dentro de um presente |

Algo que seria estranho levar para um casamento |
Algo que seria estranho levar para a escola |
Algo que seria estranho levar para uma entrevista de emprego |
Algo que seria estranho levar para um hospital |
Algo que seria estranho levar para a academia |
Algo que seria estranho levar para um restaurante |
Algo que seria estranho levar para um cinema |
Algo que seria estranho levar para uma igreja |
Algo que seria estranho levar para um aeroporto |
Algo que seria estranho levar para uma festa de aniversário |

Algo que você faria se virasse criança novamente |
Algo que você faria se acordasse famoso |
Algo que você faria se acordasse em outro país |
Algo que você faria se acordasse em um castelo |
Algo que você faria se acordasse em uma nave espacial |
Algo que você faria se pudesse voltar no tempo |
Algo que você faria se visitasse o futuro |
Algo que você faria se tivesse um clone |
Algo que você faria se tivesse um robô particular |
Algo que você faria se os animais começassem a falar |

Algo que você proibiria se fosse presidente |
Algo que você mudaria se fosse diretor de escola |
Algo que você faria se fosse dono de um shopping |
Algo que você inventaria se fosse cientista |
Algo que você criaria se fosse um mago |
Algo que você faria se fosse um rei |
Algo que você ensinaria se fosse professor |
Algo que você venderia se tivesse uma loja |
Algo que você construiria se fosse bilionário |
Algo que você apresentaria se tivesse um programa de televisão |

Algo que faria uma criança chorar |
Algo que faria um adulto chorar |
Algo que faria uma pessoa gritar |
Algo que faria alguém pular de susto |
Algo que faria alguém sair correndo |
Algo que faria alguém rir em um momento sério |
Algo que faria alguém ficar vermelho de vergonha |
Algo que faria alguém perder a paciência |
Algo que faria alguém desistir de uma viagem |
Algo que faria alguém sair de uma festa mais cedo |

Algo que você não gostaria de ouvir do seu médico |
Algo que você não gostaria de ouvir do seu professor |
Algo que você não gostaria de ouvir do seu chefe |
Algo que você não gostaria de ouvir de um piloto |
Algo que você não gostaria de ouvir de um cozinheiro |
Algo que você não gostaria de ouvir de um dentista |
Algo que você não gostaria de ouvir de um cabeleireiro |
Algo que você não gostaria de ouvir de um motorista |
Algo que você não gostaria de ouvir de um mecânico |
Algo que você não gostaria de ouvir de um vidente |

Algo que você faria durante uma invasão de monstros |
Algo que você levaria para enfrentar um dragão |
Algo que você daria de presente a um gigante |
Algo que você pediria a um gênio da lâmpada |
Algo que você levaria para um mundo medieval |
Algo que você colocaria em um caldeirão mágico |
Algo que você transformaria em ouro |
Algo que você esconderia em um castelo |
Algo que você encantaria com magia |
Algo que você faria se encontrasse um portal mágico |

Um nome para um cachorro famoso |
Um nome para um gato vilão |
Um nome para um dragão de estimação |
Um nome para um robô |
Um nome para uma banda de garagem |
Um nome para um reino fictício |
Um nome para um navio pirata |
Um nome para uma nave espacial |
Um nome para uma equipe de super-heróis |
Um nome para um restaurante maluco |

Algo que seria um presente horrível |
Algo que seria um presente perfeito |
Algo que você daria para um inimigo |
Algo que você daria para seu melhor amigo |
Algo que você daria para um fantasma |
Algo que você daria para um robô |
Algo que você daria para um milionário |
Algo que você daria para um pirata |
Algo que você daria para um super-herói |
Algo que você daria para um vilão arrependido |

Algo que você faria se estivesse preso em um shopping |
Algo que você faria se estivesse preso em um elevador |
Algo que você faria se estivesse perdido em uma floresta |
Algo que você faria se estivesse sozinho em um aeroporto |
Algo que você faria se estivesse trancado em uma escola |
Algo que você faria se estivesse em uma casa mal-assombrada |
Algo que você faria se estivesse preso em um videogame |
Algo que você faria se estivesse em um navio pirata |
Algo que você faria se estivesse no meio de uma tempestade |
Algo que você faria se estivesse em uma cidade fantasma |

Algo que seria engraçado ver um cachorro fazendo |
Algo que seria engraçado ver um gato usando |
Algo que seria estranho ver um professor fazendo |
Algo que seria estranho ver um médico usando |
Algo que seria engraçado ver um avô dançando |
Algo que seria engraçado ver um robô tentando fazer |
Algo que seria estranho ver um super-herói comprando |
Algo que seria engraçado ver um zumbi fazendo |
Algo que seria estranho ver um rei usando |
Algo que seria engraçado ver um alienígena experimentando |

Algo que você tentaria vender por um milhão de reais |
Algo que você venderia em uma loja de produtos inúteis |
Algo que você leiloaria por brincadeira |
Algo que você colocaria em um museu de coisas estranhas |
Algo que você criaria para facilitar a vida dos preguiçosos |
Algo que você inventaria para nunca precisar levantar da cama |
Algo que você criaria para fazer seus amigos rirem |
Algo que você patentearia se pudesse |
Algo que você transformaria em um brinquedo |
Algo que você transformaria em uma atração turística |

Uma coisa que você não faria nem por dinheiro |
Uma coisa que você faria por um prêmio |
Uma coisa que você teria vergonha de comprar |
Uma coisa que você teria vergonha de pesquisar na internet |
Uma coisa que você não contaria para sua mãe |
	Uma coisa que você não deixaria seu melhor amigo fazer |
Uma coisa que você não emprestaria a ninguém |
Uma coisa que você defenderia em uma discussão |
Uma coisa que você não levaria para um encontro com seus sogros |
Uma coisa que você nunca publicaria em uma rede social |

Algo que você faria se fosse o último humano na Terra |
Algo que você faria se todos os adultos desaparecessem |
Algo que você faria se a internet sumisse por um mês |
Algo que você faria se não precisasse dormir |
Algo que você faria se não precisasse trabalhar |
Algo que você faria se nunca mais tivesse aulas |
Algo que você faria se pudesse falar todos os idiomas |
Algo que você faria se pudesse respirar debaixo da água |
Algo que você faria se pudesse conversar com plantas |
Algo que você faria se pudesse trocar de corpo com alguém |

Algo que seria estranho encontrar em um tesouro |
Algo que você esconderia dentro de uma cápsula do tempo |
Algo que você enterraria para encontrar daqui a cinquenta anos |
Algo que você levaria para apresentar aos seus antepassados |
Algo moderno que assustaria uma pessoa da Idade Média |
Algo que uma pessoa do futuro acharia antiquado |
Algo que você resgataria de uma cidade submersa |
Algo que você gostaria de descobrir em uma caverna |
Algo que você procuraria em um planeta desconhecido |
Algo que você gostaria de encontrar em uma expedição |

Algo que causaria confusão em uma reunião de família |
Algo que causaria uma discussão entre amigos |
Algo que estragaria uma noite de jogos |
Algo que estragaria uma viagem em família |
Algo que estragaria uma festa surpresa |
Algo que estragaria um churrasco |
Algo que estragaria um piquenique |
Algo que estragaria uma festa do pijama |
Algo que estragaria um dia na praia |
Algo que estragaria uma maratona de filmes |

Algo que você não gostaria que tocasse no seu despertador |
Algo que você não gostaria de ver no seu histórico de compras |
Algo que você não gostaria que seus pais encontrassem no seu quarto |
Algo que você não gostaria que aparecesse na televisão |
Algo que você não gostaria que seu cachorro destruísse |
Algo que você não gostaria que caísse no seu colo |
Algo que você não gostaria que acontecesse durante uma prova |
Algo que você não gostaria que acontecesse durante uma chamada de vídeo |
Algo que você não gostaria que acontecesse em público |
Algo que você não gostaria que aparecesse em uma foto sua |

Algo que você colocaria em um parque de diversões maluco |
Algo que você colocaria em uma escola de magia |
Algo que você colocaria em um laboratório secreto |
Algo que você colocaria em uma base subterrânea |
Algo que você colocaria em uma casa mal-assombrada |
Algo que você colocaria em uma fortaleza medieval |
Algo que você colocaria em uma cidade futurista |
Algo que você colocaria em um quarto secreto |
Algo que você colocaria em um esconderijo de super-heróis |
Algo que você colocaria em uma ilha particular |

Algo que você faria se o chão virasse lava |
Algo que você faria se começasse a chover dinheiro |
Algo que você faria se os brinquedos ganhassem vida |
Algo que você faria se todos os carros começassem a voar |
Algo que você faria se seu celular começasse a falar |
Algo que você faria se seu cachorro virasse humano |
Algo que você faria se descobrisse um tesouro no quintal |
Algo que você faria se ganhasse uma máquina do tempo |
Algo que você faria se encontrasse uma passagem secreta |
Algo que você faria se pudesse entrar em qualquer filme |

Algo que você transformaria em uma arma de brincadeira |
Algo que você usaria como fantasia improvisada |
Algo que você usaria como microfone improvisado |
Algo que você usaria como instrumento musical improvisado |
Algo que você usaria como travesseiro improvisado |
Algo que você usaria para impressionar um alienígena |
Algo que você usaria para fingir que é milionário |
Algo que você usaria para assustar seus amigos |
Algo que você usaria para montar uma cabana improvisada |
Algo que você usaria para parecer um super-herói |

Uma regra absurda para uma escola |
Uma regra absurda para um campeonato |
Uma regra absurda para um restaurante |
Uma regra absurda para um reino |
Uma tarefa que você daria para um robô |
Um desafio engraçado para seus amigos |
Um motivo ridículo para virar um vilão |
Um motivo estranho para chamar a polícia |
Um motivo engraçado para comemorar |
Um motivo inesperado para receber uma medalha |

Algo que você faria se fosse prefeito por um dia |
Algo que você levaria para uma aventura com seus amigos |
Algo que você desejaria ter em uma emergência |
Algo que você faria se pudesse realizar um desejo

`);

// ================================================
// VERIFICAÇÃO DO BANCO DE CARTAS
// ================================================

const TOTAL_CARTAS = BANCO_CARTAS.length;

const idsCartas = new Set(
    BANCO_CARTAS.map(carta => carta.id)
);

const temasCartas = new Set(
    BANCO_CARTAS.map(carta =>
        carta.tema
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
    )
);

if (TOTAL_CARTAS !== 1000) {

    console.warn(
        "[STOP!] Quantidade diferente de 1.000:",
        TOTAL_CARTAS
    );

}

if (idsCartas.size !== TOTAL_CARTAS) {

    console.error(
        "[STOP!] Existem IDs duplicados no banco de cartas."
    );

}

if (temasCartas.size !== TOTAL_CARTAS) {

    console.warn(
        "[STOP!] Existem temas repetidos no banco de cartas."
    );

}

console.log(
    `[STOP!] ${TOTAL_CARTAS} cartas carregadas.`
);
