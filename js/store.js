/* Almacenamiento local compartido por index.html y admin.html bajo el mismo origen. */
window.Store = (() => {
  const KEY = 'rey-llantas.catalog.v2',
    PREV_KEY = 'rey-llantas.catalog.v2.previous';
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c],
    );
  const normalizeSize = (value) =>
    String(value)
      .trim()
      .toUpperCase()
      .replace(/,/g, '.')
      .replace(/\s/g, '')
      .replace(/X/g, 'x')
      .replace(/(\d{3})-(\d{2,3}R)/g, '$1/$2');
  const sizeOK = (value) =>
    /^(?:LT)?\d{3}\/\d{2,3}R\d{2}(?:\.5)?(?:LT|C)?$/.test(value) ||
    /^\d{2}(?:\.\d+)?x\d{1,2}(?:\.\d+)?R\d{2}(?:\.5)?(?:LT)?$/.test(value);
  const imageOK = (value) =>
    !value ||
    /^img\/[a-zA-Z0-9_./-]+$/.test(value) ||
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ||
    /^https:\/\/[^\s<>"']+$/.test(value);
  function validate(data) {
    if (
      !data ||
      data.version !== 2 ||
      !Array.isArray(data.tires) ||
      !Array.isArray(data.vehicles) ||
      !data.settings
    )
      throw Error('Este archivo no es un respaldo válido de la versión 2.');
    const ids = new Set(),
      variants = new Set();
    for (const t of data.tires) {
      if (typeof t.id !== 'string' || ids.has(t.id) || !t.id)
        throw Error('Hay identificadores de llantas repetidos o inválidos.');
      ids.add(t.id);
      for (const field of [
        'brand',
        'model',
        'type',
        'size',
        'load',
        'speed',
        'image',
        'description',
      ])
        if (typeof t[field] !== 'string')
          throw Error('La ficha contiene campos inválidos.');
      if (
        !t.brand.trim() ||
        !t.model.trim() ||
        !sizeOK(t.size) ||
        !imageOK(t.image) ||
        typeof t.published !== 'boolean' ||
        !Array.isArray(t.specs) ||
        t.specs.some(
          (r) =>
            !Array.isArray(r) ||
            r.length !== 2 ||
            r.some((x) => typeof x !== 'string'),
        )
      )
        throw Error('Revisa la medida, foto y especificaciones de la llanta.');
      if (t.load && !/^\d{2,3}(?:\/\d{2,3})?$/.test(t.load))
        throw Error('Índice de carga inválido.');
      if (t.speed && !/^[A-Z][0-9]?$/.test(t.speed))
        throw Error('Índice de velocidad inválido.');
      const key = [t.brand, t.model, t.size, t.load, t.speed]
        .join('|')
        .toLowerCase();
      if (variants.has(key))
        throw Error(
          'Esta variante ya existe: misma marca, modelo, medida e índices. Edita la ficha existente.',
        );
      variants.add(key);
    }
    ids.clear();
    for (const v of data.vehicles) {
      if (
        !v ||
        typeof v.id !== 'string' ||
        !v.id ||
        ids.has(v.id) ||
        typeof v.make !== 'string' ||
        !v.make.trim() ||
        typeof v.model !== 'string' ||
        !v.model.trim() ||
        !['sedan', 'hatch', 'suv', 'pickup'].includes(v.body) ||
        !Array.isArray(v.sizes) ||
        !v.sizes.length ||
        v.sizes.some((s) => typeof s !== 'string' || !sizeOK(s)) ||
        typeof v.image !== 'string' ||
        !imageOK(v.image)
      )
        throw Error('Referencia de vehículo inválida.');
      ids.add(v.id);
    }
    if (data.brands === undefined)
      data.brands = clone((window.RDL_SEED && window.RDL_SEED.brands) || []);
    if (!Array.isArray(data.brands))
      throw Error('La lista de marcas no es válida.');
    ids.clear();
    for (const b of data.brands) {
      if (
        !b ||
        typeof b.id !== 'string' ||
        !b.id ||
        ids.has(b.id) ||
        typeof b.name !== 'string' ||
        !b.name.trim() ||
        b.name.length > 60 ||
        typeof b.logo !== 'string' ||
        !imageOK(b.logo)
      )
        throw Error('Marca inválida: revisa el nombre y el logo.');
      ids.add(b.id);
    }
    const s = data.settings;
    if (
      typeof s.whatsapp !== 'string' ||
      (s.whatsapp && !/^[1-9]\d{7,14}$/.test(s.whatsapp)) ||
      !/^img\/fondos\/fondo[1-4]\.jpg$/.test(s.background) ||
      typeof s.address !== 'string' ||
      typeof s.hours !== 'string'
    )
      throw Error('Revisa el número de WhatsApp y los ajustes.');
    return data;
  }
  function load() {
    try {
      const seed = window.RDL_SEED,
        raw = localStorage.getItem(KEY);
      if (raw && seed.revision) {
        const saved = JSON.parse(raw);
        if (saved.seedRevision !== seed.revision) {
          // El proyecto trae un catálogo más nuevo que la copia de este navegador.
          const fresh = validate(clone(seed));
          fresh.seedRevision = seed.revision;
          try {
            localStorage.setItem(PREV_KEY, raw);
          } catch (e) {}
          try {
            localStorage.setItem(KEY, JSON.stringify(fresh));
          } catch (e) {}
          return fresh;
        }
      }
      return validate(raw ? JSON.parse(raw) : clone(seed));
    } catch (e) {
      window.RDL_STORAGE_ERROR =
        'No se pudo leer el catálogo local. Se muestra el catálogo inicial; conserva tu respaldo antes de guardar.';
      return clone(window.RDL_SEED);
    }
  }
  function save(data) {
    validate(data);
    data.seedRevision = (window.RDL_SEED && window.RDL_SEED.revision) || '';
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      throw Error(
        'No se pudo guardar: almacenamiento bloqueado o lleno. Exporta un respaldo y reduce las fotos antes de intentar de nuevo.',
      );
    }
  }
  function previous() {
    try {
      return localStorage.getItem(PREV_KEY) || '';
    } catch (e) {
      return '';
    }
  }
  function filenameInfo(filename) {
    const text = filename
      .replace(/\.[^.]+$/, '')
      .replace(/,/g, '.')
      .replace(/(\d{3})-(\d{2,3}R)/gi, '$1/$2');
    const match = text.match(
      /^(.+?)\s+((?:LT)?\d{3}\/\d{2,3}R\d{2}(?:LT|C)?|\d{2}(?:\.\d+)?[xX]\d{1,2}(?:\.\d+)?R\d{2}(?:LT)?)\s*(\d{2,3}(?:\/\d{2,3})?)?([A-Z])?$/i,
    );
    if (!match) return null;
    const space = match[1].indexOf(' ');
    if (space < 1) return null;
    return {
      brand: match[1].slice(0, space),
      model: match[1].slice(space + 1).replace(/-/g, '/'),
      size: normalizeSize(match[2]),
      load: match[3] || '',
      speed: (match[4] || '').toUpperCase(),
    };
  }
  async function readImage(file, max = 1000) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
      throw Error('Usa una imagen PNG, JPG o WebP.');
    if (file.size > 15 * 1024 * 1024)
      throw Error('La imagen debe pesar menos de 15 MB.');
    const image = await createImageBitmap(file);
    const ratio = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    return canvas.toDataURL('image/webp', 0.85);
  }
  function download(name, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return {
    KEY,
    PREV_KEY,
    previous,
    clone,
    esc,
    normalizeSize,
    sizeOK,
    validate,
    load,
    save,
    filenameInfo,
    readImage,
    download,
  };
})();
