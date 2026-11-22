
(() => {
  // Elementos principais
  const screen = document.getElementById('screen');
  const howModal = document.getElementById('how-modal');
  const settingsModal = document.getElementById('settings-modal');
  const toast = document.getElementById('toast');

  const howButton = document.getElementById('how-button');
  const settingsButton = document.getElementById('settings-button');

  const motionToggle = document.getElementById('motion-toggle');
  const soundToggle = document.getElementById('sound-toggle');

  // ========================================
  // ABRIR JANELAS
  // ========================================

  howButton.addEventListener('click', () => {
    howModal.showModal();
  });

  settingsButton.addEventListener('click', () => {
    settingsModal.showModal();
  });

  // ========================================
  // FECHAR JANELAS CLICANDO FORA
  // ========================================

  [howModal, settingsModal].forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.close();
      }
    });
  });

  // ========================================
  // CONFIGURAÇÃO DAS ANIMAÇÕES
  // ========================================

  motionToggle.addEventListener('change', () => {
    const enabled = motionToggle.checked;

    screen.classList.toggle('motion-off', !enabled);
  });

  // ========================================
  // CONFIGURAÇÃO DOS EFEITOS SONOROS
  // ========================================

  soundToggle.addEventListener('change', () => {
    const enabled = soundToggle.checked;

    showToast(
      enabled
        ? 'Efeitos sonoros ativados para quando estiverem disponíveis.'
        : 'Efeitos sonoros desativados.'
    );
  });

  // ========================================
  // MENSAGENS DE CONFIRMAÇÃO
  // ========================================

  let toastTimeout;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2600);
  }

  // ========================================
  // ACESSIBILIDADE
  // ========================================

  // Respeita a preferência de movimento do navegador
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    screen.classList.add('motion-off');
    motionToggle.checked = false;
  }

})();
