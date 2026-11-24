
const form = document.getElementById('room-form');
const nickname = document.getElementById('nickname');
const roomName = document.getElementById('room-name');
const createButton = document.getElementById('create-button');
const formNote = document.getElementById('form-note');
const formStatus = document.getElementById('form-status');
const modeTag = document.getElementById('mode-tag');

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
                config.value + step < config.min ||
                config.value + step > config.max;
        });
    });
}

// Botões de aumentar e diminuir

document.querySelectorAll('.stepper button').forEach(button => {

    button.addEventListener('click', () => {

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

    clearError(input);

    return true;
}

// Controle do botão criar sala

function updateForm() {

    const validMode =
        mode === 'com-call' || mode === 'sem-call';

    const valid =
        nickname.value.trim() !== '' &&
        roomName.value.trim() !== '' &&
        validMode;

    createButton.disabled = !valid;

    if (!validMode) {

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

// Envio do formulário

form.addEventListener('submit', event => {

    event.preventDefault();

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
        cards: settings.cards.value
    };

    sessionStorage.setItem(
        'roomConfig',
        JSON.stringify(roomConfig)
    );

    // Redireciona o anfitrião para o Lobby
    window.location.href = 'lobby.html';
});

// Inicialização

updateSettings();
updateForm();
