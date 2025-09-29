const CONFIG = {
  githubUsername: "Julio-73",
  pinnedRepos: [], // opcional: ["repo-1", "repo-2"]
  excludeForks: true,
  maxRepos: 9,
  email: "tu.email@ejemplo.com",
  links: {
    github: "https://github.com/Julio-73",
    linkedin: "https://www.linkedin.com/in/tu-perfil",
    x: "https://x.com/Skiler75",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initYear();
  initLinks();
  observeReveals();
  fetchAndRenderRepos();
  enableSmoothScroll();
  initMobileMenu();
  ensureAvatarFallback();
});

function initYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

function initLinks() {
  const { email, links } = CONFIG;
  const emailEl = document.getElementById("contact-email");
  if (emailEl && email) emailEl.href = `mailto:${email}`;
  const gh = document.getElementById("link-github");
  if (gh) gh.href = links.github;
  const li = document.getElementById("link-linkedin");
  if (li) li.href = links.linkedin;
  const x = document.getElementById("link-x");
  if (x) x.href = links.x;
}

function initTheme() {
  const key = "pref-theme";
  const saved = localStorage.getItem(key);
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    if (next === "dark") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem(key, next);
  });
}

function enableSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href.length < 2) return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initMobileMenu() {
  const toggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("site-menu");
  if (!toggle || !menu) return;
  const closeMenu = () => {
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
  };
  const openMenu = () => {
    menu.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú");
  };
  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.contains("open");
    isOpen ? closeMenu() : openMenu();
  });
  menu.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

let REPO_CACHE = [];

async function fetchAndRenderRepos() {
  const grid = document.getElementById("projects-grid");
  const empty = document.getElementById("projects-empty");
  if (!grid) return;

  try {
    showSkeletons(grid, 6);
    const repos = await getRepos();
    REPO_CACHE = repos;
    setupFilters(repos);
    if (!repos.length) {
      if (empty) empty.hidden = false;
      return;
    }
    const fragment = document.createDocumentFragment();
    for (const repo of repos) {
      fragment.appendChild(createRepoCard(repo));
    }
    grid.innerHTML = "";
    grid.appendChild(fragment);
    revealNow(grid.children);
  } catch (err) {
    console.error(err);
    if (empty) {
      empty.hidden = false;
      empty.textContent = "No se pudieron cargar los proyectos.";
    }
  }
}

async function getRepos() {
  const { githubUsername, pinnedRepos, excludeForks, maxRepos } = CONFIG;
  if (!githubUsername) return [];

  const base = `https://api.github.com/users/${githubUsername}/repos?per_page=100&sort=updated`;
  const res = await fetch(base, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error("Error al obtener repositorios");
  /** @type {any[]} */
  const data = await res.json();

  let filtered = data.filter(r => !r.archived && !r.disabled);
  if (excludeForks) filtered = filtered.filter(r => !r.fork);

  if (Array.isArray(pinnedRepos) && pinnedRepos.length > 0) {
    filtered.sort((a, b) => {
      const ap = pinnedRepos.includes(a.name) ? 0 : 1;
      const bp = pinnedRepos.includes(b.name) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.pushed_at) - new Date(a.pushed_at);
    });
  } else {
    filtered.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  }

  return filtered.slice(0, maxRepos);
}

function createRepoCard(repo) {
  const card = document.createElement("article");
  card.className = "card reveal";

  const title = document.createElement("h3");
  title.textContent = repo.name;

  const desc = document.createElement("p");
  desc.textContent = repo.description || "Sin descripción";

  const meta = document.createElement("div");
  meta.className = "meta";
  const lang = repo.language ? `· ${repo.language}` : "";
  meta.textContent = `${formatCount(repo.stargazers_count)} ★ · ${formatCount(repo.forks_count)} forks ${lang}`;

  const actions = document.createElement("div");
  actions.className = "actions";

  const linkRepo = document.createElement("a");
  linkRepo.className = "btn-secondary";
  linkRepo.href = repo.html_url;
  linkRepo.target = "_blank";
  linkRepo.rel = "noreferrer noopener";
  linkRepo.textContent = "Código";

  if (repo.homepage) {
    const linkLive = document.createElement("a");
    linkLive.className = "btn-primary";
    linkLive.href = repo.homepage;
    linkLive.target = "_blank";
    linkLive.rel = "noreferrer noopener";
    linkLive.textContent = "Demo";
    actions.appendChild(linkLive);
  }
  actions.appendChild(linkRepo);

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(meta);
  card.appendChild(actions);
  return card;
}

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return String(n);
}

function showSkeletons(container, count) {
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.className = "skeleton";
    const l1 = document.createElement("div"); l1.className = "line wide";
    const l2 = document.createElement("div"); l2.className = "line";
    const l3 = document.createElement("div"); l3.className = "line";
    sk.appendChild(l1); sk.appendChild(l2); sk.appendChild(l3);
    container.appendChild(sk);
  }
}

function observeReveals() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;
  const items = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("reveal-visible");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.15 });
  items.forEach(el => io.observe(el));
}

function revealNow(htmlCollection) {
  Array.from(htmlCollection).forEach(el => {
    if (el.classList && el.classList.contains("reveal")) {
      el.classList.add("reveal-visible");
    }
  });
}

function setupFilters(repos) {
  const chips = document.getElementById("language-chips");
  const search = document.getElementById("search-input");
  if (!chips || !search) return;
  const langs = Array.from(new Set(repos.map(r => r.language).filter(Boolean))).sort();
  chips.innerHTML = "";
  const allChip = createChip("Todos", true);
  chips.appendChild(allChip);
  langs.forEach(l => chips.appendChild(createChip(l, false)));
  chips.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains("chip")) return;
    chips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    target.classList.add("active");
    applyFilters();
  });
  search.addEventListener("input", () => applyFilters());
}

function createChip(label, active) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip" + (active ? " active" : "");
  chip.textContent = label;
  chip.setAttribute("aria-pressed", active ? "true" : "false");
  return chip;
}

function applyFilters() {
  const grid = document.getElementById("projects-grid");
  const empty = document.getElementById("projects-empty");
  if (!grid) return;
  const search = document.getElementById("search-input");
  const chips = document.getElementById("language-chips");
  const activeChip = chips ? chips.querySelector(".chip.active") : null;
  const lang = activeChip ? activeChip.textContent : "Todos";
  const q = (search && search.value ? search.value : "").toLowerCase();
  const matches = REPO_CACHE.filter(r => {
    const matchLang = lang === "Todos" || r.language === lang;
    const text = `${r.name} ${r.description || ""}`.toLowerCase();
    const matchText = !q || text.includes(q);
    return matchLang && matchText;
  });
  if (!matches.length) {
    grid.innerHTML = "";
    if (empty) { empty.hidden = false; empty.textContent = "No se encontraron proyectos."; }
    return;
  }
  if (empty) empty.hidden = true;
  const fragment = document.createDocumentFragment();
  matches.forEach(r => fragment.appendChild(createRepoCard(r)));
  grid.innerHTML = "";
  grid.appendChild(fragment);
  revealNow(grid.children);
}

function ensureAvatarFallback() {
  const img = document.getElementById("avatar");
  if (!img) return;
  img.addEventListener("error", () => {
    img.style.display = "none";
  });
}


