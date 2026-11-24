const parametros = new URLSearchParams(window.location.search);

const modo =
    parametros.get('modo') ||
    sessionStorage.getItem('modo');

const nomeModo = document.getElementById('nome-modo');
const iconeModo = document.getElementById('icone-modo');
const descricaoModo = document.getElementById('descricao-modo');

const criarSala = document.getElementById('criar-sala');
const entrarSala = document.getElementById('entrar-sala');

// Identificar a modalidade escolhida

if (modo === 'com-call') {

    nomeModo.textContent = 'COM CALL';
    descricaoModo.textContent = '• por voz';

    iconeModo.innerHTML = `
        <svg viewBox="0 0 32 32" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round">
            <rect x="11" y="4" width="10" height="18" rx="5"/>
            <path d="M7 15v3a9 9 0 0 0 18 0v-3M16 27v3M11 30h10"/>
        </svg>
    `;

} else if (modo === 'sem-call') {

    nomeModo.textContent = 'SEM CALL';
    descricaoModo.textContent = '• por escrito';

    iconeModo.innerHTML = `
        <svg viewBox="0 0 32 32" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round">
            <rect x="3" y="7" width="26" height="18" rx="3"/>
            <path d="M8 12h1m4 0h1m4 0h1m4 0h1M8 17h1m4 0h1m4 0h1m4 0h1M10 21h12"/>
        </svg>
    `;

} else {

    nomeModo.textContent = 'MODO NÃO SELECIONADO';
    criarSala.disabled = true;
    entrarSala.disabled = true;

}

// Salvar a modalidade

if (modo === 'com-call' || modo === 'sem-call') {

    sessionStorage.setItem('modo', modo);

}

// Navegação

criarSala.addEventListener('click', () => {

    window.location.href =
        `criar-sala.html?modo=${encodeURIComponent(modo)}`;

});

entrarSala.addEventListener('click', () => {

    window.location.href =
        `entrar-sala.html?modo=${encodeURIComponent(modo)}`;

});