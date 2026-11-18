'use strict';
const $ = (id) => document.getElementById(id),
  esc = Store.esc;
let db = Store.load(),
  vehicleId = '',
  search = '',
  type = '',
  brand = '',
  rim = '',
  currentBackground = db.settings.background;
const CART_KEY = 'rey-llantas.order.v2';
let cart = [];
try {
  const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  if (Array.isArray(saved))
    cart = saved.filter(
      (x) =>
        typeof x.id === 'string' &&
        Number.isInteger(x.qty) &&
        x.qty > 0 &&
        x.qty <= 99,
    );
} catch (e) {}
const liveTires = () => db.tires.filter((t) => t.published);
const tire = (id) => liveTires().find((t) => t.id === id);
const fullName = (t) =>
  t.brand + ' ' + t.model + ' ' + t.size + ' ' + t.load + t.speed;
const photo = (t) =>
  t.image
    ? '<img loading="lazy" src="' +
      esc(t.image) +
      '" alt="' +
      esc(fullName(t)) +
      '">'
    : '<div class="placeholder">Foto por agregar</div>';
const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[,\s/]/g, (c) => (c === ',' ? '.' : ''));
let toastTimer;
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4000);
}
function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (e) {
    toast('El pedido se conserva solo mientras esta página esté abierta.');
  }
  updateCount();
}
function updateCount() {
  cart = cart.filter((x) => tire(x.id));
  const n = cart.reduce((sum, x) => sum + x.qty, 0);
  $('orderCount').textContent = n;
  $('floatingCount').textContent = n;
}
function add(id) {
  if (!tire(id)) return;
  const x = cart.find((x) => x.id === id);
  if (x) x.qty = Math.min(99, x.qty + 1);
  else cart.push({ id, qty: 1 });
  saveCart();
  toast('Llanta agregada. Revisa la cantidad en Mi pedido.');
}
function product(t) {
  return (
    '<article class="product"><div class="product-visual"><span class="product-tag">' +
    esc(t.type) +
    '</span>' +
    photo(t) +
    '</div><div class="product-body"><p class="product-brand">' +
    esc(t.brand) +
    '</p><h3>' +
    esc(t.model) +
    '</h3><p class="product-size">' +
    esc(t.size) +
    ' <span>' +
    esc(t.load + t.speed) +
    '</span></p><p class="small">Precio y disponibilidad por consultar</p><div class="actions"><button class="btn outline" data-detail="' +
    esc(t.id) +
    '">Ver ficha →</button><button class="btn" data-add="' +
    esc(t.id) +
    '">Agregar al pedido +</button></div></div></article>'
  );
}
const ROWS = 4; // filas visibles; "Ver más" muestra otras 4
let rowsShown = ROWS,
  lastCols = 3;
const gridCols = () =>
  Math.max(
    1,
    getComputedStyle($('catalog'))
      .gridTemplateColumns.split(' ')
      .filter(Boolean).length,
  );
const rimOf = (size) => (/R(\d{2})/i.exec(size) || [])[1] || '';
const findBrand = (name) => {
  const n = norm(name);
  return (db.brands || []).find((b) => {
    const m = norm(b.name);
    return m === n || m.includes(n) || n.includes(m);
  });
};
function renderFilters() {
  const names = new Map();
  liveTires().forEach((t) => {
    const k = t.brand.trim().toLowerCase();
    if (!names.has(k)) names.set(k, t.brand.trim());
  });
  if (brand && !names.has(brand)) brand = '';
  const order = (name) => {
    const i = (db.brands || []).indexOf(findBrand(name));
    return i < 0 ? 999 : i;
  };
  const list = [...names.entries()].sort(
    (x, y) => order(x[1]) - order(y[1]) || x[1].localeCompare(y[1]),
  );
  $('brandFilter').innerHTML =
    '<button class="brand-chip" data-brand-filter="" aria-pressed="' +
    (brand === '') +
    '">Todas</button>' +
    list
      .map(([key, name]) => {
        const logo = (findBrand(name) || {}).logo;
        return (
          '<button class="brand-chip" data-brand-filter="' +
          esc(key) +
          '" aria-pressed="' +
          (brand === key) +
          '" title="' +
          esc(name) +
          '">' +
          (logo
            ? '<img src="' + esc(logo) + '" alt="' + esc(name) + '">'
            : esc(name)) +
          '</button>'
        );
      })
      .join('');
  const rims = [
    ...new Set(liveTires().map((t) => rimOf(t.size)).filter(Boolean)),
  ].sort((x, y) => x - y);
  if (rim && !rims.includes(rim)) rim = '';
  $('rim').innerHTML =
    '<option value="">Todos los rines</option>' +
    rims.map((r) => '<option value="' + r + '">Rin ' + r + '</option>').join('');
  $('rim').value = rim;
}
function renderCatalog() {
  const v = db.vehicles.find((x) => x.id === vehicleId);
  const items = liveTires().filter(
    (t) =>
      (!type || t.type === type) &&
      (!brand || t.brand.trim().toLowerCase() === brand) &&
      (!rim || rimOf(t.size) === rim) &&
      (!search || norm(fullName(t)).includes(norm(search))) &&
      (!v || v.sizes.includes(t.size)),
  );
  const cols = gridCols();
  lastCols = cols;
  const shown = items.slice(0, cols * rowsShown),
    pageSize = cols * ROWS;
  $('resultCount').textContent =
    (items.length > shown.length
      ? 'Mostrando ' + shown.length + ' de ' + items.length
      : items.length) +
    ' variante' +
    (items.length === 1 ? '' : 's') +
    (v
      ? ' con medidas de referencia para ' + v.make + ' ' + v.model
      : ' en el catálogo');
  $('clearFiltersBar').hidden = !(search || type || brand || rim);
  const more = $('showMore');
  more.hidden = items.length <= pageSize;
  if (!more.hidden) {
    const left = items.length - shown.length;
    more.dataset.mode = left > 0 ? 'more' : 'less';
    more.textContent =
      left > 0 ? 'Ver más llantas (' + left + ' más)' : 'Ver menos';
  }
  $('vehicleFilter').hidden = !v;
  if (v)
    $('vehicleFilter').innerHTML =
      '<strong>' +
      esc(v.make + ' ' + v.model) +
      '</strong> · Medidas orientativas: ' +
      v.sizes.map(esc).join(' · ') +
      '<button id="clearVehicle">Ver todas las llantas</button><p class="small">La coincidencia de medida no garantiza compatibilidad. Confirma año, versión, rin e índices antes de comprar.</p>';
  $('catalog').innerHTML = items.length
    ? shown.map(product).join('')
    : '<div class="empty"><h3>No hay variantes con estos filtros.</h3><p>Puedes ver todo el catálogo o preparar una consulta con la medida y los datos de tu vehículo.</p><div class="actions"><button class="btn outline" id="clearFilters">Limpiar filtros</button><button class="btn" data-order>Consultar por WhatsApp →</button></div></div>';
}
let colsTimer;
window.addEventListener('resize', () => {
  clearTimeout(colsTimer);
  colsTimer = setTimeout(() => {
    if (gridCols() !== lastCols) renderCatalog();
  }, 200);
});
/* Portada: las fotos de img/fondos cambian solas cada pocos segundos.
   Para cambiar las fotos, reemplaza fondo1.jpg … fondo4.jpg en esa carpeta. */
const HERO_COUNT = 4,
  HERO_PATHS = Array.from(
    { length: HERO_COUNT },
    (_, i) => 'img/fondos/fondo' + (i + 1) + '.jpg',
  );
let heroShown = '',
  heroLayer = 0,
  heroToken = 0,
  heroTimer = 0;
function renderHeroDots() {
  $('heroDots').innerHTML = HERO_PATHS.map(
    (path, i) =>
      '<button class="hero-dot ' +
      (path === currentBackground ? 'active' : '') +
      '" data-background="' +
      (i + 1) +
      '" aria-label="Ver foto de portada ' +
      (i + 1) +
      '" aria-pressed="' +
      (path === currentBackground) +
      '">0' +
      (i + 1) +
      '</button>',
  ).join('');
}
function setBackground(path) {
  currentBackground = path;
  renderHeroDots();
  if (path === heroShown) return;
  const token = ++heroToken,
    show = () => {
      if (token !== heroToken) return;
      const layers = [$('heroBgA'), $('heroBgB')],
        first = !heroShown,
        next = layers[first ? 0 : 1 - heroLayer];
      next.style.backgroundImage = 'url("' + path + '")';
      if (!first) layers[heroLayer].classList.remove('on');
      next.classList.add('on');
      heroLayer = layers.indexOf(next);
      heroShown = path;
    },
    probe = new Image();
  probe.onload = probe.onerror = show; // cambia cuando la foto ya cargó
  probe.src = path;
}
function nextHero() {
  const i = Math.max(0, HERO_PATHS.indexOf(currentBackground));
  setBackground(HERO_PATHS[(i + 1) % HERO_PATHS.length]);
}
function startHero() {
  clearInterval(heroTimer);
  if (reduceMotion.matches) return;
  heroTimer = setInterval(() => {
    if (!document.hidden) nextHero();
  }, 6500);
}
function carIcon(body) {
  const truck = body === 'pickup';
  return (
    '<svg viewBox="0 0 250 100" aria-hidden="true"><path d="' +
    (truck
      ? 'M15 73V49H57L79 24H135L155 49H232V73Z'
      : 'M15 73V54L54 45L81 22H157L190 47L231 55V73Z') +
    '" fill="#d9e4f5" stroke="#0b4aa2" stroke-width="3"/><path d="M72 46L88 30H128L141 46Z" fill="#fff"/><circle cx="59" cy="73" r="17" fill="#14213d"/><circle cx="190" cy="73" r="17" fill="#14213d"/><circle cx="59" cy="73" r="7" fill="#c3cfe1"/><circle cx="190" cy="73" r="7" fill="#c3cfe1"/></svg>'
  );
}
const bodyLabel = {
  sedan: 'Sedán',
  hatch: 'Hatchback',
  suv: 'SUV',
  pickup: 'Pickup',
};
const popular = [
  'toyota-hilux',
  'toyota-corolla',
  'kia-sportage',
  'nissan-frontier',
];
const vnorm = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const car = {
  pos: 0,
  setW: 0,
  n: 0,
  loop: false,
  paused: reduceMotion.matches,
  hover: false,
  holding: false,
  focus: false,
  visible: true,
  last: 0,
  t: 0,
  list: [],
};
const carEl = $('carousel'),
  carTrack = $('carTrack');
function vehicleCard(v, hidden) {
  const sel = v.id === vehicleId;
  return (
    '<button class="vehicle-card' +
    (sel ? ' selected' : '') +
    '" type="button" data-vehicle="' +
    esc(v.id) +
    '"' +
    (hidden
      ? ' tabindex="-1" aria-hidden="true"'
      : ' aria-pressed="' + sel + '"') +
    '>' +
    (v.image
      ? '<img src="' +
        esc(v.image) +
        '" loading="lazy" draggable="false" alt="' +
        (hidden ? '' : esc(v.make + ' ' + v.model)) +
        '">'
      : carIcon(v.body)) +
    '<small>' +
    esc(v.make + ' · ' + bodyLabel[v.body]) +
    '</small><strong>' +
    esc(v.model) +
    '</strong><em>' +
    (sel ? 'Mostrando sus medidas ✓' : 'Ver llantas →') +
    '</em></button>'
  );
}
function measureCarousel() {
  if (car.loop && car.n && carTrack.children[car.n])
    car.setW =
      carTrack.children[car.n].offsetLeft - carTrack.children[0].offsetLeft;
}
function renderCarousel() {
  const tokens = $('vehicleSearch')
    .value.trim()
    .split(/\s+/)
    .map(vnorm)
    .filter(Boolean);
  const sorted = [...db.vehicles].sort(
    (a, b) =>
      (popular.includes(b.id) ? 1 : 0) - (popular.includes(a.id) ? 1 : 0),
  );
  const list = sorted.filter((v) => {
    const h = vnorm(v.make + v.model + bodyLabel[v.body] + v.body);
    return tokens.every((t) => h.includes(t));
  });
  car.list = list;
  car.n = list.length;
  car.loop = !tokens.length && list.length >= 7;
  if (!list.length)
    carTrack.innerHTML =
      '<div class="empty"><h3>No encontramos ese vehículo.</h3><p>Prueba con otra marca o modelo. También puedes escribirnos tu vehículo y medida por WhatsApp.</p><div class="actions"><button class="btn" data-order>Consultar por WhatsApp →</button></div></div>';
  else if (car.loop)
    carTrack.innerHTML = [0, 1, 2]
      .map((i) => list.map((v) => vehicleCard(v, i !== 1)).join(''))
      .join('');
  else carTrack.innerHTML = list.map((v) => vehicleCard(v, false)).join('');
  $('vehicleCount').textContent = tokens.length
    ? list.length +
      (list.length === 1 ? ' vehículo encontrado' : ' vehículos encontrados')
    : 'Arrastra o desliza con el dedo para ver más vehículos.';
  car.setW = 0;
  car.pos = 0;
  carEl.scrollLeft = 0;
  if (car.loop) {
    measureCarousel();
    car.pos = car.setW;
    carEl.scrollLeft = car.pos;
  }
}
function markSelected() {
  carTrack.querySelectorAll('.vehicle-card').forEach((b) => {
    const sel = b.dataset.vehicle === vehicleId;
    b.classList.toggle('selected', sel);
    if (!b.hasAttribute('aria-hidden')) b.setAttribute('aria-pressed', sel);
    b.querySelector('em').textContent = sel
      ? 'Mostrando sus medidas ✓'
      : 'Ver llantas →';
  });
}
function tick(t) {
  const dt = Math.min(50, t - (car.t || t));
  car.t = t;
  if (car.loop && car.setW) {
    const moving =
      !car.paused &&
      !car.hover &&
      !car.holding &&
      !car.focus &&
      car.visible &&
      !document.hidden &&
      t - car.last > 1800;
    if (moving) {
      car.pos += dt * 0.04;
      carEl.scrollLeft = car.pos;
    } else car.pos = carEl.scrollLeft;
    if (car.pos >= 2 * car.setW) {
      car.pos -= car.setW;
      carEl.scrollLeft = car.pos;
    } else if (car.pos < car.setW * 0.5) {
      car.pos += car.setW;
      carEl.scrollLeft = car.pos;
    }
  }
  requestAnimationFrame(tick);
}
const touched = () => {
  car.last = performance.now();
};
let drag = null;
carEl.addEventListener('pointerdown', (e) => {
  touched();
  car.holding = true;
  if (e.pointerType === 'mouse' && e.button === 0)
    drag = { x0: e.clientX, x: e.clientX, moved: false };
});
carEl.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.abs(e.clientX - drag.x0) < 6) return;
    drag.moved = true;
    drag.x = e.clientX;
    carEl.classList.add('dragging');
    carEl.setPointerCapture(e.pointerId);
    return;
  }
  carEl.scrollLeft -= e.clientX - drag.x;
  drag.x = e.clientX;
  touched();
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach((n) =>
  carEl.addEventListener(n, () => {
    drag = null;
    car.holding = false;
    carEl.classList.remove('dragging');
    touched();
  }),
);
carEl.addEventListener('pointerenter', (e) => {
  if (e.pointerType === 'mouse') car.hover = true;
});
carEl.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse') car.hover = false;
});
carEl.addEventListener('wheel', touched, { passive: true });
carEl.addEventListener(
  'scroll',
  () => {
    if (Math.abs(carEl.scrollLeft - car.pos) > 1.5) touched();
  },
  { passive: true },
);
carEl.addEventListener('focusin', (e) => {
  if (e.target.matches && e.target.matches(':focus-visible')) car.focus = true;
});
carEl.addEventListener('focusout', () => {
  car.focus = false;
});
if ('IntersectionObserver' in window)
  new IntersectionObserver((en) => {
    car.visible = en[0].isIntersecting;
  }).observe(carEl);
window.addEventListener('resize', measureCarousel);
$('vehicleSearch').oninput = renderCarousel;
$('vehicleSearch').onkeydown = (e) => {
  if (e.key === 'Enter' && car.list.length === 1) {
    e.preventDefault();
    const b = carTrack.querySelector('.vehicle-card');
    if (b) b.click();
  }
};
requestAnimationFrame(tick);
/* Carrusel de marcas: siempre en movimiento, sin pausa ni interacción.
   Las marcas y sus logos se administran en Administración → Marcas. */
let brandWidth = 0;
function renderBrands() {
  const list = db.brands || [],
    box = $('brandsSection'),
    track = $('brandTrack');
  box.hidden = !list.length;
  if (!list.length) {
    track.innerHTML = '';
    return;
  }
  const item = (b, dup) =>
    '<span class="brand-item"' +
    (dup ? ' data-dup' : '') +
    '>' +
    (b.logo
      ? '<img src="' +
        esc(b.logo) +
        '" alt="" draggable="false" loading="lazy">'
      : '<span>' + esc(b.name) + '</span>') +
    '</span>';
  track.style.animation = 'none';
  track.innerHTML = list.map((b) => item(b, false)).join('');
  const one = track.scrollWidth || list.length * 236,
    reps = Math.max(1, Math.ceil(2400 / one)),
    half = Array.from({ length: reps }, (_, i) =>
      list.map((b) => item(b, i > 0)).join(''),
    ).join('');
  track.innerHTML =
    half +
    Array.from({ length: reps }, () =>
      list.map((b) => item(b, true)).join(''),
    ).join('');
  brandWidth = one * reps;
  track.style.animation = '';
  track.style.animationDuration = Math.max(20, brandWidth / 55) + 's';
  $('brandMarquee').setAttribute(
    'aria-label',
    'Marcas de llantas: ' + list.map((b) => b.name).join(', '),
  );
}
let brandResize,
  brandMobile = window.innerWidth <= 700;
window.addEventListener('resize', () => {
  clearTimeout(brandResize);
  brandResize = setTimeout(() => {
    const mobile = window.innerWidth <= 700;
    if (mobile !== brandMobile) {
      brandMobile = mobile;
      renderBrands();
    }
  }, 250);
});
function renderAll() {
  setBackground(currentBackground);
  renderCarousel();
  renderBrands();
  const types = [...new Set(liveTires().map((t) => t.type))];
  if (type && !types.includes(type)) type = '';
  $('type').innerHTML =
    '<option value="">Todos los usos</option>' +
    types.map((t) => '<option>' + esc(t) + '</option>').join('');
  $('type').value = type;
  renderFilters();
  renderCatalog();
  updateCount();
  $('contactDetails').innerHTML =
    [db.settings.address, db.settings.hours]
      .filter(Boolean)
      .map((x) => '<div>' + esc(x) + '</div>')
      .join('') ||
    '<div>Consulta disponibilidad y atención<br>al preparar tu pedido.</div>';
  const featured = tire('falken-at4w-35-125r');
  document.querySelector('.feature').hidden = !featured;
  if (featured) {
    $('featuredImage').src = featured.image;
    $('featuredImage').alt = fullName(featured);
    document.querySelector('.feature h2').textContent = featured.model;
    document.querySelector('.feature p:not(.eyebrow)').textContent =
      'Conoce esta variante en medida ' +
      featured.size +
      ' ' +
      featured.load +
      featured.speed +
      '. Revisa sus detalles antes de armar tu pedido.';
  }
}
function detail(id) {
  const t = tire(id);
  if (!t) return;
  const rows = [
    ['Marca', t.brand],
    ['Modelo', t.model],
    ['Medida', t.size],
    ['Índice de carga', t.load || 'Por confirmar'],
    ['Índice de velocidad', t.speed || 'Por confirmar'],
    ['Uso', t.type],
    ...t.specs,
  ];
  $('detail').innerHTML =
    '<button class="close" data-close aria-label="Cerrar ficha">×</button><div class="detail-head">' +
    photo(t) +
    '<div><p class="eyebrow">' +
    esc(t.brand) +
    '</p><h2>' +
    esc(t.model) +
    '</h2><strong class="product-size">' +
    esc(t.size + ' ' + t.load + t.speed) +
    '</strong></div></div><table>' +
    rows
      .map(
        (r) =>
          '<tr><th scope="row">' +
          esc(r[0]) +
          '</th><td>' +
          esc(r[1]) +
          '</td></tr>',
      )
      .join('') +
    '</table><p class="small">' +
    esc(t.description) +
    '</p><p class="small">Confirma la ficha del fabricante, el rin, los índices y la compatibilidad con tu año y versión. No se asume que esta medida sirve para todos los vehículos.</p><button class="btn blue" data-add="' +
    esc(t.id) +
    '">Agregar al pedido +</button>';
  $('detail').showModal();
}
function orderText() {
  const lines = ['Hola, El Rey de las Llantas. Quiero cotizar:', ''];
  cart.forEach((x) => {
    const t = tire(x.id);
    if (t) lines.push(x.qty + ' × ' + fullName(t));
  });
  if (!cart.length) lines.push('Necesito ayuda para elegir mis llantas.');
  if ($('customerName').value.trim())
    lines.push('\nNombre: ' + $('customerName').value.trim());
  if ($('customerVehicle').value.trim())
    lines.push('Vehículo: ' + $('customerVehicle').value.trim());
  if ($('customerNotes').value.trim())
    lines.push('Comentarios: ' + $('customerNotes').value.trim());
  lines.push('\nPor favor, confirmar precio, disponibilidad y compatibilidad.');
  return lines.join('\n');
}
function updateMessage() {
  $('orderMessage').value = orderText();
}
function renderOrder() {
  updateCount();
  $('orderItems').innerHTML = cart.length
    ? cart
        .map((x) => {
          const t = tire(x.id);
          return (
            '<div class="order-line">' +
            (t.image
              ? '<img src="' + esc(t.image) + '" alt="">'
              : '<span></span>') +
            '<div><strong>' +
            esc(t.brand + ' ' + t.model) +
            '</strong><small>' +
            esc(t.size + ' ' + t.load + t.speed) +
            '</small></div><input aria-label="Cantidad de ' +
            esc(fullName(t)) +
            '" type="number" min="1" max="99" step="1" value="' +
            x.qty +
            '" data-qty="' +
            esc(x.id) +
            '"><button class="remove" data-remove="' +
            esc(x.id) +
            '" aria-label="Quitar ' +
            esc(fullName(t)) +
            '">×</button></div>'
          );
        })
        .join('')
    : '<div class="empty"><p>Aún no has agregado llantas. También puedes enviarnos una consulta con los datos de tu vehículo.</p></div>';
  $('sendOrder').disabled = !db.settings.whatsapp;
  $('waNotice').textContent = db.settings.whatsapp
    ? 'Se abrirá WhatsApp con el mensaje. Tú decides cuándo enviarlo.'
    : 'El negocio aún no ha configurado su WhatsApp. Puedes copiar el pedido; el número se agrega desde Administración → Ajustes.';
  updateMessage();
}
function openOrder() {
  if ($('detail').open) $('detail').close();
  const v = db.vehicles.find((x) => x.id === vehicleId);
  if (v && !$('customerVehicle').value)
    $('customerVehicle').value = v.make + ' ' + v.model;
  renderOrder();
  $('order').showModal();
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-order')) openOrder();
  if (b.hasAttribute('data-close')) b.closest('dialog').close();
  if (b.dataset.detail) detail(b.dataset.detail);
  if (b.dataset.add) {
    add(b.dataset.add);
    if ($('detail').open) $('detail').close();
  }
  if (b.dataset.background) {
    setBackground(HERO_PATHS[Number(b.dataset.background) - 1]);
    startHero();
  }
  if (b.dataset.vehicle) {
    const v = db.vehicles.find((x) => x.id === b.dataset.vehicle);
    if (v) {
      vehicleId = v.id;
      rowsShown = ROWS;
      markSelected();
      renderCatalog();
      $('catalogo').scrollIntoView();
    }
  }
  if (b.dataset.remove) {
    cart = cart.filter((x) => x.id !== b.dataset.remove);
    saveCart();
    renderOrder();
  }
  const clearAll = b.id === 'clearFilters' || b.id === 'clearFiltersBar';
  if (b.id === 'clearVehicle' || clearAll) {
    vehicleId = '';
    rowsShown = ROWS;
    markSelected();
    if (clearAll) {
      search = '';
      type = '';
      brand = '';
      rim = '';
      $('search').value = '';
      $('type').value = '';
      renderFilters();
    }
    renderCatalog();
  }
  if (b.dataset.brandFilter !== undefined) {
    brand = b.dataset.brandFilter;
    rowsShown = ROWS;
    renderFilters();
    renderCatalog();
  }
  if (b.id === 'showMore') {
    const less = b.dataset.mode === 'less';
    rowsShown = less ? ROWS : rowsShown + ROWS;
    renderCatalog();
    if (less) $('catalogo').scrollIntoView();
  }
});
$('search').oninput = (e) => {
  search = e.target.value;
  rowsShown = ROWS;
  renderCatalog();
};
$('type').onchange = (e) => {
  type = e.target.value;
  rowsShown = ROWS;
  renderCatalog();
};
$('rim').onchange = (e) => {
  rim = e.target.value;
  rowsShown = ROWS;
  renderCatalog();
};
$('featuredButton').onclick = () => detail('falken-at4w-35-125r');
$('orderItems').oninput = (e) => {
  if (!e.target.dataset.qty) return;
  const x = cart.find((x) => x.id === e.target.dataset.qty),
    n = Number(e.target.value);
  if (x && Number.isInteger(n) && n >= 1 && n <= 99) {
    x.qty = n;
    saveCart();
    updateMessage();
  }
};
$('orderItems').onchange = (e) => {
  if (!e.target.dataset.qty) return;
  const x = cart.find((x) => x.id === e.target.dataset.qty),
    n = Number(e.target.value);
  if (x) {
    x.qty = Number.isInteger(n) ? Math.min(99, Math.max(1, n)) : 1;
    e.target.value = x.qty;
    saveCart();
    updateMessage();
  }
};
['customerName', 'customerVehicle', 'customerNotes'].forEach(
  (id) => ($(id).oninput = updateMessage),
);
$('orderForm').onsubmit = (e) => {
  e.preventDefault();
  if (!db.settings.whatsapp) return;
  window.open(
    'https://wa.me/' +
      db.settings.whatsapp +
      '?text=' +
      encodeURIComponent(orderText()),
    '_blank',
    'noopener,noreferrer',
  );
};
$('copyOrder').onclick = async () => {
  try {
    await navigator.clipboard.writeText(orderText());
    toast('Pedido copiado.');
  } catch (e) {
    $('orderMessage').select();
    toast('Selecciona y copia el texto del pedido.');
  }
};
const parts = [
  ['265', 'Ancho de la llanta, expresado en milímetros.'],
  ['65', 'Perfil: altura del costado como porcentaje del ancho.'],
  ['R', 'Construcción radial.'],
  ['17', 'Diámetro del rin en pulgadas.'],
];
function decode(index) {
  $('decoder').innerHTML = parts
    .map(
      (p, i) =>
        '<button type="button" data-decode="' +
        i +
        '" class="' +
        (i === index ? 'active' : '') +
        '" aria-pressed="' +
        (i === index) +
        '">' +
        p[0] +
        '</button>',
    )
    .join('');
  $('decodeHelp').textContent = parts[index][1];
}
$('decoder').onclick = (e) => {
  const b = e.target.closest('[data-decode]');
  if (b) decode(Number(b.dataset.decode));
};
document.querySelectorAll('dialog').forEach((d) =>
  d.addEventListener('click', (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  }),
);
window.addEventListener('storage', (e) => {
  if (e.key === Store.KEY) {
    db = Store.load();
    if (!db.vehicles.some((v) => v.id === vehicleId)) vehicleId = '';
    if ($('detail').open) $('detail').close();
    renderAll();
    if ($('order').open) renderOrder();
  }
});
decode(0);
renderAll();
startHero();
window.addEventListener('load', () =>
  HERO_PATHS.forEach((p) => {
    new Image().src = p;
  }),
);
if (window.RDL_STORAGE_ERROR) toast(window.RDL_STORAGE_ERROR);
