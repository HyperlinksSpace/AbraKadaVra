/* AbraKadaVra💀 — EN / РУ / 中文 */

export const LANGS = [
  { id: "en", label: "EN" },
  { id: "ru", label: "РУ" },
  { id: "zh", label: "中文" },
];

const dict = {
  en: {
    docTitle: "AbraKadaVra💀 — Algorithmic Grimoire",
    docDesc:
      "AbraKadaVra💀 — a digital grimoire of algorithm-generated beauty: chaos, morphogenesis, gravity, waves, and growth.",
    navEnter: "Enter the spells",
    heroLine: "Digital Grimoire",
    heroSub:
      "Speak the name. Watch the universe answer — not with miracles, but with mathematics it already believed in.",
    ctaOpen: "Open the grimoire",
    ctaFirst: "First spell",
    spellsTitle: "Six spells",
    spellsLead:
      "Each preview is a living 3D fragment — drag to orbit, hover to tilt, scroll to zoom, click to enter the full rite.",
    enter: "Enter spell →",
    footer:
      "algorithms wearing a ritual mask.<br />Inspired by curiosity, not copies. MIT. Open the console if you must.",
    hintDrag: "Drag to orbit",
    hintZoom: "Scroll to zoom",
    hintEnter: "Click to enter",
    spells: {
      chaos: {
        law: "Chaos · Sensitive dependence",
        title: "Chaos Sigil",
        blurb: "Strange attractors — infinite lace from three coupled equations.",
      },
      turing: {
        law: "Morphogenesis · Reaction–diffusion",
        title: "Turing Skin",
        blurb: "How spots and stripes invent themselves from two chemicals.",
      },
      phyllotaxis: {
        law: "Golden angle · Optimal packing",
        title: "Phyllotaxis Bone",
        blurb: "Sunflowers and pinecones: the spiral that wastes no space.",
      },
      gravity: {
        law: "Gravitation · N-body dance",
        title: "Orbital Hex",
        blurb: "Masses chasing mass — orbits, slingshots, and soft collisions.",
      },
      waves: {
        law: "Superposition · Interference",
        title: "Interference Veil",
        blurb: "Waves pass through each other and paint standing geometries.",
      },
      dla: {
        law: "Aggregation · Random walk",
        title: "Bone Growth",
        blurb: "Lightning, coral, frost — beauty born from sticky chance.",
      },
    },
  },
  ru: {
    docTitle: "AbraKadaVra💀 — Алгоритмический гримуар",
    docDesc:
      "AbraKadaVra💀 — цифровой гримуар алгоритмической красоты: хаос, морфогенез, гравитация, волны и рост.",
    navEnter: "Войти в заклинания",
    heroLine: "Цифровой гримуар",
    heroSub:
      "Произнеси имя. Вселенная ответит — не чудесами, а математикой, в которую она давно верила.",
    ctaOpen: "Открыть гримуар",
    ctaFirst: "Первое заклинание",
    spellsTitle: "Шесть заклинаний",
    spellsLead:
      "Каждый превью — живой 3D-фрагмент: тяните, чтобы вращать, наведите, чтобы наклонить, колесо — зум, клик — войти.",
    enter: "Войти →",
    footer:
      "алгоритмы в ритуальной маске.<br />Вдохновлено любопытством, не копиями. MIT. Консоль — если нужно.",
    hintDrag: "Тяните — вращение",
    hintZoom: "Колесо — зум",
    hintEnter: "Клик — войти",
    spells: {
      chaos: {
        law: "Хаос · Чувствительная зависимость",
        title: "Печать хаоса",
        blurb: "Странные аттракторы — бесконечное кружево из трёх уравнений.",
      },
      turing: {
        law: "Морфогенез · Реакция–диффузия",
        title: "Кожа Тьюринга",
        blurb: "Как пятна и полосы сами себя изобретают из двух веществ.",
      },
      phyllotaxis: {
        law: "Золотой угол · Упаковка",
        title: "Кость филлотаксиса",
        blurb: "Подсолнухи и шишки: спираль, которая не тратит место.",
      },
      gravity: {
        law: "Гравитация · N-тел",
        title: "Орбитальный гекс",
        blurb: "Массы гонятся за массами — орбиты, пращи и мягкие столкновения.",
      },
      waves: {
        law: "Суперпозиция · Интерференция",
        title: "Вуаль интерференции",
        blurb: "Волны проходят сквозь друг друга и рисуют стоячие узоры.",
      },
      dla: {
        law: "Агрегация · Случайное блуждание",
        title: "Рост кости",
        blurb: "Молния, коралл, иней — красота из липкой случайности.",
      },
    },
  },
  zh: {
    docTitle: "AbraKadaVra💀 — 算法魔典",
    docDesc: "AbraKadaVra💀 — 算法生成之美的数字魔典：混沌、形态发生、引力、波动与生长。",
    navEnter: "进入法术",
    heroLine: "数字魔典",
    heroSub: "念出这个名字。宇宙会回应——不是奇迹，而是它早已信奉的数学。",
    ctaOpen: "打开魔典",
    ctaFirst: "第一个法术",
    spellsTitle: "六种法术",
    spellsLead: "每个预览都是活的三维片段——拖动环绕，悬停倾斜，滚轮缩放，点击进入完整仪式。",
    enter: "进入法术 →",
    footer: "戴着仪式面具的算法。<br />源于好奇，而非仿作。MIT。需要时打开控制台。",
    hintDrag: "拖动环绕",
    hintZoom: "滚轮缩放",
    hintEnter: "点击进入",
    spells: {
      chaos: {
        law: "混沌 · 敏感依赖",
        title: "混沌印记",
        blurb: "奇异吸引子——由三个耦合方程织成的无限花边。",
      },
      turing: {
        law: "形态发生 · 反应扩散",
        title: "图灵之肤",
        blurb: "斑点与条纹如何由两种化学物质自行发明。",
      },
      phyllotaxis: {
        law: "黄金角 · 最优堆积",
        title: "叶序之骨",
        blurb: "向日葵与松果：不浪费空间的螺旋。",
      },
      gravity: {
        law: "引力 · N体之舞",
        title: "轨道六芒",
        blurb: "质量追逐质量——轨道、弹弓与柔软碰撞。",
      },
      waves: {
        law: "叠加 · 干涉",
        title: "干涉之纱",
        blurb: "波彼此穿过，绘出驻波几何。",
      },
      dla: {
        law: "聚集 · 随机游走",
        title: "骨之生长",
        blurb: "闪电、珊瑚、霜花——粘性偶然生出的美。",
      },
    },
  },
};

const STORAGE_KEY = "abrakadavra-lang";

export function getLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && dict[saved]) return saved;
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("zh")) return "zh";
  return "en";
}

export function setLang(id) {
  if (!dict[id]) return getLang();
  localStorage.setItem(STORAGE_KEY, id);
  return id;
}

export function t(lang) {
  return dict[lang] || dict.en;
}

export function applyI18n(lang) {
  const d = t(lang);
  document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  document.title = d.docTitle;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", d.docDesc);

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const html = key.split(".").reduce((acc, k) => (acc == null ? acc : acc[k]), d);
    if (typeof html === "string") {
      if (el.hasAttribute("data-i18n-html")) el.innerHTML = html;
      else el.textContent = html;
    }
  });

  document.querySelectorAll("[data-i18n-spell]").forEach((card) => {
    const id = card.getAttribute("data-i18n-spell");
    const s = d.spells[id];
    if (!s) return;
    const law = card.querySelector(".law");
    const title = card.querySelector("h3");
    const blurb = card.querySelector(".spell-meta > p:not(.law)");
    const enter = card.querySelector(".enter");
    if (law) law.textContent = s.law;
    if (title) title.textContent = s.title;
    if (blurb) blurb.textContent = s.blurb;
    if (enter) enter.textContent = d.enter;
  });

  // Refresh preview hints if present
  document.querySelectorAll(".preview-stage .interact-hint").forEach((hint) => {
    hint.innerHTML = [
      `<span class="hint-pill">${d.hintDrag}</span>`,
      `<span class="hint-pill">${d.hintZoom}</span>`,
      `<span class="hint-pill soft">${d.hintEnter}</span>`,
    ].join("");
  });

  document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
    btn.setAttribute("aria-pressed", btn.getAttribute("data-lang") === lang ? "true" : "false");
  });
}

export function initI18n() {
  const lang = getLang();
  applyI18n(lang);

  document.querySelectorAll(".lang-switch [data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = setLang(btn.getAttribute("data-lang"));
      applyI18n(next);
    });
  });

  return lang;
}
