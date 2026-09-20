// ===== MOBILE MENU =====
const hamburger = document.getElementById('hamburgerBtn');
const mobileMenu = document.getElementById('mobileMenu');

if (hamburger && mobileMenu) {
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', String(mobileMenu.classList.contains('open')));
  });
}

// ===== STICKY HEADER =====
const header = document.getElementById('mainHeader');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  if (currentScroll > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
  lastScroll = currentScroll;
});

// ===== BACK TO TOP =====
const backTop = document.getElementById('backTop');
window.addEventListener('scroll', () => {
  if (window.pageYOffset > 400) {
    backTop.classList.add('visible');
  } else {
    backTop.classList.remove('visible');
  }
});
if (backTop) {
  backTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ===== SCROLL REVEAL (Apple-style animations) =====
const revealElements = document.querySelectorAll(
  '.service-card, .project-card, .why-grid > div, .workflow-steps div, .dual-card, .intro-grid > div'
);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, index) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, index * 100);
    }
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -50px 0px'
});

revealElements.forEach((el, index) => {
  el.classList.add('reveal');
  el.style.transitionDelay = `${index * 0.05}s`;
  revealObserver.observe(el);
});

// ===== CONTACT FORM =====
// The enquiry form posts directly to FormSubmit.

// ===== SENT CONFIRMATION BANNER =====
// When FormSubmit redirects back with ?sent=1, reveal the confirmation
// banner, scroll to it, and strip the query string so a refresh doesn't
// re-show it.
(function () {
  const params = new URLSearchParams(window.location.search);
  if (params.get('sent') !== '1') return;

  const banner = document.getElementById('sentBanner');
  if (!banner) return;

  banner.classList.add('is-visible');
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' });

  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname + '#contactForm');
  }
})();

// ===== CLOSE MOBILE MENU ON LINK CLICK =====
document.querySelectorAll('.mobile-menu a').forEach(link => {
  link.addEventListener('click', () => {
    if (mobileMenu) {
      mobileMenu.classList.remove('open');
      if (hamburger) {
        hamburger.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    }
  });
});

// ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});