(function () {
  'use strict';

  /* ============================================================
     PRELOADER
     ============================================================ */
  const preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => preloader.classList.add('hidden'), 300);
    });
    // Safety net in case 'load' already fired or is slow
    setTimeout(() => preloader.classList.add('hidden'), 2500);
  }

  /* ============================================================
     SCROLL PROGRESS BAR
     ============================================================ */
  const scrollProgress = document.getElementById('scrollProgress');
  if (scrollProgress) {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      scrollProgress.style.width = pct + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  /* ============================================================
     CURSOR SPOTLIGHT (decorative glow following the pointer)
     ============================================================ */
  const spotlight = document.getElementById('cursorSpotlight');
  if (spotlight && window.matchMedia('(hover: hover)').matches) {
    let sx = 0, sy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      spotlight.classList.add('active');
    });
    document.addEventListener('mouseleave', () => spotlight.classList.remove('active'));
    (function loop() {
      sx += (tx - sx) * 0.12;
      sy += (ty - sy) * 0.12;
      spotlight.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();
  }

  /* ============================================================
     BACK TO TOP BUTTON
     ============================================================ */
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ============================================================
     ANIMATED COUNT-UP STATS (hero numbers)
     ============================================================ */
  const counters = document.querySelectorAll('.counter');
  if (counters.length && 'IntersectionObserver' in window) {
    const runCounter = (el) => {
      const target = parseFloat(el.dataset.count) || 0;
      const decimals = parseInt(el.dataset.decimal, 10) || 0;
      const duration = 1400;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
        const value = target * eased;
        el.textContent = decimals ? value.toFixed(decimals) : Math.round(value);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => counterObserver.observe(c));
  }

  /* ============================================================
     3D TILT + SPOTLIGHT ON EMPLOYEE / PROFILE CARDS
     ============================================================ */
  function wireTiltCards() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    document.querySelectorAll('.tilt-card').forEach((card) => {
      if (card.dataset.tiltWired) return;
      card.dataset.tiltWired = 'true';
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const midX = rect.width / 2;
        const midY = rect.height / 2;
        const rotateX = ((y - midY) / midY) * -4;
        const rotateY = ((x - midX) / midX) * 4;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        card.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--my', `${(y / rect.height) * 100}%`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }
  wireTiltCards();

  /* ============================================================
     RIPPLE EFFECT ON BUTTONS
     ============================================================ */
  document.querySelectorAll('.btn').forEach((btn) => {
    btn.addEventListener('click', function (e) {
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      ripple.className = 'ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 650);
    });
  });

  /* ============================================================
     FEATURED CAROUSEL CONTROLS
     ============================================================ */
  const track = document.getElementById('carouselTrack');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  if (track && prevBtn && nextBtn) {
    const scrollAmount = () => track.querySelector('.spotlight-card')?.offsetWidth + 18 || 240;
    prevBtn.addEventListener('click', () => track.scrollBy({ left: -scrollAmount() * 2, behavior: 'smooth' }));
    nextBtn.addEventListener('click', () => track.scrollBy({ left: scrollAmount() * 2, behavior: 'smooth' }));

    // gentle autoplay, pauses on hover/touch
    let autoplay = setInterval(() => {
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
      track.scrollBy({ left: atEnd ? -track.scrollLeft : scrollAmount(), behavior: 'smooth' });
    }, 3800);
    ['mouseenter', 'touchstart'].forEach((evt) => track.addEventListener(evt, () => clearInterval(autoplay)));
  }

  /* ============================================================
     SMOOTH PAGE-TRANSITION FADE for internal navigation
     ============================================================ */
  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    let url;
    try { url = new URL(href, window.location.origin); } catch (e) { return; }
    if (url.origin !== window.location.origin) return;

    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      document.body.classList.add('page-exit');
      setTimeout(() => { window.location.href = href; }, 220);
    });
  });

  /* ============================================================
     TOASTS - auto dismiss + manual close
     ============================================================ */
  function wireToasts() {
    document.querySelectorAll('.toast[data-autohide]').forEach((toast) => {
      const closeBtn = toast.querySelector('.toast-close');
      const remove = () => {
        toast.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 280);
      };
      if (closeBtn) closeBtn.addEventListener('click', remove);
      setTimeout(remove, 4500);
    });
  }
  wireToasts();

  /* ============================================================
     SCROLL REVEAL for elements appearing later
     ============================================================ */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = 'running';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
  }

  /* ============================================================
     VIEW TOGGLE (grid / list) - directory page only
     ============================================================ */
  const grid = document.getElementById('employeeGrid');
  const viewButtons = document.querySelectorAll('.view-btn');
  if (grid && viewButtons.length) {
    viewButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        viewButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        grid.classList.toggle('list-mode', view === 'list');
        grid.dataset.view = view;
        const url = new URL(window.location);
        url.searchParams.set('view', view);
        window.history.replaceState({}, '', url);
      });
    });
  }

  /* ============================================================
     LIVE AJAX SEARCH & FILTER - directory page only
     ============================================================ */
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');
  const departmentFilter = document.getElementById('departmentFilter');
  const statusFilter = document.getElementById('statusFilter');
  const sortSelect = document.getElementById('sortSelect');
  const resultCount = document.getElementById('resultCount');

  function statusLabel(s) {
    return { active: 'active', on_leave: 'on leave', inactive: 'inactive' }[s] || s;
  }

  function renderEmployeeCard(emp, index) {
    const avatar = emp.avatar_url || `https://ui-avatars.com/api/?background=6366f1&color=fff&name=${encodeURIComponent(emp.full_name)}`;
    const badge = emp.department_name
      ? `<span class="dept-badge" style="--badge-color:${emp.department_color}">${emp.department_name}</span>`
      : '';
    return `
      <a href="/employee/${emp.id}" class="employee-card tilt-card fade-up" data-emp-id="${emp.id}" style="animation-delay:${Math.min(index * 0.05, 0.5)}s">
        <div class="card-spotlight"></div>
        <button class="fav-btn" data-id="${emp.id}" aria-label="Save to favorites" onclick="event.preventDefault(); event.stopPropagation(); window.toggleFavorite(this);">
          <svg class="icon icon-sm"><use href="#icon-heart"></use></svg>
        </button>
        <div class="card-top">
          <img src="${avatar}" alt="${emp.full_name}" class="avatar" loading="lazy">
          <span class="status-dot status-${emp.status}" title="${statusLabel(emp.status)}"></span>
        </div>
        <h3 class="emp-name">${emp.full_name}</h3>
        <p class="emp-role">${emp.job_title || 'Team Member'}</p>
        ${badge}
        <div class="card-footer">
          <span class="emp-location"><svg class="icon icon-sm"><use href="#icon-pin"></use></svg> ${emp.location || '—'}</span>
          <svg class="icon icon-sm card-arrow"><use href="#icon-arrow-right"></use></svg>
        </div>
      </a>`;
  }

  function showSkeletons() {
    grid.innerHTML = Array.from({ length: 6 })
      .map(() => '<div class="skeleton-card"></div>')
      .join('');
  }

  let debounceTimer;
  async function fetchAndRender() {
    if (!grid) return;
    showSkeletons();

    const params = new URLSearchParams({
      q: searchInput ? searchInput.value : '',
      department: departmentFilter ? departmentFilter.value : '',
      status: statusFilter ? statusFilter.value : '',
      sort: sortSelect ? sortSelect.value : 'name_asc',
    });

    try {
      const res = await fetch(`/api/employees?${params.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error('Request failed');

      if (resultCount) {
        resultCount.innerHTML = `<strong>${data.total}</strong> team member${data.total === 1 ? '' : 's'} found`;
      }

      if (!data.employees.length) {
        grid.innerHTML = `
          <div class="empty-state fade-up">
            <svg class="icon" style="width:44px;height:44px;color:var(--text-muted);"><use href="#icon-search"></use></svg>
            <h3>No employees match your search</h3>
            <p>Try adjusting your filters or search terms.</p>
          </div>`;
        return;
      }

      grid.innerHTML = data.employees.map(renderEmployeeCard).join('');
      applyFavoriteStates();
      wireTiltCards();
      applyFavoriteChipFilter();

      // update URL so the page is shareable/bookmarkable
      const url = new URL(window.location);
      Object.entries({ q: params.get('q'), department: params.get('department'), status: params.get('status'), sort: params.get('sort') })
        .forEach(([k, v]) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k)));
      window.history.replaceState({}, '', url);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state fade-up"><svg class="icon" style="width:44px;height:44px;color:var(--danger);"><use href="#icon-alert"></use></svg><h3>Something went wrong</h3><p>Please try again.</p></div>`;
    }
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => e.preventDefault());

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchAndRender, 350);
      });
    }
    [departmentFilter, statusFilter, sortSelect].forEach((el) => {
      if (el) el.addEventListener('change', fetchAndRender);
    });
  }

  /* ============================================================
     FAVORITES (heart toggle, persisted in localStorage)
     ============================================================ */
  const FAV_KEY = 'td_favorites';
  function getFavorites() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; }
  }
  function saveFavorites(list) {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  }
  function applyFavoriteStates() {
    const favs = getFavorites().map(String);
    document.querySelectorAll('.fav-btn').forEach((btn) => {
      btn.classList.toggle('active', favs.includes(String(btn.dataset.id)));
    });
    const favChipCount = document.getElementById('favChipCount');
    if (favChipCount) favChipCount.textContent = favs.length;
  }
  window.toggleFavorite = function (btn) {
    const id = String(btn.dataset.id);
    let favs = getFavorites().map(String);
    if (favs.includes(id)) {
      favs = favs.filter((f) => f !== id);
      btn.classList.remove('active');
    } else {
      favs.push(id);
      btn.classList.add('active');
    }
    saveFavorites(favs);
    applyFavoriteStates();
  };
  applyFavoriteStates();

  const favChip = document.getElementById('favChip');
  function applyFavoriteChipFilter() {
    if (!favChip || favChip.dataset.active !== 'true') return;
    const favs = getFavorites().map(String);
    document.querySelectorAll('#employeeGrid .employee-card').forEach((card) => {
      card.style.display = favs.includes(String(card.dataset.empId)) ? '' : 'none';
    });
  }
  if (favChip) {
    favChip.addEventListener('click', () => {
      const isActive = favChip.dataset.active === 'true';
      favChip.dataset.active = (!isActive).toString();
      favChip.classList.toggle('active', !isActive);
      if (!isActive) {
        applyFavoriteChipFilter();
      } else {
        document.querySelectorAll('#employeeGrid .employee-card').forEach((card) => { card.style.display = ''; });
      }
    });
  }

  /* ============================================================
     TEAM INSIGHTS BAR ANIMATION
     ============================================================ */
  if ('IntersectionObserver' in window) {
    const insightObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.width = entry.target.dataset.target + '%';
          insightObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    document.querySelectorAll('.insight-fill').forEach((bar) => insightObserver.observe(bar));
  }

  /* ============================================================
     KEYBOARD SHORTCUT: "/" focuses search
     ============================================================ */
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && searchInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ============================================================
     COPY TO CLIPBOARD (profile page email / share link)
     ============================================================ */
  function showMiniToast(message) {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.innerHTML = `<svg class="icon icon-md toast-icon"><use href="#icon-check-circle"></use></svg><span>${message}</span>`;
    stack.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'fadeIn 0.3s ease reverse'; setTimeout(() => toast.remove(), 280); }, 2200);
  }

  document.querySelectorAll('.copy-btn[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.classList.add('copied');
        showMiniToast('Copied to clipboard');
        setTimeout(() => btn.classList.remove('copied'), 1500);
      } catch (e) { /* clipboard unavailable — silently ignore */ }
    });
  });

  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const fullUrl = window.location.origin + shareBtn.dataset.url;
      try {
        await navigator.clipboard.writeText(fullUrl);
        showMiniToast('Profile link copied');
      } catch (e) {
        showMiniToast('Could not copy link');
      }
    });
  }
})();
