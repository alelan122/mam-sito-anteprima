// Bozza Magazzino Muse: moduli dimostrativi, menu, testata della home e filtri.
// Ogni blocco è indipendente: se uno si rompe, gli altri continuano a funzionare.
(() => {
  const body = document.body;

  // Moduli: nella bozza non inviano nulla, mostrano solo la conferma scritta in data-bozza.
  // Vengono per primi perché senza questo blocco il browser proverebbe l'invio vero (bloccato dalla CSP).
  document.querySelectorAll('form[data-bozza]').forEach(modulo => {
    const esito = modulo.querySelector('.esito');
    modulo.addEventListener('submit', e => {
      e.preventDefault();
      if (!modulo.checkValidity()) {
        modulo.reportValidity();
        return;
      }
      if (esito) {
        esito.textContent = modulo.dataset.bozza;
        esito.classList.add('ok');
      }
    });
  });

  // Menu a tutto schermo.
  try {
    const bottoneMenu = document.querySelector('.menu-btn');
    const menu = document.getElementById('menu');
    if (bottoneMenu && menu) {
      const apriMenu = () => {
        menu.hidden = false;
        body.classList.add('menu-aperto');
        bottoneMenu.setAttribute('aria-expanded', 'true');
        bottoneMenu.textContent = 'Chiudi';
        menu.querySelector('a')?.focus();
      };
      const chiudiMenu = (rimettiFocus = true) => {
        menu.hidden = true;
        body.classList.remove('menu-aperto');
        bottoneMenu.setAttribute('aria-expanded', 'false');
        bottoneMenu.textContent = 'Menu';
        if (rimettiFocus) bottoneMenu.focus();
      };
      bottoneMenu.addEventListener('click', () => (menu.hidden ? apriMenu() : chiudiMenu()));
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !menu.hidden) chiudiMenu();
      });
      menu.addEventListener('click', e => {
        if (e.target.closest('a')) chiudiMenu(false);
      });
    }
  } catch (errore) {
    console.error('Menu non attivo:', errore);
  }

  // Sulla home la testata resta trasparente sopra la foto e diventa piena quando la foto finisce.
  try {
    const testata = document.querySelector('[data-testata]');
    const hero = document.querySelector('.hero');
    if (body.classList.contains('home') && hero && testata) {
      const aggiorna = () => testata.classList.toggle('solida', hero.getBoundingClientRect().bottom <= testata.offsetHeight);
      aggiorna();
      window.addEventListener('scroll', aggiorna, { passive: true });
      window.addEventListener('resize', aggiorna);
    }
  } catch (errore) {
    console.error('Testata non attiva:', errore);
  }

  // Filtri: data-filtri e data-vuoto contengono l'id della lista e del messaggio "nessun risultato".
  document.querySelectorAll('[data-filtri]').forEach(gruppo => {
    try {
      const lista = document.getElementById(gruppo.dataset.filtri);
      const vuoto = gruppo.dataset.vuoto ? document.getElementById(gruppo.dataset.vuoto) : null;
      if (!lista) return;
      const elementi = [...lista.querySelectorAll('[data-tipo]')];

      gruppo.addEventListener('click', e => {
        const scelto = e.target.closest('button[data-valore]');
        if (!scelto) return;
        gruppo.querySelectorAll('button[data-valore]').forEach(b => b.setAttribute('aria-pressed', String(b === scelto)));
        const valore = scelto.dataset.valore;
        let visibili = 0;
        elementi.forEach(el => {
          const mostra = valore === 'tutto' || el.dataset.tipo.split(' ').includes(valore);
          el.hidden = !mostra;
          if (mostra) visibili++;
        });
        if (vuoto) vuoto.hidden = visibili > 0;
      });
    } catch (errore) {
      console.error('Filtro non attivo:', errore);
    }
  });
})();
