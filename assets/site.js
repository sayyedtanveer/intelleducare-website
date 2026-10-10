(() => {
  'use strict';

  const menuToggle = document.getElementById('menuToggle');
  const primaryNav = document.getElementById('primaryNav');

  if (menuToggle && primaryNav) {
    const setMenu = (isOpen) => {
      primaryNav.classList.toggle('open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    };

    menuToggle.addEventListener('click', () => {
      setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });

    primaryNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => setMenu(false));
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setMenu(false);
    });

    document.addEventListener('click', (event) => {
      if (menuToggle.getAttribute('aria-expanded') === 'true' &&
          !primaryNav.contains(event.target) && !menuToggle.contains(event.target)) {
        setMenu(false);
      }
    });
  }

  // Pointer-based depth is only enabled for fine pointers and respects reduced motion.
  const heroArt = document.getElementById('heroArt');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (heroArt && finePointer && !reduceMotion) {
    let framePending = false;
    let pointerX = 0;
    let pointerY = 0;
    heroArt.addEventListener('pointermove', (event) => {
      const bounds = heroArt.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 3.5;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2.5;
      if (framePending) return;
      framePending = true;
      window.requestAnimationFrame(() => {
        heroArt.style.transform = `rotateY(${pointerX}deg) rotateX(${pointerY}deg)`;
        framePending = false;
      });
    });
    heroArt.addEventListener('pointerleave', () => {
      heroArt.style.transform = 'rotateY(0deg) rotateX(0deg)';
    });
  }

  // FAQ accordion: one item open at a time for predictable keyboard and screen-reader behaviour.
  document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
      const wasExpanded = button.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.faq-question').forEach((otherButton) => {
        otherButton.setAttribute('aria-expanded', 'false');
        const answer = otherButton.closest('.faq-item')?.querySelector('.faq-answer');
        if (answer) answer.hidden = true;
      });
      button.setAttribute('aria-expanded', String(!wasExpanded));
      const answer = button.closest('.faq-item')?.querySelector('.faq-answer');
      if (answer) answer.hidden = wasExpanded;
    });
  });

  // Program cards can prefill the form so the admissions team receives useful context.
  document.querySelectorAll('.enquiry-prefill').forEach((link) => {
    link.addEventListener('click', () => {
      const message = document.getElementById('message');
      const program = link.getAttribute('data-program');
      if (message && program && !message.value.trim()) {
        message.value = `I would like to know more about ${program}.`;
      }
    });
  });

  const form = document.getElementById('enquiryForm');
  const status = document.getElementById('formStatus');
  const submitButton = document.getElementById('submitButton');

  const displayStatus = (message, kind) => {
    if (!status) return;
    status.textContent = message;
    status.className = `form-status show ${kind}`;
  };

  if (form && status && submitButton) {
    form.addEventListener('input', (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
        event.target.removeAttribute('aria-invalid');
      }
      if (status.classList.contains('error')) status.className = 'form-status';
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        const firstInvalid = form.querySelector(':invalid');
        firstInvalid?.setAttribute('aria-invalid', 'true');
        return;
      }

      const payload = Object.fromEntries(new FormData(form).entries());
      payload.consent = document.getElementById('consent')?.checked === true;
      const label = submitButton.querySelector('.submit-label');
      submitButton.disabled = true;
      if (label) label.textContent = 'Sending…';
      submitButton.setAttribute('aria-busy', 'true');
      status.className = 'form-status';
      status.textContent = '';

      try {
        const response = await fetch('/api/enquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'same-origin'
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const friendlyMessage = result && typeof result.message === 'string' ? result.message : '';
          throw new Error(friendlyMessage || 'The enquiry could not be sent right now.');
        }
        form.reset();
        displayStatus('Thank you — your enquiry has been sent to the IntellEducare team. We’ll use the contact details you provided to follow up.', 'success');
      } catch (error) {
        displayStatus(`${error.message || 'We could not send your enquiry.'} You can email Info@intelleducare.com directly instead.`, 'error');
      } finally {
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
        if (label) label.textContent = 'Send Enquiry';
      }
    });
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // If IntersectionObserver is unavailable, content remains visible rather than hidden.
  const revealItems = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealItems.forEach((item) => item.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -25px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  }
})();
