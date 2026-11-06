/* AirStep demo v2 — логика сайта (всё на клиенте, данные в localStorage) */
(() => {
'use strict';

const P = (window.PRODUCTS || []).slice();
const BY_ID = Object.fromEntries(P.map(p => [p.id, p]));
const REVIEWS = window.REVIEWS || [];
const GEO = window.GEO;
const MANAGER = 'AirStep_manager';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $('#view');
const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24">${ICONS[n] || ''}</svg>`;
const arr = ic('arrow-right', 'i-arr');
const hydrateIcons = (root = document) => $$('svg[data-i]', root).forEach(s => { s.setAttribute('viewBox', '0 0 24 24'); s.innerHTML = ICONS[s.dataset.i] || ''; s.removeAttribute('data-i'); });
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const norm = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------- storage ---------- */
const mem = {};
const store = {
  get(k, d) { try { const v = localStorage.getItem('as_' + k); return v ? JSON.parse(v) : (mem[k] ?? d); } catch (e) { return mem[k] ?? d; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem('as_' + k, JSON.stringify(v)); } catch (e) {} }
};
let fav = store.get('fav', []);
let cart = store.get('cart', []);
let user = store.get('user', null);
let orders = store.get('orders', []);
function saveAll() { store.set('fav', fav); store.set('cart', cart); store.set('user', user); store.set('orders', orders); updateCounts(); }
let lastCart = -1;
function updateCounts() {
  const c = cart.reduce((s, i) => s + i.qty, 0);
  $$('[data-cnt="cart"]').forEach(e => { e.textContent = c || ''; if (lastCart >= 0 && c > lastCart) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } });
  lastCart = c;
  $$('[data-cnt="fav"]').forEach(e => e.textContent = fav.length || '');
}

function toast(html, icon = 'check') {
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = ic(icon) + `<span>${html}</span>`;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2700);
}

/* ---------- products ---------- */
const SEASON = { winter: 'Зима', demi: 'Межсезонье', base: 'На каждый день' };
const GENDER = { m: 'Мужские', w: 'Женские', u: 'Унисекс' };
const latest = P.reduce((m, p) => p.date > m ? p.date : m, '0');
const isNew = p => (new Date(latest) - new Date(p.date)) / 864e5 <= 21;
const sizeLabel = p => p.sizes.length ? p.sizes[0] + (p.sizes.length > 1 ? '-' + p.sizes[p.sizes.length - 1] : '') : '';
const img = (p, i = 0) => p.img[i] || p.img[0];
const VAR = {};
P.forEach(p => (VAR[p.name.toLowerCase().trim()] ||= []).push(p.id));
Object.values(VAR).forEach(a => a.sort((x, y) => BY_ID[y].date.localeCompare(BY_ID[x].date) || BY_ID[y].post - BY_ID[x].post));
const variantsOf = p => VAR[p.name.toLowerCase().trim()] || [p.id];
const priceHtml = p => `<span class="price ${p.old ? 'sale' : ''}">${fmt(p.price)}${p.old ? `<s>${fmt(p.old)}</s>` : ''}</span>`;

function card(p) {
  const on = fav.includes(p.id);
  const nv = variantsOf(p).length;
  const badges = [p.old ? `<span class="badge badge-sale">-${Math.round((1 - p.price / p.old) * 100)}%</span>` : '', isNew(p) ? '<span class="badge">Новинка</span>' : '', p.season === 'winter' ? `<span class="badge badge-winter">${ic('snowflake')}Зима</span>` : ''].join('');
  return `<article class="card" data-id="${p.id}">
    <a class="card-img" href="#/product/${p.id}">
      <img loading="lazy" src="${img(p)}" alt="${esc(p.name)}">
      ${p.img[1] ? `<img class="alt" loading="lazy" src="${img(p, 1)}" alt="">` : ''}
    </a>
    <div class="badges">${badges}</div>
    <button class="fav ${on ? 'on' : ''}" data-fav="${p.id}" aria-label="В избранное">${ic('heart')}</button>
    <div class="card-body">
      <div class="card-brand">${esc(p.brand)}</div>
      <a class="card-name" href="#/product/${p.id}">${esc(p.name)}</a>
      <div class="card-meta"><span>Размеры ${sizeLabel(p)}</span>${nv > 1 ? `<span class="var"><i></i>${nv} ${plural(nv, 'расцветка', 'расцветки', 'расцветок')}</span>` : ''}</div>
      <div class="card-foot">${priceHtml(p)}<button class="qadd" data-quick="${p.id}" aria-label="Быстро добавить">${ic('plus')}</button></div>
    </div>
  </article>`;
}

function toggleFav(id) {
  const i = fav.indexOf(id);
  if (i >= 0) { fav.splice(i, 1); toast('Убрали из избранного', 'heart'); }
  else { fav.unshift(id); toast('Добавили в избранное <a href="#/favorites">Открыть</a>', 'heart'); }
  saveAll();
  $$(`[data-fav="${id}"]`).forEach(b => { b.classList.toggle('on', fav.includes(id)); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
  if (location.hash.startsWith('#/favorites') || location.hash.startsWith('#/account/fav')) setTimeout(route, 250);
}
function addToCart(id, size, qty = 1) {
  const it = cart.find(c => c.id === id && c.size === size);
  if (it) it.qty += qty; else cart.push({ id, size, qty });
  saveAll(); renderCart();
}

/* ---------- accordion ---------- */
const acc = (items, openFirst) => `<div class="acc">${items.map(([q, a], i) => `<div class="acc-i ${openFirst && i === 0 ? 'open' : ''}"><button class="acc-q" data-acc>${q}<span class="pl">${ic('plus')}</span></button><div class="acc-a"><div><div>${a}</div></div></div></div>`).join('')}</div>`;

/* ---------- reveal ---------- */
let io, navIo;
function reveal() {
  io && io.disconnect();
  io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.rv, .stg', view).forEach(el => io.observe(el));
  navIo && navIo.disconnect();
  const secs = $$('section[id]', view);
  if (secs.length) {
    navIo = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$('.nav a[data-s]').forEach(a => a.classList.toggle('on', a.dataset.s === e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => navIo.observe(s));
  }
}

/* ============ HOME ============ */
const HERO_ID = (() => { const c = P.filter(p => /1906r/i.test(p.name) && !/зимн/i.test(p.name)); return (c[0] || P.find(p => /1906r/i.test(p.name)) || P[0] || {}).id; })();
const SBP_MK = '<svg class="sbp-mk" viewBox="16 5 98 120" aria-hidden="true"><path fill="#5b57a2" d="M 16 31.1 L 30.5 57.1 L 30.5 72.9 L 16 98.9 L 16 31.1 Z"/><path fill="#d90751" d="M 71.8 47.6 L 85.4 39.3 L 113.3 39.3 L 71.8 64.7 L 71.8 47.6 Z"/><path fill="#fab718" d="M 71.7 31 L 71.8 65.4 L 57.2 56.4 L 57.2 5 L 71.7 31 Z"/><path fill="#ed6f26" d="M 113.3 39.3 L 85.4 39.3 L 71.7 31 L 57.2 5 L 113.3 39.3 Z"/><path fill="#63b22f" d="M 71.8 99 L 71.8 82.3 L 57.2 73.5 L 57.2 125 L 71.8 99 Z"/><path fill="#1487c9" d="M 85.4 90.7 L 30.5 57.1 L 16 31.1 L 113.2 90.7 L 85.4 90.7 Z"/><path fill="#017f36" d="M 57.2 125 L 71.8 99 L 85.4 90.7 L 113.2 90.7 L 57.2 125 Z"/><path fill="#984995" d="M 16 98.9 L 57.3 73.5 L 43.5 65 L 30.5 72.9 L 16 98.9 Z"/></svg>';
const TG_ICON = '<svg class="i tg-ic" viewBox="0 0 24 24"><path fill="currentColor" stroke="none" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>';
function tgPost(p) {
  const n = Math.min(p.img.length, 5), h = hash(p.id);
  const views = p.views >= 1000 ? (p.views / 1000).toFixed(1).replace('.0', '') + 'K' : p.views;
  const time = `${10 + h % 11}:${String(h % 60).padStart(2, '0')}`;
  return `<a class="tgp" href="https://t.me/AirStep/${p.post}" target="_blank" rel="noopener">
    <div class="tgp-from">AirStep</div>
    <div class="tgp-alb n${n}">${p.img.slice(0, n).map(src => `<img src="${src}" alt="">`).join('')}</div>
    <div class="tgp-tx"><b>${esc(p.name)}</b><br><br>Размеры ${sizeLabel(p)}<br><br>${p.features.slice(0, 6).map(f => `<i class="dm"></i>${esc(f)}`).join('<br>')}<br><br>Цена: ${p.price}₽<br><br><b>Заказ:</b> <span class="lnk">@${MANAGER}</span></div>
    <div class="tgp-ft"><span class="rx"><i>❤️</i>${3 + h % 14}</span><span class="rx"><i>👍</i>${1 + h % 6}</span><span class="tgp-meta">${ic('eye')}${views} · ${time}</span></div>
  </a>`;
}
let tgRaf = 0;
function tgScroll() {
  cancelAnimationFrame(tgRaf);
  const box = $('#tgFeed'); if (!box) return;
  let hold = false, last = 0, pos = 0;
  const stop = () => hold = true, go = () => { hold = false; pos = box.scrollTop; };
  box.addEventListener('mouseenter', stop); box.addEventListener('mouseleave', go);
  box.addEventListener('touchstart', stop, { passive: true }); box.addEventListener('touchend', () => setTimeout(go, 2500));
  box.addEventListener('wheel', () => { pos = box.scrollTop; }, { passive: true });
  const step = t => {
    if (!document.contains(box)) return;
    const dt = Math.min(50, t - (last || t)); last = t;
    if (!hold && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pos += dt * 0.03; const half = box.firstElementChild.offsetHeight;
      if (pos >= half) pos -= half;
      box.scrollTop = pos;
    } else pos = box.scrollTop;
    tgRaf = requestAnimationFrame(step);
  };
  tgRaf = requestAnimationFrame(step);
}
function home() {
  const winter = P.filter(p => p.season === 'winter').sort((a, b) => b.views - a.views);
  const news = P.slice().sort((a, b) => b.date.localeCompare(a.date) || b.post - a.post).slice(0, 8);
  const popular = P.slice().sort((a, b) => b.views - a.views).filter(p => !news.includes(p)).slice(0, 8);
  const BR = [['Nike', 'nike'], ['New Balance', 'new-balance'], ['Adidas', 'adidas'], ['Timberland', 'timberland'], ['Asics', 'asics'], ['Maison Margiela', 'maison-margiela']];
  const heroP = BY_ID[HERO_ID];
  const feed = P.slice().sort((a, b) => b.post - a.post).slice(0, 6);
  const rv = REVIEWS.slice(0, 5);
  const flakes = Array.from({ length: 14 }, (_, i) => `<span class="flake" style="left:${(i * 37) % 100}%;top:${-10 - (i * 13) % 30}px;animation-duration:${9 + (i * 7) % 9}s;animation-delay:-${(i * 3) % 9}s;font-size:${10 + (i * 5) % 14}px">${ic('snowflake')}</span>`).join('');
  view.innerHTML = `
  <section class="hero" id="top">
    <div class="wrap hero-in">
      <div class="rv">
        <span class="eyebrow">Магазин кроссовок с 2022 года</span>
        <h1>Лёгкий шаг<span>в каждой паре</span></h1>
        <p class="lead">Реплики кроссовок оригинального качества: в фирменной коробке, со всеми бирками и QR-кодами. Доставка по России и СНГ.</p>
        <div class="hero-ctas">
          <a class="btn btn-ink" href="#/catalog">Перейти в каталог ${arr}</a>
          <a class="btn btn-ghost" href="#/s/winter">${ic('snowflake')} Зимняя обувь</a>
        </div>
        <div class="hero-trust">
          <div><i>${ic('truck')}</i>СДЭК и Почта России</div>
          <div><i>${ic('gift')}</i>Носки в подарок</div>
          <div><i>${ic('refresh-ccw')}</i>Замена размера</div>
        </div>
      </div>
      <div class="hero-art">
        <div class="hero-disc"></div>
        <img class="hero-wings" src="assets/img/airstep-mark.svg" alt="" style="display:none">
        <div class="hero-shadow"></div>
        <img class="hero-shoe" id="heroShoe" src="assets/img/hero-shoe.webp" alt="New Balance 1906R">
        ${heroP ? `<a class="hero-tag" href="#/product/${heroP.id}"><div><small>${esc(heroP.brand)}</small><b>${esc(heroP.name)}</b></div>${priceHtml(heroP)}</a>` : ''}
      </div>
    </div>
  </section>

  <section class="sec cream" style="padding-top:0">
    <div class="wrap feats stg">
      <div class="feat-c"><div class="ic">${ic('truck')}</div><div><h4>Доставка по России и СНГ</h4><p>СДЭК или Почта России до пункта выдачи. Трек-номер появится в личном кабинете.</p></div></div>
      <div class="feat-c"><div class="ic">${ic('gift')}</div><div><h4>Носки в подарок</h4><p>Почти к каждому заказу кладём носки Nike, Adidas, Puma или Fila.</p></div></div>
      <div class="feat-c"><div class="ic">${ic('box')}</div><div><h4>Фирменная коробка и бирки</h4><p>Все QR-коды и бирки на месте. Материалы и бирки соответствуют оригиналу.</p></div></div>
      <div class="feat-c"><div class="ic">${ic('map-pin')}</div><div><h4>Шоурум в Петербурге</h4><p>Ул. Вербная, 1Б. Примерка по предварительной записи у менеджера.</p></div><a class="more" href="https://t.me/${MANAGER}" target="_blank" rel="noopener">Записаться ${arr}</a></div>
    </div>
  </section>

  <section class="sec dark" id="winter" style="position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;pointer-events:none">${flakes}</div>
    <div class="wrap" style="position:relative">
      <div class="winter-top">
        <div class="rv">
          <span class="eyebrow">Сезон ${new Date(latest).getFullYear()}/${new Date(latest).getFullYear() + 1}</span>
          <h2>Зима <span>близко.</span><br>Ноги в тепле</h2>
          <p>Кроссовки и ботинки с мехом внутри, мембраной Gore-Tex и цепкой подошвой. Не промокают в слякоть и держат тепло в мороз.</p>
          <div class="winter-chips"><span>${ic('snowflake')}Мех внутри</span><span>${ic('shield-check')}Gore-Tex</span><span>${ic('footprints')}Цепкий протектор</span></div>
          <a class="btn btn-yellow" href="#/catalog?season=winter">Вся зимняя обувь ${arr}</a>
        </div>
        <div class="winter-art rv"><img src="assets/img/winter-boots.webp" alt="Зимние ботинки"></div>
      </div>
      <div class="sec-h" style="margin-bottom:24px"><h2 style="font-size:24px">Хиты зимы</h2><div class="car-nav"><button data-car="-1" aria-label="Назад">${ic('arrow-left')}</button><button data-car="1" aria-label="Вперёд">${ic('arrow-right')}</button></div></div>
      <div class="carousel"><div class="car-track" id="winterTrack">${winter.slice(0, 12).map(card).join('')}</div></div>
    </div>
  </section>

  <section class="sec cream" id="new">
    <div class="wrap">
      <div class="sec-h rv"><div><span class="eyebrow">Новинки</span><h2>Свежие пары<br>этой <em>недели</em></h2></div><a class="btn btn-ghost" href="#/catalog?sort=new">Все новинки ${arr}</a></div>
      <div class="grid stg">${news.map(card).join('')}</div>
    </div>
  </section>

  <section class="sec dark" id="brands">
    <div class="wrap">
      <div class="sec-h rv"><div><span class="eyebrow">Бренды</span><h2>Выберите<br>свой <em>бренд</em></h2></div><a class="btn btn-light" href="#/catalog">Весь каталог ${arr}</a></div>
      <div class="brands stg">${BR.map(([b, f]) => `<a class="brand" href="#/catalog?brand=${encodeURIComponent(b)}"><img src="assets/img/brands/${f}.webp" alt=""><div class="brand-n"><b>${esc(b)}</b><span>Смотреть модели ${ic('arrow-right')}</span></div></a>`).join('')}</div>
    </div>
  </section>

  <section class="sec cream" id="popular">
    <div class="wrap">
      <div class="sec-h rv"><div><span class="eyebrow">Популярное</span><h2>Чаще всего<br><em>смотрят</em></h2></div><a class="btn btn-ghost" href="#/catalog?sort=pop">Смотреть все ${arr}</a></div>
      <div class="grid stg">${popular.map(card).join('')}</div>
    </div>
  </section>

  <section class="sec cream" id="how">
    <div class="wrap">
      <div class="sec-h rv"><div><span class="eyebrow">Как заказать</span><h2>Четыре шага<br>до новой <em>пары</em></h2></div></div>
      <div class="steps stg">
        <div class="step"><div class="step-top"><span class="n">01</span><div class="ic">${ic('search')}</div></div><div><h4>Выберите пару</h4><p>Фильтры по размеру, сезону, бренду и цене. Понравившееся сохраните в избранное.</p></div><div class="mini"><span>Размер</span><span>Сезон</span><span>Бренд</span></div></div>
        <div class="step"><div class="step-top"><span class="n">02</span><div class="ic">${ic('smartphone')}</div></div><div><h4>Войдите по номеру</h4><p>Без паролей: придёт SMS с кодом. Данные для доставки сохранятся в кабинете.</p></div><div class="mini"><span>Код из SMS</span></div></div>
        <div class="step"><div class="step-top"><span class="n">03</span><div class="ic">${ic('wallet')}</div></div><div><h4>Оплатите удобно</h4><p>Онлайн сразу или при получении. Доставку оплачивает покупатель по тарифу службы.</p></div><div class="mini"><span>Онлайн</span><span>При получении</span></div></div>
        <div class="step"><div class="step-top"><span class="n">04</span><div class="ic">${ic('package-check')}</div></div><div><h4>Получите посылку</h4><p>Трек-номер появится в личном кабинете. Обычно СДЭК везёт от 3 до 7 дней.</p></div><div class="mini"><span>Трек-номер</span><span>Статус</span></div></div>
      </div>
    </div>
  </section>

  <section class="sec cream" id="delivery" style="padding-top:0">
    <div class="wrap">
      <div class="sec-h rv"><div><span class="eyebrow">Доставка и оплата</span><h2>Привезём <em>куда удобно</em></h2><p>Стоимость и сроки зависят от региона. Доставку покупатель оплачивает при получении в пункте выдачи.</p></div></div>
      <div class="dp stg">
        <div class="dp-card"><h3>${ic('truck')}Доставка</h3>
          <div class="svc">
            <div><span class="lg"><img src="assets/img/dl/cdek.webp" alt="СДЭК"></span><b>СДЭК</b><small>В среднем по России 450 ₽, от 3 до 7 дней</small></div>
            <div><span class="lg post"><img src="assets/img/dl/post.webp" alt="Почта России"></span><b>Почта России</b><small>До отделения, по тарифу Почты</small></div>
          </div>
          <div class="lines"><div>${ic('check')}Отправляем по всей России и в страны СНГ</div><div>${ic('check')}Трек-номер появится в личном кабинете сразу после отправки</div><div>${ic('check')}Почти к каждому заказу кладём носки в подарок</div></div>
        </div>
        <div class="dp-card"><h3>${ic('wallet')}Оплата</h3>
          <div class="pay-opts">
            <div><span class="ic">${ic('credit-card')}</span><span><b>Онлайн, 100% предоплата</b><small>Сразу оплачиваете товар, доставку оплачиваете при получении. Затем получаете трек-номер и ждёте посылку.</small></span></div>
            <div><span class="ic">${ic('hand-coins')}</span><span><b>При получении</b><small>Сначала оплачиваете только доставку, товар и 7% комиссии наложенного платежа при получении.</small></span></div>
          </div>
          <div class="notice">${ic('refresh-ccw')}<span>Замена размера или брака есть. Деньги возвращаем только в случае брака, стоимость доставки не возвращается.</span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="sec dark" id="telegram">
    <div class="wrap tg">
      <div class="rv">
        <span class="eyebrow">Telegram</span>
        <h2>Новинки каждый день в нашем канале</h2>
        <p>Выкладываем новые пары, проводим конкурсы, где можно выиграть одежду и кроссовки. Менеджер отвечает в личных сообщениях.</p>
        <div class="btns"><a class="btn btn-yellow" href="https://t.me/AirStep" target="_blank" rel="noopener">${TG_ICON} Открыть канал</a><a class="btn btn-light" href="https://t.me/${MANAGER}" target="_blank" rel="noopener">Написать менеджеру</a></div>
      </div>
      <div class="tgw rv">
        <div class="tgw-head"><img src="assets/img/airstep-mark.svg" alt=""><div><b>AirStep</b><small>канал</small></div><a href="https://t.me/AirStep" target="_blank" rel="noopener">Открыть</a></div>
        <div class="tgw-body" id="tgFeed"><div class="tgw-list">${feed.map(tgPost).join('')}</div><div class="tgw-list" aria-hidden="true">${feed.map(tgPost).join('')}</div></div>
      </div>
    </div>
    </div>
  </section>

  <section class="sec cream" id="reviews">
    <div class="wrap">
      <div class="sec-h rv"><div><span class="eyebrow">Отзывы</span><h2>Пишут <em>покупатели</em></h2></div><div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-ghost" href="https://t.me/AirStep_feedback" target="_blank" rel="noopener">Все отзывы в Telegram ${ic('external-link')}</a></div></div>
      <div class="reviews stg">${rv.map((r, i) => `<a class="review ${i === 0 ? 'big' : ''}" href="https://t.me/AirStep_feedback/${r.post}" target="_blank" rel="noopener">${i === 0 ? '<div class="quote">“</div>' : `<div class="stars">${ic('star').repeat(5)}</div>`}<p>${esc(r.text)}</p><div class="r-foot"><span>${new Date(r.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</span><span>Открыть в Telegram ${ic('arrow-up-right')}</span></div></a>`).join('')}</div>
    </div>
  </section>

  <section class="sec cream" style="padding-top:0">
    <div class="wrap family stg">
      <a class="fam t-ink" href="https://t.me/AirWear_shop" target="_blank" rel="noopener">
        <div class="txt"><div><span class="eyebrow" style="color:var(--yellow)">Одежда</span><h3 style="margin-top:16px">AirWear</h3></div><p>Куртки, худи, джинсы и лонгсливы к вашим кроссовкам. Заказ через того же менеджера.</p><span class="btn btn-yellow btn-sm">Открыть канал ${ic('arrow-up-right')}</span></div>
        <div class="lg"><img src="assets/img/airwear.webp" alt="AirWear"></div>
      </a>
      <a class="fam t-yellow" href="https://t.me/AirFume_shop" target="_blank" rel="noopener">
        <div class="txt"><div><span class="eyebrow">Парфюм</span><h3 style="margin-top:16px">AirFume</h3></div><p>Ароматы в фирменных колбах, с батч-кодом, розлив в ОАЭ. Мужские, женские и унисекс.</p><span class="btn btn-ink btn-sm">Открыть канал ${ic('arrow-up-right')}</span></div>
        <div class="lg"><img src="assets/img/airfume.webp" alt="AirFume"></div>
      </a>
    </div>
  </section>

  <section class="sec cream" id="faq" style="padding-top:0">
    <div class="wrap faq">
      <div class="rv"><span class="eyebrow">Вопросы</span><h2 class="h2" style="margin-top:16px">Частые<br>вопросы</h2><p class="muted" style="margin:18px 0 26px;max-width:340px">Не нашли ответ или не можете выбрать размер? Менеджер подскажет в Telegram.</p><a class="btn btn-ink" href="https://t.me/${MANAGER}" target="_blank" rel="noopener">${ic('send')} Написать менеджеру</a></div>
      <div class="rv">${acc([
        ['Это оригинальные кроссовки?', 'Нет. AirStep продаёт реплики оригинального качества: материалы, коробка, бирки и QR-коды соответствуют оригиналу. Мы честно пишем об этом на сайте и в карточке каждой пары.'],
        ['Сколько стоит доставка и кто её оплачивает?', 'Доставку оплачивает покупатель по тарифу службы, при онлайн-оплате заказа это делается в пункте выдачи при получении. Стоимость и сроки зависят от региона: в среднем по России СДЭК стоит 450 ₽ и идёт от 3 до 7 дней.'],
        ['Можно оплатить при получении?', 'Да. Сначала вы оплачиваете только доставку и получаете трек-номер, а стоимость товара и 7% комиссии наложенного платежа платите в пункте выдачи. Такой заказ оформляется через менеджера в Telegram.'],
        ['Что, если не подойдёт размер или будет брак?', 'Замена размера или брака есть. Деньги возвращаем только в случае брака. Стоимость доставки не возвращается.'],
        ['Как подобрать размер?', 'Размеры указаны в европейской сетке, в карточке товара есть таблица с длиной стопы. Если сомневаетесь, напишите менеджеру: он подскажет по конкретной модели.'],
        ['Можно примерить перед покупкой?', 'Да, в шоуруме в Санкт-Петербурге на ул. Вербной, 1Б, по предварительной записи у менеджера.']
      ], true)}</div>
    </div>
  </section>`;
  tgScroll();
  // hero parallax
  const shoe = $('#heroShoe');
  if (shoe && matchMedia('(pointer:fine)').matches) {
    const art = $('.hero-art');
    art.onmousemove = e => { const r = art.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; shoe.style.translate = `${x * 18}px ${y * 14}px`; };
    art.onmouseleave = () => shoe.style.translate = '0 0';
    shoe.style.transition = 'translate .6s cubic-bezier(.2,.8,.2,1)';
  }
}

/* ============ CATALOG ============ */
const ALL_SIZES = [...new Set(P.flatMap(p => p.sizes))].sort((a, b) => a - b);
const PMIN = Math.floor(Math.min(...P.map(p => p.price)) / 100) * 100, PMAX = Math.ceil(Math.max(...P.map(p => p.price)) / 100) * 100;
const BRANDS = Object.entries(P.reduce((m, p) => (m[p.brand] = (m[p.brand] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]);
const SORTS = { new: 'Сначала новые', pop: 'Популярные', cheap: 'Сначала дешевле', exp: 'Сначала дороже' };
const PAGE = 24;
let F = null, shown = PAGE, brandsOpen = false;
function parseQuery() {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  return { q: q.get('q') || '', brand: q.getAll('brand'), size: q.getAll('size').map(Number), season: q.getAll('season'), gender: q.get('gender') || '', min: +q.get('min') || PMIN, max: +q.get('max') || PMAX, sort: q.get('sort') || 'new', sale: q.get('sale') === '1' };
}
function writeQuery() {
  const q = new URLSearchParams();
  if (F.q) q.set('q', F.q);
  F.brand.forEach(b => q.append('brand', b)); F.size.forEach(s => q.append('size', s)); F.season.forEach(s => q.append('season', s));
  if (F.gender) q.set('gender', F.gender);
  if (F.min > PMIN) q.set('min', F.min); if (F.max < PMAX) q.set('max', F.max);
  if (F.sort !== 'new') q.set('sort', F.sort); if (F.sale) q.set('sale', '1');
  const s = q.toString(); history.replaceState(null, '', '#/catalog' + (s ? '?' + s : ''));
}
function matchQ(p, q) { if (!q) return true; const hay = norm(p.name + ' ' + p.brand); return norm(q).split(' ').every(w => hay.includes(w)); }
function filtered(skip) {
  const r = P.filter(p => matchQ(p, F.q) &&
    (skip === 'brand' || !F.brand.length || F.brand.includes(p.brand)) &&
    (skip === 'size' || !F.size.length || F.size.some(s => p.sizes.includes(s))) &&
    (skip === 'season' || !F.season.length || F.season.includes(p.season)) &&
    (skip === 'gender' || !F.gender || p.gender === F.gender || p.gender === 'u') &&
    (!F.sale || p.old) && p.price >= F.min && p.price <= F.max);
  const s = F.sort;
  r.sort(s === 'cheap' ? (a, b) => a.price - b.price : s === 'exp' ? (a, b) => b.price - a.price : s === 'pop' ? (a, b) => b.views - a.views : (a, b) => b.date.localeCompare(a.date) || b.post - a.post);
  return r;
}
function catalog() {
  F = parseQuery(); shown = PAGE;
  view.innerHTML = `<div class="wrap">
    <div class="page-h"><div class="crumbs"><a href="#/">Главная</a><span>/</span><span>Каталог</span></div><h1><span id="catTitle">Каталог</span><sup id="catSup"></sup></h1></div>
    <div class="cat">
      <aside class="filters" id="filters"></aside>
      <div>
        <div class="toolbar">
          <span class="count" id="count"></span>
          <button class="btn btn-ghost btn-sm filter-btn" data-act="filters">${ic('sliders-horizontal')} Фильтры</button>
          <label class="cat-search">${ic('search')}<input id="cq" type="search" placeholder="Поиск по каталогу" value="${esc(F.q)}"></label>
          <div class="dd pill" id="sortDD"></div>
        </div>
        <div class="active-f" id="activeF"></div>
        <div class="grid" id="grid"></div>
        <div class="loadmore" id="more"></div>
      </div>
    </div></div>`;
  const drawSort = () => dropdown($('#sortDD'), { value: SORTS[F.sort], items: Object.values(SORTS), search: false, onPick: v => { F.sort = Object.keys(SORTS).find(k => SORTS[k] === v); drawSort(); apply(); } });
  drawSort();
  let t; $('#cq').oninput = e => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value.trim(); shown = PAGE; apply(); }, 200); };
  renderFilters(); apply(false);
}
function countBy(key, values) {
  const base = filtered(key), m = {};
  values.forEach(v => m[v] = 0);
  base.forEach(p => { if (key === 'size') p.sizes.forEach(s => m[s] !== undefined && m[s]++); else m[p[key]] = (m[p[key]] || 0) + 1; });
  return m;
}
function renderFilters() {
  const bc = countBy('brand', BRANDS.map(b => b[0])), sc = countBy('size', ALL_SIZES), seas = countBy('season', Object.keys(SEASON));
  const bl = brandsOpen ? BRANDS : BRANDS.slice(0, 8);
  const saleN = P.filter(p => p.old).length;
  $('#filters').innerHTML = `
    <div class="filters-close" style="display:none;justify-content:space-between;align-items:center;padding:8px 0 4px"><b style="font-family:var(--display);font-size:20px">Фильтры</b><button class="modal-x" style="position:static" data-act="filters">${ic('x')}</button></div>
    <div class="fgroup"><h5>Для кого</h5><div class="seg2" style="grid-template-columns:repeat(3,1fr)">${[['', 'Все'], ['m', 'Мужские'], ['w', 'Женские']].map(([k, v]) => `<button class="${F.gender === k ? 'on' : ''}" data-gender="${k}">${v}</button>`).join('')}</div></div>
    <div class="fgroup"><h5>Сезон ${F.season.length ? '<button data-clear="season">Сбросить</button>' : ''}</h5>
      ${Object.entries(SEASON).map(([k, v]) => `<label class="check"><input type="checkbox" data-f="season" value="${k}" ${F.season.includes(k) ? 'checked' : ''}>${v}<small>${seas[k] || 0}</small></label>`).join('')}</div>
    <div class="fgroup"><h5>Размер ${F.size.length ? '<button data-clear="size">Сбросить</button>' : ''}</h5>
      <div class="sizes-grid">${ALL_SIZES.map(s => `<button class="sz ${F.size.includes(s) ? 'on' : ''}" data-size="${s}" ${!sc[s] && !F.size.includes(s) ? 'disabled' : ''}>${s}</button>`).join('')}</div></div>
    <div class="fgroup"><h5>Цена ${F.min > PMIN || F.max < PMAX ? '<button data-clear="price">Сбросить</button>' : ''}</h5>
      <div class="range"><div class="track"></div><div class="fill" id="rfill"></div>
        <input type="range" id="rmin" min="${PMIN}" max="${PMAX}" step="100" value="${F.min}" aria-label="Цена от"><input type="range" id="rmax" min="${PMIN}" max="${PMAX}" step="100" value="${F.max}" aria-label="Цена до"></div>
      <div class="prices"><label><span>от</span><input id="pmin" inputmode="numeric" value="${F.min.toLocaleString('ru-RU')}"><i>₽</i></label><label><span>до</span><input id="pmax" inputmode="numeric" value="${F.max.toLocaleString('ru-RU')}"><i>₽</i></label></div></div>
    <div class="fgroup"><h5>Бренд ${F.brand.length ? '<button data-clear="brand">Сбросить</button>' : ''}</h5>
      ${bl.map(([b]) => `<label class="check"><input type="checkbox" data-f="brand" value="${esc(b)}" ${F.brand.includes(b) ? 'checked' : ''}>${esc(b)}<small>${bc[b] || 0}</small></label>`).join('')}
      ${BRANDS.length > 8 ? `<button class="more-btn" data-act="brands">${brandsOpen ? 'Свернуть' : 'Ещё ' + (BRANDS.length - 8)}</button>` : ''}</div>
    ${saleN ? `<div class="fgroup"><label class="check"><input type="checkbox" data-sale ${F.sale ? 'checked' : ''}><b>Только со скидкой</b><small>${saleN}</small></label></div>` : ''}
    <button class="btn btn-ink btn-block filter-btn" data-act="filters" style="margin-top:10px">Показать</button>`;
  const rmin = $('#rmin'), rmax = $('#rmax');
  const fill = () => { const a = (rmin.value - PMIN) / (PMAX - PMIN) * 100, b = (rmax.value - PMIN) / (PMAX - PMIN) * 100; $('#rfill').style.left = a + '%'; $('#rfill').style.width = (b - a) + '%'; };
  fill();
  let t;
  const onR = e => { if (+rmin.value > +rmax.value - 200) { if (e.target === rmin) rmin.value = +rmax.value - 200; else rmax.value = +rmin.value + 200; } $('#pmin').value = (+rmin.value).toLocaleString('ru-RU'); $('#pmax').value = (+rmax.value).toLocaleString('ru-RU'); fill(); clearTimeout(t); t = setTimeout(() => { F.min = +rmin.value; F.max = +rmax.value; shown = PAGE; apply(false); }, 220); };
  rmin.oninput = rmax.oninput = onR;
  const onP = () => { F.min = Math.max(PMIN, +$('#pmin').value.replace(/\D/g, '') || PMIN); F.max = Math.min(PMAX, +$('#pmax').value.replace(/\D/g, '') || PMAX); if (F.min > F.max) [F.min, F.max] = [F.max, F.min]; apply(); };
  $('#pmin').onchange = $('#pmax').onchange = onP;
}
function apply(rerender = true) {
  writeQuery();
  const list = filtered(), n = list.length;
  $('#count').textContent = `${n} ${plural(n, 'модель', 'модели', 'моделей')}`;
  $('#catTitle').textContent = F.sale ? 'Скидки' : F.season.length === 1 && F.season[0] === 'winter' ? 'Зимняя обувь' : F.brand.length === 1 ? F.brand[0] : 'Каталог';
  $('#catSup').textContent = n;
  const act = [...F.brand.map(b => ['brand', b, b]), ...F.size.map(s => ['size', s, 'Размер ' + s]), ...F.season.map(s => ['season', s, SEASON[s]]),
    ...(F.gender ? [['gender', '', GENDER[F.gender]]] : []), ...(F.min > PMIN || F.max < PMAX ? [['price', '', `от ${fmt(F.min)} до ${fmt(F.max)}`]] : []),
    ...(F.q ? [['q', '', `«${F.q}»`]] : []), ...(F.sale ? [['sale', '', 'Со скидкой']] : [])];
  $('#activeF').innerHTML = act.length ? act.map(([k, v, l]) => `<button class="chip" data-rm="${k}" data-v="${esc(v)}">${esc(l)} ${ic('x')}</button>`).join('') + `<button class="chip" data-clear="all">Сбросить всё</button>` : '';
  const grid = $('#grid');
  if (!n) { grid.style.display = 'block'; grid.innerHTML = `<div class="empty"><h3>Ничего не нашли</h3><p>Попробуйте убрать часть фильтров или изменить запрос.</p><button class="btn btn-ink" data-clear="all">Сбросить фильтры</button></div>`; }
  else { grid.style.display = ''; grid.innerHTML = list.slice(0, shown).map(card).join(''); grid.classList.remove('stg', 'in'); void grid.offsetWidth; grid.classList.add('stg'); requestAnimationFrame(() => grid.classList.add('in')); }
  $('#more').innerHTML = n > shown ? `<button class="btn btn-ghost" data-act="more">Показать ещё ${Math.min(PAGE, n - shown)}</button>` : '';
  if (rerender) renderFilters();
}

/* ============ PRODUCT ============ */
const SIZE_CM = { 35: 22.5, 36: 23, 37: 23.5, 38: 24, 39: 25, 40: 25.5, 41: 26, 42: 26.5, 43: 27.5, 44: 28, 45: 29, 46: 29.5, 47: 30, 48: 31, 49: 31.5 };
let selSize = null, gi = 0, curP = null;
function product(id) {
  const p = BY_ID[id];
  if (!p) { view.innerHTML = `<div class="wrap" style="padding:60px 0"><div class="empty"><h3>Такой пары нет</h3><p>Возможно, модель уже распродана.</p><a class="btn btn-ink" href="#/catalog">В каталог</a></div></div>`; return; }
  selSize = null; gi = 0; curP = p;
  const vars = variantsOf(p);
  const similar = P.filter(x => x.id !== p.id && !vars.includes(x.id) && (x.brand === p.brand || x.season === p.season)).sort((a, b) => (b.brand === p.brand) - (a.brand === p.brand) || b.views - a.views).slice(0, 4);
  const on = fav.includes(p.id);
  view.innerHTML = `<div class="wrap">
    <div class="crumbs" style="margin-top:28px"><a href="#/">Главная</a><span>/</span><a href="#/catalog">Каталог</a><span>/</span><a href="#/catalog?brand=${encodeURIComponent(p.brand)}">${esc(p.brand)}</a></div>
    <div class="pdp">
      <div class="gallery">
        <div class="thumbs">${p.img.map((s, i) => `<button class="${i ? '' : 'on'}" data-gi="${i}"><img src="${s}" alt="" loading="lazy"></button>`).join('')}</div>
        <div class="main-img"><img id="mainImg" src="${p.img[0]}" alt="${esc(p.name)}"><button class="fav pfav-img ${on ? 'on' : ''}" data-fav="${p.id}" aria-label="В избранное">${ic('heart')}</button>
          ${p.img.length > 1 ? `<button class="nav-arr prev" data-gstep="-1">${ic('chevron-left')}</button><button class="nav-arr next" data-gstep="1">${ic('chevron-right')}</button>` : ''}
          <div class="badges">${p.old ? `<span class="badge badge-sale">-${Math.round((1 - p.price / p.old) * 100)}%</span>` : ''}${isNew(p) ? '<span class="badge">Новинка</span>' : ''}${p.season === 'winter' ? `<span class="badge badge-winter">${ic('snowflake')}Зима</span>` : ''}</div>
        </div>
      </div>
      <div class="pinfo">
        <div class="card-brand">${esc(p.brand)}</div>
        <h1>${esc(p.name)}</h1>
        ${priceHtml(p)}
        <div class="pmeta"><span class="pill">${ic('box')}В фирменной коробке</span><span class="pill">${ic('gift')}Носки в подарок</span><span class="pill">${SEASON[p.season]}</span><span class="pill">${GENDER[p.gender]}</span></div>
        ${vars.length > 1 ? `<div class="plabel">Расцветка <small>${vars.length} ${plural(vars.length, 'вариант', 'варианта', 'вариантов')}</small></div><div class="variants">${vars.map(v => `<a href="#/product/${v}" class="${v === p.id ? 'on' : ''}" title="${esc(BY_ID[v].name)}, ${fmt(BY_ID[v].price)}"><img src="${img(BY_ID[v])}" alt=""></a>`).join('')}</div>` : ''}
        <div class="plabel">Размер <button class="link muted" data-act="sizes" style="font-size:14px;font-weight:500">Таблица размеров</button></div>
        <div class="psizes" id="psizes">${p.sizes.map(s => `<button class="sz" data-psize="${s}">${s}</button>`).join('')}</div>
        <div class="pbuy"><button class="btn btn-ink" id="buy" data-buy="${p.id}">${ic('shopping-bag')} Добавить в корзину</button><button class="fav pfav-buy ${on ? 'on' : ''}" data-fav="${p.id}" aria-label="В избранное">${ic('heart')}</button></div>
        <div class="pfeat">${p.features.map(f => `<div>${ic('check')}<span>${esc(f)}</span></div>`).join('')}</div>
        ${acc([
          ['Доставка и оплата', 'СДЭК или Почта России, по России и в страны СНГ. Доставку оплачивает покупатель по тарифу службы, в среднем по России СДЭК стоит 450 ₽ и идёт от 3 до 7 дней. Оплатить можно онлайн сразу или при получении (+7% комиссии наложенного платежа).'],
          ['Обмен и возврат', 'Замена размера или брака есть. Деньги возвращаем только в случае брака, стоимость доставки не возвращается.'],
          ['Примерка в Санкт-Петербурге', `Шоурум на ул. Вербной, 1Б, по предварительной записи. Запишитесь у <a class="link" href="https://t.me/${MANAGER}" target="_blank" rel="noopener">менеджера в Telegram</a>.`],
          ['Эта пара в Telegram', `Пост в канале AirStep: <a class="link" href="https://t.me/AirStep/${p.post}" target="_blank" rel="noopener">t.me/AirStep/${p.post}</a>`]
        ])}
        <div class="pnote">${ic('info')}<span>Реплика оригинального качества, не оригинальная продукция бренда.</span></div>
      </div>
    </div>
    ${similar.length ? `<section style="padding-bottom:var(--sec)"><div class="sec-h"><h2>Похожие <em>пары</em></h2></div><div class="grid stg">${similar.map(card).join('')}</div></section>` : ''}
  </div>`;
}
function setGallery(i) {
  const p = curP; if (!p) return;
  gi = (i + p.img.length) % p.img.length;
  const m = $('#mainImg'); m.style.opacity = 0; setTimeout(() => { m.src = p.img[gi]; m.onload = () => m.style.opacity = 1; }, 160);
  $$('.thumbs button').forEach((b, k) => b.classList.toggle('on', k === gi));
}

/* ============ FAVORITES ============ */
function favorites() {
  const list = fav.map(id => BY_ID[id]).filter(Boolean);
  view.innerHTML = `<div class="wrap" style="padding-bottom:var(--sec)"><div class="page-h"><div class="crumbs"><a href="#/">Главная</a><span>/</span><span>Избранное</span></div><h1>Избранное<sup>${list.length || ''}</sup></h1></div>
    ${list.length ? `<div class="grid stg">${list.map(card).join('')}</div>` : `<div class="empty"><h3>Здесь пока пусто</h3><p>Нажимайте на сердечко на карточке, чтобы сохранить пару.</p><a class="btn btn-ink" href="#/catalog">Перейти в каталог</a></div>`}</div>`;
}

/* ============ CART ============ */
const cartTotal = () => cart.reduce((s, c) => s + (BY_ID[c.id]?.price || 0) * c.qty, 0);
function renderCart() {
  cart = cart.filter(c => BY_ID[c.id]);
  const body = $('#cartBody'), foot = $('#cartFoot');
  if (!cart.length) {
    body.innerHTML = `<div style="text-align:center;padding:70px 10px"><div style="margin:0 auto 18px;width:72px;height:72px;border-radius:22px;background:var(--paper);display:grid;place-items:center">${ic('shopping-bag')}</div><h4 style="font-family:var(--display);font-size:20px;margin-bottom:8px">Корзина пуста</h4><p class="muted">Добавьте пару из каталога</p></div>`;
    foot.innerHTML = `<a class="btn btn-ink btn-block" href="#/catalog" data-act="close">В каталог</a>`;
  } else {
    body.innerHTML = cart.map((c, i) => { const p = BY_ID[c.id]; return `<div class="citem" style="animation-delay:${i * .05}s"><a href="#/product/${p.id}" data-act="close"><img src="${img(p)}" alt=""></a><div><h4>${esc(p.name)}</h4><div class="meta">Размер ${c.size}</div><div class="qty"><button data-q="${i}" data-d="-1">${ic('minus')}</button><span>${c.qty}</span><button data-q="${i}" data-d="1">${ic('plus')}</button></div></div><div style="display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end"><button class="rm" data-rmc="${i}" aria-label="Удалить">${ic('trash-2')}</button><span class="price">${fmt(p.price * c.qty)}</span></div></div>`; }).join('');
    const n = cart.reduce((s, c) => s + c.qty, 0);
    foot.innerHTML = `<div class="gift">${ic('gift')}<span>Почти к каждому заказу кладём носки в подарок</span></div>
      <div class="sumrow"><span class="muted">${n} ${plural(n, 'товар', 'товара', 'товаров')}</span><span>${fmt(cartTotal())}</span></div>
      <div class="sumrow"><span class="muted">Доставка</span><span>рассчитаем при оформлении</span></div>
      <div class="sumrow total"><span>Товары</span><span>${fmt(cartTotal())}</span></div>
      <button class="btn btn-ink btn-block" data-act="checkout">Оформить заказ ${arr}</button>`;
  }
  updateCounts();
}
function openCart() { renderCart(); openLayer('#cart'); }

/* ---------- layers ---------- */
function openLayer(sel) { closeLayer(); $(sel).classList.add('open'); $('#ovl').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeLayer() { ['#cart', '#modal', '#mnav', '#filters'].forEach(s => $(s)?.classList.remove('open')); $('#ovl').classList.remove('open'); document.body.style.overflow = ''; }
function modal(html, wide) { $('#modalBody').innerHTML = `<div class="stp">${html}</div>`; $('#modal').classList.toggle('wide', !!wide); openLayer('#modal'); }

/* ---------- custom dropdown ---------- */
function dropdown(el, { value, placeholder, items, onPick, disabled, search = true, display }) {
  el.innerHTML = `<button type="button" class="dd-btn ${value ? '' : 'ph'}" ${disabled ? 'disabled' : ''}><span>${esc(display || value || placeholder)}</span>${ic('chevron-down')}</button><div class="dd-pop">${search ? '<input placeholder="Поиск" autocomplete="off">' : ''}<div class="dd-list"></div></div>`;
  const btn = el.querySelector('.dd-btn'), pop = el.querySelector('.dd-pop'), q = pop.querySelector('input'), list = pop.querySelector('.dd-list');
  const label = i => typeof i === 'object' ? i.label : i;
  let hl = -1, cur = [];
  const draw = () => {
    const s = q ? norm(q.value) : '';
    cur = items.filter(i => !s || norm(label(i)).includes(s));
    const CAP = 200;
    list.innerHTML = cur.length ? cur.slice(0, CAP).map((i, k) => `<button type="button" data-k="${k}" class="${label(i) === value || (typeof i === 'object' && i.value === value) ? 'on' : ''} ${k === hl ? 'hl' : ''}">${typeof i === 'object' ? `<span>${esc(i.label)}</span><small>${esc(i.hint || '')}</small>` : esc(i)}</button>`).join('') + (cur.length > CAP ? `<div class="none">Ещё ${cur.length - CAP}, уточните поиск</div>` : '') : '<div class="none">Ничего не найдено</div>';
  };
  const open = () => { $$('.dd.open').forEach(d => d !== el && d.classList.remove('open')); el.classList.add('open'); const r = el.getBoundingClientRect(); el.classList.toggle('up', innerHeight - r.bottom < 300 && r.top > 320); hl = -1; if (q) q.value = ''; draw(); setTimeout(() => (q || btn).focus(), 20); };
  btn.onclick = e => { e.stopPropagation(); el.classList.contains('open') ? el.classList.remove('open') : open(); };
  const keys = e => { if (e.key === 'ArrowDown') { hl = Math.min(cur.length - 1, hl + 1); draw(); e.preventDefault(); } if (e.key === 'ArrowUp') { hl = Math.max(0, hl - 1); draw(); e.preventDefault(); } if (e.key === 'Enter' && cur[hl]) { e.preventDefault(); el.classList.remove('open'); onPick(cur[hl]); } if (e.key === 'Escape') { e.stopPropagation(); el.classList.remove('open'); } };
  if (q) { q.oninput = () => { hl = 0; draw(); }; q.onkeydown = keys; } else btn.onkeydown = e => { if (el.classList.contains('open')) keys(e); };
  list.onclick = e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); el.classList.remove('open'); onPick(cur[+b.dataset.k]); };
  pop.onclick = e => e.stopPropagation();
}

/* ============ LOGIN (SMS) ============ */
let loginCb = null, smsCode = '', pcIdx = 0;
const maskApply = (v, mask) => { const d = v.replace(/\D/g, ''); let i = 0, out = ''; for (const ch of mask) { if (i >= d.length) break; out += ch === '_' ? d[i++] : ch; } return out; };
function login(cb) {
  loginCb = cb || null;
  modal(`<h3>Вход по номеру телефона</h3><p class="sub">Пришлём SMS с кодом для входа.</p>
    <div class="field" id="phF"><label for="phone">Телефон</label>
      <div class="phone-row"><div class="dd" id="pcode"></div><input class="inp" id="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(999) 123-45-67"></div>
      <span class="ferr">Введите номер полностью</span></div>
    <button class="btn btn-ink btn-block" id="getCode">Получить код</button>
    <p class="legal">Нажимая кнопку, вы соглашаетесь с <a href="#/privacy" data-act="close">политикой обработки персональных данных</a></p>`);
  const ph = $('#phone');
  const mask = () => PHONE_CODES[pcIdx].mask;
  const drawCode = () => dropdown($('#pcode'), { value: PHONE_CODES[pcIdx].c, display: PHONE_CODES[pcIdx].code, search: false, items: PHONE_CODES.map(c => ({ label: c.c, hint: c.code, value: c.c })), onPick: i => { pcIdx = PHONE_CODES.findIndex(c => c.c === i.label); drawCode(); ph.value = ''; ph.placeholder = mask().replace(/_/g, '0'); ph.focus(); } });
  drawCode();
  ph.placeholder = mask().replace(/_/g, '0');
  ph.addEventListener('input', () => { const pos = ph.value.length; ph.value = maskApply(ph.value, mask()); $('#phF').classList.remove('has-err'); ph.classList.remove('err'); });
  setTimeout(() => ph.focus(), 350);
  const go = async () => {
    const need = (mask().match(/_/g) || []).length;
    if (ph.value.replace(/\D/g, '').length < need) { $('#phF').classList.add('has-err'); ph.classList.add('err'); ph.focus(); return; }
    const full = PHONE_CODES[pcIdx].code + ' ' + ph.value;
    const b = $('#getCode'); b.disabled = true; b.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:3px;margin:0;border-top-color:var(--yellow)"></span> Отправляем';
    await sleep(700);
    codeStep(full);
  };
  $('#getCode').onclick = go;
  ph.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}
function codeStep(phone) {
  smsCode = String(Math.floor(1000 + Math.random() * 9000));
  $('#modalBody').innerHTML = `<div class="stp"><h3>Введите код из SMS</h3><p class="sub">Отправили на ${esc(phone)}. <button class="link" id="chg">Изменить</button></p>
    <div class="codes" id="codes">${[0, 1, 2, 3].map(i => `<input inputmode="numeric" maxlength="1" data-ci="${i}" autocomplete="one-time-code" aria-label="Цифра ${i + 1}">`).join('')}</div>
    <div class="resend" id="resend"></div>
    <p class="legal">Демо: SMS ненастоящее, код появится уведомлением сверху экрана. Нажмите на него.</p></div>`;
  const ins = $$('#codes input');
  ins[0].focus();
  const check = async () => {
    const v = ins.map(i => i.value).join('');
    if (v.length < 4) return;
    if (v === smsCode) {
      $('#codes').classList.add('ok'); hideSms();
      await sleep(550);
      const users = store.get('users', {});
      user = users[phone] || { phone, name: '', email: '', country: 'Россия', region: '', city: '', created: Date.now() };
      users[phone] = user; store.set('users', users);
      if (!orders.length) orders = seedOrders();
      saveAll(); closeLayer();
      toast('Вы вошли в личный кабинет', 'user');
      const cb = loginCb; loginCb = null;
      cb ? cb() : route();
    } else {
      $('#codes').animate([{ transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'none' }], { duration: 300 });
      ins.forEach(i => { i.value = ''; i.classList.remove('fill'); }); ins[0].focus();
      toast('Неверный код, попробуйте ещё раз', 'info');
    }
  };
  ins.forEach((inp, i) => {
    inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(-1); inp.classList.toggle('fill', !!inp.value); if (inp.value && ins[i + 1]) ins[i + 1].focus(); check(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); });
    inp.addEventListener('paste', e => { const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4); if (d) { e.preventDefault(); d.split('').forEach((c, k) => { ins[k].value = c; ins[k].classList.add('fill'); }); check(); } });
  });
  $('#chg').onclick = () => { hideSms(); login(loginCb); };
  let left = 30; const tick = () => { const r = $('#resend'); if (!r || !document.contains(r)) return; if (left > 0) { r.textContent = `Отправить код повторно через ${left} с`; left--; setTimeout(tick, 1000); } else { r.innerHTML = '<button id="again">Отправить код повторно</button>'; $('#again').onclick = () => codeStep(phone); } };
  tick();
  setTimeout(() => showSms(`AirStep: код для входа <b>${smsCode}</b>. Никому его не сообщайте.`, () => {
    smsCode.split('').forEach((c, k) => setTimeout(() => { ins[k].value = c; ins[k].classList.add('fill'); if (k === 3) check(); }, k * 120));
  }), 1400);
}
let smsT;
function showSms(html, onClick) { const s = $('#sms'); $('#smsTxt').innerHTML = html; s.classList.add('show'); s.onclick = () => { hideSms(); onClick && onClick(); }; clearTimeout(smsT); smsT = setTimeout(hideSms, 10000); }
function hideSms() { $('#sms').classList.remove('show'); }
function seedOrders() {
  const ex = P.slice().sort((a, b) => b.views - a.views)[3] || P[0];
  if (!ex) return [];
  return [{ id: 'AS-' + (10000 + Math.floor(Math.random() * 900)), example: true, date: new Date(Date.now() - 41 * 864e5).toISOString(), items: [{ id: ex.id, size: ex.sizes[Math.floor(ex.sizes.length / 2)], qty: 1 }], total: ex.price, delivery: 'cdek', address: 'Пример заказа', status: 4, track: '10' + Math.floor(1e8 + Math.random() * 9e8) }];
}

/* ============ CHECKOUT ============ */
const DL = { cdek: { name: 'СДЭК', logo: 'assets/img/dl/cdek.webp' }, post: { name: 'Почта России', logo: 'assets/img/dl/post.webp' } };
function shipCost(dl, country, region) {
  if (!region) return null;
  const h = hash(country + region + dl);
  if (country === 'Россия') return dl === 'cdek' ? 350 + (h % 9) * 25 : 300 + (h % 8) * 30;
  return dl === 'cdek' ? 900 + (h % 8) * 50 : 1100 + (h % 6) * 60;
}
/* Пункты выдачи: по одному файлу на регион, грузятся только когда нужен регион (работает и с file://) */
const PVZ = {}, PVZ_WAIT = {};
window.PVZ_LOAD = (id, d) => { PVZ[id] = d; const w = PVZ_WAIT[id] || []; delete PVZ_WAIT[id]; w.forEach(f => f()); };
function loadPvz(country, region) {
  const id = (window.PVZ_RID || {})[country + '|' + region];
  return new Promise(res => {
    if (!id) return res(null);
    if (PVZ[id]) return res(PVZ[id]);
    const done = () => res(PVZ[id] || null);
    if (PVZ_WAIT[id]) return PVZ_WAIT[id].push(done);
    PVZ_WAIT[id] = [done];
    const sc = document.createElement('script'); sc.src = `assets/js/pvz/${id}.js`;
    sc.onerror = () => { const w = PVZ_WAIT[id] || []; delete PVZ_WAIT[id]; w.forEach(f => f()); };
    document.head.appendChild(sc);
  });
}
const geoCities = (country, region) => (GEO[country] && GEO[country][region]) || [];
const hasCity = (country, region, city) => geoCities(country, region).some(c => c[0] === city);
function cityItems(country, region, dl) {
  const k = dl === 'post' ? 2 : 1;
  return geoCities(country, region).map(c => ({ label: c[0], value: c[0], hint: c[k] ? `${c[k]} ${plural(c[k], 'пункт', 'пункта', 'пунктов')}` : '' }));
}
let CO = null;
function checkout() {
  if (!cart.length) { view.innerHTML = `<div class="wrap" style="padding:60px 0 var(--sec)"><div class="empty"><h3>Корзина пуста</h3><p>Добавьте пару, чтобы оформить заказ.</p><a class="btn btn-ink" href="#/catalog">В каталог</a></div></div>`; return; }
  if (!user) { view.innerHTML = `<div class="wrap" style="padding:60px 0 var(--sec)"><div class="empty"><h3>Войдите, чтобы оформить заказ</h3><p>Это займёт 10 секунд: номер телефона и код из SMS.</p><button class="btn btn-ink" data-act="login">${ic('smartphone')} Войти по номеру</button></div></div>`; login(() => route()); return; }
  CO = { name: user.name || '', phone: user.phone, delivery: DL[user.delivery] ? user.delivery : 'cdek', pay: 'online', country: user.country || 'Россия', region: user.region || '', city: user.city || '', pvz: null, manual: false, data: null, loading: false };
  const n = cart.reduce((s, c) => s + c.qty, 0);
  view.innerHTML = `<div class="wrap"><div class="page-h"><div class="crumbs"><a href="#/">Главная</a><span>/</span><a href="#/cart">Корзина</a><span>/</span><span>Оформление</span></div><h1>Оформление заказа</h1></div>
  <div class="co">
    <div>
      <section class="co-sec"><h3><span class="n">1</span>Получатель</h3>
        <div class="grid2">
          <div class="field" id="fName"><label>ФИО полностью</label><input class="inp" id="coName" placeholder="Иванов Иван Иванович" value="${esc(CO.name)}" autocomplete="name"><span class="ferr">Нужны фамилия, имя и отчество, как в паспорте</span></div>
          <div class="field" id="fPhone"><label>Телефон</label><input class="inp" id="coPhone" type="tel" inputmode="tel" value="${esc(CO.phone)}"><span class="ferr">Проверьте номер</span></div>
        </div>
        <p class="hint">${ic('info')}Номер подставили из кабинета, его можно изменить. По нему служба доставки сообщит о посылке.</p>
      </section>
      <section class="co-sec"><h3><span class="n">2</span>Способ доставки</h3>
        <div class="seg two" id="seg">${Object.entries(DL).map(([k, d]) => `<button data-dl="${k}"><span class="logo-d ${k}"><img src="${d.logo}" alt="${d.name}"></span><span><b>${d.name}</b><small id="dlh-${k}"></small></span></button>`).join('')}</div>
      </section>
      <section class="co-sec" id="addrSec"><h3><span class="n">3</span>Куда доставить</h3>
        <div class="grid3">
          <div class="field"><label>Страна</label><div class="dd" id="ddCountry"></div></div>
          <div class="field" id="fRegion"><label>Регион</label><div class="dd" id="ddRegion"></div><span class="ferr">Выберите регион</span></div>
          <div class="field" id="fCity"><label>Город или посёлок</label><div class="dd" id="ddCity"></div><span class="ferr">Выберите город</span></div>
        </div>
        <div id="pvzPick">
          <div class="field" id="fAddr"><label id="addrLabel">Пункт выдачи</label>
            <div class="addr-w">${ic('search')}<input class="inp" id="addr" autocomplete="off" placeholder="Улица, дом или индекс"></div>
            <div class="ac-list" id="ac"></div>
            <span class="ferr">Выберите пункт из списка или укажите адрес вручную</span></div>
          <div class="pvz-chosen" id="pvzChosen"></div>
          <div class="addr-acts"><button class="link muted" id="showAll" type="button"></button><button class="link" id="toManual" type="button">${ic('pencil')}Не нашли свой пункт выдачи? Укажите адрес вручную</button></div>
        </div>
        <div id="pvzManual" style="display:none">
          <div class="field" id="fManual"><label>Адрес пункта выдачи или отделения</label><textarea class="inp" id="manualAddr" rows="2" placeholder="Например: ул. Ленина, 25, пункт СДЭК в ТЦ «Мега» или индекс отделения Почты"></textarea><span class="ferr">Укажите адрес, хотя бы улицу и дом</span></div>
          <p class="hint">${ic('info')}Менеджер проверит адрес и при необходимости уточнит его в Telegram.</p>
          <button class="link" id="toList" type="button" style="margin-top:8px">${ic('map-pin')}Выбрать пункт из списка</button>
        </div>
      </section>
      <section class="co-sec"><h3><span class="n">4</span>Способ оплаты</h3>
        <div class="seg two" id="payseg">
          <button data-pay="online"><span class="ic2">${ic('credit-card')}</span><span><b>Онлайн сейчас</b><small>Товар сейчас, доставку при получении</small></span></button>
          <button data-pay="cod"><span class="ic2">${ic('hand-coins')}</span><span><b>При получении</b><small>Сейчас только доставка, товар +7% при получении</small></span></button>
        </div>
        <p class="hint" id="payHint"></p>
      </section>
    </div>
    <aside class="co-side">
      <section class="co-sec"><h3>Ваш заказ</h3>
        <div class="co-items">${cart.map(c => { const p = BY_ID[c.id]; return `<div class="co-item"><img src="${img(p)}" alt=""><div><b>${esc(p.name)}</b><span class="muted">Размер ${c.size} · ${c.qty} шт.</span></div><span class="price">${fmt(p.price * c.qty)}</span></div>`; }).join('')}</div>
        <div class="gift">${ic('gift')}<span>Носки в подарок почти к каждому заказу</span></div>
        <div class="sumrow"><span class="muted">${n} ${plural(n, 'товар', 'товара', 'товаров')}</span><span>${fmt(cartTotal())}</span></div>
        <div class="sumrow"><span class="muted" id="dlName">Доставка</span><span id="dlSum">выберите город</span></div>
        <div class="sumrow" id="codRow" style="display:none"><span class="muted">При получении</span><span id="codSum"></span></div>
        <div class="sumrow total"><span id="totLabel">К оплате</span><span id="totSum">${fmt(cartTotal())}</span></div>
        <button class="btn btn-ink btn-block" id="toPay" style="height:58px"></button>
        <p class="hint">${ic('refresh-ccw')}Замена размера или брака есть. Деньги возвращаем только при браке, доставка не возвращается.</p>
      </section>
    </aside>
  </div></div>`;
  $('#coPhone').oninput = () => { $('#fPhone').classList.remove('has-err'); $('#coPhone').classList.remove('err'); };
  $('#coName').oninput = e => { CO.name = e.target.value; $('#fName').classList.remove('has-err'); e.target.classList.remove('err'); };
  $$('#seg button').forEach(b => b.onclick = () => { if (CO.delivery !== b.dataset.dl) { CO.delivery = b.dataset.dl; resetPvz(); buildDD(); } syncCO(); });
  $$('#payseg button').forEach(b => b.onclick = () => { CO.pay = b.dataset.pay; syncCO(); });
  $('#toManual').onclick = () => setManual(true);
  $('#toList').onclick = () => setManual(false);
  $('#manualAddr').oninput = e => { const v = e.target.value.trim(); CO.pvz = v.length >= 5 ? { title: v, sub: 'адрес указан вручную', manual: true } : null; $('#fManual').classList.remove('has-err'); e.target.classList.remove('err'); };
  buildDD(); addrInit(); syncCO(); regionData();
  $('#toPay').onclick = submitCheckout;
}
function setManual(on) {
  CO.manual = on; CO.pvz = null;
  $('#pvzPick').style.display = on ? 'none' : ''; $('#pvzManual').style.display = on ? '' : 'none';
  $('#fAddr').classList.remove('has-err'); $('#addr').value = ''; $('#pvzChosen').classList.remove('show');
  if (on) { const m = $('#manualAddr'); if (m.value.trim().length >= 5) CO.pvz = { title: m.value.trim(), sub: 'адрес указан вручную', manual: true }; setTimeout(() => m.focus(), 30); }
}
async function regionData() {
  CO.data = null;
  if (!CO.region) return syncAddr();
  const key = CO.country + '|' + CO.region;
  CO.loading = true; syncAddr();
  const d = await loadPvz(CO.country, CO.region);
  if (!CO || CO.country + '|' + CO.region !== key) return;
  CO.loading = false; CO.data = d; syncAddr();
  if (user.pvz && !user.pvz.manual && user.city === CO.city && user.delivery === CO.delivery && !CO.pvz) pickPvz(user.pvz);
}
function syncAddr() {
  if (!$('#addr')) return;
  const n = pvzList().length, dl = DL[CO.delivery].name;
  $('#addrLabel').textContent = CO.delivery === 'cdek' ? 'Пункт выдачи СДЭК' : 'Отделение Почты России';
  const a = $('#addr'); a.disabled = !CO.city || CO.loading;
  a.placeholder = CO.loading ? 'Загружаем пункты выдачи' : !CO.city ? 'Сначала выберите город' : n ? (CO.delivery === 'post' ? 'Улица, дом или индекс отделения' : 'Улица, дом или ориентир') : `В этом городе нет пунктов ${dl} в списке`;
  $('#showAll').textContent = CO.city && n ? `Показать все пункты в городе (${n})` : '';
  $('#showAll').style.display = CO.city && n ? '' : 'none';
}
function syncCO() {
  $$('#seg button').forEach(b => b.classList.toggle('on', b.dataset.dl === CO.delivery));
  $$('#payseg button').forEach(b => b.classList.toggle('on', b.dataset.pay === CO.pay));
  ['cdek', 'post'].forEach(k => { const c = shipCost(k, CO.country, CO.region); $('#dlh-' + k).textContent = c ? `≈ ${fmt(c)}${k === 'cdek' && CO.country === 'Россия' ? ', от 3 до 7 дней' : ''}` : k === 'cdek' ? 'в среднем 450 ₽ по России' : 'по тарифу Почты'; });
  const goods = cartTotal(), ship = shipCost(CO.delivery, CO.country, CO.region), cod = CO.pay === 'cod';
  $('#dlName').textContent = cod ? 'Доставка, ' + DL[CO.delivery].name : 'Доставка при получении';
  $('#dlSum').textContent = ship ? '≈ ' + fmt(ship) : 'выберите регион';
  $('#codRow').style.display = cod ? '' : 'none';
  $('#codSum').textContent = fmt(goods * 1.07) + ' (товар +7%)';
  $('#totLabel').textContent = cod ? 'Сейчас' : 'К оплате';
  $('#totSum').textContent = cod ? (ship ? fmt(ship) : 'доставка') : fmt(goods);
  $('#toPay').innerHTML = cod ? `${TG_ICON} Оформить через менеджера` : `${ic('lock')} Оплатить ${fmt(goods)}`;
  $('#payHint').innerHTML = cod ? `${ic('info')}Откроем чат с менеджером в Telegram с уже заполненным заказом. Он пришлёт реквизиты для оплаты доставки и трек-номер.` : `${ic('shield-check')}Сейчас оплачиваете только товар, доставку оплатите в пункте выдачи по тарифу службы. Демо: деньги не списываются.`;
  syncAddr();
}
function buildDD() {
  if (!GEO[CO.country]) CO.country = 'Россия';
  if (CO.region && !GEO[CO.country][CO.region]) CO.region = '';
  if (CO.city && (!CO.region || !hasCity(CO.country, CO.region, CO.city))) CO.city = '';
  dropdown($('#ddCountry'), { value: CO.country, items: Object.keys(GEO), onPick: v => { if (v === CO.country) return; CO.country = v; CO.region = ''; CO.city = ''; resetPvz(); buildDD(); syncCO(); regionData(); } });
  dropdown($('#ddRegion'), { value: CO.region, placeholder: 'Выберите регион', items: Object.keys(GEO[CO.country]).sort((a, b) => a.localeCompare(b, 'ru')), onPick: v => { const same = v === CO.region; CO.region = v; const cs = geoCities(CO.country, v); if (!same) CO.city = cs.length === 1 ? cs[0][0] : ''; $('#fRegion').classList.remove('has-err'); if (!same) resetPvz(); buildDD(); syncCO(); if (!same) regionData(); if (!CO.city) setTimeout(() => $('#ddCity .dd-btn').click(), 60); } });
  dropdown($('#ddCity'), { value: CO.city, placeholder: CO.region ? 'Выберите город' : 'Сначала регион', disabled: !CO.region, items: CO.region ? cityItems(CO.country, CO.region, CO.delivery) : [], onPick: v => { CO.city = v.value; $('#fCity').classList.remove('has-err'); resetPvz(); buildDD(); syncAddr(); if (!pvzList().length && !CO.loading) setManual(true); else setTimeout(() => $('#addr').focus(), 60); } });
}
function resetPvz() { if (!CO) return; CO.pvz = null; const a = $('#addr'); if (a) a.value = ''; $('#pvzChosen')?.classList.remove('show'); if (CO.manual && $('#pvzManual')) setManual(false); }
const WD = { Mo: 'Пн', Tu: 'Вт', We: 'Ср', Th: 'Чт', Fr: 'Пт', Sa: 'Сб', Su: 'Вс' };
const hoursFmt = s => String(s || '').replace(/^24\/7$/, 'круглосуточно').replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, m => WD[m]).replace(/\boff\b/g, 'выходной').replace(/;\s*/g, ', ').replace(/(\d\d:\d\d)-(\d\d:\d\d)/g, '$1 до $2').replace(/Пн-Вс 00:00 до 23:59/, 'круглосуточно');
function pvzList() {
  if (!CO || !CO.data || !CO.city) return [];
  const rows = (CO.data[CO.delivery] || {})[CO.city] || [];
  if (CO.delivery === 'cdek') return rows.map(r => ({ title: r[0], sub: `${r[2] === 'M' ? 'Постамат' : 'Пункт выдачи'} ${r[3] || 'СДЭК'} · ${hoursFmt(r[1])}`, note: r[5] || '', code: r[4] || '' }));
  return rows.map(r => ({ title: r[2] || `Отделение ${r[0]}`, sub: (r[2] ? `Отделение ${r[0]}, ${r[1]}` : `Почта России, ${r[1]}`) + (r[3] ? ' · ' + hoursFmt(r[3]) : ''), note: '', code: r[0] }));
}
let pickPvz = () => {};
function addrInit() {
  const a = $('#addr'), ac = $('#ac'), CAP = 60;
  let hl = 0, cur = [];
  const draw = all => {
    if (!CO.city || CO.loading) { ac.classList.remove('open'); return; }
    const q = norm(a.value), list = pvzList();
    cur = all || !q ? list : list.filter(x => q.split(' ').every(w => norm(x.title + ' ' + x.sub + ' ' + x.code + ' ' + x.note).includes(w)));
    const w0 = q.split(' ')[0];
    const mark = s => { if (!q || all) return esc(s); const i = norm(s).indexOf(w0); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + w0.length)) + '</mark>' + esc(s.slice(i + w0.length)); };
    const more = cur.length > CAP ? `<div class="ac-more">Показаны ${CAP} из ${cur.length}. Уточните улицу или индекс</div>` : '';
    const manual = `<button type="button" class="ac-manual" data-manual="1">${ic('pencil')}<span><b>Нет нужного пункта?</b><small>Укажите адрес вручную</small></span></button>`;
    ac.innerHTML = (cur.length ? cur.slice(0, CAP).map((x, k) => `<button type="button" data-k="${k}" class="${k === hl ? 'hl' : ''}">${ic('map-pin')}<span><b>${mark(x.title)}</b><small>${esc(x.sub)}</small>${x.note ? `<small class="nt">${esc(x.note)}</small>` : ''}</span></button>`).join('') + more : `<div class="ac-none">По такому адресу пунктов нет. Попробуйте другую улицу или номер дома.</div>`) + manual;
    ac.classList.add('open');
  };
  a.oninput = () => { hl = 0; CO.pvz = null; $('#pvzChosen').classList.remove('show'); $('#fAddr').classList.remove('has-err'); a.classList.remove('err'); draw(); };
  a.onfocus = () => draw();
  a.onkeydown = e => { if (!ac.classList.contains('open')) return; if (e.key === 'ArrowDown') { hl = Math.min(Math.min(cur.length, CAP) - 1, hl + 1); draw(); e.preventDefault(); } if (e.key === 'ArrowUp') { hl = Math.max(0, hl - 1); draw(); e.preventDefault(); } if (e.key === 'Enter' && cur[hl]) { pickPvz(cur[hl]); e.preventDefault(); } if (e.key === 'Escape') ac.classList.remove('open'); };
  ac.onmousedown = e => { const b = e.target.closest('button'); if (!b) return; e.preventDefault(); if (b.dataset.manual) { ac.classList.remove('open'); setManual(true); return; } pickPvz(cur[+b.dataset.k]); };
  a.onblur = () => setTimeout(() => ac.classList.remove('open'), 150);
  $('#showAll').onclick = () => { if (!CO.city) { $('#fCity').classList.add('has-err'); return; } a.focus(); draw(true); };
  pickPvz = x => { CO.pvz = x; a.value = x.title; ac.classList.remove('open'); $('#fAddr').classList.remove('has-err'); a.classList.remove('err'); const c = $('#pvzChosen'); c.innerHTML = `${ic('check')}<div><b>${DL[CO.delivery].name}: ${esc(x.title)}</b><div class="muted">${esc(CO.city)}, ${esc(CO.region)} · ${esc(x.sub)}</div></div>`; c.classList.add('show'); };
}
function orderText(o) {
  const lines = o.items.map((it, i) => { const p = BY_ID[it.id]; return `${i + 1}. ${p.name}, размер ${it.size}, ${it.qty} шт., ${fmt(p.price * it.qty)}\nhttps://t.me/AirStep/${p.post}`; });
  return [`Здравствуйте! Хочу оформить заказ с сайта.`, `Заказ ${o.id}`, '', ...lines, '', `Товары: ${fmt(o.goods)}`, `Получатель: ${o.name}, ${o.phone}`, `Доставка: ${DL[o.delivery]?.name || 'СДЭК'}, ${o.address}`, `Оплата: при получении (доставку оплачу сразу, товар +7% при получении)`].join('\n');
}
function submitCheckout() {
  let ok = true;
  const name = $('#coName').value.trim();
  if (name.split(/\s+/).filter(w => w.length > 1).length < 2) { $('#fName').classList.add('has-err'); $('#coName').classList.add('err'); ok = false; }
  const ph = $('#coPhone').value; if (ph.replace(/\D/g, '').length < 10) { $('#fPhone').classList.add('has-err'); $('#coPhone').classList.add('err'); ok = false; }
  if (!CO.region) { $('#fRegion').classList.add('has-err'); ok = false; }
  if (!CO.city) { $('#fCity').classList.add('has-err'); ok = false; }
  if (!CO.pvz) { if (CO.manual) { $('#fManual').classList.add('has-err'); $('#manualAddr').classList.add('err'); } else { $('#fAddr').classList.add('has-err'); $('#addr').classList.add('err'); } ok = false; }
  if (!ok) { $('.has-err')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Заполните выделенные поля', 'info'); return; }
  CO.name = name; CO.phone = ph;
  Object.assign(user, { name, country: CO.country, region: CO.region, city: CO.city, delivery: CO.delivery, pvz: CO.pvz });
  saveAll();
  if (CO.pay === 'cod') {
    const o = { id: 'AS-' + (10500 + orders.length * 7 + Math.floor(Math.random() * 6)), date: new Date().toISOString(), items: cart.map(c => ({ ...c })), goods: cartTotal(), total: cartTotal(), delivery: CO.delivery, name: CO.name, phone: CO.phone, address: `${CO.country}, ${CO.region}, ${CO.city}, ${CO.pvz.title}`, status: 0, manager: true, track: null };
    const url = `https://t.me/${MANAGER}?text=${encodeURIComponent(orderText(o))}`;
    window.open(url, '_blank', 'noopener');
    orders.unshift(o); cart = []; saveAll(); renderCart();
    location.hash = '#/account';
    setTimeout(() => modal(`<div class="success"><div class="ok-ic tg">${TG_ICON}</div><h3>Заказ ${o.id} отправлен менеджеру</h3><p class="sub">Открыли чат с @${MANAGER} в Telegram, текст заказа со ссылками на модели уже вставлен: просто отправьте его. Если чат не открылся, нажмите кнопку ниже.</p><div class="btns"><a class="btn btn-ink" href="${url}" target="_blank" rel="noopener">${TG_ICON} Открыть Telegram</a><button class="btn btn-ghost" data-act="close">Смотреть заказ в кабинете</button></div></div>`), 250);
    return;
  }
  openPay();
}

/* ============ PAYMENT (demo) ============ */
const BANKS = [['Сбербанк', '#21A038', '#fff', 'С'], ['Т-Банк', '#FFDD2D', '#141414', 'Т'], ['Банк ВТБ', '#0A2896', '#fff', 'В'], ['Альфа-Банк', '#EF3124', '#fff', 'А'], ['Райффайзенбанк', '#FFED00', '#141414', 'R'], ['Газпромбанк', '#1C3F8C', '#fff', 'Г'], ['Совкомбанк', '#E3262F', '#fff', 'С'], ['Озон Банк', '#005BFF', '#fff', 'O'], ['Банк Открытие', '#00B3E3', '#fff', 'О'], ['Почта Банк', '#002882', '#fff', 'П'], ['МТС Банк', '#E30611', '#fff', 'М'], ['Россельхозбанк', '#00843D', '#fff', 'Р'], ['Яндекс Банк', '#000', '#fff', 'Я'], ['ПСБ', '#F26722', '#fff', 'П']];
let payOrder = null;
function payShell(inner) { $('#payBox').innerHTML = `<button class="pay-x" data-act="payclose">${ic('x')}</button>` + inner; }
function openPay() {
  const ship = shipCost(CO.delivery, CO.country, CO.region) || 0;
  payOrder = { id: 'AS-' + (10500 + orders.length * 7 + Math.floor(Math.random() * 6)), goods: cartTotal(), ship, total: cartTotal() };
  payMain(); $('#pay').classList.add('open'); document.body.style.overflow = 'hidden';
}
function payMain() {
  payShell(`<div class="pay-head"><div class="pic">${ic('credit-card')}</div><div><h4>Оплата заказа</h4><p>${payOrder.id} · AirStep</p></div></div>
    <div class="pay-sum"><div class="r"><span>Товары</span><span>${fmt(payOrder.goods)}</span></div><div class="r"><span>Доставка ${DL[CO.delivery].name}, оплата при получении</span><span>≈ ${fmt(payOrder.ship)}</span></div><div class="t"><span>К оплате</span><b>${fmt(payOrder.total)}</b></div></div>
    <div class="p-field"><label>Email для чека</label><input class="p-inp" id="pEmail" type="email" inputmode="email" placeholder="pochta@gmail.com" value="${esc(user.email || '')}"></div>
    <div class="p-err" id="pEmailErr">Укажите почту, на неё придёт чек</div>
    <button class="pm pm-sbp" data-pm="sbp" aria-label="Оплатить через СБП"><span class="sbp-t">Оплатить</span>${SBP_MK}<b class="sbp-w">сбп</b></button>
    <button class="pm pm-sber" data-pm="sber" aria-label="SberPay"><svg class="sber-mk" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 8.03A9.4 9.4 0 1 1 15.97 3.48" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M7.4 11.7l3.7 3.7 9.6-9.6" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg><b class="sber-w">Pay</b></button>
    <button class="pm pm-t" data-pm="tpay" aria-label="T-Pay"><img src="assets/img/pay/tpay.webp" alt="T-Pay"></button>
    <div class="pm-row"><button class="pm pm-alfa" data-pm="alfa" aria-label="Alfa Pay"><img src="assets/img/pay/alfa.webp" alt="Alfa Pay"></button><button class="pm pm-vtb" data-pm="vtb" aria-label="VTB Pay"><img src="assets/img/pay/vtb.webp" alt="VTB Pay"></button></div>
    <div class="or">или картой</div>
    <div class="p-field"><label>Номер карты</label><input class="p-inp" id="cNum" inputmode="numeric" placeholder="0000 0000 0000 0000" autocomplete="cc-number"></div>
    <div class="card-row"><div class="p-field"><label>Срок</label><input class="p-inp" id="cExp" inputmode="numeric" placeholder="ММ/ГГ" autocomplete="cc-exp"></div><div class="p-field"><label>CVC/CVV</label><input class="p-inp" id="cCvc" inputmode="numeric" placeholder="•••" type="password" maxlength="3" autocomplete="cc-csc"></div></div>
    <div class="p-err" id="cErr">Проверьте данные карты</div>
    <button class="pm pm-pay" data-pm="card">Оплатить ${fmt(payOrder.total)}</button>
    <p class="pay-legal">Нажимая «Оплатить», вы соглашаетесь с офертой и политикой обработки персональных данных. Демо: настоящие данные карты не вводите, деньги не списываются.</p>
    <div class="secure"><span>PCI DSS</span><span>3-D SECURE</span><span>МИР · VISA · MC</span></div>`);
  const n = $('#cNum'), ex = $('#cExp');
  n.oninput = () => { n.value = n.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 '); n.classList.remove('err'); $('#cErr').classList.remove('show'); };
  ex.oninput = () => { let v = ex.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); ex.value = v; ex.classList.remove('err'); };
  $('#pEmail').oninput = () => { $('#pEmail').classList.remove('err'); $('#pEmailErr').classList.remove('show'); };
}
function emailOk() { const e = $('#pEmail'), v = e.value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)) { e.classList.add('err'); $('#pEmailErr').classList.add('show'); e.focus(); return false; } user.email = v; saveAll(); return true; }
async function payAction(m) {
  if (!emailOk()) return;
  if (m === 'card') {
    const num = $('#cNum').value.replace(/\D/g, ''), exp = $('#cExp').value, cvc = $('#cCvc').value, expOk = /^(0[1-9]|1[0-2])\/\d\d$/.test(exp);
    if (num.length < 16 || !expOk || cvc.length < 3) { $('#cErr').classList.add('show'); (num.length < 16 ? $('#cNum') : !expOk ? $('#cExp') : $('#cCvc')).classList.add('err'); return; }
    payShell(`<div class="pay-wait"><div class="pay-head" style="justify-content:center"><div class="pic">${ic('shield-check')}</div></div><h5>Подтверждение 3-D Secure</h5><p>Банк отправил код на ваш телефон. В демо подойдёт любой.</p><div class="otp3ds">${[0, 1, 2, 3, 4, 5].map(() => '<input inputmode="numeric" maxlength="1">').join('')}</div><button class="pm pm-pay" id="otpOk">Подтвердить</button></div>`);
    const ins = $$('.otp3ds input'); ins[0].focus();
    ins.forEach((i, k) => i.oninput = () => { i.value = i.value.replace(/\D/g, ''); if (i.value && ins[k + 1]) ins[k + 1].focus(); if (ins.every(x => x.value)) $('#otpOk').click(); });
    setTimeout(() => { if (ins.every(x => !x.value)) '482913'.split('').forEach((c, k) => setTimeout(() => { if (!document.contains(ins[k])) return; ins[k].value = c; if (k === 5) $('#otpOk')?.click(); }, 200 + k * 120)); }, 1600);
    let done = false; $('#otpOk').onclick = () => { if (done) return; done = true; processing('Проверяем оплату', 'Обычно это занимает пару секунд'); };
    return;
  }
  if (m === 'sbp') return sbpBanks();
  const names = { sber: 'Открываем СберБанк Онлайн', tpay: 'Открываем приложение Т-Банка', alfa: 'Открываем Альфа-Онлайн', vtb: 'Открываем ВТБ Онлайн' };
  processing(names[m], 'Подтвердите платёж в приложении. В демо подтверждение произойдёт само.');
}
function sbpBanks() {
  payShell(`<div class="sbp-logo"><span class="sbp-badge">${SBP_MK}<b class="sbp-w">сбп</b></span><p>Выберите банк для подтверждения оплаты</p></div>
    <input class="bank-search" id="bq" placeholder="Введите название банка"><div class="banks" id="banks"></div>
    <button class="link" style="display:block;margin:14px auto 0;font-size:14px;color:#6b7280" id="back">Назад к способам оплаты</button>`);
  const draw = () => { const q = norm($('#bq').value); $('#banks').innerHTML = BANKS.filter(b => norm(b[0]).includes(q)).map(b => `<button class="bank" data-bank="${b[0]}"><i style="background:${b[1]};color:${b[2]}">${b[3]}</i>${b[0]}</button>`).join('') || '<p style="color:#8a8f98;text-align:center;padding:20px">Банк не найден</p>'; };
  draw(); $('#bq').oninput = draw;
  $('#banks').onclick = e => { const b = e.target.closest('[data-bank]'); if (b) processing('Переходим в ' + b.dataset.bank, 'Подтвердите оплату по СБП в приложении банка. В демо подтверждение произойдёт само.'); };
  $('#back').onclick = payMain;
}
async function processing(title, sub) {
  payShell(`<div class="pay-wait"><div class="spinner"></div><h5>${esc(title)}</h5><p>${esc(sub)}</p></div>`);
  await sleep(2300);
  payShell(`<div class="pay-wait"><div class="ok-ic"><svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h5>Оплата прошла</h5><p>${fmt(payOrder.total)} · чек отправлен на ${esc(user.email)}</p></div>`);
  await sleep(1300);
  finishOrder();
}
function finishOrder() {
  const o = { id: payOrder.id, date: new Date().toISOString(), items: cart.map(c => ({ ...c })), goods: payOrder.goods, total: payOrder.total, delivery: CO.delivery, name: CO.name, phone: CO.phone, address: `${CO.country}, ${CO.region}, ${CO.city}, ${CO.pvz.title}`, status: 0, track: null, email: user.email };
  orders.unshift(o); cart = []; saveAll(); renderCart();
  $('#pay').classList.remove('open'); document.body.style.overflow = '';
  location.hash = '#/account';
  setTimeout(() => modal(`<div class="success"><div class="ok-ic"><svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h3>Заказ ${o.id} оплачен</h3><p class="sub">Скоро мы отправим заказ, трек-номер появится в личном кабинете. Чек отправили на ${esc(o.email)}.</p><div class="btns"><button class="btn btn-ink" data-act="close">Смотреть статус заказа</button><a class="btn btn-ghost" href="#/catalog" data-act="close">Продолжить покупки</a></div></div>`), 250);
}

/* ============ ACCOUNT ============ */
const STEPS = ['Оплачен', 'Собираем заказ', 'Передан в доставку', 'Ждёт в пункте выдачи', 'Получен'];
function account(tab) {
  if (!user) {
    view.innerHTML = `<div class="wrap"><div class="page-h"><div class="crumbs"><a href="#/">Главная</a><span>/</span><span>Личный кабинет</span></div><h1>Личный кабинет</h1></div>
    <div class="guest">
      <div class="guest-l rv"><img class="mk" src="assets/img/airstep-mark.svg" alt=""><div><h2>Войдите<br><span>по номеру телефона</span></h2><p>Без паролей: код придёт в SMS. После входа заказ оформляется в пару кликов.</p></div><div><button class="btn btn-yellow" data-act="login">${ic('smartphone')} Войти или зарегистрироваться</button></div></div>
      <div class="guest-r stg">
        <div><span class="ic">${ic('package')}</span><span><h4>Статус и трек-номер</h4><p>Видно, где посылка, без переписки с менеджером.</p></span></div>
        <div><span class="ic">${ic('heart')}</span><span><h4>Избранное</h4><p>Сохраняйте пары, чтобы вернуться к ним позже.</p></span></div>
        <div><span class="ic">${ic('map-pin')}</span><span><h4>Адрес доставки</h4><p>Регион, город и пункт выдачи подставятся сами.</p></span></div>
        <div><span class="ic">${ic('clock')}</span><span><h4>История заказов</h4><p>Повторите прошлый заказ одним нажатием.</p></span></div>
      </div>
    </div></div>`;
    return;
  }
  tab = tab || 'orders';
  const initials = (user.name || 'A S').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const content = tab === 'profile' ? profileTab() : tab === 'fav' ? `<h2>Избранное</h2>${fav.length ? `<div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${fav.map(id => BY_ID[id]).filter(Boolean).map(card).join('')}</div>` : `<div class="empty"><h3>Пока пусто</h3><p>Сохраняйте пары сердечком в каталоге.</p><a class="btn btn-ink" href="#/catalog">В каталог</a></div>`}` : ordersTab();
  view.innerHTML = `<div class="wrap"><div class="page-h"><div class="crumbs"><a href="#/">Главная</a><span>/</span><span>Личный кабинет</span></div><h1>Личный кабинет</h1></div>
    <div class="acct">
      <nav class="acct-nav">
        <div class="acct-user"><div class="ava">${esc(initials)}</div><div><b>${esc(user.name || 'Покупатель AirStep')}</b><small>${esc(user.phone)}</small></div></div>
        <a href="#/account" class="${tab === 'orders' ? 'on' : ''}">${ic('package')}Заказы<span class="cnt2">${orders.length}</span></a>
        <a href="#/account/fav" class="${tab === 'fav' ? 'on' : ''}">${ic('heart')}Избранное<span class="cnt2">${fav.length}</span></a>
        <a href="#/account/profile" class="${tab === 'profile' ? 'on' : ''}">${ic('user')}Мои данные</a>
        <button data-act="logout">${ic('log-out')}Выйти</button>
        <button data-act="reset" class="reset-demo">${ic('rotate-ccw')}Сбросить демо</button>
      </nav>
      <div>${content}</div>
    </div></div>`;
  if (tab === 'profile') profileInit();
}
function orderCard(o, current) {
  const items = o.items.map(i => BY_ID[i.id]).filter(Boolean);
  const dl = DL[o.delivery]?.name || 'СДЭК';
  const trackUrl = o.delivery === 'post' ? `https://www.pochta.ru/tracking#${o.track}` : `https://www.cdek.ru/ru/tracking?order_id=${o.track}`;
  const date = new Date(o.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const thumbs = `<div class="order-items">${o.items.map(i => BY_ID[i.id] ? `<a href="#/product/${i.id}"><img src="${img(BY_ID[i.id])}" alt="" title="${esc(BY_ID[i.id].name)}, размер ${i.size}"></a>` : '').join('')}</div>`;
  if (!current) return `<div class="order"><div class="order-h"><div><h4>Заказ ${o.id} ${o.example ? '<span class="tag-ex">пример</span>' : ''}</h4><small>${date} · ${dl}</small></div><span class="status st-done">${STEPS[o.status]}</span></div>${thumbs}
    <div class="order-foot"><span class="muted">${items.map(p => esc(p.name)).join(', ')}</span><b class="price">${fmt(o.total)}</b></div>
    ${o.track ? `<div class="order-foot"><span class="muted">Трек-номер ${dl}: <b style="color:var(--ink)">${o.track}</b></span><button class="btn btn-ghost btn-sm" data-repeat="${o.id}">${ic('shopping-bag')} Повторить заказ</button></div>` : ''}</div>`;
  if (o.manager) return `<div class="order current"><div class="order-h"><div><h4>Заказ ${o.id}</h4><small>${date} · ${dl} · ${esc(o.address)}</small></div><span class="status st-wait">Оформляется у менеджера</span></div>
    <div class="track-box" style="margin-top:24px">${TG_ICON}<div><small>Оплата при получении</small><div style="font-weight:600">Заказ отправлен менеджеру в Telegram. После оплаты доставки здесь появится трек-номер.</div></div><a class="btn btn-yellow btn-sm" href="https://t.me/${MANAGER}" target="_blank" rel="noopener">Открыть чат ${ic('external-link')}</a></div>
    ${thumbs}<div class="order-foot"><span>${items.map(p => esc(p.name)).join(', ')} · получатель ${esc(o.name)}</span><b class="price" style="color:var(--yellow)">${fmt(o.goods || o.total)}</b></div></div>`;
  return `<div class="order current"><div class="order-h"><div><h4>Заказ ${o.id}</h4><small>${date} · ${dl} · ${esc(o.address)}</small></div><span class="status st-paid">${STEPS[o.status]}</span></div>
    <div class="tracker">${STEPS.map((s, k) => `<div class="st ${k < o.status || (k === o.status && k === 4) ? 'done' : k === o.status ? 'now' : ''}"><div class="dot">${k < o.status ? ic('check') : ''}</div><span>${s}</span></div>`).join('')}</div>
    ${o.track ? `<div class="track-box"><div><small>Трек-номер ${dl}</small><div class="tn">${o.track}</div></div><button class="btn btn-light btn-sm" data-copy="${o.track}">${ic('copy')} Скопировать</button><a class="btn btn-yellow btn-sm" href="${trackUrl}" target="_blank" rel="noopener">Отследить ${ic('external-link')}</a></div>` : `<div class="track-box">${ic('clock')}<div><small>Трек-номер</small><div style="font-weight:600">Появится здесь, как только передадим посылку в ${dl}</div></div></div>`}
    ${thumbs}<div class="order-foot"><span>${items.map(p => esc(p.name)).join(', ')} · получатель ${esc(o.name)}</span><b class="price" style="color:var(--yellow)">${fmt(o.total)}</b></div>
    ${o.status < 4 ? `<div style="margin-top:18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><button class="demo-ctl" data-advance="${o.id}">${ic('zap')} Демо: следующий статус</button><span style="font-size:12px;opacity:.5">только для показа, в рабочей версии статус меняет менеджер</span></div>` : ''}</div>`;
}
function ordersTab() {
  if (!orders.length) return `<h2>Заказы</h2><div class="empty"><h3>Заказов пока нет</h3><p>Здесь появятся статус и трек-номер.</p><a class="btn btn-ink" href="#/catalog">В каталог</a></div>`;
  const cur = orders.filter(o => o.status < 4 && !o.example), past = orders.filter(o => o.status >= 4 || o.example);
  return `${cur.length ? `<h2>Текущие заказы</h2>${cur.map(o => orderCard(o, true)).join('')}` : ''}${past.length ? `<h2 style="margin-top:${cur.length ? 34 : 0}px">${cur.length ? 'Прошлые заказы' : 'Заказы'}</h2>${past.map(o => orderCard(o, false)).join('')}` : ''}`;
}
function profileTab() {
  return `<h2>Мои данные</h2><div class="co-sec">
    <div class="grid2">
      <div class="field"><label>ФИО</label><input class="inp" id="pfName" value="${esc(user.name)}" placeholder="Иванов Иван Иванович"></div>
      <div class="field"><label>Телефон для входа</label><input class="inp" value="${esc(user.phone)}" disabled></div>
      <div class="field"><label>Email для чеков</label><input class="inp" id="pfEmail" value="${esc(user.email)}" placeholder="pochta@gmail.com"></div>
      <div class="field"><label>Страна</label><div class="dd" id="pfCountry"></div></div>
      <div class="field"><label>Регион</label><div class="dd" id="pfRegion"></div></div>
      <div class="field"><label>Город</label><div class="dd" id="pfCity"></div></div>
    </div>
    ${user.pvz ? `<div class="pvz-chosen show" style="margin-bottom:16px">${ic('map-pin')}<div><b>${DL[user.delivery]?.name || 'СДЭК'}: ${esc(user.pvz.title)}</b><div class="muted">Последний пункт выдачи, подставится при следующем заказе</div></div></div>` : ''}
    <button class="btn btn-ink" id="pfSave">Сохранить</button></div>`;
}
function profileInit() {
  const st = { country: user.country || 'Россия', region: user.region, city: user.city };
  const draw = () => {
    dropdown($('#pfCountry'), { value: st.country, items: Object.keys(GEO), onPick: v => { st.country = v; st.region = ''; st.city = ''; draw(); } });
    dropdown($('#pfRegion'), { value: st.region, placeholder: 'Выберите регион', items: Object.keys(GEO[st.country]).sort((a, b) => a.localeCompare(b, 'ru')), onPick: v => { st.region = v; const cs = geoCities(st.country, v); st.city = cs.length === 1 ? cs[0][0] : ''; draw(); } });
    dropdown($('#pfCity'), { value: st.city, placeholder: 'Выберите город', disabled: !st.region, items: st.region ? geoCities(st.country, st.region).map(c => c[0]) : [], onPick: v => { st.city = v; draw(); } });
  };
  draw();
  $('#pfSave').onclick = () => { if (st.city !== user.city) user.pvz = null; Object.assign(user, { name: $('#pfName').value.trim(), email: $('#pfEmail').value.trim(), ...st }); const users = store.get('users', {}); users[user.phone] = user; store.set('users', users); saveAll(); toast('Данные сохранены'); account('profile'); hydrateIcons(view); };
}

/* ============ PRIVACY ============ */
function privacy() {
  view.innerHTML = `<div class="wrap"><div class="page-h"><div class="crumbs"><a href="#/">Главная</a><span>/</span><span>Политика обработки персональных данных</span></div><h1>Политика обработки персональных данных</h1></div>
  <div class="doc rv">
    <p class="note">Шаблон для демо-версии. Перед запуском нужно вписать реквизиты владельца магазина (ФИО или название, ИНН, ОГРНИП/ОГРН, адрес) и согласовать текст.</p>
    <h2>1. Общие положения</h2>
    <p>Настоящая политика определяет порядок обработки и защиты персональных данных пользователей сайта магазина AirStep (далее «Сайт»). Оператор персональных данных: [наименование и реквизиты владельца] (далее «Оператор»). Политика составлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».</p>
    <h2>2. Какие данные мы обрабатываем</h2>
    <ul><li>номер телефона, используемый для входа в личный кабинет;</li><li>фамилия, имя, отчество получателя заказа;</li><li>адрес электронной почты для отправки чека;</li><li>страна, регион, город и адрес пункта выдачи;</li><li>состав и история заказов, список избранных товаров;</li><li>технические данные: cookie, сведения о браузере и устройстве.</li></ul>
    <h2>3. Цели обработки</h2>
    <ul><li>регистрация и вход в личный кабинет по коду из SMS;</li><li>оформление, оплата и доставка заказов, передача трек-номера;</li><li>отправка кассового чека;</li><li>связь с покупателем по вопросам заказа;</li><li>улучшение работы Сайта.</li></ul>
    <h2>4. Правовые основания</h2>
    <p>Оператор обрабатывает персональные данные на основании согласия пользователя, а также для исполнения договора купли-продажи, стороной которого является пользователь.</p>
    <h2>5. Передача третьим лицам</h2>
    <p>Для исполнения заказа данные могут передаваться службам доставки (СДЭК, Почта России), платёжным сервисам и оператору фискальных данных, только в объёме, необходимом для оказания услуги. Оператор не продаёт персональные данные и не передаёт их для рекламы.</p>
    <h2>6. Хранение и защита</h2>
    <p>Данные хранятся не дольше, чем этого требуют цели обработки или закон. Оператор принимает организационные и технические меры для защиты данных от неправомерного доступа, изменения и уничтожения.</p>
    <h2>7. Права пользователя</h2>
    <p>Пользователь может запросить сведения об обработке своих данных, потребовать их уточнения или удаления, а также отозвать согласие, написав Оператору в Telegram <a class="link" href="https://t.me/${MANAGER}" target="_blank" rel="noopener">@${MANAGER}</a> или по адресу [email владельца].</p>
    <h2>8. Cookie</h2>
    <p>Сайт использует cookie и локальное хранилище браузера, чтобы запоминать корзину, избранное и вход в кабинет. Их можно отключить в настройках браузера, но часть функций Сайта перестанет работать.</p>
    <h2>9. Изменения политики</h2>
    <p>Оператор может обновлять политику. Актуальная версия всегда доступна на этой странице.</p>
  </div></div>`;
}

/* ============ HEADER SEARCH ============ */
function headerSearch() {
  const q = $('#q'), sg = $('#suggest'); let hl = -1, res = [];
  const draw = () => {
    const v = q.value.trim();
    if (!v) { sg.classList.remove('open'); return; }
    res = P.filter(p => matchQ(p, v)).sort((a, b) => b.views - a.views);
    sg.innerHTML = (res.length ? res.slice(0, 6).map((p, k) => `<a href="#/product/${p.id}" class="${k === hl ? 'hl' : ''}"><img src="${img(p)}" alt=""><div><div class="s-name">${esc(p.name)}</div><div class="s-price">${fmt(p.price)} · ${sizeLabel(p)}</div></div></a>`).join('') : '<div style="padding:14px;color:var(--muted);font-size:14px">Ничего не нашли</div>') + (res.length > 6 ? `<a class="s-all" href="#/catalog?q=${encodeURIComponent(v)}">Все результаты: ${res.length}</a>` : '');
    sg.classList.add('open');
  };
  q.oninput = () => { hl = -1; draw(); };
  q.onfocus = draw;
  q.onblur = () => setTimeout(() => sg.classList.remove('open'), 160);
  q.onkeydown = e => {
    if (e.key === 'ArrowDown') { hl = Math.min(Math.min(res.length, 6) - 1, hl + 1); draw(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { hl = Math.max(-1, hl - 1); draw(); e.preventDefault(); }
    if (e.key === 'Enter') { location.hash = hl >= 0 && res[hl] ? '#/product/' + res[hl].id : '#/catalog?q=' + encodeURIComponent(q.value.trim()); q.blur(); }
  };
  sg.onclick = () => { q.value = ''; sg.classList.remove('open'); };
}

/* ============ ROUTER ============ */
let lastRoute = '';
function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [path] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const r = parts[0] || 'home';
  closeLayer(); hideSms();
  const isHome = r === 'home' || r === 's';
  const sameHome = isHome && (lastRoute === 'home' || lastRoute === 's');
  if (!sameHome) {
    if (r === 'catalog') catalog();
    else if (r === 'product') product(parts[1]);
    else if (r === 'favorites') favorites();
    else if (r === 'cart') { home(); openCart(); }
    else if (r === 'checkout') checkout();
    else if (r === 'account') account(parts[1]);
    else if (r === 'privacy') privacy();
    else home();
    view.classList.remove('view-in'); void view.offsetWidth; view.classList.add('view-in');
    hydrateIcons(view); reveal();
  }
  lastRoute = r;
  if (r === 's' && parts[1]) {
    const el = document.getElementById(parts[1]);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: sameHome ? 'smooth' : 'auto', block: 'start' }), sameHome ? 0 : 30);
  } else if (!sameHome || r === 'home') window.scrollTo({ top: 0, behavior: sameHome ? 'smooth' : 'auto' });
  $$('.nav a[data-r], .tabbar a').forEach(a => a.classList.toggle('on', a.dataset.r === r || (isHome && a.dataset.r === 'home')));
  if (!isHome) $$('.nav a[data-s]').forEach(a => a.classList.remove('on'));
  updateCounts();
}

/* ============ EVENTS ============ */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-sale],[data-act],[data-fav],[data-quick],[data-size],[data-psize],[data-buy],[data-gi],[data-gstep],[data-q],[data-rmc],[data-f],[data-clear],[data-rm],[data-pm],[data-advance],[data-copy],[data-repeat],[data-acc],[data-car],[data-gender]');
  if (!e.target.closest('.dd')) $$('.dd.open').forEach(d => d.classList.remove('open'));
  if (!t) return;
  const d = t.dataset;
  if ('acc' in d) { t.closest('.acc-i').classList.toggle('open'); return; }
  if (d.car) { const tr = t.closest('.wrap').querySelector('.car-track'); tr.scrollBy({ left: +d.car * tr.clientWidth * .75, behavior: 'smooth' }); return; }
  if (d.fav) { e.preventDefault(); toggleFav(d.fav); }
  else if (d.quick) {
    e.preventDefault(); const p = BY_ID[d.quick];
    modal(`<h3>${esc(p.name)}</h3><p class="sub">${fmt(p.price)} · выберите размер</p><div class="psizes" style="grid-template-columns:repeat(4,1fr)">${p.sizes.map(s => `<button class="sz" data-qs="${s}">${s}</button>`).join('')}</div><a class="link muted" style="display:block;margin-top:18px;font-size:14px" href="#/product/${p.id}">Открыть карточку товара</a>`);
    $$('[data-qs]').forEach(b => b.onclick = () => { addToCart(p.id, +b.dataset.qs); closeLayer(); toast(`Размер ${b.dataset.qs} в корзине <a href="#/cart">Открыть</a>`, 'shopping-bag'); });
  }
  else if ('gender' in d) { F.gender = d.gender; shown = PAGE; apply(); }
  else if (d.size) { const s = +d.size; F.size = F.size.includes(s) ? F.size.filter(x => x !== s) : [...F.size, s]; shown = PAGE; apply(); }
  else if ('sale' in d && t.tagName === 'INPUT') { F.sale = t.checked; shown = PAGE; apply(); }
  else if (d.f) { const k = d.f, v = t.value; F[k] = t.checked ? [...F[k], v] : F[k].filter(x => x !== v); shown = PAGE; apply(); }
  else if (d.clear) { const k = d.clear; if (k === 'all') { F = { q: '', brand: [], size: [], season: [], gender: '', min: PMIN, max: PMAX, sort: F.sort, sale: false }; $('#cq').value = ''; } else if (k === 'price') { F.min = PMIN; F.max = PMAX; } else F[k] = []; shown = PAGE; apply(); }
  else if (d.rm) { const k = d.rm, v = d.v; if (k === 'price') { F.min = PMIN; F.max = PMAX; } else if (k === 'sale') F.sale = false; else if (k === 'gender') F.gender = ''; else if (k === 'q') { F.q = ''; $('#cq').value = ''; } else F[k] = F[k].filter(x => String(x) !== v); apply(); }
  else if (d.psize) { selSize = +d.psize; $$('[data-psize]').forEach(b => b.classList.toggle('on', b === t)); $('#buy').innerHTML = ic('shopping-bag') + ` Добавить размер ${selSize}`; }
  else if (d.buy) { if (!selSize) { const ps = $('#psizes'); ps.classList.remove('shake'); void ps.offsetWidth; ps.classList.add('shake'); toast('Сначала выберите размер', 'ruler'); return; } addToCart(d.buy, selSize); toast(`Размер ${selSize} в корзине <a href="#/cart">Оформить</a>`, 'shopping-bag'); }
  else if (d.gi) setGallery(+d.gi);
  else if (d.gstep) setGallery(gi + +d.gstep);
  else if (d.q) { const it = cart[+d.q]; it.qty += +d.d; if (it.qty < 1) cart.splice(+d.q, 1); saveAll(); renderCart(); }
  else if (d.rmc) { cart.splice(+d.rmc, 1); saveAll(); renderCart(); }
  else if (d.pm) payAction(d.pm);
  else if (d.advance) { const o = orders.find(x => x.id === d.advance); o.status = Math.min(4, o.status + 1); if (o.status >= 2 && !o.track) o.track = o.delivery === 'post' ? '8' + String(Math.floor(1e12 + Math.random() * 9e12)).slice(0, 13) : '1' + String(Math.floor(1e9 + Math.random() * 9e9)); saveAll(); account(); hydrateIcons(view); if (o.status === 2) toast('Трек-номер появился в заказе', 'truck'); }
  else if (d.copy) { navigator.clipboard?.writeText(d.copy).catch(() => {}); toast('Трек-номер скопирован', 'copy'); }
  else if (d.repeat) { const o = orders.find(x => x.id === d.repeat); o.items.forEach(i => BY_ID[i.id] && addToCart(i.id, i.size, i.qty)); openCart(); }
  else if (d.act) {
    const a = d.act;
    if (a === 'close') { closeLayer(); return; }
    if (a === 'cart') openCart();
    else if (a === 'checkout') { closeLayer(); location.hash = '#/checkout'; }
    else if (a === 'login') login(() => route());
    else if (a === 'reset') { modal(`<div class="success"><div class="ok-ic plain">${ic('rotate-ccw')}</div><h3>Сбросить демо?</h3><p class="sub">Удалим вход, корзину, избранное, заказы и сохранённые данные в этом браузере. Сайт откроется как для нового посетителя.</p><div class="btns"><button class="btn btn-ink" data-act="reset-ok">Сбросить</button><button class="btn btn-ghost" data-act="close">Отмена</button></div></div>`); }
    else if (a === 'reset-ok') { try { Object.keys(localStorage).filter(k => k.startsWith('as_')).forEach(k => localStorage.removeItem(k)); } catch (e) {} location.hash = '#/'; location.reload(); }
    else if (a === 'logout') { modal(`<div class="success"><div class="ok-ic plain">${ic('log-out')}</div><h3>Выйти из кабинета?</h3><p class="sub">Корзина и избранное останутся в этом браузере. Чтобы снова увидеть заказы, войдите по тому же номеру телефона.</p><div class="btns"><button class="btn btn-ink" data-act="logout-ok">Выйти</button><button class="btn btn-ghost" data-act="close">Остаться</button></div></div>`); }
    else if (a === 'logout-ok') { closeLayer(); user = null; saveAll(); toast('Вы вышли из кабинета', 'log-out'); lastRoute = ''; route(); }
    else if (a === 'mnav') openLayer('#mnav');
    else if (a === 'filters') { if ($('#filters').classList.contains('open')) closeLayer(); else openLayer('#filters'); }
    else if (a === 'brands') { brandsOpen = !brandsOpen; renderFilters(); }
    else if (a === 'more') { shown += PAGE; apply(false); }
    else if (a === 'sizes') modal(`<h3>Таблица размеров</h3><p class="sub">Измерьте стопу от пятки до большого пальца и выберите размер с запасом 0,5 см.</p><table class="stable"><tr><th>EU</th><th>Длина стопы</th><th>RU</th></tr>${Object.entries(SIZE_CM).map(([eu, cm]) => `<tr><td><b>${eu}</b></td><td>${String(cm).replace('.', ',')} см</td><td>${eu - 1}</td></tr>`).join('')}</table>`);
    else if (a === 'payclose') { $('#pay').classList.remove('open'); document.body.style.overflow = ''; }
  }
  hydrateIcons();
});
$('#ovl').onclick = () => closeLayer();
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('.dd.open')) { $$('.dd.open').forEach(d => d.classList.remove('open')); return; } closeLayer(); $('#pay').classList.remove('open'); document.body.style.overflow = ''; } });
window.addEventListener('hashchange', route);
window.addEventListener('scroll', () => $('#hdr').classList.toggle('scrolled', scrollY > 10), { passive: true });
// force re-render when navigating home from another page
const _route = route;
hydrateIcons(); headerSearch(); renderCart(); route();
{ const mc = document.getElementById('mnavCount'); if (mc) mc.textContent = P.length + ' ' + plural(P.length, 'пара', 'пары', 'пар') + ' в каталоге'; }
})();
