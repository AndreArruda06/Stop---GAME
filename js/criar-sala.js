import { criarSalaOnline } from './salas-online.js';

const form = document.getElementById('room-form');
const nickname = document.getElementById('nickname');
const roomName = document.getElementById('room-name');
const createButton = document.getElementById('create-button');
const formNote = document.getElementById('form-note');
const formStatus = document.getElementById('form-status');
const modeTag = document.getElementById('mode-tag');

// Controle da criação online

let criandoSala = false;

// Configurações iniciais e limites

const settings = {
    players: {
        value: 8,
        min: 2,
        max: 12
    },

    time: {
        value: 10,
        min: 5,
        max: 120
    },

    cards: {
        value: 10,
        min: 1,
        max: 26
    }
};

// Modalidade selecionada

const params = new URLSearchParams(window.location.search);

const mode =
    params.get('modo') ||
    sessionStorage.getItem('modo');

if (mode === 'sem-call') {
    modeTag.textContent = '⌨️ SEM CALL · por chat';
} else if (mode === 'com-call') {
    modeTag.textContent = '🎙️ COM CALL · por voz';
} else {
    modeTag.textContent = 'MODO NÃO SELECIONADO';
}

// Atualização dos seletores

function updateSettings() {

    Object.entries(settings).forEach(([key, config]) => {

        const output = document.getElementById(key);

        output.textContent =
            key === 'time'
                ? `${config.value} s`
                : config.value;

        const buttons = document.querySelectorAll(
            `[data-target="${key}"]`
        );

        buttons.forEach(button => {

            const step = Number(button.dataset.step);

            button.disabled =
                criandoSala ||
                config.value + step < config.min ||
                config.value + step > config.max;
        });
    });
}

// Botões de aumentar e diminuir

document.querySelectorAll('.stepper button').forEach(button => {

    button.addEventListener('click', () => {

        if (criandoSala) return;

        const target = button.dataset.target;
        const step = Number(button.dataset.step);

        const config = settings[target];

        config.value = Math.max(
            config.min,
            Math.min(config.max, config.value + step)
        );

        updateSettings();
    });
});

// Exibição de erros

function showError(input, message) {

    const error = document.getElementById(
        `${input.id}-error`
    );

    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');

    error.textContent = `! ${message}`;
    error.classList.add('visible');
}

// Remoção de erros

function clearError(input) {

    const error = document.getElementById(
        `${input.id}-error`
    );

    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');

    error.textContent = '';
    error.classList.remove('visible');
}

// Validação dos campos

function validateField(input) {

    const value = input.value.trim();

    if (value === '') {

        const message =
            input === nickname
                ? 'Informe seu apelido para continuar.'
                : 'O nome da sala é obrigatório.';

        showError(input, message);

        return false;
    }

    const limite = input === nickname ? 20 : 30;

    if (value.length > limite) {

        showError(
            input,
            `Utilize até ${limite} caracteres.`
        );

        return false;
    }

    clearError(input);

    return true;
}

// Controle do botão criar sala

function updateForm() {

    const validMode =
        mode === 'com-call' || mode === 'sem-call';

    const valid =
        nickname.value.trim() !== '' &&
        nickname.value.trim().length <= 20 &&
        roomName.value.trim() !== '' &&
        roomName.value.trim().length <= 30 &&
        validMode;

    createButton.disabled = !valid || criandoSala;

    if (criandoSala) {

        formNote.textContent =
            'Aguarde enquanto sua sala é criada.';

    } else if (!validMode) {

        formNote.textContent =
            'Volte e selecione uma modalidade.';

    } else if (!valid) {

        formNote.textContent =
            'Preencha os campos obrigatórios para liberar o botão.';

    } else {

        formNote.textContent =
            '* Campos obrigatórios. Depois é só compartilhar o código!';
    }
}

// Validação durante o preenchimento

[nickname, roomName].forEach(input => {

    input.addEventListener('blur', () => {
        validateField(input);
        updateForm();
    });

    input.addEventListener('input', () => {

        if (input.classList.contains('invalid')) {
            validateField(input);
        }

        formStatus.textContent = '';

        updateForm();
    });
});

// Bloqueio temporário durante a criação

function controlarCriacao(ativa) {

    criandoSala = ativa;

    nickname.disabled = ativa;

    roomName.disabled = ativa;

    form.setAttribute(
        'aria-busy',
        String(ativa)
    );

    updateSettings();

    updateForm();
}

// Envio do formulário

form.addEventListener('submit', async event => {

    event.preventDefault();

    // Impede a criação duplicada de salas.

    if (criandoSala) return;

    const validNickname = validateField(nickname);
    const validRoomName = validateField(roomName);

    if (!validNickname || !validRoomName) {
        return;
    }

    if (mode !== 'com-call' && mode !== 'sem-call') {
        return;
    }

    const roomConfig = {
        nickname: nickname.value.trim(),
        roomName: roomName.value.trim(),
        mode: mode,
        players: settings.players.value,
        time: settings.time.value,
        cards: settings.cards.value,
        privacy: 'privada'
    };

    const textoOriginal = createButton.textContent;

    controlarCriacao(true);

    createButton.textContent = 'CRIANDO SALA...';

    formStatus.textContent =
        'Conectando ao servidor...';

    try {

        // Cria a sala no Firebase.

        const salaOnline = await criarSalaOnline(
            roomConfig
        );

        // Acrescenta os dados reais da sala.

        const configuracaoCompleta = {
            ...roomConfig,
            ...salaOnline
        };

        // Armazena os dados necessários para o Lobby.

        sessionStorage.setItem(
            'roomConfig',
            JSON.stringify(configuracaoCompleta)
        );

        formStatus.textContent =
            'Sala criada com sucesso!';

        console.info(
            '[STOP!] Sala online criada:',
            configuracaoCompleta
        );

        // Redireciona o anfitrião para o Lobby.

        window.location.href = 'lobby.html';

    } catch (erro) {

        console.error(
            '[STOP!] Erro ao criar sala:',
            erro
        );

        formStatus.textContent =
            'Não foi possível criar a sala. Tente novamente.';

        createButton.textContent = textoOriginal;

        controlarCriacao(false);

    }

});

// Inicialização

updateSettings();
updateForm();