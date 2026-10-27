/**
 * The Minimo Company — Main Scripts
 */

(function () {
  'use strict';

  /* -----------------------------------------------------------
     Page load sequence
     ----------------------------------------------------------- */
  function initPageLoad() {
    document.body.classList.add('loaded');
    document.body.classList.remove('loading');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPageLoad);
  } else {
    initPageLoad();
  }

  /* -----------------------------------------------------------
     Navigation scroll state
     ----------------------------------------------------------- */
  const navbar = document.getElementById('navbar');

  function updateNav() {
    const y = window.scrollY;
    if (y > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* -----------------------------------------------------------
     Mobile menu toggle
     ----------------------------------------------------------- */
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      navbar.classList.toggle('menu-open', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when a link is clicked
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        navbar.classList.remove('menu-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Close menu when clicking outside (on the overlay background)
    navMenu.addEventListener('click', (e) => {
      if (e.target === navMenu) {
        navMenu.classList.remove('open');
        navbar.classList.remove('menu-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* -----------------------------------------------------------
     Scroll reveal (IntersectionObserver)
     ----------------------------------------------------------- */
  const revealElements = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    // Fallback for older browsers
    revealElements.forEach((el) => el.classList.add('visible'));
  }

  /* -----------------------------------------------------------
     Lightbox with prev/next navigation
     ----------------------------------------------------------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('img');
  const lightboxClose = lightbox.querySelector('.lightbox-close');
  const lightboxPrev = lightbox.querySelector('.lightbox-prev');
  const lightboxNext = lightbox.querySelector('.lightbox-next');
  const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
  const heroImageEl = document.querySelector('#project .hero-image');
  if (heroImageEl) {
    galleryItems.unshift(heroImageEl);
  }

  let currentIndex = 0;

  // Detect WebP support once
  const webpSupported = (() => {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  })();

  const MOBILE_BREAKPOINT = 768;

  function isMobileViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function getPreferredSrc(item) {
    if (isMobileViewport()) {
      return webpSupported ? item.dataset.mobile : item.dataset.mobileFallback;
    }
    return webpSupported ? item.dataset.full : item.dataset.fullFallback;
  }

  function getFallbackSrc(item) {
    if (isMobileViewport()) {
      return item.dataset.mobileFallback;
    }
    return item.dataset.fullFallback;
  }

  function preloadImage(item) {
    const src = getPreferredSrc(item);
    if (!src) return Promise.resolve();
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.decode().then(resolve).catch(resolve);
    });
  }

  function preloadAdjacent(index) {
    const prev = (index - 1 + galleryItems.length) % galleryItems.length;
    const next = (index + 1) % galleryItems.length;
    preloadImage(galleryItems[prev]);
    preloadImage(galleryItems[next]);
  }

  function preloadAlbum(centerIndex) {
    // Build a list radiating outward from centerIndex (closest first)
    const ordered = [];
    const len = galleryItems.length;
    for (let distance = 2; distance < len; distance++) {
      ordered.push((centerIndex - distance + len) % len);
      ordered.push((centerIndex + distance) % len);
    }

    let i = 0;
    function loadNext() {
      if (i >= ordered.length) return;
      const item = galleryItems[ordered[i]];
      i++;
      preloadImage(item).then(() => {
        // Yield to the browser between loads so scrolling stays smooth
        if (window.requestIdleCallback) {
          requestIdleCallback(loadNext, { timeout: 2000 });
        } else {
          setTimeout(loadNext, 50);
        }
      });
    }
    loadNext();
  }

  function showImage(index) {
    if (index < 0) {
      currentIndex = galleryItems.length - 1;
    } else if (index >= galleryItems.length) {
      currentIndex = 0;
    } else {
      currentIndex = index;
    }

    const item = galleryItems[currentIndex];
    const img = item.querySelector('img');
    const preferredSrc = getPreferredSrc(item);
    const fallbackSrc = getFallbackSrc(item);

    lightboxImg.onerror = null;
    if (preferredSrc) {
      lightboxImg.src = preferredSrc;
      // Fallback to JPG if WebP fails for any reason
      if (webpSupported && fallbackSrc) {
        lightboxImg.onerror = () => {
          lightboxImg.onerror = null;
          lightboxImg.src = fallbackSrc;
        };
      }
    }
    if (img) {
      lightboxImg.alt = img.alt || '';
    }

    preloadAdjacent(currentIndex);
    if (!isMobileViewport()) {
      preloadAlbum(currentIndex);
    }
  }

  function openLightbox(index) {
    showImage(index);
    lightbox.hidden = false;
    // Force reflow
    void lightbox.offsetWidth;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
      lightbox.hidden = true;
      lightboxImg.src = '';
    }, 400);
  }

  function prevImage() {
    showImage(currentIndex - 1);
  }

  function nextImage() {
    showImage(currentIndex + 1);
  }

  galleryItems.forEach((item, index) => {
    const img = item.querySelector('img');

    item.addEventListener('click', () => {
      if (img) openLightbox(index);
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (img) openLightbox(index);
      }
    });
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', (e) => {
    e.stopPropagation();
    prevImage();
  });
  lightboxNext.addEventListener('click', (e) => {
    e.stopPropagation();
    nextImage();
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;

    switch (e.key) {
      case 'Escape':
        closeLightbox();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevImage();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextImage();
        break;
    }
  });

  /* -----------------------------------------------------------
     Smooth scroll offset for fixed nav
     ----------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      const navHeight = navbar.offsetHeight;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth',
      });
    });
  });

})();
