// Bozza Magazzino Muse: moduli dimostrativi, menu, testata, comparse allo scorrere, filtri.
// Ogni blocco è indipendente: se uno si rompe, gli altri continuano a funzionare.
(() => {
  const body = document.body;
  const movimentoRidotto = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- Moduli ----------
  // Nella bozza non inviano nulla: controllano i campi, mostrano gli errori in italiano e poi la conferma di data-bozza.
  // Vengono per primi perché senza questo blocco il browser proverebbe l'invio vero (bloccato dalla CSP).
  try {
    const oggi = new Date();
    const dataOggi = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, '0')}-${String(oggi.getDate()).padStart(2, '0')}`;
    const errori = new WeakMap();
    let contatore = 0;

    const messaggio = campo => {
      const v = campo.validity;
      if (v.valueMissing) {
        if (campo.type === 'radio') return 'Scegli una delle opzioni.';
        if (campo.type === 'checkbox') return 'Spunta la casella per continuare.';
        return campo.tagName === 'SELECT' ? 'Scegli una voce.' : 'Questo campo serve.';
      }
      if (campo.type === 'email' && v.typeMismatch) return "Scrivi un'email valida, per esempio nome@esempio.it.";
      if (campo.type === 'url' && (v.typeMismatch || v.patternMismatch)) return 'Scrivi un indirizzo che inizia con https://';
      if (v.rangeUnderflow) return campo.type === 'date' ? 'Scegli una data da oggi in poi.' : `Il numero minimo è ${campo.min}.`;
      if (v.rangeOverflow) return `Il numero massimo è ${campo.max}.`;
      if (v.tooLong) return `Puoi scrivere al massimo ${campo.maxLength} caratteri.`;
      return 'Controlla questo campo.';
    };
    const contenitore = campo => {
      if (campo.type === 'radio') return campo.closest('fieldset') || campo.parentElement;
      if (campo.type === 'checkbox') return campo.closest('fieldset') || campo.closest('label') || campo.parentElement;
      return campo.closest('.campo') || campo.parentElement;
    };
    const mostraErrore = (campo, testo) => {
      const box = contenitore(campo);
      let p = errori.get(box);
      if (!p) {
        p = document.createElement('p');
        p.className = 'errore-campo';
        p.id = `errore-${++contatore}`;
        if (box.tagName === 'LABEL') box.after(p); else box.append(p);
        errori.set(box, p);
      }
      p.textContent = testo;
      const bersaglio = box.tagName === 'FIELDSET' ? box : campo;
      bersaglio.setAttribute('aria-invalid', 'true');
      const descritto = (bersaglio.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (!descritto.includes(p.id)) bersaglio.setAttribute('aria-describedby', [...descritto, p.id].join(' '));
    };
    const togliErrore = campo => {
      const box = contenitore(campo);
      const p = errori.get(box);
      if (p) p.textContent = '';
      (box.tagName === 'FIELDSET' ? box : campo).removeAttribute('aria-invalid');
    };

    document.querySelectorAll('form[data-bozza]').forEach(modulo => {
      const esito = modulo.querySelector('.esito');
      const svuotaEsito = () => {
        if (esito && esito.textContent) {
          esito.textContent = '';
          esito.classList.remove('ok');
        }
      };
      modulo.noValidate = true;
      modulo.querySelectorAll('input[type="date"]').forEach(data => {
        if (!data.min) data.min = dataOggi;
      });
      // Segna i campi facoltativi, così si capisce quali servono davvero.
      modulo.querySelectorAll('.campo').forEach(campo => {
        const etichetta = campo.querySelector(':scope > label, :scope > legend');
        if (!etichetta || /facoltativ/i.test(etichetta.textContent) || campo.querySelector('[required]')) return;
        etichetta.insertAdjacentHTML('beforeend', ' <span class="facoltativo">(facoltativo)</span>');
      });

      modulo.addEventListener('submit', e => {
        e.preventDefault();
        svuotaEsito();
        const gruppiVisti = new Set();
        let primoErrore = null;
        [...modulo.elements].forEach(campo => {
          if (!campo.willValidate || campo.type === 'submit') return;
          if (campo.type === 'radio') {
            if (gruppiVisti.has(campo.name)) return;
            gruppiVisti.add(campo.name);
          }
          if (campo.checkValidity()) {
            togliErrore(campo);
            return;
          }
          mostraErrore(campo, messaggio(campo));
          primoErrore ??= campo;
        });
        if (primoErrore) {
          primoErrore.focus();
          return;
        }
        modulo.reset();
        if (esito) {
          esito.textContent = modulo.dataset.bozza;
          esito.classList.add('ok');
        }
      });
      // Mentre si corregge, l'errore sparisce appena il campo diventa valido.
      const ricontrolla = e => {
        svuotaEsito();
        const campo = e.target;
        if (!campo.willValidate) return;
        const segnato = campo.hasAttribute('aria-invalid') || contenitore(campo).hasAttribute('aria-invalid');
        if (segnato && campo.checkValidity()) togliErrore(campo);
      };
      modulo.addEventListener('input', ricontrolla);
      modulo.addEventListener('change', ricontrolla);
    });
  } catch (errore) {
    console.error('Moduli non attivi:', errore);
  }

  // ---------- Menu a tutto schermo (sotto i 1080px) ----------
  const testata = document.querySelector('[data-testata]');
  try {
    const bottoneMenu = document.querySelector('.menu-btn');
    const menu = document.getElementById('menu');
    if (bottoneMenu && menu) {
      const largo = window.matchMedia('(min-width: 1081px)');
      const restoPagina = () => document.querySelectorAll('main, .piede');
      const focalizzabili = () => [bottoneMenu, ...menu.querySelectorAll('a[href]')];

      const apriMenu = () => {
        menu.hidden = false;
        body.classList.add('menu-aperto');
        testata?.classList.remove('nascosta');
        restoPagina().forEach(el => { el.inert = true; });
        bottoneMenu.setAttribute('aria-expanded', 'true');
        bottoneMenu.textContent = 'Chiudi';
        menu.querySelector('a')?.focus();
      };
      const chiudiMenu = (doveFocus = bottoneMenu) => {
        if (menu.hidden) return;
        menu.hidden = true;
        body.classList.remove('menu-aperto');
        restoPagina().forEach(el => { el.inert = false; });
        bottoneMenu.setAttribute('aria-expanded', 'false');
        bottoneMenu.textContent = 'Menu';
        doveFocus?.focus();
      };

      bottoneMenu.addEventListener('click', () => (menu.hidden ? apriMenu() : chiudiMenu()));
      menu.addEventListener('click', e => {
        if (e.target.closest('a')) chiudiMenu(null);
      });
      document.addEventListener('keydown', e => {
        if (menu.hidden) return;
        if (e.key === 'Escape') {
          chiudiMenu();
          return;
        }
        // Con il menu aperto il Tab gira solo tra il bottone e le voci del menu.
        if (e.key === 'Tab') {
          const elementi = focalizzabili();
          const primo = elementi[0];
          const ultimo = elementi[elementi.length - 1];
          if (e.shiftKey && document.activeElement === primo) {
            e.preventDefault();
            ultimo.focus();
          } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault();
            primo.focus();
          } else if (!elementi.includes(document.activeElement)) {
            e.preventDefault();
            primo.focus();
          }
        }
      });
      // Se la finestra si allarga oltre il menu a tutto schermo, il menu si chiude e il focus va sul marchio.
      largo.addEventListener('change', e => {
        if (e.matches) chiudiMenu(document.querySelector('.marchio'));
      });
    }
  } catch (errore) {
    console.error('Menu non attivo:', errore);
  }

  // ---------- Testata: sopra la foto diventa piena appena si scorre; scendendo si nasconde, salendo ricompare ----------
  try {
    if (testata) {
      const sopraFoto = body.classList.contains('sopra-foto');
      let ultimaY = window.scrollY;
      let inAttesa = false;
      const aggiorna = () => {
        inAttesa = false;
        const y = window.scrollY;
        if (sopraFoto) testata.classList.toggle('solida', y > 16);
        const scende = y > ultimaY + 4;
        const sale = y < ultimaY - 4;
        const focusDentro = testata.contains(document.activeElement);
        if (body.classList.contains('menu-aperto') || focusDentro || y < 400) {
          testata.classList.remove('nascosta');
        } else if (scende) {
          testata.classList.add('nascosta');
        } else if (sale) {
          testata.classList.remove('nascosta');
        }
        if (scende || sale) ultimaY = y;
      };
      aggiorna();
      window.addEventListener('scroll', () => {
        if (!inAttesa) {
          inAttesa = true;
          requestAnimationFrame(aggiorna);
        }
      }, { passive: true });
      testata.addEventListener('focusin', () => testata.classList.remove('nascosta'));
    }
  } catch (errore) {
    console.error('Testata non attiva:', errore);
  }

  // ---------- Comparsa allo scorrere: solo gli elementi ancora fuori schermo, una volta sola ----------
  try {
    if ('IntersectionObserver' in window && !movimentoRidotto.matches) {
      const selettore = '.testa-sezione, .intestazione, .ora__griglia, .split, .carta, .opera, .scheda, .riga, .elenco-semplice > div, .passi li, .info div, .invito__corpo, .amici';
      const osservatore = new IntersectionObserver(voci => {
        voci.forEach(voce => {
          if (voce.isIntersecting) {
            voce.target.classList.add('visibile');
            osservatore.unobserve(voce.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      const altezza = window.innerHeight;
      document.querySelectorAll(selettore).forEach(el => {
        if (el.getBoundingClientRect().top < altezza * 0.9) return;
        el.classList.add('rivela');
        osservatore.observe(el);
      });
    }
  } catch (errore) {
    console.error('Comparse non attive:', errore);
  }

  // ---------- Filtri: data-filtri e data-vuoto contengono l'id della lista e del messaggio "nessun risultato" ----------
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
          const eraNascosto = el.hidden;
          el.hidden = !mostra;
          if (mostra) {
            visibili++;
            el.classList.remove('rivela');
            if (eraNascosto && !movimentoRidotto.matches && el.animate) {
              el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
            }
          }
        });
        if (vuoto) vuoto.hidden = visibili > 0;
      });
    } catch (errore) {
      console.error('Filtro non attivo:', errore);
    }
  });

  // ---------- Indice e filtri su una riga: la sfumatura a destra solo se c'è ancora da scorrere ----------
  document.querySelectorAll('.indice, .filtri').forEach(riga => {
    const aggiorna = () => riga.classList.toggle('scorre-ancora', riga.scrollLeft + riga.clientWidth < riga.scrollWidth - 2);
    aggiorna();
    riga.addEventListener('scroll', aggiorna, { passive: true });
    window.addEventListener('resize', aggiorna);
  });

  // ---------- Link che compilano un campo del modulo prima di portarci (formato, codice dell'opera, laboratorio) ----------
  document.querySelectorAll('[data-compila]').forEach(link => {
    link.addEventListener('click', () => {
      const campo = document.getElementById(link.dataset.compila);
      if (!campo) return;
      campo.value = link.dataset.valore || '';
      campo.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // ---------- Barra delle azioni sul telefono: sparisce quando il modulo di richiesta è già sullo schermo ----------
  try {
    const barra = document.querySelector('[data-barra]');
    const richiesta = document.getElementById('richiesta');
    if (barra && richiesta && 'IntersectionObserver' in window) {
      new IntersectionObserver(([voce]) => barra.classList.toggle('nascosta', voce.isIntersecting), { threshold: 0.1 }).observe(richiesta);
    }
  } catch (errore) {
    console.error('Barra non attiva:', errore);
  }
})();
