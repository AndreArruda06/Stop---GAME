document.querySelectorAll('[data-modo]').forEach((botao) => {
  botao.addEventListener('click', () => {
    const modo = botao.dataset.modo;

    // Salva o modo escolhido.
    sessionStorage.setItem('modo', modo);

    // Redireciona para a tela de salas.
    window.location.href = `salas.html?modo=${modo}`;
  });
});