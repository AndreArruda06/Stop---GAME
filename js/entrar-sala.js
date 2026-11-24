const form = document.getElementById('join-form');
const nickname = document.getElementById('nickname');
const roomCode = document.getElementById('room-code');
const joinButton = document.getElementById('join-button');
const formStatus = document.getElementById('form-status');
const modeTag = document.getElementById('mode-tag');

// Modalidade selecionada

const params = new URLSearchParams(window.location.search);

const mode =
    params.get('modo') ||
    sessionStorage.getItem('modo');

const validMode =
    mode === 'com-call' || mode === 'sem-call';

if (mode === 'com-call') {

    modeTag.textContent = '🎙️ COM CALL · por voz';

} else if (mode === 'sem-call') {

    modeTag.textContent = '⌨️ SEM CALL · por chat';

} else {

    modeTag.textContent = 'MODO NÃO SELECIONADO';

    formStatus.textContent =
        'Volte e selecione uma modalidade.';
}

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

// Validação do apelido

function validateNickname() {

    const value = nickname.value.trim();

    if (value === '') {

        showError(
            nickname,
            'Informe seu apelido para continuar.'
        );

        return false;
    }

    if (value.length > 20) {

        showError(
            nickname,
            'Use no máximo 20 caracteres.'
        );

        return false;
    }

    clearError(nickname);

    return true;
}

// Validação do código da sala

function validateRoomCode() {

    const code = roomCode.value;

    if (code === '') {

        showError(
            roomCode,
            'Informe o código da sala.'
        );

        return false;
    }

    if (!/^[A-Z0-9]{6}$/.test(code)) {

        showError(
            roomCode,
            'Use 6 letras e números, sem espaços.'
        );

        return false;
    }

    clearError(roomCode);

    return true;
}

// Controle do botão entrar na sala

function updateForm() {

    const validNickname =
        nickname.value.trim() !== '' &&
        nickname.value.trim().length <= 20;

    const validCode =
        /^[A-Z0-9]{6}$/.test(roomCode.value);

    joinButton.disabled =
        !validNickname ||
        !validCode ||
        !validMode;
}

// Validação durante o preenchimento do apelido

nickname.addEventListener('input', () => {

    if (nickname.classList.contains('invalid')) {
        validateNickname();
    }

    if (validMode) {
        formStatus.textContent = '';
    }

    updateForm();
});

nickname.addEventListener('blur', () => {

    validateNickname();

    updateForm();
});

// Validação durante o preenchimento do código

roomCode.addEventListener('input', () => {

    // Converte automaticamente para maiúsculas

    roomCode.value = roomCode.value.toUpperCase();

    if (roomCode.classList.contains('invalid')) {
        validateRoomCode();
    }

    if (validMode) {
        formStatus.textContent = '';
    }

    updateForm();
});

roomCode.addEventListener('blur', () => {

    validateRoomCode();

    updateForm();
});

// Envio do formulário

form.addEventListener('submit', event => {

    event.preventDefault();

    const validNickname = validateNickname();
    const validCode = validateRoomCode();

    if (!validNickname || !validCode || !validMode) {
        return;
    }

    const joinConfig = {
        nickname: nickname.value.trim(),
        roomCode: roomCode.value,
        mode: mode
    };

    sessionStorage.setItem(
        'joinConfig',
        JSON.stringify(joinConfig)
    );

    formStatus.textContent =
        'Dados salvos! Entrada online ainda não disponível.';
});

// Inicialização

updateForm();