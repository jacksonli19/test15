// ── Utilities ─────────────────────────────────────────────────────────────
const clamp        = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const sleep        = ms => new Promise(r => setTimeout(r, ms));

// ── DOM refs ───────────────────────────────────────────────────────────────
const header    = document.getElementById("header");
const navToggle = document.getElementById("nav-toggle");
const navMenu   = document.getElementById("nav-menu");
const navLinks  = document.querySelectorAll(".nav__link");
const sections  = document.querySelectorAll("section[id]");

// ── Nav toggle (mobile) ────────────────────────────────────────────────────
if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    navMenu.classList.toggle("show-menu");
  });
}

// ── Courses dropdown (hover on desktop, tap-toggle everywhere) ─────────────
const dropdownItem   = document.querySelector(".nav__item--dropdown");
const dropdownToggle = document.querySelector(".nav__dropdown-toggle");
const dropdownPanel  = document.getElementById("nav-courses-dropdown");

function closeDropdown() {
  if (!dropdownToggle || !dropdownPanel) return;
  dropdownToggle.setAttribute("aria-expanded", "false");
  dropdownPanel.classList.remove("show-dropdown");
}

if (dropdownToggle && dropdownPanel && dropdownItem) {
  dropdownToggle.addEventListener("click", e => {
    e.stopPropagation();
    const open = dropdownToggle.getAttribute("aria-expanded") === "true";
    dropdownToggle.setAttribute("aria-expanded", String(!open));
    dropdownPanel.classList.toggle("show-dropdown", !open);
  });

  // Close after picking a course, close on outside click / Escape
  document.addEventListener("click", e => {
    if (!dropdownItem.contains(e.target)) closeDropdown();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeDropdown();
  });
}

// ── Nav link clicks: skip the 300vh hero when jumping to a section ──────────
navLinks.forEach(l => {
  l.addEventListener("click", e => {
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
    if (navMenu)   navMenu.classList.remove("show-menu");
    closeDropdown();

    const href = l.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    const id = href.slice(1);
    if (id === "home") return;

    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    const headerH = header ? header.offsetHeight : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - headerH;
    window.scrollTo({ top, behavior: "smooth" });
  });
});

// ── Nav: shadow + active link ──────────────────────────────────────────────
const dropdownLinks = document.querySelectorAll(".nav__dropdown-link");
function updateNav() {
  if (!header) return;
  header.classList.toggle("shadow-header", window.scrollY > 60);
  const headerH = header.offsetHeight;
  let current = "";
  sections.forEach(s => {
    // getBoundingClientRect works correctly even when sections are wrapped in
    // spacer divs (e.g. the about-spacer), where offsetTop would be wrong.
    const rect = s.getBoundingClientRect();
    if (rect.top <= headerH + 80) current = s.id;
  });
  // The how-to steps section (appt-howto) is part of the Appointment flow —
  // keep the Appointment nav tab active while scrolling through it.
  if (current === "appt-howto") current = "appointment";
  navLinks.forEach(l => l.classList.toggle("is-active", l.getAttribute("href") === `#${current}`));
  // Update browser tab title to match current section
  const activeLink = Array.from(navLinks).find(l => l.getAttribute("href") === `#${current}`);
  const sectionName = activeLink ? activeLink.childNodes[0].textContent.trim() : "";
  document.title = sectionName ? `${sectionName} | HALC` : "| HALC";
  // Light up the "Courses" toggle whenever Math, History, or Economics is active
  if (dropdownToggle) {
    const inCourses = Array.from(dropdownLinks).some(l => l.getAttribute("href") === `#${current}`);
    dropdownToggle.classList.toggle("is-active", inCourses);
  }
}
window.addEventListener("scroll", updateNav, { passive: true });
window.addEventListener("load",   updateNav);





// ── Scroll-reveal (IntersectionObserver) ──────────────────────────────────
const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); return; }
      if (entry.boundingClientRect.top > 0) entry.target.classList.remove("is-visible");
    });
  },
  { rootMargin: "0px 0px 12% 0px", threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

// ── Scroll FX (CSS-var driven) ────────────────────────────────────────────
const scrollFxEls = document.querySelectorAll(
  ".section__header, .intro__content, .about__content, .notice .container"
);
scrollFxEls.forEach(el => {
  el.classList.add("is-scroll-fx");
  const section = el.closest("section");
  if (el.classList.contains("section__header")) {
    el.dataset.fx = ["home","usage","about"].includes(section?.id) ? "focus" : "sweep";
  }
  if (el.matches(".notice .container")) el.dataset.fx = "notice";
});

function updateScrollFx() {
  const vh = window.innerHeight;

  scrollFxEls.forEach(el => {
    const r = el.getBoundingClientRect();
    let p = clamp((vh * 0.92 - r.top) / (vh * 0.72));
    if (r.bottom <= vh * 1.03 && r.top >= 0) p = 1;
    el.style.setProperty("--scroll-reveal", easeOutCubic(p).toFixed(3));
  });

  document.querySelectorAll(".course-card.is-scroll-fx").forEach(card => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--scroll-reveal", easeOutCubic(
      clamp((vh * 0.95 - r.top) / (vh * 0.65))
    ).toFixed(3));
  });
}

// ── Fade-in parallax: sections fade + rise in as they enter, fade out as they leave ──
// Applies to every <section> with the class "section" that is NOT the hero
const fadeParallaxSections = document.querySelectorAll("section.section");

function updateFadeParallax() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const vh = window.innerHeight;

  fadeParallaxSections.forEach(section => {
    const r = section.getBoundingClientRect();

    // ENTER: fade+rise in as top edge crosses 90% → 10% of viewport
    const enterT = clamp((vh * 0.90 - r.top) / (vh * 0.80));
    // EXIT: only fade out once the section's bottom is well above the fold
    // Using 0.25 (was 0.55) so the exit doesn't fire when nav-jumping to a section
    const exitT  = clamp((r.bottom) / (vh * 0.25));

    // Combined: in during enter, out during exit
    const fadeIn  = easeOutCubic(enterT);
    const fadeOut = easeOutCubic(exitT);

    // Section is fully visible when both are 1
    const op = Math.min(fadeIn, fadeOut);
    // Parallax vertical offset: rises up as it enters, continues rising out
    const ty = (1 - fadeIn) * 32 - (1 - fadeOut) * 24;

    section.style.setProperty("--fade-parallax-op", op.toFixed(3));
    section.style.setProperty("--fade-parallax-ty", ty.toFixed(2) + "px");
  });
}

// ══════════════════════════════════════════════════════════════════════════
//  CARD SWIPE — fly in from left when section enters, fly out to right
//  when section exits.  No sticky, no pinning — page scrolls normally.
//
//  Each card gets a staggered delay so they arrive one after another.
//  States:
//    (default / .card-before) — off-screen LEFT, waiting to enter
//    .card-visible            — centerd, fully visible
//    .card-past               — off-screen RIGHT, exited
// ══════════════════════════════════════════════════════════════════════════

document.querySelectorAll(".course-grid").forEach(grid => {
  [...grid.querySelectorAll(".course-card")].forEach((card, i) => {
    card.classList.add("swipe-card");
    card.style.setProperty("--swipe-delay", `${i * 80}ms`);
  });
});

const swipeCards = document.querySelectorAll(".swipe-card");

function updateCardSwipe() {
  const vh = window.innerHeight;

  swipeCards.forEach(card => {
    const r = card.getBoundingClientRect();
    // Section is "in view" between these thresholds
    const entering = r.top  < vh * 0.85;
    const exiting  = r.bottom < vh * 0.15;

    if (exiting) {
      card.classList.remove("card-visible");
      card.classList.add("card-past");
    } else if (entering) {
      card.classList.remove("card-past");
      card.classList.add("card-visible");
    } else {
      card.classList.remove("card-visible", "card-past");
    }
  });
}

window.addEventListener("scroll", updateCardSwipe, { passive: true });
window.addEventListener("resize", updateCardSwipe, { passive: true });
updateCardSwipe();

// ══════════════════════════════════════════════════════════════════════════
//  SPLITSCREEN INTRO — pinned title that drifts/blurs away and dissolves
//  into the next section's color as you scroll (no black wipe panels)
// ══════════════════════════════════════════════════════════════════════════
(function () {
  const section  = document.querySelector('.splitintro');
  const bgFade   = document.querySelector('.splitintro-bgfade');
  const content  = document.querySelector('.splitintro-content');
  const badge    = document.querySelector('.splitintro-badge');
  const lineEls  = document.querySelectorAll('.splitintro-line');
  const typedLine = document.getElementById('splitintro-typed-line');
  const halcBar   = document.getElementById('splitintro-halc-bar');
  if (!section || !content) return;

  // ── Show "Hostos Academic Learning Center!" then sweep the gold bar ──────
  // (Text now appears via the .splitintro-content rise/fade-in CSS animation
  //  instead of being typed letter-by-letter.)
  async function runIntroTyping() {
    if (!typedLine) return;
    typedLine.textContent = 'Hostos Academic Learning Center!';
    // Fire the gold bar right as the text becomes visible (at the animation-delay threshold)
    await new Promise(r => setTimeout(r, 820));
    if (halcBar) halcBar.classList.add('animate');
  }
  runIntroTyping();

  let setIdx    = 0;
  let cycling   = false;
  let cycleTimer = null;

  // ── Animation pool — picked randomly per line per cycle ──────────────────
  const ANIMS = [
    'letterDrop', 'scrambleWipe', 'slideUp', 'slideDown',
    'scalePop', 'blurFade', 'flipX', 'flipY', 'glitch',
    'stretch', 'swingIn', 'bounceIn', 'splitReveal', 'typewriter',
    'spinFade', 'rollIn', 'skewSlide', 'ripple', 'pixelate', 'wave',
    'handwrite', 'handwrite', 'handwrite'  // weighted 3× so it appears often
  ];

  // ── Handwriting font map — per script ────────────────────────────────────
  // Each entry: { font: Google Fonts family name, url: import URL }
  const HW_FONTS = {
    // Latin / Cyrillic / Albanian / German / Haitian Creole / Ukrainian / Russian
    latin:   { family: 'Caveat', url: 'https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap' },
    // Chinese
    chinese: { family: 'Ma Shan Zheng', url: 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap' },
    // Japanese
    japanese:{ family: 'Kaisei Decol', url: 'https://fonts.googleapis.com/css2?family=Kaisei+Decol:wght@700&display=swap' },
    // Arabic / Urdu / Farsi
    arabic:  { family: 'Amiri', url: 'https://fonts.googleapis.com/css2?family=Amiri:wght@700&display=swap' },
    // Bengali
    bengali: { family: 'Hind Siliguri', url: 'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@700&display=swap' },
  };

  // Detect which font set to use for a given string
  function detectScript(str) {
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(str)) return 'chinese';
    if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(str)) return 'japanese';
    if (/[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/.test(str)) return 'arabic';
    if (/[\u0980-\u09ff]/.test(str)) return 'bengali';
    return 'latin';
  }

  // Preload a Google Font by injecting a link tag (no-op if already loaded)
  const _loadedFonts = new Set();
  function preloadFont(script) {
    if (_loadedFonts.has(script)) return;
    _loadedFonts.add(script);
    const cfg = HW_FONTS[script];
    if (!cfg) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = cfg.url;
    document.head.appendChild(link);
  }

  // Preload all handwriting fonts up front (non-blocking, happens in background)
  Object.keys(HW_FONTS).forEach(preloadFont);

  // ── Inject keyframes once ─────────────────────────────────────────────────
  if (!document.getElementById('splitintro-anim-style')) {
    const st = document.createElement('style');
    st.id = 'splitintro-anim-style';
    st.textContent = `
      .si-char { display: inline-block; will-change: transform, opacity, filter; }
      @keyframes siLetterOut {
        0%   { opacity:1; transform: translateY(0) rotate(0deg) scale(1); }
        100% { opacity:0; transform: translateY(var(--dy,60px)) rotate(var(--dr,0deg)) scale(.5); }
      }
      @keyframes siLetterIn {
        0%   { opacity:0; transform: translateY(var(--iy,-50px)) rotate(var(--ir,0deg)) scale(.4); }
        70%  { opacity:1; transform: translateY(4px) rotate(0deg) scale(1.07); }
        100% { opacity:1; transform: translateY(0) rotate(0deg) scale(1); }
      }
      @keyframes siSlideOut  { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(-56px)} }
      @keyframes siSlideIn   { 0%{opacity:0;transform:translateY(60px)} 100%{opacity:1;transform:translateY(0)} }
      @keyframes siSlideDownOut { 0%{opacity:1;transform:translateY(0)} 100%{opacity:0;transform:translateY(56px)} }
      @keyframes siSlideDownIn  { 0%{opacity:0;transform:translateY(-60px)} 100%{opacity:1;transform:translateY(0)} }
      @keyframes siScaleOut  { 0%{opacity:1;transform:scale(1);filter:blur(0)} 100%{opacity:0;transform:scale(1.6);filter:blur(8px)} }
      @keyframes siScaleIn   { 0%{opacity:0;transform:scale(.3);filter:blur(6px)} 70%{opacity:1;transform:scale(1.09)} 100%{opacity:1;transform:scale(1)} }
      @keyframes siBlurOut   { 0%{opacity:1;filter:blur(0px)} 100%{opacity:0;filter:blur(20px)} }
      @keyframes siBlurIn    { 0%{opacity:0;filter:blur(20px)} 100%{opacity:1;filter:blur(0px)} }
      @keyframes siFlipXOut  { 0%{opacity:1;transform:rotateX(0deg)} 100%{opacity:0;transform:rotateX(90deg)} }
      @keyframes siFlipXIn   { 0%{opacity:0;transform:rotateX(-90deg)} 60%{opacity:1;transform:rotateX(8deg)} 100%{opacity:1;transform:rotateX(0deg)} }
      @keyframes siFlipYOut  { 0%{opacity:1;transform:rotateY(0deg)} 100%{opacity:0;transform:rotateY(90deg)} }
      @keyframes siFlipYIn   { 0%{opacity:0;transform:rotateY(-90deg)} 60%{opacity:1;transform:rotateY(8deg)} 100%{opacity:1;transform:rotateY(0deg)} }
      @keyframes siStretchOut{ 0%{opacity:1;transform:scaleX(1) scaleY(1)} 50%{transform:scaleX(1.4) scaleY(.3)} 100%{opacity:0;transform:scaleX(0) scaleY(0)} }
      @keyframes siStretchIn { 0%{opacity:0;transform:scaleX(0) scaleY(0)} 50%{transform:scaleX(1.3) scaleY(.4)} 80%{opacity:1;transform:scaleX(.97) scaleY(1.06)} 100%{opacity:1;transform:scaleX(1) scaleY(1)} }
      @keyframes siSwingOut  { 0%{opacity:1;transform:rotate(0deg);transform-origin:top left} 100%{opacity:0;transform:rotate(15deg);transform-origin:top left} }
      @keyframes siSwingIn   { 0%{opacity:0;transform:rotate(-15deg);transform-origin:top left} 70%{transform:rotate(3deg)} 100%{opacity:1;transform:rotate(0deg)} }
      @keyframes siBounceOut { 0%{opacity:1;transform:translateY(0)} 30%{transform:translateY(-18px)} 100%{opacity:0;transform:translateY(80px)} }
      @keyframes siBounceIn  { 0%{opacity:0;transform:translateY(-80px)} 60%{transform:translateY(12px)} 80%{transform:translateY(-6px)} 100%{opacity:1;transform:translateY(0)} }
      @keyframes siSpinOut   { 0%{opacity:1;transform:rotate(0deg) scale(1)} 100%{opacity:0;transform:rotate(180deg) scale(0)} }
      @keyframes siSpinIn    { 0%{opacity:0;transform:rotate(-180deg) scale(0)} 70%{transform:rotate(8deg) scale(1.08)} 100%{opacity:1;transform:rotate(0deg) scale(1)} }
      @keyframes siRollOut   { 0%{opacity:1;transform:translateX(0) rotate(0deg)} 100%{opacity:0;transform:translateX(-120%) rotate(-360deg)} }
      @keyframes siRollIn    { 0%{opacity:0;transform:translateX(120%) rotate(360deg)} 100%{opacity:1;transform:translateX(0) rotate(0deg)} }
      @keyframes siSkewOut   { 0%{opacity:1;transform:skewX(0deg) translateX(0)} 100%{opacity:0;transform:skewX(-20deg) translateX(-80px)} }
      @keyframes siSkewIn    { 0%{opacity:0;transform:skewX(20deg) translateX(80px)} 70%{transform:skewX(-4deg)} 100%{opacity:1;transform:skewX(0deg) translateX(0)} }
      @keyframes siGlitchA   { 0%{clip-path:inset(0 0 80% 0)} 25%{clip-path:inset(20% 0 40% 0)} 50%{clip-path:inset(60% 0 10% 0)} 75%{clip-path:inset(10% 0 70% 0)} 100%{clip-path:inset(0)} }
      @keyframes siRipple    { 0%{opacity:1;transform:scaleX(1)} 40%{transform:scaleX(1.08) scaleY(.7)} 70%{transform:scaleX(.96) scaleY(1.05)} 100%{opacity:0;transform:scaleX(1) scaleY(1)} }
      @keyframes siWaveChar  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(var(--wy,-14px))} }
      @keyframes siInkFill   { 0%{fill-opacity:0;stroke-opacity:1} 60%{fill-opacity:0.6} 100%{fill-opacity:1;stroke-opacity:0} }
    `;
    document.head.appendChild(st);
  }

  function randInt(n) { return Math.floor(Math.random() * n); }
  function shuffle(arr) { return [...arr].sort(() => Math.random() - .5); }
  function pick(arr) { return arr[randInt(arr.length)]; }
  function randSign() { return Math.random() > .5 ? 1 : -1; }

  // ── Wrap each character in a span ─────────────────────────────────────────
  function spannify(el, word) {
    el.innerHTML = '';
    [...word].forEach(ch => {
      const s = document.createElement('span');
      s.className = 'si-char';
      s.textContent = ch === ' ' ? '\u00a0' : ch;
      el.appendChild(s);
    });
    return [...el.querySelectorAll('.si-char')];
  }

  function plainify(el, word) {
    el.style.animation = '';
    el.innerHTML = '';
    el.textContent = word;
  }

  // ── Simple swap helper (out anim → swap text → in anim) ──────────────────
  function simpleSwap(el, newWord, outAnim, outDur, inAnim, inDur, inDelay = 0) {
    return new Promise(res => {
      el.style.animation = `${outAnim} ${outDur}ms cubic-bezier(.55,0,.1,1) both`;
      setTimeout(() => {
        plainify(el, newWord);
        el.style.animation = `${inAnim} ${inDur}ms cubic-bezier(.16,1,.3,1) ${inDelay}ms both`;
        setTimeout(res, inDur + inDelay + 40);
      }, outDur + 20);
    });
  }

  // ── Scramble chars helper ─────────────────────────────────────────────────
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?';
  function scrambleTo(el, targetWord, duration) {
    return new Promise(res => {
      const chars = [...targetWord];
      const spans = spannify(el, targetWord);
      const order = shuffle([...Array(spans.length).keys()]);
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        order.forEach((ci, rank) => {
          if (t >= rank / order.length) {
            spans[ci].textContent = chars[ci] === ' ' ? '\u00a0' : chars[ci];
            spans[ci].style.color = '';
          } else {
            spans[ci].textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            spans[ci].style.color = 'hsl(41,100%,43%)';
          }
        });
        if (t < 1) requestAnimationFrame(tick); else res();
      }
      requestAnimationFrame(tick);
    });
  }

  // ── Gold bar wipe then scramble ───────────────────────────────────────────
  function animScrambleWipe(el, newWord) {
    return new Promise(res => {
      const bar = document.createElement('span');
      bar.style.cssText = `position:absolute;inset:0;width:0%;height:100%;background:hsl(41,100%,43%);z-index:10;border-radius:3px;transition:width 0.28s cubic-bezier(.16,1,.3,1);pointer-events:none;`;
      el.style.position = 'relative';
      el.appendChild(bar);
      requestAnimationFrame(() => {
        bar.style.width = '100%';
        setTimeout(() => {
          scrambleTo(el, newWord, 380).then(() => {
            bar.style.transition = 'width 0.22s ease';
            bar.style.width = '0%';
            setTimeout(() => { bar.remove(); el.style.position = ''; res(); }, 240);
          });
        }, 300);
      });
    });
  }

  // ── Letter drop ──────────────────────────────────────────────────────────
  function animLetterDrop(el, newWord) {
    return new Promise(res => {
      const oldSpans = [...el.querySelectorAll('.si-char')];
      if (!oldSpans.length) { plainify(el, newWord); return res(); }
      const dur = 240 + randInt(80);
      const outOrder = shuffle([...Array(oldSpans.length).keys()]);
      outOrder.forEach((i, rank) => {
        const sp = oldSpans[i];
        sp.style.setProperty('--dy', (randSign() * (40 + randInt(60))) + 'px');
        sp.style.setProperty('--dr', ((Math.random() - .5) * 40) + 'deg');
        sp.style.animation = `siLetterOut ${dur}ms cubic-bezier(.55,0,.1,1) ${rank * randInt(35) + 15}ms both`;
      });
      setTimeout(() => {
        const newSpans = spannify(el, newWord);
        const inOrder = shuffle([...Array(newSpans.length).keys()]);
        inOrder.forEach((i, rank) => {
          const sp = newSpans[i];
          sp.style.setProperty('--iy', (randSign() * (30 + randInt(50))) + 'px');
          sp.style.setProperty('--ir', ((Math.random() - .5) * 24) + 'deg');
          sp.style.animation = `siLetterIn ${380 + randInt(80)}ms cubic-bezier(.16,1,.3,1) ${rank * (20 + randInt(25))}ms both`;
        });
        const maxDelay = newSpans.length * 44 + 460;
        setTimeout(res, maxDelay);
      }, dur + outOrder.length * 35 + 60);
    });
  }

  // ── Typewriter: erase → swap lang quietly at blank → type in ────────────
  function animTypewriter(el, newWord, lang) {
    return new Promise(async res => {
      const old = el.textContent;
      const oldChars = [...old];
      // Erase char by char
      for (let i = oldChars.length; i >= 0; i--) {
        el.textContent = oldChars.slice(0, i).join('') || '\u00a0';
        await new Promise(r => setTimeout(r, 45 + randInt(50)));
      }
      // ── At blank: silently swap lang/type so font-size changes with NO text visible ──
      if (lang) el.dataset.lang = lang;
      // Brief pause at blank so the font-size CSS transition (300ms) has nothing to show
      await new Promise(r => setTimeout(r, 320));
      // Type in new word
      const newChars = [...newWord];
      for (let i = 0; i <= newChars.length; i++) {
        el.textContent = newChars.slice(0, i).join('') || '\u00a0';
        await new Promise(r => setTimeout(r, 55 + randInt(60)));
      }
      // Hold for 2 seconds after typing completes
      await new Promise(r => setTimeout(r, 2000));
      res();
    });
  }

  // ── Glitch ───────────────────────────────────────────────────────────────
  function animGlitch(el, newWord) {
    return new Promise(res => {
      const colors = ['hsl(0,100%,50%)','hsl(180,100%,50%)','hsl(41,100%,43%)'];
      let flickers = 0;
      const total = 6 + randInt(6);
      const interval = setInterval(() => {
        el.textContent = flickers % 2 === 0
          ? newWord.split('').map(() => GLYPHS[randInt(GLYPHS.length)]).join('')
          : newWord;
        el.style.color = pick(colors);
        el.style.transform = `translateX(${randSign() * randInt(8)}px) skewX(${randSign() * randInt(10)}deg)`;
        flickers++;
        if (flickers >= total) {
          clearInterval(interval);
          el.textContent = newWord;
          el.style.color = '';
          el.style.transform = '';
          res();
        }
      }, 55 + randInt(40));
    });
  }

  // ── Wave: each character bobs up/down in a wave then swaps ───────────────
  function animWave(el, newWord) {
    return new Promise(res => {
      const spans = el.querySelectorAll('.si-char').length
        ? [...el.querySelectorAll('.si-char')]
        : spannify(el, el.textContent);
      spans.forEach((sp, i) => {
        const wy = randSign() * (10 + randInt(16));
        sp.style.setProperty('--wy', wy + 'px');
        sp.style.animation = `siWaveChar 0.4s ease-in-out ${i * 60}ms 2 alternate both`;
      });
      setTimeout(() => {
        plainify(el, newWord);
        const newSpans = spannify(el, newWord);
        newSpans.forEach((sp, i) => {
          sp.style.setProperty('--wy', randSign() * (8 + randInt(12)) + 'px');
          sp.style.animation = `siLetterIn 360ms cubic-bezier(.16,1,.3,1) ${i * 40}ms both`;
        });
        setTimeout(res, newSpans.length * 40 + 400);
      }, spans.length * 60 + 340);
    });
  }

  // ── Split reveal: word splits in half, halves fly apart, new word assembles ─
  function animSplitReveal(el, newWord) {
    return new Promise(res => {
      const text = el.textContent;
      const mid = Math.floor(text.length / 2);
      const h1 = document.createElement('span');
      const h2 = document.createElement('span');
      h1.className = 'si-char'; h2.className = 'si-char';
      h1.style.cssText = 'display:inline-block;transition:transform .3s ease,opacity .3s ease;';
      h2.style.cssText = 'display:inline-block;transition:transform .3s ease,opacity .3s ease;';
      h1.textContent = text.slice(0, mid);
      h2.textContent = text.slice(mid);
      el.innerHTML = ''; el.appendChild(h1); el.appendChild(h2);
      requestAnimationFrame(() => {
        h1.style.transform = 'translateX(-60px)'; h1.style.opacity = '0';
        h2.style.transform = 'translateX(60px)';  h2.style.opacity = '0';
        setTimeout(() => {
          plainify(el, newWord);
          el.style.animation = `siBounceIn 420ms cubic-bezier(.16,1,.3,1) both`;
          setTimeout(res, 460);
        }, 340);
      });
    });
  }

  // ── Pixelate (blur steps) ─────────────────────────────────────────────────
  function animPixelate(el, newWord) {
    return new Promise(async res => {
      const steps = [0, 4, 12, 24, 12, 4, 0];
      for (let i = 0; i < steps.length; i++) {
        el.style.filter = `blur(${steps[i]}px)`;
        if (i === Math.floor(steps.length / 2)) el.textContent = newWord;
        await new Promise(r => setTimeout(r, 55 + randInt(30)));
      }
      el.style.filter = '';
      res();
    });
  }

  // ── Ripple ───────────────────────────────────────────────────────────────
  function animRipple(el, newWord) {
    return new Promise(res => {
      el.style.animation = `siRipple 320ms ease both`;
      setTimeout(() => {
        plainify(el, newWord);
        el.style.animation = `siStretchIn 420ms cubic-bezier(.16,1,.3,1) both`;
        setTimeout(res, 460);
      }, 340);
    });
  }

  // ── Handwrite: SVG stroke-draw animation, then swap to real text ──────────
  // Works for ALL scripts. Uses a per-language handwriting Google Font.
  // Phase 1: current text fades/slides out.
  // Phase 2: SVG text element draws itself via stroke-dashoffset animation.
  // Phase 3: SVG fades out as styled real text fades in.
  function animHandwrite(el, newWord) {
    return new Promise(async res => {
      const script = detectScript(newWord);
      const fontCfg = HW_FONTS[script] || HW_FONTS.latin;
      const isRTL = script === 'arabic';

      // --- Phase 1: slide old text out ---
      el.style.animation = `siSlideOut 220ms cubic-bezier(.55,0,.1,1) both`;
      await sleep(240);
      el.innerHTML = '';
      el.style.animation = '';

      // --- Phase 2: SVG stroke draw ---
      // We create an SVG that overlays the element, draw text as a stroke,
      // then animate stroke-dashoffset from full-length to 0 (draws the text).
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');

      // The SVG needs to be sized to match the element's rendered text.
      // We'll use a large viewBox and let it scale to fit.
      const fontSize = parseFloat(getComputedStyle(el).fontSize) || 72;
      const svgH = Math.ceil(fontSize * 1.5);
      // Estimate width — will be corrected after text renders
      const estW = Math.max(300, newWord.length * fontSize * 0.7);

      svg.setAttribute('xmlns', svgNS);
      svg.setAttribute('viewBox', `0 0 ${estW} ${svgH}`);
      svg.style.cssText = `
        display:block; width:100%; height:${svgH}px;
        overflow:visible; pointer-events:none;
        opacity:0; transition:opacity 0.15s ease;
      `;

      const textEl = document.createElementNS(svgNS, 'text');
      textEl.setAttribute('x', isRTL ? '100%' : '50%');
      textEl.setAttribute('y', '80%');
      textEl.setAttribute('text-anchor', 'middle');
      textEl.setAttribute('dominant-baseline', 'auto');
      textEl.setAttribute('font-family', `'${fontCfg.family}', cursive`);
      textEl.setAttribute('font-size', fontSize + 'px');
      textEl.setAttribute('font-weight', '700');
      textEl.setAttribute('fill', 'none');
      textEl.setAttribute('stroke', 'currentColor');
      textEl.setAttribute('stroke-width', Math.max(1.5, fontSize * 0.022) + 'px');
      textEl.setAttribute('stroke-linecap', 'round');
      textEl.setAttribute('stroke-linejoin', 'round');
      if (isRTL) textEl.setAttribute('direction', 'rtl');
      textEl.textContent = newWord;

      svg.appendChild(textEl);
      el.appendChild(svg);

      // Give the font a moment to apply, then measure actual text length
      await sleep(80);

      let pathLen = 800; // fallback
      try { pathLen = textEl.getComputedTextLength() || 800; } catch(e) {}
      // For complex scripts, multiply to ensure full coverage
      const totalLen = pathLen * (script === 'chinese' || script === 'japanese' ? 4 : 2.2);

      textEl.style.strokeDasharray = totalLen + 'px';
      textEl.style.strokeDashoffset = totalLen + 'px';

      // Fade SVG in
      svg.style.opacity = '1';
      await sleep(60);

      // Animate the stroke draw using a CSS transition
      const drawDuration = Math.min(1800, Math.max(600, newWord.length * 120));
      textEl.style.transition = `stroke-dashoffset ${drawDuration}ms cubic-bezier(0.25, 0.1, 0.2, 1)`;
      textEl.style.strokeDashoffset = '0px';

      // Midway through: also fill the text in (ink fills as pen draws)
      const fillDelay = drawDuration * 0.4;
      setTimeout(() => {
        textEl.setAttribute('fill', 'currentColor');
        textEl.style.transition += `, fill 400ms ease ${fillDelay * 0.5}ms`;
      }, fillDelay);

      await sleep(drawDuration + 100);

      // --- Phase 3: swap SVG for real styled text, crossfade ---
      // Place the real text but invisible
      const realSpan = document.createElement('span');
      realSpan.textContent = newWord;
      realSpan.style.cssText = `
        position:absolute; top:0; left:0; width:100%; height:100%;
        display:flex; align-items:center; justify-content:center;
        font-family:'${fontCfg.family}', cursive;
        opacity:0; transition:opacity 0.35s ease;
        pointer-events:none;
      `;
      el.style.position = 'relative';
      el.appendChild(realSpan);

      // Cross-fade: SVG out, real text in
      svg.style.transition = 'opacity 0.35s ease';
      svg.style.opacity = '0';
      await sleep(30);
      realSpan.style.opacity = '1';
      await sleep(400);

      // Clean up — set final text directly on the element
      // and remove the SVG + overlay span
      svg.remove();
      realSpan.remove();
      el.style.position = '';

      // Restore the element with the handwriting font applied
      el.textContent = newWord;
      // Keep the handwriting font for ~1s before it reverts on next cycle
      el.style.fontFamily = `'${fontCfg.family}', cursive`;
      el.style.animation = `siSlideIn 300ms cubic-bezier(.16,1,.3,1) both`;
      await sleep(320);
      res();
    });
  }

  // ── Dispatch: always typewriter ───────────────────────────────────────────
  function animateLine(el, newWord, lang) {
    el.style.animation = '';
    el.style.fontFamily = '';
    return animTypewriter(el, newWord, lang);
  }

  // ── Staggered cascade: top → mid → bottom ────────────────────────────────
  async function cycleToSet(idx) {
    const set = SETS[idx];
    const STAGGER = 320; // ms between each line starting

    // Fire lines staggered but don't await each — they overlap
    const promises = [...lineEls].map((el, i) => {
      const text = set.lines[i] || '';
      const lang  = set.lang || 'en';
      return new Promise(res => setTimeout(() => {
        // Stamp type immediately (doesn't affect font-size, just welcome/quote mode)
        el.dataset.type = set.type;
        // lang is passed into animateLine and applied at the blank moment, not now
        animateLine(el, text, lang).then(res);
      }, i * STAGGER));
    });
    await Promise.all(promises);

    // Restore float animation on all lines after swap completes
    lineEls.forEach((el, i) => {
      const durs = ['4.2s', '3.8s', '4.5s'];
      const delays = ['0s', '.4s', '.8s'];
      el.style.animation = `splitintroFloat ${durs[i]} ease-in-out ${delays[i]} infinite`;
    });
  }

  // No cycling — Welcome! stays static.

  // ── Scroll-driven drift + crossfade ───────────────────────────────────────
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Grab eyebrow for parallax
  const eyebrow = document.querySelector('.splitintro-eyebrow');

  function smoothStep(t) {
    t = Math.min(1, Math.max(0, t));
    return t * t * (3 - 2 * t);
  }

  function easeInOut(t) {
    t = Math.min(1, Math.max(0, t));
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function update() {
    const sy     = window.scrollY;
    const vh     = window.innerHeight;
    const rect   = section.getBoundingClientRect();
    const top    = sy + rect.top;
    const travel = section.offsetHeight - vh;
    if (travel <= 0) return;

    const progress = Math.max(0, Math.min(1, (sy - top) / travel));
    const pe = easeInOut(progress); // runs the FULL scroll range now

    // ── Eyebrow + badge — clear out early (first 40% of scroll) so they
    // don't compete with the title's longer drift ───────────────────────────
    const earlyT = easeInOut(Math.min(1, progress / 0.4));

    if (eyebrow) {
      const eyebrowTY = earlyT * -80;
      const eyebrowOp = 1 - earlyT * 1.15;
      const eyebrowSc = 1 - earlyT * 0.08;
      eyebrow.style.transform = `translateY(${eyebrowTY.toFixed(2)}px) scale(${eyebrowSc.toFixed(3)})`;
      eyebrow.style.opacity   = Math.max(0, eyebrowOp).toFixed(3);
    }
    // badge handled fully in enhanced parallax block below

    // ── Title lines — drift, shrink, rotate and blur continuously across
    // the ENTIRE scroll (no hold-then-cover). It reads as one unbroken move
    // that carries the text away into the next section, rather than a
    // parallax that stalls and gets hidden behind a panel ───────────────────
    const lineSpeeds = [
      { ty: -380, tx: -150, sc: 0.55, rot: -10, blur: 14 },
      { ty: -200, tx:   90, sc: 0.40, rot:   6, blur: 11 },
      { ty:  -90, tx:  -40, sc: 0.25, rot:  -3, blur:  8 },
    ];

    lineEls.forEach((el, i) => {
      const s   = lineSpeeds[i] || lineSpeeds[2];
      const ty  = (pe * s.ty).toFixed(2);
      const tx  = (pe * s.tx).toFixed(2);
      const sc  = (1 - pe * s.sc).toFixed(4);
      const rot = (pe * s.rot).toFixed(3);
      const blr = (pe * s.blur).toFixed(2);
      el.style.setProperty('--si-para-ty', ty + 'px');
      el.style.setProperty('--si-para-tx', tx + 'px');
      el.style.setProperty('--si-para-sc', sc);
      el.style.setProperty('--si-para-rot', rot + 'deg');
      el.style.filter = `blur(${blr}px)`;
    });

    // Bar moves with line index 1 (sits between the two lines)
    if (halcBarEl) {
      const s  = lineSpeeds[1];
      const ty = (pe * s.ty).toFixed(2);
      const tx = (pe * s.tx).toFixed(2);
      halcBarEl.style.setProperty('--bar-ty', ty + 'px');
      halcBarEl.style.setProperty('--bar-tx', tx + 'px');
      halcBarEl.style.filter = `blur(${(pe * s.blur).toFixed(2)}px)`;
    }

    // ── Floating icons — each drifts at its own parallax depth + scatters outward ──
    // Icons explode outward dramatically as you scroll — big travel, heavy spin
    const floatDirs = [
      { ty: -420, tx: -300, rot:  -55, sc: 0.18 },
      { ty: -320, tx:  380, rot:   48, sc: 0.22 },
      { ty:  260, tx: -290, rot:  -38, sc: 0.20 },
      { ty:  360, tx:  260, rot:   62, sc: 0.18 },
      { ty: -480, tx:  110, rot:  -72, sc: 0.14 },
      { ty: -200, tx:  440, rot:   35, sc: 0.26 },
      { ty:  320, tx: -400, rot:  -50, sc: 0.16 },
      { ty:  440, tx:  320, rot:   68, sc: 0.18 },
    ];
    // Scatter spreads across full 90% of the hero scroll zone
    const fe = easeInOut(Math.min(1, progress / 0.9));
    floatEls.forEach((el, i) => {
      const d   = floatDirs[i % floatDirs.length];
      const ty  = (fe * d.ty).toFixed(2);
      const tx  = (fe * d.tx).toFixed(2);
      const rot = (fe * d.rot).toFixed(2);
      const sc  = (1 - fe * d.sc).toFixed(4);
      // Fade starts late (50% progress) so emojis stay very visible while the hero is in view
      const op  = (Math.max(0, 0.92 - Math.max(0, fe - 0.5) * 2.2)).toFixed(3);
      el.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sc})`;
      el.style.opacity   = op;
    });

    // ── Badge — slides down and fades (was just fading before) ───────────────
    if (badge) {
      const badgeTY  = earlyT * 40;
      const badgeOp  = Math.max(0, 1 - earlyT * 1.15);
      const badgeSc  = 1 - earlyT * 0.12;
      badge.style.transform = `translateY(${badgeTY.toFixed(2)}px) scale(${badgeSc.toFixed(3)})`;
      badge.style.opacity   = badgeOp.toFixed(3);
    }

    // ── Final fade (progress 0.6 → 1) — content finishes disappearing
    // right as the background color underneath has fully caught up ─────────
    const fadeT = smoothStep(Math.max(0, progress - 0.6) / 0.4);
    if (fadeT > 0) {
      content.style.opacity   = (1 - fadeT).toFixed(3);
      content.style.transform = `scale(${(1 - fadeT * 0.08).toFixed(4)})`;
    } else {
      // Don't touch opacity/transform near the top of the page — let the
      // CSS rise/fade-in entrance animation control these instead.
      content.style.opacity   = '';
      content.style.transform = '';
    }

    // ── Background crossfade (progress 0.5 → 1) — the pinned panel's color
    // dissolves into the next section's color underneath the drifting text,
    // so by the time it unpins there's no visible seam to cut to ───────────
    const bgT = smoothStep(Math.max(0, progress - 0.5) / 0.5);
    if (bgFade) bgFade.style.opacity = bgT.toFixed(3);

    // Stop cycling once the drift gets heavy — no point swapping words
    // underneath text that's already blurring away. Resume it if the
    // user scrolls back up above that threshold, so the words keep
    // changing whenever the hero text is actually readable again.
    // (no cycling — single static welcome)
  }

  // ── Declared outside update() so base opacities are captured exactly once,
  //    before any scroll frame writes inline styles on the elements.
  //    getComputedStyle here returns the CSS-sheet value, not any inline value. ──
  const floatEls    = document.querySelectorAll('.si-float');
  const floatBaseOp = Array.from(floatEls).map(el =>
    parseFloat(getComputedStyle(el).opacity) || 0.92
  );
  const halcBarEl   = document.getElementById('splitintro-halc-bar');

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();

// Easing helper used by remaining scroll effects
function smoothStep(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

// ── Staggered list reveal ──────────────────────────────────────────────────
document.querySelectorAll(".stagger-list").forEach(list => {
  const obs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          [...entry.target.children].forEach((child, i) =>
            setTimeout(() => child.classList.add("show"), i * 110)
          );
        } else if (entry.boundingClientRect.top > 0) {
          [...entry.target.children].forEach(c => c.classList.remove("show"));
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
  );
  obs.observe(list);
});

// ── Section subtitle wipe ──────────────────────────────────────────────────
const wipeObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("show");
      else if (entry.boundingClientRect.top > 0) entry.target.classList.remove("show");
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".text-wipe").forEach(el => wipeObserver.observe(el));

// ══════════════════════════════════════════════════════════════════════════
//  MASTER CONTINUOUS RAF
// ══════════════════════════════════════════════════════════════════════════
function masterTick() {
  // 1. Scroll-reveal FX for section elements
  updateScrollFx();

  // 2. Fade-in parallax for content sections
  updateFadeParallax();

  requestAnimationFrame(masterTick);
}
requestAnimationFrame(masterTick);
// ══════════════════════════════════════════════════════════════════════════
//  HALC SECTION — scroll-driven full-page text sequence (mirrors Objective)
// ══════════════════════════════════════════════════════════════════════════
(function () {
  const section = document.querySelector('.halc-section');
  const elOut   = document.getElementById('halc-text-out');
  const elIn    = document.getElementById('halc-text-in');
  const mapOverlay     = document.getElementById('halc-map-overlay');
  const transitOverlay = document.getElementById('halc-transit-overlay');
  if (!section || !elOut || !elIn) return;

  // ── Lines ──────────────────────────────────────────────────────────────
  const LINES = [
    'Find us at <span class="halc-green">450 Grand Concourse,</span> Room <span class="halc-pink">C-596</span>, Bronx NY <span class="halc-pink">10451</span>.',
    'Right by the <span class="halc-inline-pill halc-inline-pill--2">2</span><span class="halc-inline-pill halc-inline-pill--4">4</span><span class="halc-inline-pill halc-inline-pill--5">5</span> subway<br>and the <span class="halc-inline-pill halc-inline-pill--bus">Bx1</span><span class="halc-inline-pill halc-inline-pill--bus">Bx2</span><span class="halc-inline-pill halc-inline-pill--bus">Bx19</span> buses at <span class="halc-green">149 St</span>.',
    'Reach us by email or phone — <span class="halc-green">halctutoring@hostos.cuny.edu</span>, <span class="halc-pink">(718) 518-6624</span>.',
    '<span class="halc-green">Fall & Spring</span> — Mon–Thu <span class="halc-pink">11am–6pm</span>, Fri <span class="halc-pink">11am–3pm</span>.',
    '<span class="halc-green">Summer</span> — Mon–Thu <span class="halc-pink">12pm–5pm</span>.',
  ];

  // Which overlay (if any) should be showing while each line index is active
  const LINE_OVERLAY = ['map', 'none', 'none', 'none', 'none'];

  const N = LINES.length;
  section.style.height = `${(N + 0.5) * 100}vh`;

  function easeOut(t) {
    t = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - t, 3);
  }

  // HALC: one distinct, purpose-built effect per gap — no recycled directions.
  // Each entry returns { transform, filter? } so motion can carry blur/depth,
  // not just position.
  const DIR_PAIRS = [
    // gap 0 — address → transit: 3D card flip
    [
      t => ({ transform: `perspective(900px) rotateY(${(-95 * t).toFixed(2)}deg) scale(${(1 - 0.08 * t).toFixed(4)})`, filter: `blur(${(3 * t).toFixed(2)}px)` }),
      t => ({ transform: `perspective(900px) rotateY(${(95 * (1 - t)).toFixed(2)}deg) scale(${(0.92 + 0.08 * t).toFixed(4)})`, filter: `blur(${(3 * (1 - t)).toFixed(2)}px)` }),
    ],
    // gap 1 — transit → contact: diagonal blur swoosh
    [
      t => ({ transform: `translate(${(70 * t).toFixed(2)}px, ${(-45 * t).toFixed(2)}px) skew(${(-9 * t).toFixed(2)}deg, ${(-3 * t).toFixed(2)}deg)`, filter: `blur(${(7 * t).toFixed(2)}px)` }),
      t => ({ transform: `translate(${(-70 * (1 - t)).toFixed(2)}px, ${(45 * (1 - t)).toFixed(2)}px) skew(${(9 * (1 - t)).toFixed(2)}deg, ${(3 * (1 - t)).toFixed(2)}deg)`, filter: `blur(${(7 * (1 - t)).toFixed(2)}px)` }),
    ],
    // gap 2 — contact → fall/spring hours: elastic squish bounce
    [
      t => ({ transform: `translateY(${(-30 * t - 10 * Math.sin(t * Math.PI)).toFixed(2)}px) scaleY(${(1 - 0.18 * t).toFixed(4)}) scaleX(${(1 + 0.08 * t).toFixed(4)})` }),
      t => ({ transform: `translateY(${(30 * (1 - t) + 10 * Math.sin((1 - t) * Math.PI)).toFixed(2)}px) scaleY(${(0.82 + 0.18 * t).toFixed(4)}) scaleX(${(1.08 - 0.08 * t).toFixed(4)})` }),
    ],
    // gap 3 — fall/spring → summer hours: 3D tilt fold
    [
      t => ({ transform: `perspective(800px) rotateX(${(62 * t).toFixed(2)}deg) translateY(${(-18 * t).toFixed(2)}px)` }),
      t => ({ transform: `perspective(800px) rotateX(${(-62 * (1 - t)).toFixed(2)}deg) translateY(${(18 * (1 - t)).toFixed(2)}px)` }),
    ],
  ];
  const gapPairs = LINES.slice(0, -1).map((_, i) => DIR_PAIRS[i % DIR_PAIRS.length]);

  const TRANS_STD = 0.38;
  let renderedOut = -1;
  let renderedIn  = -1;
  let activeOverlay = null;
  let outInner = null;

  const desktopMQ = window.matchMedia('(min-width: 761px)');

  function setOverlay(which) {
    if (which === activeOverlay) return;
    activeOverlay = which;
    if (mapOverlay)     mapOverlay.classList.toggle('is-visible', which === 'map');
    if (transitOverlay) transitOverlay.classList.toggle('is-visible', which === 'transit');
  }

  let lastMapTop = null;
  let lastMapHeight = null;

  // Match the map's top + height to the address line's text block exactly,
  // so it spans from the top of "Find us..." to the bottom of "...10451."
  // (desktop side-by-side layout only — mobile uses a fixed, centered overlay).
  // Only touches the DOM when the value actually changes, so the floating
  // CSS animation on the inner card isn't interrupted by layout writes on
  // every scroll tick.
  function alignMapToText() {
    if (!mapOverlay) return;
    if (!desktopMQ.matches) {
      if (lastMapTop !== '') {
        mapOverlay.style.top    = '';
        mapOverlay.style.height = '';
        lastMapTop = '';
        lastMapHeight = '';
      }
      return;
    }
    if (!outInner) return;
    const top    = outInner.offsetTop + Math.round(outInner.offsetHeight * 0.35);
    const height = outInner.offsetHeight;
    if (top !== lastMapTop) {
      mapOverlay.style.top = top + 'px';
      lastMapTop = top;
    }
    if (height !== lastMapHeight) {
      mapOverlay.style.height = height + 'px';
      lastMapHeight = height;
    }
  }

  function update() {
    const sy     = window.scrollY;
    const vh     = window.innerHeight;
    const rect   = section.getBoundingClientRect();
    const top    = sy + rect.top;
    const travel = section.offsetHeight - vh;
    if (travel <= 0) return;

    const progress = Math.max(0, Math.min(N - 0.0001, (sy - top) / travel * N));
    const lineIdx  = Math.min(N - 1, Math.floor(progress));
    const linePos  = progress - lineIdx;
    const outIdx   = lineIdx;
    const inIdx    = lineIdx + 1;

    const inXfade = linePos >= (1 - TRANS_STD) && outIdx < N - 1;
    const xfadeT  = inXfade ? easeOut((linePos - (1 - TRANS_STD)) / TRANS_STD) : 0;

    if (outIdx !== renderedOut) {
      elOut.innerHTML = '<span class="halc-line-inner">' + LINES[outIdx] + '</span>';
      elOut.classList.toggle('halc-line--map', LINE_OVERLAY[outIdx] === 'map');
      outInner = elOut.querySelector('.halc-line-inner');
      renderedOut = outIdx;
    }
    if (inXfade && inIdx !== renderedIn) {
      elIn.innerHTML = '<span class="halc-line-inner">' + LINES[inIdx] + '</span>';
      elIn.classList.toggle('halc-line--map', LINE_OVERLAY[inIdx] === 'map');
      renderedIn = inIdx;
    }

    if (outIdx === 0) alignMapToText();

    if (inXfade) {
      const [outFn, inFn] = gapPairs[outIdx] || gapPairs[1];
      const outR = outFn(xfadeT);
      const inR  = inFn(xfadeT);
      elOut.style.opacity   = (1 - xfadeT).toFixed(4);
      elOut.style.transform = outR.transform;
      elOut.style.filter    = outR.filter || '';
      elOut.style.zIndex    = '1';
      elIn.style.opacity    = xfadeT.toFixed(4);
      elIn.style.transform  = inR.transform;
      elIn.style.filter     = inR.filter || '';
      elIn.style.zIndex     = '2';
      // Crossfading between two lines — show whichever target overlay belongs to the incoming line
      setOverlay(xfadeT > 0.5 ? LINE_OVERLAY[inIdx] : LINE_OVERLAY[outIdx]);
    } else {
      elOut.style.opacity   = '1';
      elOut.style.transform = 'none';
      elOut.style.filter    = '';
      elOut.style.zIndex    = '2';
      elIn.style.opacity    = '0';
      elIn.style.transform  = 'none';
      elIn.style.filter     = '';
      elIn.style.zIndex     = '1';
      setOverlay(LINE_OVERLAY[outIdx]);
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();
// ══════════════════════════════════════════════════════════════════════════
//  OBJECTIVE SECTION — scroll-driven full-page text sequence (mirrors About)
// ══════════════════════════════════════════════════════════════════════════
(function () {
  const section = document.querySelector('.objective-section');
  const elOut   = document.getElementById('obj-text-out');
  const elIn    = document.getElementById('obj-text-in');
  if (!section || !elOut || !elIn) return;

  // ── Lines ──────────────────────────────────────────────────────────────
  const LINES = [
    'The HALC is <span class="obj-gold">your complete academic</span> learning center at Hostos.',
    'We offer tutoring in <span class="obj-accent">most introductory courses.</span>',
    'Your tutor will guide you through <span class="obj-gold">course material and get you ready</span> for every exam.',
    'We also run workshops on <span class="obj-accent">study skills, time management,</span> and note-taking throughout the year.',
  ];

  const N = LINES.length;
  section.style.height = `${(N + 0.8) * 100}vh`;

  function easeOut(t) {
    t = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - t, 3);
  }

  // Opportunities: skew / stretch / flip effects — distinct from HALC
  const DIR_PAIRS = [
    // skew-left out → skew-right in
    [
      t => `skewX(${(-14 * t).toFixed(4)}deg) translateX(${(-40 * t).toFixed(2)}px)`,
      t => `skewX(${(14 * (1 - t)).toFixed(4)}deg) translateX(${(40 * (1 - t)).toFixed(2)}px)`,
    ],
    // scale-X stretch out → scale-X stretch in
    [
      t => `scaleX(${(1 + 0.3 * t).toFixed(4)}) scaleY(${(1 - 0.15 * t).toFixed(4)})`,
      t => `scaleX(${(0.7 + 0.3 * t).toFixed(4)}) scaleY(${(0.85 + 0.15 * t).toFixed(4)})`,
    ],
    // skew-right + drift up out → skew-left + drift in
    [
      t => `skewY(${(6 * t).toFixed(4)}deg) translateY(${(-50 * t).toFixed(2)}px)`,
      t => `skewY(${(-6 * (1 - t)).toFixed(4)}deg) translateY(${(50 * (1 - t)).toFixed(2)}px)`,
    ],
    // compress-Y out → expand-Y in
    [
      t => `scaleY(${(1 - 0.25 * t).toFixed(4)}) scaleX(${(1 + 0.1 * t).toFixed(4)})`,
      t => `scaleY(${(0.75 + 0.25 * t).toFixed(4)}) scaleX(${(1.1 - 0.1 * t).toFixed(4)})`,
    ],
    // diagonal skew out → diagonal skew in
    [
      t => `skewX(${(8 * t).toFixed(4)}deg) skewY(${(4 * t).toFixed(4)}deg)`,
      t => `skewX(${(-8 * (1 - t)).toFixed(4)}deg) skewY(${(-4 * (1 - t)).toFixed(4)}deg)`,
    ],
  ];
  const gapPairs = LINES.slice(0, -1).map((_, i) => DIR_PAIRS[i % DIR_PAIRS.length]);

  const TRANS_STD = 0.38;
  let renderedOut = -1;
  let renderedIn  = -1;

  function update() {
    const sy     = window.scrollY;
    const vh     = window.innerHeight;
    const rect   = section.getBoundingClientRect();
    const top    = sy + rect.top;
    const travel = section.offsetHeight - vh;
    if (travel <= 0) return;

    const progress = Math.max(0, Math.min(N - 0.0001, (sy - top) / travel * N));
    const lineIdx  = Math.min(N - 1, Math.floor(progress));
    const linePos  = progress - lineIdx;
    const outIdx   = lineIdx;
    const inIdx    = lineIdx + 1;

    const inXfade = linePos >= (1 - TRANS_STD) && outIdx < N - 1;
    const xfadeT  = inXfade ? easeOut((linePos - (1 - TRANS_STD)) / TRANS_STD) : 0;

    if (outIdx !== renderedOut) {
      elOut.innerHTML = LINES[outIdx];
      renderedOut = outIdx;
    }
    if (inXfade && inIdx !== renderedIn) {
      elIn.innerHTML = LINES[inIdx];
      renderedIn = inIdx;
    }

    if (inXfade) {
      const [outFn, inFn] = gapPairs[outIdx] || gapPairs[1];
      elOut.style.opacity   = (1 - xfadeT).toFixed(4);
      elOut.style.transform = outFn(xfadeT);
      elOut.style.zIndex    = '1';
      elIn.style.opacity    = xfadeT.toFixed(4);
      elIn.style.transform  = inFn(xfadeT);
      elIn.style.zIndex     = '2';
    } else {
      elOut.style.opacity   = '1';
      elOut.style.transform = 'none';
      elOut.style.zIndex    = '2';
      elIn.style.opacity    = '0';
      elIn.style.transform  = 'none';
      elIn.style.zIndex     = '1';
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();


// ══════════════════════════════════════════════════════════════════════════
//  ABOUT SECTION — scroll-driven full-page text sequence
//
//  Line 0: scroll-driven typing animation, then plain fade into line 1.
//  Lines 1+: random directional crossfades.
// ══════════════════════════════════════════════════════════════════════════
(function () {
  const section = document.querySelector('.about-section');
  const elOut   = document.getElementById('about-text-out');
  const elIn    = document.getElementById('about-text-in');
  if (!section || !elOut || !elIn) return;

  const LINE0_PLAIN = 'Hi,\u00a0I\u2019m Jackson.';
  const LINE0_HTML  = '<span class="about-violet">Hi,</span>\u00a0I\u2019m <span class="about-red">Jackson.</span>';

  const LINES = [
    LINE0_HTML,
    'I graduated from <span class="about-violet">Hunter College</span> in Spring\u00a02026 with a <span class="about-red">B.A. in Economics,</span> a minor in Mathematics and Business Studies.',
    'My journey with Hostos began as an <span class="about-violet">ePermit student,</span> and continued when I joined as a <span class="about-red">tutor at the\u00a0HALC</span> in Fall\u00a02025.',
    'I built this site to ensure students have what they need to <span class="about-violet">succeed</span> in their <span class="about-red">studies.</span>',
    'Questions, corrections, or just want to say hi?<br><span class="about-reach">Reach me at <a href="mailto:jackson.li19@stu-mail.hunter.cuny.edu">jackson.li19@stu-mail.hunter.cuny.edu</a></span>',
  ];

  const N = LINES.length;
  section.style.height = `${(N + 0.6) * 100}vh`;

  const wrapEl   = document.createElement('span');
  wrapEl.className = 'typing-wrap';
  const cursorEl = document.createElement('span');
  cursorEl.className = 'typing-cursor';
  cursorEl.textContent = '|';

  function buildTypingDOM(chars) {
    wrapEl.textContent = chars;
    wrapEl.appendChild(cursorEl);
    elOut.innerHTML = '';
    elOut.appendChild(wrapEl);
  }

  function easeOut(t) {
    t = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - t, 3);
  }

  const DIR_PAIRS = [
    [t => `translateX(${-120 * t}px)`, t => `translateX(${120 * (1 - t)}px)`],
    [t => `translateX(${120 * t}px)`,  t => `translateX(${-120 * (1 - t)}px)`],
    [t => `translateY(${-80 * t}px)`,  t => `translateY(${80 * (1 - t)}px)`],
    [t => `translateY(${80 * t}px)`,   t => `translateY(${-80 * (1 - t)}px)`],
  ];

  // Gap 0: plain fade only — no slide so "Hi" stays in place
  const GAP0_PAIR  = [t => 'none', t => 'none'];
  const otherPairs = [...DIR_PAIRS].sort(() => Math.random() - 0.5);
  const gapPairs   = LINES.slice(0, -1).map((_, i) =>
    i === 0 ? GAP0_PAIR : otherPairs[(i - 1) % otherPairs.length]
  );

  const TYPE_END    = 0.55;
  const TRANS_START = 0.65;
  const TRANS       = 1 - TRANS_START;
  const TRANS_STD   = 0.38;
  const CHARS0      = [...LINE0_PLAIN].length;

  let renderedOut   = -1;
  let renderedIn    = -1;
  let cursorVisible = true;

  function hideCursor() { cursorEl.style.opacity = '0'; cursorVisible = false; }

  function update() {
    const sy     = window.scrollY;
    const vh     = window.innerHeight;
    const rect   = section.getBoundingClientRect();
    const top    = sy + rect.top;
    const travel = section.offsetHeight - vh;
    if (travel <= 0) return;

    const progress = Math.max(0, Math.min(N - 0.0001, (sy - top) / travel * N));
    const lineIdx  = Math.min(N - 1, Math.floor(progress));
    const linePos  = progress - lineIdx;
    const outIdx   = lineIdx;
    const inIdx    = lineIdx + 1;

    if (outIdx === 0) {
      const inXfade = linePos >= TRANS_START;
      const xfadeT  = inXfade ? easeOut((linePos - TRANS_START) / TRANS) : 0;

      if (!inXfade) {
        const charCount = Math.min(CHARS0, Math.round((linePos / TYPE_END) * CHARS0));
        if (renderedOut !== 0) { renderedOut = 0; renderedIn = -1; }
        buildTypingDOM(LINE0_PLAIN.slice(0, charCount));
        if (!cursorVisible) { cursorEl.style.opacity = ''; cursorVisible = true; }
        elOut.style.opacity   = '1';
        elOut.style.transform = 'none';
        elOut.style.zIndex    = '2';
        elIn.style.opacity    = '0';
        elIn.style.transform  = 'none';
        elIn.style.zIndex     = '1';
        return;
      }

      if (cursorVisible) hideCursor();
      if (renderedOut !== 'line0-fading') {
        elOut.textContent = LINE0_PLAIN;
        renderedOut = 'line0-fading';
      }
      if (renderedIn !== 1) { elIn.innerHTML = LINES[1]; renderedIn = 1; }

      elOut.style.opacity   = (1 - xfadeT).toFixed(4);
      elOut.style.transform = 'none';
      elOut.style.zIndex    = '1';
      elIn.style.opacity    = xfadeT.toFixed(4);
      elIn.style.transform  = 'none';
      elIn.style.zIndex     = '2';
      return;
    }

    if (cursorVisible) hideCursor();

    const inXfade = linePos >= (1 - TRANS_STD) && outIdx < N - 1;
    const xfadeT  = inXfade ? easeOut((linePos - (1 - TRANS_STD)) / TRANS_STD) : 0;

    if (outIdx !== renderedOut) { elOut.innerHTML = LINES[outIdx]; renderedOut = outIdx; }
    if (inXfade && inIdx !== renderedIn) { elIn.innerHTML = LINES[inIdx]; renderedIn = inIdx; }

    if (inXfade) {
      const [outFn, inFn] = gapPairs[outIdx] || gapPairs[1];
      elOut.style.opacity   = (1 - xfadeT).toFixed(4);
      elOut.style.transform = outFn(xfadeT);
      elOut.style.zIndex    = '1';
      elIn.style.opacity    = xfadeT.toFixed(4);
      elIn.style.transform  = inFn(xfadeT);
      elIn.style.zIndex     = '2';
    } else {
      elOut.style.opacity   = '1';
      elOut.style.transform = 'none';
      elOut.style.zIndex    = '2';
      elIn.style.opacity    = '0';
      elIn.style.transform  = 'none';
      elIn.style.zIndex     = '1';
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();

// ══════════════════════════════════════════════════════════════════════════
//  OPPORTUNITIES SECTION — Apple-style staggered scroll-reveal (all lines listed)
// ══════════════════════════════════════════════════════════════════════════
(function () {
  const section = document.querySelector('.opps-section');
  if (!section) return;

  const LINES = [
    'Inspire, teach, and grow — <span class="opps-gold">become a tutor</span> at the HALC.',
    'We look for <span class="opps-green">knowledgeable, professional,</span> and dedicated tutors across all subjects.',
    'Help students build the <span class="opps-gold">skills and confidence</span> they need to succeed academically.',
    '<span class="opps-green">Qualifications:</span> a grade of B+ or better in the course you want to tutor.',
    'An overall <span class="opps-gold">GPA of 3.0 or higher</span> is required.',
    'Submit a <span class="opps-green">resume, faculty recommendation letter,</span> and unofficial transcript.',
    'Strong <span class="opps-gold">interpersonal and communication skills</span> are essential.',
    'Comfortable working with people from <span class="opps-green">diverse backgrounds.</span>',
    '<span class="opps-gold">Responsibilities:</span> use engaging activities to facilitate course material and study strategies.',
    'Participate in all <span class="opps-green">program meetings and professional development,</span> including pre-semester training.',
    'Complete tutoring logs, create session materials, and <span class="opps-gold">facilitate workshops.</span>',
    '<span class="opps-green">What we offer:</span> flexible schedule, maximum 19\u00a0hrs/wk.',
    'Starting at <span class="opps-gold">$19.12/hr.</span>',
    'To apply, click the link and email your documents to <span class="opps-green">halctutoring@hostos.cuny.edu.</span>',
  ];

  // Build the list into the stage
  const stage = section.querySelector('.opps-stage');
  if (!stage) return;
  stage.innerHTML = '';

  LINES.forEach((line, i) => {
    const p = document.createElement('p');
    p.className = 'opps-big-text opps-item';
    p.innerHTML = line;
    p.style.setProperty('--opps-i', i);
    stage.appendChild(p);
  });

  // Intersection observer — reveal each line as it enters the viewport
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.opps-item').forEach(el => el.classList.add('opps-visible'));
    return;
  }

  // Track batch timing: items that enter within the same scroll tick get a stagger
  let batchTimer = null;
  let batchCount = 0;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = batchCount * 80;
        batchCount++;
        clearTimeout(batchTimer);
        batchTimer = setTimeout(() => { batchCount = 0; }, 100);
        entry.target.style.transitionDelay = `${delay}ms`;
        entry.target.classList.add('opps-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.opps-item').forEach(el => obs.observe(el));
})();


// ══════════════════════════════════════════════════════════════════════════
//  APPOINTMENT HOW-TO — sticky phone + scroll-driven step sequence
// ══════════════════════════════════════════════════════════════════════════
(function () {
  const section = document.querySelector('.appt-howto-section');
  const phone   = document.getElementById('howtoPhone');
  const clock   = document.getElementById('howtoClock');
  const steps   = Array.from(document.querySelectorAll('.appt-howto-step'));
  if (!section || !phone || !steps.length) return;

  const N = steps.length;
  section.style.height = `${(N + 0.4) * 100}vh`;

  // ── Live US Eastern time ─────────────────────────────────────────────────
  function formatEastern(date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(date);
    const h = parts.find(p => p.type === 'hour').value;
    const m = parts.find(p => p.type === 'minute').value;
    return `${h}:${m}`;
  }

  // Set all phone clocks to real EST time on load, and tick every minute
  function syncAllClocks() {
    const now = new Date();
    const timeStr = formatEastern(now);
    // Update both the howto phone clock and the appt-section phone clock
    const allClocks = document.querySelectorAll('#howtoClock, #apptClock');
    allClocks.forEach(el => { if (el) el.textContent = timeStr; });
    // Schedule next update at the top of the next minute
    const secondsLeft = 60 - now.getSeconds();
    setTimeout(syncAllClocks, secondsLeft * 1000);
  }
  syncAllClocks();

  const nowEastern = new Date();
  const stepOffsetsMin = [0, 1, 2, 3, 5, 8, 11, 92];
  const stepClocks = stepOffsetsMin.map(min => formatEastern(new Date(nowEastern.getTime() + min * 60000)));

  // ── Step indicator dots ───────────────────────────────────────────────────
  const dots = phone ? Array.from(phone.querySelectorAll('.howto-dot')) : [];

  // Set howto clock to current real time (step 1)
  if (clock) clock.textContent = stepClocks[0];

  // Initialize: screen 1 fully visible from the start
  if (phone) {
    phone.style.setProperty('--screen-in-1',  '1');
    phone.style.setProperty('--screen-out-1', '0');
    for (let i = 2; i <= 8; i++) {
      phone.style.setProperty(`--screen-in-${i}`,  '0');
      phone.style.setProperty(`--screen-out-${i}`, '0');
    }
  }

  let activeIdx = -1;

  // ── Scroll-driven screen transition vars ──────────────────────────────────
  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function update() {
    const sy     = window.scrollY;
    const vh     = window.innerHeight;
    const rect   = section.getBoundingClientRect();
    const top    = sy + rect.top;
    const travel = section.offsetHeight - vh;
    if (travel <= 0) return;

    const progress = Math.max(0, Math.min(N - 0.0001, (sy - top) / travel * N));
    const idx = Math.min(N - 1, Math.floor(progress));
    const stepProgress = progress - Math.floor(progress);
    const TRANSITION = 0.28;

    for (let i = 0; i < N; i++) {
      let stepPos;
      if (i === idx)      stepPos = stepProgress;
      else if (i < idx)   stepPos = 1;
      else                stepPos = 0;

      const screenIn  = clamp(stepPos / TRANSITION);
      const screenOut = clamp((stepPos - (1 - TRANSITION)) / TRANSITION);

      phone.style.setProperty(`--screen-in-${i + 1}`,  easeInOut(screenIn).toFixed(3));
      phone.style.setProperty(`--screen-out-${i + 1}`, easeInOut(screenOut).toFixed(3));
    }

    // Update step dots
    dots.forEach((dot, i) => {
      const active = i === idx;
      dot.setAttribute('fill', active ? 'hsl(41,100%,43%)' : 'rgba(255,255,255,.3)');
      dot.setAttribute('r', active ? '4' : '3');
    });

    // Drive the in-step "tap" micro-animations (button press, date/time tap,
    // email pulse) directly off scroll position via a CSS custom property.
    // CSS pauses these animations and reads their elapsed time from a negative
    // animation-delay computed from this value, so they only move while the
    // user is actually scrolling through the step — no autoplay/looping.
    phone.style.setProperty('--howto-tap-progress', stepProgress.toFixed(4));

    if (idx !== activeIdx) {
      steps.forEach((s, i) => s.classList.toggle('is-active', i === idx));
      phone.setAttribute('data-step', String(idx + 1));
      if (clock) clock.textContent = stepClocks[idx];
      activeIdx = idx;
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
})();


(function () {
  const fields = document.querySelectorAll('.symbol-field');
  if (!fields.length) return;

  // Reveal symbols when section enters viewport
  const symObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const syms = entry.target.querySelectorAll('.sym');
      if (entry.isIntersecting) {
        syms.forEach(s => s.classList.add('sym--visible'));
      } else if (entry.boundingClientRect.top > 0) {
        syms.forEach(s => s.classList.remove('sym--visible'));
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });

  fields.forEach(f => symObserver.observe(f));

  // Parallax: each symbol moves at a rate proportional to its data-depth
  function updateSymParallax() {
    const vh = window.innerHeight;
    fields.forEach(field => {
      const section = field.closest('section');
      if (!section) return;
      const rect = section.getBoundingClientRect();
      // How far section has scrolled through viewport: -1 (above) to 1 (below)
      const progress = (vh * 0.5 - rect.top - rect.height * 0.5) / (vh * 0.5 + rect.height * 0.5);

      field.querySelectorAll('.sym').forEach(sym => {
        const depth = parseFloat(sym.dataset.depth || 0.4);
        // Symbols with higher depth move more — creates Z separation.
        // Amplitude capped at 50 and total travel clamped to ±35px
        // so symbols at top/bottom edges can't drift into the card zone.
        const ty = Math.max(-35, Math.min(35, -progress * depth * 50));
        // Only update the CSS custom property — the CSS keyframe animation
        // already incorporates --sym-ty, so we don't override transform here.
        sym.style.setProperty('--sym-ty', ty.toFixed(2) + 'px');
      });
    });
  }

  window.addEventListener('scroll', updateSymParallax, { passive: true });
  updateSymParallax();
})();

// ── Light / Dark mode toggle ──────────────────────────────────────────────
(function () {
  const btn   = document.getElementById('theme-toggle');
  const label = btn?.querySelector('.theme-toggle__label');
  const icon  = btn?.querySelector('.theme-toggle__icon');

  // Apply saved preference on every page — even subpages without the button
  const saved = localStorage.getItem('theme');
  if (saved === 'light') applyLight();

  if (btn) {
    btn.addEventListener('click', () => {
      if (document.body.classList.contains('light-mode')) {
        applyDark();
      } else {
        applyLight();
      }
    });
  }

  function applyLight() {
    document.body.classList.add('light-mode');
    if (label) label.textContent = 'Dark';
    if (icon)  icon.textContent  = '☾';
    localStorage.setItem('theme', 'light');
  }

  function applyDark() {
    document.body.classList.remove('light-mode');
    if (label) label.textContent = 'Light';
    if (icon)  icon.textContent  = '☀';
    localStorage.setItem('theme', 'dark');
  }
})();

/* ── SUBJECTS MARQUEE ── */
(function() {
  // All 19 subjects split exclusively across 3 rows — no subject ever appears
  // on more than one row at the same time.
  var allSubjects = [
    "Accounting","Biology","Business","Chemistry","Computer Science",
    "Dental Hygiene","Economics","Electrical Circuits","French","History",
    "Japanese","Mathematics","Nursing","Nutrition","Physics",
    "Psychology","Radiology","Sociology","Spanish"
  ];

  // Distribute subjects round-robin across 3 buckets so each row has ~6-7
  var row0List = [], row1List = [], row2List = [];
  allSubjects.forEach(function(s, i) {
    if      (i % 3 === 0) row0List.push(s);
    else if (i % 3 === 1) row1List.push(s);
    else                  row2List.push(s);
  });

  var colors = [
    "#ffffff",
    "hsl(41,100%,60%)",
    "hsl(202,79%,72%)",
    "hsl(174,68%,60%)",
    "hsl(270,55%,75%)",
    "hsl(356,74%,70%)",
    "hsl(141,55%,62%)"
  ];

  var WHITE_COLOR = "#ffffff";

  function assignColors(list) {
    var seq = [];
    list.forEach(function(_, i) {
      var avail = colors.filter(function(c) { return c !== seq[seq.length - 1]; });
      seq.push(avail[i % avail.length]);
    });
    if (seq.length > 1 && seq[seq.length - 1] === seq[0]) {
      var alt = colors.filter(function(c) { return c !== seq[seq.length - 2] && c !== seq[0]; });
      if (alt.length) seq[seq.length - 1] = alt[0];
    }
    return seq;
  }

  var rowConfig = [
    { trackId: "mqTrack0", dir:  1, speed: 0.55, list: row0List, reverse: false },
    { trackId: "mqTrack1", dir: -1, speed: 0.42, list: row1List, reverse: true  },
    { trackId: "mqTrack2", dir:  1, speed: 0.62, list: row2List, reverse: false }
  ];

  var offsets   = [0, 0, 0];
  var setWidths = [0, 0, 0];
  var tracks    = [];

  rowConfig.forEach(function(cfg, r) {
    var track = document.getElementById(cfg.trackId);
    if (!track) return;

    var list = cfg.reverse ? cfg.list.slice().reverse() : cfg.list;
    var colorSeq = assignColors(list);

    for (var rep = 0; rep < 10; rep++) {
      list.forEach(function(s, i) {
        var span = document.createElement("span");
        span.className = "mq-item" + (colorSeq[i] === WHITE_COLOR ? " mq-item--white" : "");
        span.style.color = colorSeq[i];
        span.innerHTML = s + '<span class="mq-dot" aria-hidden="true">◆</span>';
        track.appendChild(span);
      });
    }

    tracks.push({ track: track, list: list, cfg: cfg });

    requestAnimationFrame(function() {
      var items = track.querySelectorAll(".mq-item");
      var w = 0;
      for (var i = 0; i < list.length; i++) { if (items[i]) w += items[i].offsetWidth; }
      setWidths[r] = w;
    });
  });

  function getW(r) {
    if (setWidths[r] > 10) return setWidths[r];
    var items = tracks[r].track.querySelectorAll(".mq-item");
    var n = tracks[r].list.length;
    var w = 0;
    for (var i = 0; i < n && i < items.length; i++) w += items[i].offsetWidth;
    setWidths[r] = w || (tracks[r].track.scrollWidth / 10);
    return setWidths[r];
  }

  function loop() {
    tracks.forEach(function(_, i) {
      offsets[i] += rowConfig[i].speed * rowConfig[i].dir;
      var w = getW(i);
      offsets[i] = ((offsets[i] % w) + w) % w;
      tracks[i].track.style.transform = "translate3d(" + (-offsets[i]) + "px,0,0)";
    });
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  var scrollV = 0, decaying = false;

  function decay() {
    if (Math.abs(scrollV) < 0.2) { scrollV = 0; decaying = false; return; }
    tracks.forEach(function(_, i) { offsets[i] += scrollV * rowConfig[i].dir * 0.18; });
    scrollV *= 0.86;
    requestAnimationFrame(decay);
  }

  window.addEventListener("wheel", function(e) {
    var d = e.deltaY;
    scrollV += Math.min(Math.abs(d) * 0.6, 90) * (d > 0 ? 1 : -1);
    var skewBase = d > 0 ? 9 : -9;
    tracks.forEach(function(t, i) {
      var skew = skewBase * rowConfig[i].dir;
      t.track.querySelectorAll(".mq-item").forEach(function(el) {
        el.style.transform = "skewX(" + skew + "deg)";
      });
      setTimeout(function() {
        t.track.querySelectorAll(".mq-item").forEach(function(el) {
          el.style.transform = "skewX(0deg)";
        });
      }, 480);
    });
    if (!decaying) { decaying = true; decay(); }
  }, { passive: true });
})();

// HOME PARTICLE FIELD — removed; icons now use particle-like CSS animation
// (function () { ... })();

/* PARTICLE IIFE BODY REMOVED — start */
/*
    'hsl(41,100%,63%)',   // gold
    'hsl(41,100%,75%)',   // light gold
    'hsl(202,79%,68%)',   // sky blue
    'hsl(202,79%,85%)',   // light blue
    'hsl(270,55%,75%)',   // lavender
    'rgba(255,255,255,.55)', // white
  ];

  const COUNT  = 120;
  const LAYERS = 4; // parallax depth layers

  // ── Build particles ───────────────────────────────────────────────────
  const particles = Array.from({ length: COUNT }, (_, i) => ({
    x:     Math.random(),          // 0–1 normalised
    y:     Math.random(),
    r:     1.5 + Math.random() * 3.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    layer: (i % LAYERS) + 1,      // 1 (slowest) → 4 (fastest)
    speed: 0.04 + Math.random() * 0.06, // autonomous drift speed
    angle: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 0.002,
    pulse: Math.random() * Math.PI * 2, // phase for size pulsing
    alpha: 0.75 + Math.random() * 0.25,
    // connection radius (larger particles act as nodes)
    node:  Math.random() > 0.75,
  }));

  let W = 0, H = 0;

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  // Scroll progress 0→1 across the sticky section
  function scrollProgress() {
    const sy     = window.scrollY;
    const rect   = section.getBoundingClientRect();
    const top    = sy + rect.top;
    const travel = section.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    return Math.max(0, Math.min(1, (sy - top) / travel));
  }

  let raf;
  let lastT = 0;

  function draw(t) {
    raf = requestAnimationFrame(draw);
    const dt = Math.min(32, t - lastT) / 16; // normalised delta (~1 at 60fps)
    lastT = t;

    if (!W || !H) { resize(); return; }

    ctx.clearRect(0, 0, W, H);

    const prog = scrollProgress();
    // Fade canvas itself out in the final 30% of scroll
    canvas.style.opacity = Math.max(0, 1 - Math.max(0, (prog - 0.7) / 0.3)).toFixed(3);

    // Scroll-driven scatter: particles accelerate and spread as you scroll
    const scatter = prog * prog; // quadratic — slow start, fast finish

    // ── Update + draw particles ───────────────────────────────────────
    // Scroll offset per layer: deeper layers shift more, with scatter boost
    const layerOffsets = [0, prog * 80 + scatter * 60, prog * 180 + scatter * 120, prog * 310 + scatter * 200, prog * 460 + scatter * 300];

    particles.forEach(p => {
      // Autonomous drift — accelerates as you scroll
      const driftBoost = 1 + scatter * 4;
      p.angle += p.drift;
      p.x += Math.cos(p.angle) * p.speed * dt * 0.001 * driftBoost;
      p.y += Math.sin(p.angle) * p.speed * dt * 0.001 * driftBoost;
      p.pulse += 0.018 * dt;

      // Wrap around
      if (p.x < -0.02) p.x = 1.02;
      if (p.x >  1.02) p.x = -0.02;
      if (p.y < -0.02) p.y = 1.02;
      if (p.y >  1.02) p.y = -0.02;

      // Screen position with parallax offset
      const sx = p.x * W;
      const sy = (p.y * H) - layerOffsets[p.layer];
      const r  = p.r * (1 + 0.18 * Math.sin(p.pulse));

      // Fade particles near the edges of the canvas
      const edgeFade = Math.min(
        Math.min(sx / 60, (W - sx) / 60),
        Math.min(sy / 60, (H - sy) / 60),
        1
      );
      if (edgeFade <= 0) return;

      const alpha = p.alpha * Math.max(0, edgeFade);

      ctx.save();
      ctx.globalAlpha = alpha;
      // Glow: set shadow to the particle's own color
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 12 + r * 4;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      // Second pass — brighter core dot on top
      ctx.shadowBlur = 4;
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fill();
      ctx.restore();
    });

    // ── Draw connections between nearby node particles ────────────────
    const nodes = particles.filter(p => p.node);
    const MAX_DIST = 140;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const ax = a.x * W, ay = (a.y * H) - layerOffsets[a.layer];
        const bx = b.x * W, by = (b.y * H) - layerOffsets[b.layer];
        const dist = Math.hypot(ax - bx, ay - by);
        if (dist > MAX_DIST) continue;

        const lineAlpha = (1 - dist / MAX_DIST) * 0.35;
        ctx.save();
        ctx.globalAlpha = lineAlpha;
        ctx.shadowColor = 'hsl(41,100%,63%)';
        ctx.shadowBlur  = 6;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = 'hsl(41,100%,75%)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────
  resize();
  window.addEventListener('resize', () => { resize(); }, { passive: true });
  requestAnimationFrame(t => { lastT = t; draw(t); });

  // Pause when section is not visible
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        if (!raf) requestAnimationFrame(t => { lastT = t; draw(t); });
      } else {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });
  }, { threshold: 0 });
  obs.observe(section);
})();
*/ /* PARTICLE IIFE BODY REMOVED — end */
// ── CURSOR GLOW ────────────────────────────────────────────────────────────
(function () {
  const pin = document.querySelector('.splitintro-pin');
  if (!pin) return;

  const glow = document.createElement('div');
  glow.className = 'hero-cursor-glow';
  pin.appendChild(glow);

  let mx = -999, my = -999;
  let cx = -999, cy = -999;
  let raf;

  pin.addEventListener('mousemove', e => {
    const r = pin.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
  });

  pin.addEventListener('mouseleave', () => {
    mx = -999; my = -999;
  });

  function tick() {
    const speed = 0.07;
    cx += (mx - cx) * speed;
    cy += (my - cy) * speed;
    if (mx === -999) {
      glow.style.opacity = '0';
    } else {
      glow.style.opacity = '1';
      glow.style.left = cx + 'px';
      glow.style.top  = cy + 'px';
    }
    raf = requestAnimationFrame(tick);
  }
  tick();
})();

// ── BACKGROUND BLOBS ───────────────────────────────────────────────────────
(function () {
  const pin = document.querySelector('.splitintro-pin');
  if (!pin) return;

  const container = document.createElement('div');
  container.className = 'hero-blobs';
  container.setAttribute('aria-hidden', 'true');

  const blobs = [
    { cls: 'hero-blob hero-blob--1' },
    { cls: 'hero-blob hero-blob--2' },
    { cls: 'hero-blob hero-blob--3' },
  ];

  blobs.forEach(b => {
    const el = document.createElement('div');
    el.className = b.cls;
    container.appendChild(el);
  });

  pin.insertBefore(container, pin.firstChild);
})();