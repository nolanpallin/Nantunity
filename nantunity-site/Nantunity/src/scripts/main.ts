/* Interactions globales du site Nant'Unity — légères, sans dépendance. */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

/* ---------- Apparition au défilement ---------- */
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>("[data-reveal], .lines");
  // Indexation automatique des lignes de titre
  document.querySelectorAll<HTMLElement>(".lines").forEach((block) => {
    block.querySelectorAll<HTMLElement>(":scope > .line > span").forEach((s, i) => s.style.setProperty("--i", String(i)));
  });
  if (reduceMotion || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- En-tête : fond au défilement, masqué en descendant ---------- */
function initHeader() {
  const hdr = document.querySelector<HTMLElement>("[data-header]");
  if (!hdr) return;
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    hdr.classList.toggle("is-scrolled", y > 40);
    const menuOpen = document.body.classList.contains("menu-open");
    hdr.classList.toggle("is-hidden", !menuOpen && y > 400 && y > lastY + 4);
    if (y < lastY - 4 || y < 400) hdr.classList.remove("is-hidden");
    lastY = y;
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

/* ---------- Menu mobile ---------- */
function initMenu() {
  const btn = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const menu = document.querySelector<HTMLElement>("[data-menu]");
  if (!btn || !menu) return;
  const label = btn.querySelector(".visually-hidden");
  const setOpen = (open: boolean) => {
    btn.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = (open ? btn.dataset.labelClose : btn.dataset.labelOpen) || "";
    document.body.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add("is-open"));
      menu.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
    } else {
      menu.classList.remove("is-open");
      setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 700);
    }
  };
  btn.addEventListener("click", () => setOpen(btn.getAttribute("aria-expanded") !== "true"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { setOpen(false); btn.focus(); }
  });
  window.matchMedia("(min-width: 1041px)").addEventListener("change", (e) => e.matches && setOpen(false));
}

/* ---------- Boutons magnétiques ---------- */
function initMagnetic() {
  if (reduceMotion || !finePointer) return;
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    const strength = 0.28;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * strength;
      const y = (e.clientY - r.top - r.height / 2) * strength;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ---------- Parallaxe légère ---------- */
function initParallax() {
  const els = document.querySelectorAll<HTMLElement>("[data-parallax]");
  if (reduceMotion || !els.length) return;
  let ticking = false;
  const update = () => {
    const vh = window.innerHeight;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const speed = parseFloat(el.dataset.parallax || "0.1");
      const offset = (r.top + r.height / 2 - vh / 2) * -speed;
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    });
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}

/* ---------- Suivi du curseur sur les cartes (halo) ---------- */
function initSpotlight() {
  if (!finePointer) return;
  document.querySelectorAll<HTMLElement>("[data-spotlight]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/* ---------- Thème clair / sombre ---------- */
function initTheme() {
  const root = document.documentElement;
  const btns = document.querySelectorAll<HTMLButtonElement>("[data-theme-toggle]");
  const sync = () => btns.forEach((b) => {
    const dark = root.dataset.theme === "dark";
    b.setAttribute("aria-label", (dark ? b.dataset.labelLight : b.dataset.labelDark) || "");
    b.setAttribute("aria-pressed", String(dark));
  });
  const apply = (theme: string, origin?: HTMLElement) => {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } };
    const set = () => { root.dataset.theme = theme; sync(); };
    if (reduceMotion) return set();
    if (doc.startViewTransition && origin) {
      // Révélation circulaire depuis le bouton
      const r = origin.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.classList.add("vt-theme");
      const vt = doc.startViewTransition(set);
      vt.finished.finally(() => root.classList.remove("vt-theme"));
      vt.ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
          { duration: 650, easing: "cubic-bezier(.16,1,.3,1)", pseudoElement: "::view-transition-new(root)" },
        );
      }).catch(() => {});
    } else {
      root.classList.add("theme-switching");
      set();
      setTimeout(() => root.classList.remove("theme-switching"), 500);
    }
  };
  btns.forEach((b) => b.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("nu-theme", next); } catch {}
    apply(next, b);
  }));
  // Suit le thème du système tant que le visiteur n'a pas fait de choix
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("nu-theme"); } catch {}
    if (!saved) apply(e.matches ? "dark" : "light");
  });
  sync();
}

/* ---------- Langue : mémorisation du choix ---------- */
function initLang() {
  document.querySelectorAll<HTMLAnchorElement>("[data-lang-switch]").forEach((a) =>
    a.addEventListener("click", () => { try { localStorage.setItem("nu-lang", a.dataset.langSwitch!); } catch {} }),
  );
}

/* ---------- Menu déroulant (pôles) ---------- */
function initDropdown() {
  document.querySelectorAll<HTMLElement>("[data-dropdown]").forEach((dd) => {
    const btn = dd.querySelector<HTMLButtonElement>("[data-dropdown-toggle]");
    if (!btn) return;
    const set = (open: boolean) => { dd.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
    dd.addEventListener("focusout", (e) => { if (!dd.contains(e.relatedTarget as Node)) set(false); });
    dd.addEventListener("keydown", (e) => { if (e.key === "Escape") { set(false); btn.focus(); } });
    dd.addEventListener("mouseleave", () => set(false));
  });
}

/* ---------- Compteurs animés ---------- */
function initCounters() {
  const els = document.querySelectorAll<HTMLElement>("[data-count]");
  if (!els.length) return;
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const start = performance.now(), dur = 1400;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { run(e.target as HTMLElement); io.unobserve(e.target); }
  }), { threshold: 0.5 });
  els.forEach((el) => io.observe(el));
}

initTheme();
initLang();
initDropdown();
initCounters();
initReveal();
initHeader();
initMenu();
// Effet magnétique désactivé : les boutons restent immobiles au survol (choix de l'association)
void initMagnetic;
initParallax();
initSpotlight();
