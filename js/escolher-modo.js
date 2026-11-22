document.querySelectorAll('[data-modo]').forEach((botao) => {
  botao.addEventListener('click', () => {
    const modo = botao.dataset.modo;
    // Ajuste os nomes abaixo quando criar as telas de cada modo.
    const paginas = {
      'com-call': 'com-call.html',
      'sem-call': 'sem-call.html'
    };
    window.location.href = paginas[modo];
  });
});
