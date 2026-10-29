/* =========================================================
   СВАГРОСС — главная. Интерактив и моушн
   GSAP 3.13 (ScrollTrigger, SplitText) + Lenis
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (n, d = 2) => n.toFixed(d).replace('.', ',');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const plural = (n, forms) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
    return forms[2];
  };
  // типографика для текста, который собирает скрипт: предлоги, тире, числа с единицами
  const NBSP = ' ';
  const nb = (s) => {
    let out = s;
    for (let i = 0; i < 2; i++) {
      out = out.replace(/(^|[\s(«])(в|с|к|о|у|и|а|на|по|до|от|за|из|не|ни|без|для|под|при|со|во|об)\s/gi, `$1$2${NBSP}`);
    }
    return out
      .replace(/\s—/g, `${NBSP}—`)
      .replace(/(\d)\s(мм|м|мин|ч|часа|суток)(?=[\s.,;:)]|$)/g, `$1${NBSP}$2`);
  };
  const isVisible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const safe = (name, fn) => {
    try { return fn(); } catch (err) { console.error(`[svagross] ${name}:`, err); return undefined; }
  };

  const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HAS_GSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const root = document.documentElement;
  root.classList.add('js');

  if (HAS_GSAP) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    gsap.defaults({ ease: 'expo.out' });
  }

  /* ---------------------------------------------------------
     Плавный скролл (Lenis)
     --------------------------------------------------------- */
  let lenis = null;
  if (HAS_GSAP && !REDUCE && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.15,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    window.__lenis = lenis; // для отладки и автотестов
  }

  const scrollToTarget = (target) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.6, offset: el.id === 'top' ? 0 : -10 });
    else el.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' });
  };

  const lockScroll = (on) => {
    if (lenis) on ? lenis.stop() : lenis.start();
    document.body.style.overflow = on ? 'hidden' : '';
  };

  const hdr = $('#hdr');
  const gauge = $('#gauge');

  /* ---------------------------------------------------------
     Прелоадер: «погружение сваи» 0 → 6 м
     --------------------------------------------------------- */
  function prepHero() {
    if (!HAS_GSAP || REDUCE) return;
    gsap.set('.hero__title .ln > span', { yPercent: 130 });
    gsap.set('[data-hero-fade]', { autoAlpha: 0, y: 26 });
    gsap.set('.hero__media', { autoAlpha: 0, scale: 1.14 });
    gsap.set('.guides__h', { scaleX: 0 });
    gsap.set('.guides__v', { scaleY: 0 });
    gsap.set('.guides .cross', { autoAlpha: 0, rotate: -90 });
    gsap.set('.hdr', { yPercent: -100 });
  }

  function heroIntro() {
    if (!HAS_GSAP || REDUCE) { countUp($$('.hero [data-count]'), true); return; }
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero__media', { autoAlpha: 1, scale: 1, duration: 2.2 }, 0)
      .to('.hdr', { yPercent: 0, duration: 1.2, clearProps: 'transform' }, .3)
      .to('.hero__title .ln > span', { yPercent: 0, duration: 1.25, stagger: .09 }, .1)
      .to('.guides__h', { scaleX: 1, duration: 1.8, ease: 'expo.inOut' }, .1)
      .to('.guides__v', { scaleY: 1, duration: 1.8, ease: 'expo.inOut' }, .2)
      .to('.guides .cross', { autoAlpha: .7, rotate: 0, duration: 1.2 }, .9)
      .to('[data-hero-fade]', { autoAlpha: 1, y: 0, duration: 1.1, stagger: .06 }, .45)
      .add(() => countUp($$('.hero [data-count]')), .7)
      .to(gauge, { opacity: 1, duration: 1 }, .9);
  }

  function finishLoading() {
    document.body.classList.remove('is-loading');
    if (lenis) lenis.start();
  }

  function runPreloader() {
    const pre = $('#preloader');
    const ring = $('.preloader__ring');
    const glyph = $('.preloader__glyph');
    const depth = $('#preloaderDepth');
    const heroImg = $('.hero__media img');

    const ready = Promise.all([
      document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve(),
      heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve(),
    ]);

    // повторный визит в рамках сессии — без прелоадера
    let repeat = false;
    try { repeat = sessionStorage.getItem('svagross-pre') === '1'; sessionStorage.setItem('svagross-pre', '1'); } catch (e) { /* приватный режим */ }

    if (!pre || !HAS_GSAP || REDUCE || repeat) {
      if (HAS_GSAP && !REDUCE) prepHero();
      Promise.race([ready, wait(repeat ? 900 : 1500)]).then(() => {
        if (pre) pre.remove();
        finishLoading();
        if (gauge && (!HAS_GSAP || REDUCE)) gauge.style.opacity = 1;
        heroIntro();
        if (HAS_GSAP) ScrollTrigger.refresh();
      });
      return;
    }

    prepHero();
    const st = { p: 0 };
    const render = () => {
      ring.style.strokeDashoffset = (277.1 * (1 - st.p)).toFixed(2);
      depth.textContent = fmt(st.p * 6);
      glyph.style.transform = `rotate(${st.p * 540}deg)`;
    };
    const t0 = performance.now();
    const PREROLL = .75;
    gsap.to(st, { p: .8, duration: PREROLL, ease: 'power2.inOut', onUpdate: render });

    Promise.race([ready, wait(4000)]).then(() => {
      const left = Math.max(0, PREROLL - (performance.now() - t0) / 1000);
      gsap.to(st, {
        p: 1, duration: .4, ease: 'power3.inOut', delay: left, overwrite: true, onUpdate: render,
        onComplete: () => {
          gsap.timeline({ onComplete: () => pre.remove() })
            .to('.preloader__inner', { y: -40, autoAlpha: 0, duration: .5, ease: 'expo.in' }, 0)
            .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: .95, ease: 'expo.inOut' }, .15)
            .add(() => { finishLoading(); heroIntro(); ScrollTrigger.refresh(); }, .4);
        },
      });
    });
  }

  /* ---------------------------------------------------------
     Счётчики
     --------------------------------------------------------- */
  function countUp(els, instant) {
    els.forEach(el => {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';
      const end = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || '0', 10);
      if (instant || !HAS_GSAP || REDUCE) { el.textContent = fmt(end, dec); return; }
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v, dec); } });
    });
  }

  /* ---------------------------------------------------------
     Шапка: тема по секции, скрытие при скролле, шкала глубины
     --------------------------------------------------------- */
  function initHeaderThemes() {
    $$('[data-theme]').filter(el => el !== hdr).forEach(sec => {
      ScrollTrigger.create({
        trigger: sec, start: 'top top+=38', end: 'bottom top+=38',
        onToggle: self => { if (self.isActive && !hdr.classList.contains('is-menu')) hdr.dataset.theme = sec.dataset.theme; },
      });
      ScrollTrigger.create({
        trigger: sec, start: 'top center', end: 'bottom center',
        onToggle: self => { if (self.isActive && gauge) gauge.classList.toggle('is-dark', sec.dataset.theme === 'dark'); },
      });
    });
  }

  const gaugeValue = $('#gaugeValue');
  const gaugeTicks = $('#gaugeTicks');
  let lastY = 0;
  let lastDepth = '';
  let maxScroll = 1;
  const measureMax = () => { maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight); };

  function onScrollUI(y, limit) {
    hdr.classList.toggle('is-scrolled', y > 24);
    const goingDown = y > lastY + 2;
    const goingUp = y < lastY - 2;
    if (y > 320 && goingDown && !hdr.classList.contains('is-mega') && !hdr.contains(document.activeElement)) hdr.classList.add('is-hidden');
    else if (goingUp || y < 320) hdr.classList.remove('is-hidden');
    lastY = y;

    // вся страница = 6 метров сваи
    const p = clamp(y / (limit || maxScroll), 0, 1);
    const txt = (p > .0008 ? '−' : '') + fmt(p * 6);
    if (txt !== lastDepth) { lastDepth = txt; if (gaugeValue) gaugeValue.textContent = txt; }
    if (gaugeTicks) gaugeTicks.style.transform = `translate3d(0, ${-((y * .35) % 40)}px, 0)`;
  }

  function initScrollUI() {
    measureMax();
    window.addEventListener('resize', measureMax);
    if (HAS_GSAP) ScrollTrigger.addEventListener('refresh', measureMax);
    if (lenis) lenis.on('scroll', ({ scroll, limit }) => onScrollUI(scroll, limit));
    else window.addEventListener('scroll', () => onScrollUI(window.scrollY), { passive: true });
    onScrollUI(window.scrollY || 0);
  }

  /* ---------------------------------------------------------
     Мега-меню
     --------------------------------------------------------- */
  let restoringFocus = false;

  function initMega() {
    const items = $$('.nav-item[data-mega]');
    const panels = $$('[data-mega-panel]');
    let closeTimer = null;
    const setExpanded = (item, on) => { const a = $('.nav-link', item); if (a) a.setAttribute('aria-expanded', String(on)); };
    const closeAll = () => {
      panels.forEach(p => p.classList.remove('is-open'));
      items.forEach(i => { i.classList.remove('is-open'); setExpanded(i, false); });
      hdr.classList.remove('is-mega');
    };
    items.forEach(item => {
      const panel = $(`[data-mega-panel="${item.dataset.mega}"]`);
      const link = $('.nav-link', item);
      const open = () => {
        clearTimeout(closeTimer);
        panels.forEach(p => p.classList.toggle('is-open', p === panel));
        items.forEach(i => { const on = i === item; i.classList.toggle('is-open', on); setExpanded(i, on); });
        hdr.classList.add('is-mega');
        hdr.classList.remove('is-hidden');
      };
      item.addEventListener('mouseenter', open);
      item.addEventListener('focusin', () => { if (!restoringFocus) open(); });
      link.addEventListener('keydown', e => {
        if (e.key !== 'ArrowDown') return;
        e.preventDefault();
        open();
        const first = $('a', panel);
        if (first) first.focus();
      });
      panel.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); link.focus(); } });
    });
    hdr.addEventListener('mouseleave', () => { closeTimer = setTimeout(closeAll, 160); });
    hdr.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    hdr.addEventListener('focusout', e => { if (!hdr.contains(e.relatedTarget)) closeAll(); });
    hdr.addEventListener('focusin', () => hdr.classList.remove('is-hidden'));
    $$('.hdr__nav > .nav-link, .hdr__contacts, .hdr__logo, .hdr__actions').forEach(el => el.addEventListener('mouseenter', closeAll));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && hdr.classList.contains('is-mega')) closeAll(); });

    // превью в мега-меню: запоминаем желаемую картинку, чтобы быстрые наведения не путали кадр
    $$('[data-mega-img]').forEach(img => { img.dataset.want = img.getAttribute('src'); });
    $$('.mega__link[data-preview]').forEach(link => {
      const swap = () => {
        const img = $('[data-mega-img]', link.closest('.mega'));
        if (!img) return;
        const want = link.dataset.preview;
        if (img.dataset.want === want) return;
        img.dataset.want = want;
        if (!HAS_GSAP || REDUCE) { img.src = want; return; }
        gsap.killTweensOf(img);
        gsap.to(img, {
          autoAlpha: 0, y: 8, duration: .18, ease: 'power2.in',
          onComplete: () => { img.src = img.dataset.want; gsap.to(img, { autoAlpha: 1, y: 0, duration: .5 }); },
        });
      };
      link.addEventListener('mouseenter', swap);
      link.addEventListener('focus', swap);
    });
    return closeAll;
  }

  /* ---------------------------------------------------------
     Мобильное меню
     --------------------------------------------------------- */
  function initBurger() {
    const btn = $('#burger');
    const nav = $('#mnav');
    if (!btn || !nav) return () => {};
    const set = (on) => {
      if (on === nav.classList.contains('is-open')) return;
      btn.setAttribute('aria-expanded', String(on));
      btn.setAttribute('aria-label', on ? 'Закрыть меню' : 'Открыть меню');
      nav.classList.toggle('is-open', on);
      nav.setAttribute('aria-hidden', String(!on));
      hdr.classList.toggle('is-menu', on);
      hdr.classList.remove('is-hidden');
      if (on) { hdr.dataset.prevTheme = hdr.dataset.theme; hdr.dataset.theme = 'dark'; }
      else if (hdr.dataset.prevTheme) hdr.dataset.theme = hdr.dataset.prevTheme;
      [$('#main'), $('.ftr')].forEach(el => { if (el) el.inert = on; });
      lockScroll(on);
      if (on) {
        if (HAS_GSAP && !REDUCE) {
          gsap.fromTo($$('.mnav__list a, .mnav__foot > *', nav), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, stagger: .045, delay: .15 });
        }
        setTimeout(() => { const f = $('.mnav__list a', nav); if (f) f.focus({ preventScroll: true }); }, 220);
      }
    };
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    $$('a, button', nav).forEach(a => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); }
    });
    return () => set(false);
  }

  /* ---------------------------------------------------------
     Слои: демо-заглушка и заявка (стек, фокус, inert)
     --------------------------------------------------------- */
  const stack = [];
  const pageParts = () => [hdr, $('#main'), $('.ftr'), $('#mnav')].filter(Boolean);

  function openLayer(layer) {
    if (stack.some(s => s.layer === layer)) return;
    const back = document.activeElement;
    stack.forEach(s => { s.layer.inert = true; });
    stack.push({ layer, back });
    pageParts().forEach(el => { el.inert = true; });
    layer.inert = false;
    layer.classList.add('is-open');
    layer.setAttribute('aria-hidden', 'false');
    lockScroll(true);
    const target = $('[data-autofocus]', layer) || $('.modal__x', layer);
    setTimeout(() => { if (target) target.focus({ preventScroll: true }); }, 90);
  }

  function closeLayer(layer) {
    const i = stack.findIndex(s => s.layer === layer);
    if (i < 0) return;
    const [entry] = stack.splice(i, 1);
    layer.classList.remove('is-open');
    layer.setAttribute('aria-hidden', 'true');
    if (stack.length) {
      stack[stack.length - 1].layer.inert = false;
    } else {
      pageParts().forEach(el => { el.inert = false; });
      lockScroll(false);
    }
    let back = entry.back;
    if (!isVisible(back)) back = [$('#burger'), $('.hdr__logo')].find(isVisible);
    if (back && back.focus) {
      restoringFocus = true;
      back.focus({ preventScroll: true });
      restoringFocus = false;
    }
  }

  function initLayers() {
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !stack.length) return;
      closeLayer(stack[stack.length - 1].layer);
    });
  }

  function initDemo(closeMega) {
    const modal = $('#demoModal');
    const name = $('[data-demo-name]', modal);
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-demo]');
      if (!t) return;
      e.preventDefault();
      if (closeMega) closeMega();
      name.textContent = t.dataset.demo || 'Раздел';
      openLayer(modal);
    });
    $$('[data-close]', modal).forEach(b => b.addEventListener('click', () => closeLayer(modal)));
  }

  const OBJECT_MAP = [
    [/пирс|мостк|у воды|серии P/i, 'Пирс / мостки'],
    [/забор|ворот|огражд/i, 'Забор / ворота'],
    [/тепли|хоз|бан/i, 'Баня / хозпостройка'],
    [/террас|веранд/i, 'Терраса'],
    [/коммерч|бизнес|застрой|подряд/i, 'Коммерческий объект'],
    [/дом/i, 'Дом'],
  ];
  const TOPIC_COMMENT = {
    'Сваи серии L': 'Интересуют сваи серии L',
    'Сваи серии P': 'Интересуют сваи серии P',
    'Сваи под проект': 'Нужны сваи под параметры проекта',
    'Застройщик / подрядчик': 'Интересуют условия для застройщиков и подрядчиков',
  };

  function initDrawer() {
    const drawer = $('#requestDrawer');
    const form = $('form', drawer);
    const comment = $('[data-comment]', drawer);
    const eyebrow = $('[data-drawer-eyebrow]', drawer);
    const title = $('[data-drawer-title]', drawer);
    const defaults = { eyebrow: eyebrow.textContent, title: title.innerHTML, placeholder: comment.placeholder };
    const radios = $$('input[name="object"]', drawer);
    const selectObject = val => radios.forEach(r => { r.checked = r.value === val; });

    document.addEventListener('click', e => {
      const t = e.target.closest('[data-open-request]');
      if (!t) return;
      e.preventDefault();
      const topic = t.getAttribute('data-open-request') || '';
      form.classList.remove('is-sent');

      // каждый раз начинаем с исходного состояния; то, что человек ввёл сам, не трогаем
      eyebrow.textContent = defaults.eyebrow;
      title.innerHTML = defaults.title;
      comment.placeholder = defaults.placeholder;
      if (comment.value && comment.value === comment.dataset.auto) comment.value = '';
      selectObject('Дом');

      let auto = '';
      if (t.hasAttribute('data-calc-cta')) {
        auto = calcSummary();
        selectObject(calcObjectName());
      } else if (topic === 'Вопрос') {
        eyebrow.textContent = 'вопрос';
        title.textContent = 'Задайте вопрос';
        comment.placeholder = 'Ваш вопрос';
      } else if (topic) {
        const hit = OBJECT_MAP.find(([re]) => re.test(topic));
        if (hit) selectObject(hit[1]);
        auto = TOPIC_COMMENT[topic] || '';
      }
      if (auto && !comment.value) comment.value = auto;
      comment.dataset.auto = auto && comment.value === auto ? auto : '';
      openLayer(drawer);
    });
    $$('[data-close]', drawer).forEach(b => b.addEventListener('click', () => closeLayer(drawer)));
  }

  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('is-show'), 2800);
  }

  /* ---------------------------------------------------------
     Формы: маска телефона, валидация, демо-отправка
     --------------------------------------------------------- */
  function formatPhone(raw) {
    let d = raw.replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    // скобку закрываем только когда пошла 5-я цифра — иначе Backspace «застревает» на ")"
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length > 4) out += ') ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  }

  function initForms() {
    // без автоподстановки «+7 (» при фокусе: первая введённая 8 или 7 считается кодом страны
    $$('[data-phone]').forEach(inp => {
      inp.addEventListener('input', () => { inp.value = formatPhone(inp.value); });
      inp.addEventListener('blur', () => { if (inp.value.replace(/\D/g, '').length <= 1) inp.value = ''; });
    });
    $$('[data-file]').forEach(inp => {
      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0];
        const form = inp.closest('form');
        const label = $('[data-file-name]', form);
        const drop = inp.closest('.file-drop');
        if (!f) return;
        if (label) label.textContent = `прикреплён файл: ${f.name}`;
        if (drop) drop.classList.add('has-file');
        toast('Файл прикреплён — в демо он никуда не отправляется');
      });
    });
    $$('[data-form]').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const name = $('input[name="name"]', form);
        const phone = $('input[name="phone"]', form);
        const badName = !name.value.trim() || name.value.trim().length < 2;
        const badPhone = phone.value.replace(/\D/g, '').length !== 11;
        [[name, badName], [phone, badPhone]].forEach(([i, bad]) => {
          const f = i.closest('.field');
          f.classList.remove('is-error');
          i.removeAttribute('aria-invalid');
          if (bad) { void f.offsetWidth; f.classList.add('is-error'); i.setAttribute('aria-invalid', 'true'); }
        });
        if (badName || badPhone) {
          (badName ? name : phone).focus();
          toast(badName ? 'Укажите, как к вам обращаться' : 'Проверьте номер телефона');
          return;
        }
        const btn = $('button[type="submit"]', form);
        btn.classList.add('is-loading');
        btn.disabled = true;
        setTimeout(() => {
          btn.classList.remove('is-loading');
          btn.disabled = false;
          form.classList.add('is-sent');
          form.reset();
          $$('[data-file-name]', form).forEach(l => { l.textContent = l.closest('.file-drop') ? 'прикрепить чертёж или фото участка' : ''; });
          $$('.file-drop', form).forEach(d => d.classList.remove('has-file'));
          const ok = $('[data-form-success]', form);
          if (ok) ok.focus({ preventScroll: true });
        }, 1100);
      });
      $$('input', form).forEach(i => i.addEventListener('input', () => {
        const f = i.closest('.field');
        if (f) f.classList.remove('is-error');
        i.removeAttribute('aria-invalid');
      }));
    });
  }

  /* ---------------------------------------------------------
     Появления: заголовки по строкам, блоки, слова по скроллу
     --------------------------------------------------------- */
  // SplitText по умолчанию рвёт строки на неразрывных пробелах — делим только по обычным;
  // aria:'none' — текст остаётся настоящим текстом для экранных дикторов
  const SPLIT_OPTS = { wordDelimiter: { delimiter: / /, replaceWith: ' ' }, reduceWhiteSpace: false, aria: 'none' };

  function initReveals() {
    if (!HAS_GSAP || REDUCE) return;

    if (window.SplitText) {
      let refreshTimer = 0;
      $$('[data-split]').forEach(el => {
        const parts = el.classList.contains('h-split') ? $$(':scope > span', el) : [el];
        parts.forEach((part, k) => {
          let splitOnce = false;
          SplitText.create(part, {
            type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true, ...SPLIT_OPTS,
            onSplit(self) {
              // при пересплите (шрифты, ресайз) высоты блоков меняются — пересчитаем триггеры
              if (splitOnce) { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150); }
              splitOnce = true;
              return gsap.from(self.lines, {
                yPercent: 108, duration: 1.15, stagger: .08, delay: k * .09,
                scrollTrigger: { trigger: el, start: 'top 88%', once: true },
              });
            },
          });
        });
      });

      // слова подсвечиваются по мере прокрутки — делим после загрузки шрифтов
      const scrubWords = () => {
        $$('[data-scrub-words]').forEach(el => {
          const split = SplitText.create(el, { type: 'words', wordsClass: 'word', ...SPLIT_OPTS });
          gsap.fromTo(split.words, { opacity: .32 }, {
            opacity: 1, stagger: .1, ease: 'none',
            scrollTrigger: { trigger: el, start: el.dataset.scrubStart || 'top 92%', end: el.dataset.scrubEnd || 'bottom 52%', scrub: true },
          });
        });
        ScrollTrigger.refresh();
      };
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => safe('scrubWords', scrubWords));
    }

    // карточки — каскадом; только opacity, чтобы скрытые карточки оставались доступны с клавиатуры
    gsap.set('[data-reveal]', { opacity: 0 });
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      onEnter: batch => gsap.fromTo(batch, { y: 64, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .08, overwrite: true }),
    });
    document.addEventListener('focusin', e => {
      const card = e.target.closest && e.target.closest('[data-reveal]');
      if (card && +getComputedStyle(card).opacity < 1) gsap.to(card, { opacity: 1, y: 0, duration: .3, overwrite: true });
    });

    // счётчики вне героя
    $$('[data-count]').filter(el => !el.closest('.hero')).forEach(el => {
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => countUp([el]) });
    });
  }

  /* ---------------------------------------------------------
     Параллаксы и сцены
     --------------------------------------------------------- */
  function initParallax() {
    if (!HAS_GSAP || REDUCE) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 721px)', () => {
      // герой: свая «вкручивается» — уходит вниз и поворачивается
      gsap.to('.hero__media', {
        yPercent: 16, rotate: -4, scale: 1.06, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.hero__title', {
        yPercent: -18, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      // ступени выезжают лесенкой
      $$('.why-step').forEach((step, i) => {
        gsap.fromTo(step, { y: 140 + i * 50 }, {
          y: 0, ease: 'none',
          scrollTrigger: { trigger: '.why__steps', start: 'top bottom', end: 'top 45%', scrub: .6 },
        });
      });
    });
    mm.add('(max-width: 720px)', () => {
      gsap.to('.hero__media', {
        yPercent: 10, rotate: -3, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
    });

    gsap.fromTo('.why__media img', { yPercent: -4, scale: 1.1 }, {
      yPercent: 4, scale: 1.1, ease: 'none',
      scrollTrigger: { trigger: '.why__media', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.fromTo('[data-pause-media]', { yPercent: -8, scale: 1.12 }, {
      yPercent: 8, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.pause', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.fromTo('.factory__photo img', { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: '.factory__photo', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.fromTo('.formats__photo img', { yPercent: -5, scale: 1.08 }, {
      yPercent: 5, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.formats', start: 'top bottom', end: 'bottom top', scrub: true },
    });
    gsap.from('.formats__grid .cross', {
      autoAlpha: 0, rotate: -90, duration: 1, stagger: .06,
      scrollTrigger: { trigger: '.formats__grid', start: 'top 85%', once: true },
    });
    gsap.from('.format', {
      y: 40, opacity: 0, duration: 1.1, stagger: .1,
      scrollTrigger: { trigger: '.formats__grid', start: 'top 85%', once: true },
    });
    gsap.from('.ftr__h', { scaleX: 0, transformOrigin: 'left', duration: 1.8, ease: 'expo.inOut', scrollTrigger: { trigger: '.ftr', start: 'top 70%', once: true } });
    gsap.from('.ftr__v', { scaleY: 0, transformOrigin: 'top', duration: 1.8, ease: 'expo.inOut', scrollTrigger: { trigger: '.ftr', start: 'top 70%', once: true } });
    gsap.from('.ftr__lines .cross', { autoAlpha: 0, rotate: -90, duration: 1.2, delay: .9, scrollTrigger: { trigger: '.ftr', start: 'top 70%', once: true } });
  }

  /* ---------------------------------------------------------
     Устройство сваи: закреплённая сцена
     --------------------------------------------------------- */
  function initPile() {
    const stage = $('[data-pile-stage]');
    if (!stage) return;
    const steps = $$('[data-pile-steps] li', stage);
    const parts = $$('.ps-part, .ps-blade', stage);
    const hole = $('.ps-hole', stage);
    const calls = $$('[data-call]', stage);
    const labels = $$('[data-label]', stage);
    const noseam = $('.ps-noseam', stage);
    const clock = $('[data-clock]', stage);
    const bar = $('[data-clock-bar]', stage);
    const compare = $('[data-pile-compare]', stage);
    const drawing = $('[data-pile-drawing] svg', stage);
    const dims = $$('[data-dim]', stage);

    let current = -1;
    const setStep = (i) => {
      if (i === current) return;
      current = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      parts.forEach(p => p.classList.toggle('is-hot', +(p.dataset.part || 0) === i + 1));
      hole.classList.toggle('is-hot', i === 3);
      calls.forEach(c => c.classList.toggle('is-on', +c.dataset.call <= i + 1));
      labels.forEach(l => {
        l.classList.toggle('is-on', +l.dataset.label <= i + 1);
        l.classList.toggle('is-current', +l.dataset.label === i + 1);
      });
      noseam.classList.toggle('is-on', i >= 2);
      compare.classList.toggle('is-on', i >= 2);
    };
    const setClock = (t) => {
      const sec = Math.round(t * 150);
      clock.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
      bar.style.transform = `scaleX(${t})`;
    };
    const staticMode = () => {
      current = -1;
      steps.forEach(s => s.classList.add('is-active'));
      parts.forEach(p => p.classList.remove('is-hot'));
      calls.forEach(c => c.classList.add('is-on'));
      labels.forEach(l => l.classList.add('is-on'));
      noseam.classList.add('is-on');
      compare.classList.add('is-on');
      setClock(1);
    };

    if (!HAS_GSAP || REDUCE) { staticMode(); return; }

    const mm = gsap.matchMedia();
    mm.add('(min-width: 1181px) and (min-height: 640px)', () => {
      current = -1;
      setStep(0);
      setClock(0);
      gsap.set(drawing, { clipPath: 'inset(0 0 100% 0)' });
      gsap.set(dims, { autoAlpha: 0 });
      gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top 75%', once: true } })
        .to(drawing, { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'expo.inOut' })
        .to(dims, { autoAlpha: 1, duration: .8, stagger: .15 }, '-=.6');
      const st = ScrollTrigger.create({
        trigger: stage, start: 'top top', end: '+=260%', pin: true, refreshPriority: 1,
        onUpdate: self => {
          const p = self.progress;
          setStep(p < .25 ? 0 : p < .5 ? 1 : p < .72 ? 2 : 3);
          setClock(clamp((p - .72) / .24, 0, 1));
        },
      });
      ScrollTrigger.sort();
      return () => st.kill();
    });
    mm.add('(max-width: 1180px), (max-height: 639px)', () => {
      staticMode();
      setClock(0);
      ScrollTrigger.create({
        trigger: stage, start: 'top 70%', once: true,
        onEnter: () => { const o = { t: 0 }; gsap.to(o, { t: 1, duration: 2.4, ease: 'power2.inOut', onUpdate: () => setClock(o.t) }); },
      });
      ScrollTrigger.sort();
    });
  }

  /* ---------------------------------------------------------
     Сравнение: вкладки
     --------------------------------------------------------- */
  const CMP = {
    typical: {
      title: 'Типовая винтовая свая', img: 'assets/img/cmp-typical.webp', wide: true,
      rows: [
        ['конструкция', 'новая цельная труба, наконечник — из её тела', 'труба и наконечник — отдельные детали на сварке'],
        ['наконечник', 'формируется из тела трубы', 'отдельная деталь'],
        ['сварка', 'без отдельного шва наконечника', 'наконечник приварен к трубе'],
        ['качество', 'автоматизированная линия, контроль на всём цикле', 'зависит от точности изготовления и сварки'],
      ],
    },
    strip: {
      title: 'Ленточный фундамент', img: 'assets/img/cmp-strip.webp', wide: false,
      rows: [
        ['земляные работы', 'не нужны', 'траншея и вывоз грунта'],
        ['нагрузка', 'сразу после монтажа', 'после набора прочности бетона — до 28 суток'],
        ['сезон', 'нет бетона — нет зимнего прогрева', 'зимой — прогрев бетона и добавки'],
        ['рельеф', 'уклоны и перепады без подсыпки', 'на уклоне — сложнее и дороже'],
      ],
    },
    bored: {
      title: 'Буронабивные сваи', img: 'assets/img/cmp-bored.webp', wide: false,
      rows: [
        ['материалы', 'готовые сваи с завода', 'бетон, арматурные каркасы, опалубка'],
        ['нагрузка', 'сразу после монтажа', 'после набора прочности бетона'],
        ['сезон', 'нет бетона — нет зимнего прогрева', 'бетонирование зависит от температуры'],
        ['грунтовые воды', 'подходят для обводнённых грунтов', 'при высоком уровне — сложнее'],
      ],
    },
  };

  function initCompare() {
    const tabs = $$('[data-tab]');
    const ours = $('[data-cmp-ours]');
    const theirs = $('[data-cmp-theirs]');
    const title = $('[data-cmp-title]');
    const imgBox = $('[data-cmp-img]');
    if (!tabs.length) return;
    const rowHTML = (label, value) => `<div class="cmp-row"><dt>${nb(label)}</dt><dd>${nb(value)}</dd></div>`;
    const fill = (key) => {
      const d = CMP[key];
      ours.innerHTML = d.rows.map(r => rowHTML(r[0], r[1])).join('');
      theirs.innerHTML = d.rows.map(r => rowHTML(r[0], r[2])).join('');
      title.textContent = d.title;
      const img = $('img', imgBox);
      img.src = d.img;
      img.alt = d.title;
      img.classList.toggle('is-wide', d.wide);
    };
    const show = (key, animate) => {
      tabs.forEach(t => {
        const on = t.dataset.tab === key;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      if (!animate || !HAS_GSAP || REDUCE) { fill(key); return; }
      const rows = () => [...$$('.cmp-row', ours), ...$$('.cmp-row', theirs)];
      gsap.timeline()
        .to(rows(), { autoAlpha: 0, x: -14, duration: .22, stagger: .02, ease: 'power2.in' }, 0)
        .to(imgBox, { clipPath: 'inset(0 0 0 100%)', duration: .4, ease: 'expo.in' }, 0)
        .to(title, { autoAlpha: 0, duration: .2 }, 0)
        .add(() => fill(key))
        .fromTo(imgBox, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: .9 })
        .to(title, { autoAlpha: 1, duration: .4 }, '<')
        .add(() => { gsap.fromTo(rows(), { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, duration: .7, stagger: .04 }); }, '<');
    };
    tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.tab, true)));
    $('[data-tabs]').addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0 || (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft')) return;
      e.preventDefault();
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus();
      n.click();
    });
    show('typical', false);
  }

  /* ---------------------------------------------------------
     Калькулятор свайного поля
     --------------------------------------------------------- */
  const CALC_CFG = {
    house: { name: 'Дом', label: 'дом', s: 2.5, series: 'L', d: 108, mode: 'frame', len: [4, 20, 10], wid: [4, 14, 8] },
    bath:  { name: 'Баня / хозпостройка', label: 'баня / хозблок', s: 2, series: 'L', d: 89, mode: 'frame', len: [3, 10, 6], wid: [3, 8, 4] },
    deck:  { name: 'Терраса', label: 'терраса', s: 2, series: 'L', d: 89, mode: 'grid', len: [2, 14, 6], wid: [2, 8, 4] },
    fence: { name: 'Забор / ворота', label: 'забор', s: 2.5, series: 'L', d: 76, mode: 'line', len: [10, 200, 40], wid: null },
    pier:  { name: 'Пирс / мостки', label: 'пирс', s: 2, series: 'P', d: 108, mode: 'pier', len: [3, 30, 10], wid: [1.5, 4, 2] },
  };
  const CALC_NOTES = {
    frame: 'Оценка по типовой схеме: периметр и несущие линии.',
    grid: 'Оценка по типовой схеме: равномерная сетка опор под настил.',
    line: 'Оценка по типовой схеме: одна линия опор с равным шагом.',
    pier: 'Оценка по типовой схеме: два ряда опор по краям настила.',
  };
  const calc = { type: 'house', len: 10, wid: 8 };

  function calcPositions(cfg, L, W) {
    const pts = new Map();
    const add = (x, y) => { const k = `${x.toFixed(2)}:${y.toFixed(2)}`; if (!pts.has(k)) pts.set(k, [x, y]); };
    const nx = Math.ceil(L / cfg.s) + 1;
    const xs = Array.from({ length: nx }, (_, i) => i * L / (nx - 1));
    if (cfg.mode === 'line') { xs.forEach(x => add(x, 0)); return [...pts.values()]; }
    if (cfg.mode === 'pier') { xs.forEach(x => { add(x, 0); add(x, W); }); return [...pts.values()]; }
    const ny = Math.ceil(W / cfg.s) + 1;
    const ys = Array.from({ length: ny }, (_, j) => j * W / (ny - 1));
    if (cfg.mode === 'grid') { xs.forEach(x => ys.forEach(y => add(x, y))); return [...pts.values()]; }
    // frame: периметр + несущие линии
    xs.forEach(x => { add(x, 0); add(x, W); });
    ys.forEach(y => { add(0, y); add(L, y); });
    const rows = W >= 11 ? 2 : W >= 5.5 ? 1 : 0;
    for (let r = 1; r <= rows; r++) { const y = W * r / (rows + 1); xs.forEach(x => add(x, y)); }
    return [...pts.values()];
  }

  function calcObjectName() { return CALC_CFG[calc.type].name; }
  function calcSummary() {
    const cfg = CALC_CFG[calc.type];
    const n = calcPositions(cfg, calc.len, cfg.wid ? calc.wid : 0).length;
    const size = cfg.wid ? `${fmt(calc.len, calc.len % 1 ? 1 : 0)} × ${fmt(calc.wid, calc.wid % 1 ? 1 : 0)} м` : `${fmt(calc.len, 0)} м`;
    return `Оценка с сайта: ${cfg.label} ${size} — около ${n} ${plural(n, ['сваи', 'свай', 'свай'])}, серия ${cfg.series}, Ø ${cfg.d} мм.`;
  }

  function initCalc() {
    const svg = $('.plan__svg');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const rLen = $('#rLen'), rWid = $('#rWid'), oLen = $('#oLen'), oWid = $('#oWid');
    const widBox = $('[data-range="wid"]');
    const countEl = $('[data-calc-count]'), wordEl = $('[data-calc-word]'), metaEl = $('[data-calc-meta]'), noteEl = $('[data-calc-note]');
    const lenLabel = $('label[for="rLen"]');
    const VB = { w: 520, h: 380, pad: 58 };
    const layer = (cls) => { const g = document.createElementNS(NS, 'g'); g.setAttribute('class', cls); svg.appendChild(g); return g; };
    const gBase = layer('plan__base');
    const gPiles = layer('plan__piles');
    let circles = [];
    let shown = 0;
    const anim = HAS_GSAP && !REDUCE;

    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
      if (parent) parent.appendChild(n);
      return n;
    };
    const paintRange = (input) => {
      const p = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.setProperty('--p', p + '%');
    };
    const setRange = (input, [min, max], value) => {
      input.min = min; input.max = max;
      input.step = max - min > 40 ? 1 : .5;
      input.value = value;
      paintRange(input);
    };
    const m = v => `${fmt(v, v % 1 ? 1 : 0)}${NBSP}м`;

    const render = (animate) => {
      const cfg = CALC_CFG[calc.type];
      const L = calc.len;
      const W = cfg.wid ? calc.wid : 0;
      const pts = calcPositions(cfg, L, W);
      const innerW = VB.w - VB.pad * 2;
      const innerH = VB.h - VB.pad * 2;
      const scale = cfg.mode === 'line' ? innerW / L : Math.min(innerW / L, innerH / Math.max(W, .1));
      const w = L * scale, h = W * scale;
      const ox = (VB.w - w) / 2, oy = (VB.h - h) / 2;
      const r = clamp(scale * .16, 2.6, 8);

      gBase.innerHTML = '';
      if (cfg.mode === 'pier') {
        el('rect', { class: 'plan__water', x: ox - 6, y: 18, width: VB.w - ox + 6, height: VB.h - 36 }, gBase);
        el('path', { class: 'plan__shore', d: `M${ox - 6} 18 C ${ox - 20} ${VB.h * .35}, ${ox + 8} ${VB.h * .6}, ${ox - 6} ${VB.h - 18}` }, gBase);
        el('text', { class: 'plan__legend', x: ox + w - 2, y: VB.h - 26, 'text-anchor': 'end' }, gBase).textContent = 'вода';
        el('text', { class: 'plan__legend', x: ox - 14, y: 34, 'text-anchor': 'end' }, gBase).textContent = 'берег';
      }
      if (cfg.mode === 'line') {
        el('line', { class: 'plan__beam', x1: ox, y1: oy, x2: ox + w, y2: oy, style: 'opacity:.8;stroke-dasharray:none' }, gBase);
      } else {
        el('rect', { class: 'plan__outline', x: ox, y: oy, width: w, height: h }, gBase);
        if (cfg.mode === 'frame') {
          const rows = W >= 11 ? 2 : W >= 5.5 ? 1 : 0;
          for (let k = 1; k <= rows; k++) {
            const y = oy + h * k / (rows + 1);
            el('line', { class: 'plan__beam', x1: ox, y1: y, x2: ox + w, y2: y }, gBase);
          }
        }
      }
      const dy = cfg.mode === 'line' ? oy - 38 : oy - 26;
      el('line', { class: 'plan__dim', x1: ox, y1: dy, x2: ox + w, y2: dy }, gBase);
      el('line', { class: 'plan__dim', x1: ox, y1: dy - 5, x2: ox, y2: dy + 5 }, gBase);
      el('line', { class: 'plan__dim', x1: ox + w, y1: dy - 5, x2: ox + w, y2: dy + 5 }, gBase);
      el('text', { class: 'plan__dim-text', x: ox + w / 2, y: dy - 8, 'text-anchor': 'middle' }, gBase).textContent = m(L);
      if (cfg.mode !== 'line') {
        const dx = ox - 24;
        el('line', { class: 'plan__dim', x1: dx, y1: oy, x2: dx, y2: oy + h }, gBase);
        el('line', { class: 'plan__dim', x1: dx - 5, y1: oy, x2: dx + 5, y2: oy }, gBase);
        el('line', { class: 'plan__dim', x1: dx - 5, y1: oy + h, x2: dx + 5, y2: oy + h }, gBase);
        el('text', { class: 'plan__dim-text', x: dx - 8, y: oy + h / 2, 'text-anchor': 'middle', transform: `rotate(-90 ${dx - 8} ${oy + h / 2})` }, gBase).textContent = m(W);
      } else {
        el('text', { class: 'plan__legend', x: ox + w / 2, y: oy + 40, 'text-anchor': 'middle' }, gBase).textContent = `шаг ≈${NBSP}${fmt(L / (pts.length - 1), 1)}${NBSP}м`;
      }

      // сваи: переиспользуем кружки, чтобы схема «перетекала»
      pts.forEach(([x, y], i) => {
        const cx = ox + x * scale, cy = oy + y * scale;
        let c = circles[i];
        if (!c) {
          c = el('circle', { class: 'plan__pile', cx, cy, r }, gPiles);
          circles[i] = c;
          c.dataset.r = r;
          if (animate && anim) gsap.fromTo(c, { attr: { r: 0 } }, { attr: { r }, duration: .6, delay: Math.min(i * .012, .5), ease: 'back.out(2.5)' });
        } else {
          c.dataset.r = r;
          if (animate && anim) gsap.to(c, { attr: { cx, cy, r }, duration: .5, ease: 'expo.out', overwrite: true });
          else { c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r); }
        }
      });
      for (let i = pts.length; i < circles.length; i++) {
        const c = circles[i];
        if (animate && anim) gsap.to(c, { attr: { r: 0 }, duration: .3, ease: 'power2.in', overwrite: true, onComplete: () => c.remove() });
        else c.remove();
      }
      circles = circles.slice(0, pts.length);

      const n = pts.length;
      wordEl.textContent = plural(n, ['свая', 'сваи', 'свай']);
      metaEl.textContent = nb(`серия ${cfg.series} · Ø ${cfg.d} мм · шаг до ${fmt(cfg.s, cfg.s % 1 ? 1 : 0)} м`);
      if (noteEl) noteEl.textContent = nb(`${CALC_NOTES[cfg.mode]} Количество и типоразмер уточним по нагрузкам и грунту.`);
      if (animate && anim) {
        const o = { v: shown };
        gsap.to(o, { v: n, duration: .6, ease: 'power3.out', overwrite: true, onUpdate: () => { countEl.textContent = Math.round(o.v); } });
      } else countEl.textContent = n;
      shown = n;
      oLen.textContent = m(L);
      if (cfg.wid) oWid.textContent = m(W);
    };

    const applyType = (type, animate) => {
      calc.type = type;
      const cfg = CALC_CFG[type];
      calc.len = cfg.len[2];
      setRange(rLen, cfg.len, calc.len);
      lenLabel.textContent = cfg.mode === 'line' ? 'длина забора' : cfg.mode === 'pier' ? 'длина пирса' : 'длина';
      if (cfg.wid) { calc.wid = cfg.wid[2]; setRange(rWid, cfg.wid, calc.wid); widBox.hidden = false; }
      else widBox.hidden = true;
      render(animate);
    };

    let raf = 0;
    const onRange = () => {
      calc.len = parseFloat(rLen.value);
      calc.wid = parseFloat(rWid.value);
      paintRange(rLen); paintRange(rWid);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => render(true));
    };
    rLen.addEventListener('input', onRange);
    rWid.addEventListener('input', onRange);
    $$('input[name="ctype"]').forEach(i => i.addEventListener('change', () => applyType(i.value, true)));

    applyType('house', false);
    if (anim) {
      // первое появление: сваи «вкручиваются» в план по очереди
      const initial = circles.slice();
      gsap.set(initial, { attr: { r: 0 } });
      ScrollTrigger.create({
        trigger: '.plan', start: 'top 80%', once: true,
        onEnter: () => initial.forEach((c, i) => {
          if (circles.indexOf(c) === -1) return;
          gsap.to(c, { attr: { r: +c.dataset.r }, duration: .7, delay: i * .025, ease: 'back.out(2.5)' });
        }),
      });
    }
  }

  /* ---------------------------------------------------------
     5 шагов: поворотная шкала
     --------------------------------------------------------- */
  function initDial() {
    const section = $('#steps');
    const pin = $('[data-steps-pin]');
    const dial = $('[data-dial]');
    if (!dial || !pin) return;
    const cards = $$('.step-card', dial);
    const labelsBox = $('[data-dial-labels]');
    const STEP = 21;

    // лента карточек для телефонов и режима «меньше движения»
    const mob = document.createElement('div');
    mob.className = 'steps-mobile';
    cards.forEach((c, i) => { const n = c.cloneNode(true); n.classList.toggle('is-active', i === 0); mob.appendChild(n); });
    pin.appendChild(mob);
    mob.addEventListener('scroll', () => {
      const first = mob.children[0];
      if (!first) return;
      const stepW = first.getBoundingClientRect().width + 8;
      const idx = clamp(Math.round(mob.scrollLeft / stepW), 0, mob.children.length - 1);
      Array.from(mob.children).forEach((c, i) => c.classList.toggle('is-active', i === idx));
    }, { passive: true });

    // шкала: деления через pathLength
    const minor = $('.dial__minor', dial), major = $('.dial__major', dial);
    minor.setAttribute('pathLength', '360'); minor.setAttribute('stroke-dasharray', '0.1 1.4'); minor.setAttribute('stroke-dashoffset', '0.05');
    major.setAttribute('pathLength', '360'); major.setAttribute('stroke-dasharray', '0.18 7.32'); major.setAttribute('stroke-dashoffset', '0.09');

    // подписи: шкала погружения от 0 м, каждые 15°
    const labels = [];
    for (let a = -45; a <= 165; a += 15) {
      const s = document.createElement('span');
      s.className = 'dial__label';
      s.textContent = fmt((a + 45) / 15 * .5, 1);
      s.style.transform = `rotate(${a}deg)`;
      s.dataset.a = a;
      labelsBox.appendChild(s);
      labels.push(s);
    }
    cards.forEach((c, i) => { c.style.transform = `rotate(${i * STEP}deg)`; });

    const setActive = (rot) => {
      const idx = clamp(Math.round(-rot / STEP), 0, cards.length - 1);
      cards.forEach((c, i) => c.classList.toggle('is-active', i === idx));
      labels.forEach(l => l.classList.toggle('is-hot', Math.abs(+l.dataset.a + rot) < 7.5));
    };

    if (!HAS_GSAP || REDUCE) { section.classList.add('steps--static'); setActive(0); return; }

    const mm = gsap.matchMedia();
    mm.add('(min-width: 721px)', () => {
      const st = { rot: STEP * .7 };
      const apply = () => { dial.style.setProperty('--rot', `${st.rot}deg`); setActive(st.rot); };
      apply();
      const tw = gsap.to(st, {
        rot: -(cards.length - 1) * STEP - STEP * .5,
        ease: 'none',
        onUpdate: apply,
        scrollTrigger: { trigger: pin, start: 'top top', end: `+=${cards.length * 70}%`, pin: true, scrub: .8, refreshPriority: 1 },
      });
      gsap.from(['.dial__ticks', labelsBox], { autoAlpha: 0, duration: 1.4, scrollTrigger: { trigger: section, start: 'top 75%', once: true } });
      gsap.from(cards, { autoAlpha: 0, duration: 1, stagger: .08, scrollTrigger: { trigger: section, start: 'top 60%', once: true } });
      ScrollTrigger.sort();
      return () => { if (tw.scrollTrigger) tw.scrollTrigger.kill(); tw.kill(); };
    });
  }

  /* ---------------------------------------------------------
     Бегущая строка — скорость зависит от скролла, работает только в кадре
     --------------------------------------------------------- */
  function initMarquee() {
    const track = $('[data-marquee]');
    if (!track) return;
    const count = track.children.length;
    track.innerHTML += track.innerHTML;
    if (!HAS_GSAP || REDUCE) return;
    let x = 0, period = 0, boost = 0, visible = false;
    // период = расстояние до первого элемента второй копии (учитывает gap)
    const measure = () => { period = track.children[count].offsetLeft - track.children[0].offsetLeft; };
    measure();
    if (document.fonts) document.fonts.ready.then(measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(track);
    ScrollTrigger.create({ trigger: track.parentElement, start: 'top bottom', end: 'bottom top', onToggle: s => { visible = s.isActive; } });
    if (lenis) lenis.on('scroll', ({ velocity }) => { boost = clamp(Math.abs(velocity) * 1.6, 0, 40); });
    gsap.ticker.add((t, dt) => {
      if (!visible || document.hidden || !period) return;
      x -= (60 + boost * 18) * (dt / 1000);
      boost *= .92;
      if (-x >= period) x += period;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* ---------------------------------------------------------
     FAQ — плавное раскрытие, один открытый вопрос
     --------------------------------------------------------- */
  function initAccordion() {
    const items = $$('.acc__item');
    items.forEach(i => { i.dataset.state = i.open ? 'open' : 'closed'; });
    const animate = (item, open) => {
      const body = $('.acc__body', item);
      item.dataset.state = open ? 'open' : 'closed';
      if (!HAS_GSAP || REDUCE) { item.open = open; return; }
      gsap.killTweensOf(body);
      if (open) {
        const from = item.open ? body.getBoundingClientRect().height : 0;
        item.open = true;
        gsap.fromTo(body, { height: from }, { height: 'auto', duration: .7, ease: 'expo.out', onComplete: () => { body.style.height = ''; } });
        gsap.fromTo($('p', body), { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .7, delay: .05 });
      } else {
        gsap.to(body, {
          height: 0, duration: .45, ease: 'expo.inOut',
          onComplete: () => { if (item.dataset.state === 'closed') item.open = false; body.style.height = ''; },
        });
      }
    };
    items.forEach(item => {
      $('summary', item).addEventListener('click', e => {
        e.preventDefault();
        const willOpen = item.dataset.state !== 'open';
        items.forEach(o => { if (o !== item && o.dataset.state === 'open') animate(o, false); });
        animate(item, willOpen);
      });
    });
  }

  /* ---------------------------------------------------------
     Чат в блоке заявки
     --------------------------------------------------------- */
  function initChat() {
    const chat = $('[data-chat]');
    if (!chat) return;
    const msgs = $$('[data-chat-msg]', chat);
    const typing = $('[data-chat-typing]', chat);
    if (!HAS_GSAP || REDUCE) { typing.style.display = 'none'; return; }
    gsap.set(msgs, { autoAlpha: 0, y: 16 });
    gsap.set(typing, { autoAlpha: 0, display: 'none' });
    ScrollTrigger.create({
      trigger: chat, start: 'top 80%', once: true,
      onEnter: () => {
        gsap.timeline()
          .to(msgs[0], { autoAlpha: 1, y: 0, duration: .8 })
          .set(typing, { display: 'inline-flex' }, '+=.3')
          .to(typing, { autoAlpha: 1, duration: .3 })
          .to(typing, { autoAlpha: 0, duration: .2 }, '+=1.4')
          .set(typing, { display: 'none' })
          .to(msgs[1], { autoAlpha: 1, y: 0, duration: .8 });
      },
    });
  }

  /* ---------------------------------------------------------
     Карточки решений: «+» показывает типовой подбор
     --------------------------------------------------------- */
  function initSpecs() {
    $$('[data-spec-toggle]').forEach(b => b.addEventListener('click', () => {
      const card = b.closest('.app-card');
      const on = !card.classList.contains('is-spec');
      card.classList.toggle('is-spec', on);
      b.setAttribute('aria-expanded', String(on));
      b.setAttribute('aria-label', on ? 'Скрыть типовой подбор' : 'Показать типовой подбор');
    }));
  }

  /* ---------------------------------------------------------
     Якоря
     --------------------------------------------------------- */
  function initAnchors(closeMega) {
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-scroll-to]');
      if (!a) {
        const dead = e.target.closest('a[href="#"]');
        if (dead && !dead.hasAttribute('data-demo')) e.preventDefault();
        return;
      }
      e.preventDefault();
      if (closeMega) closeMega();
      scrollToTarget(a.getAttribute('data-scroll-to'));
    });
  }

  /* ---------------------------------------------------------
     Старт: прелоадер первым, каждый модуль изолирован от ошибок соседей
     --------------------------------------------------------- */
  // страховка: что бы ни случилось, через 9 с страница должна быть видна и прокручиваться
  setTimeout(() => {
    if (!document.body.classList.contains('is-loading')) return;
    const pre = $('#preloader');
    if (pre) pre.remove();
    finishLoading();
    if (HAS_GSAP) gsap.set(['.hero__title .ln > span', '[data-hero-fade]', '.hero__media', '.hdr'], { clearProps: 'all' });
    if (gauge) gauge.style.opacity = 1;
  }, 9000);

  safe('preloader', runPreloader);
  const closeMega = safe('mega', initMega);
  safe('burger', initBurger);
  safe('layers', initLayers);
  safe('demo', () => initDemo(closeMega));
  safe('drawer', initDrawer);
  safe('forms', initForms);
  safe('specs', initSpecs);
  safe('anchors', () => initAnchors(closeMega));
  safe('compare', initCompare);
  safe('calc', initCalc);
  safe('accordion', initAccordion);
  if (HAS_GSAP) {
    safe('headerThemes', initHeaderThemes);
    safe('reveals', initReveals);
    safe('parallax', initParallax);
  }
  safe('pile', initPile);
  safe('dial', initDial);
  if (HAS_GSAP) safe('chat', initChat);
  safe('marquee', initMarquee);
  safe('scrollUI', initScrollUI);
  if (HAS_GSAP) { ScrollTrigger.sort(); ScrollTrigger.refresh(); }

  window.addEventListener('load', () => { if (HAS_GSAP) ScrollTrigger.refresh(); });
})();
