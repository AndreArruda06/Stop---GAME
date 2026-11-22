(() => {
  const screen = document.getElementById('screen');
  const playModal = document.getElementById('play-modal');
  const howModal = document.getElementById('how-modal');
  const settingsModal = document.getElementById('settings-modal');
  const toast = document.getElementById('toast');

  const openDialog = (dialog) => {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  };

  document.getElementById('play-button').addEventListener('click', () => {
    openDialog(playModal);
    window.setTimeout(() => {
      document.getElementById('player-name').focus();
    }, 50);
  });

  document.getElementById('how-button').addEventListener('click', () => {
    openDialog(howModal);
  });

  document.getElementById('settings-button').addEventListener('click', () => {
    openDialog(settingsModal);
  });

  document.getElementById('continue-button').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim();
    const room = document.getElementById('room-code').value.trim();
    const feedback = document.getElementById('play-feedback');

    if (!name) {
      feedback.textContent = 'Digite seu nome para continuar.';
      document.getElementById('player-name').focus();
      return;
    }

    // Integração futura com criação e entrada de salas.
    const roomMessage = room
      ? ` Sala informada: ${room.toUpperCase()}.`
      : ' Você poderá criar uma sala na próxima etapa.';

    feedback.textContent = `Tudo certo, ${name}!${roomMessage}`;
  });

  document.getElementById('motion-toggle').addEventListener('change', (event) => {
    screen.classList.toggle('motion-off', !event.currentTarget.checked);
  });

  document.getElementById('sound-toggle').addEventListener('change', (event) => {
    showToast(
      event.currentTarget.checked
        ? 'Efeitos sonoros ativados para quando forem conectados ao jogo.'
        : 'Efeitos sonoros desativados.'
    );
  });

  let toastTimeout;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');

    window.clearTimeout(toastTimeout);

    toastTimeout = window.setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  }

  // Fecha os modais ao clicar no fundo escurecido.
  [playModal, howModal, settingsModal].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
  });

  // Respeita a preferência de acessibilidade do navegador.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    screen.classList.add('motion-off');
    document.getElementById('motion-toggle').checked = false;
  }
})();