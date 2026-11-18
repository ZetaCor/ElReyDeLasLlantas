'use strict';
const $ = (id) => document.getElementById(id),
  esc = Store.esc;
let db = Store.load(),
  baseline = JSON.stringify(db),
  tab = 'tires',
  editingTire = null,
  editingVehicle = null,
  editingBrand = null,
  brandLogo = '',
  brandPhotoJob = 0,
  tireImage = '',
  vehicleImage = '',
  fileInfo = null,
  pendingConfirm = null,
  photoJob = 0,
  vehiclePhotoJob = 0;
const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  'item-' + Date.now() + '-' + Math.random().toString(36).slice(2);
function status(text, error = false) {
  $('adminStatus').textContent = text;
  $('adminStatus').classList.toggle('error', error);
}
function loggedIn() {
  try {
    return sessionStorage.getItem('rdl.local.session') === 'active';
  } catch (e) {
    return window.rdlSession === true;
  }
}
function showSession() {
  $('loginPanel').hidden = loggedIn();
  $('dashboard').hidden = !loggedIn();
  if (loggedIn()) render();
}
$('login').onsubmit = (e) => {
  e.preventDefault();
  if (
    $('email').value.trim().toLowerCase() === RDL_CONFIG.email &&
    $('password').value === RDL_CONFIG.password
  ) {
    try {
      sessionStorage.setItem('rdl.local.session', 'active');
    } catch (e) {
      window.rdlSession = true;
    }
    $('password').value = '';
    $('loginError').textContent = '';
    showSession();
  } else $('loginError').textContent = 'Correo o contraseña incorrectos.';
};
$('logout').onclick = () => {
  try {
    sessionStorage.removeItem('rdl.local.session');
  } catch (e) {}
  window.rdlSession = false;
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  showSession();
};
function commit(next) {
  if (!loggedIn()) throw Error('Entra de nuevo al administrador.');
  if (JSON.stringify(Store.load()) !== baseline)
    throw Error(
      'El catálogo cambió en otra pestaña. Recarga esta página antes de guardar para evitar sobrescribir cambios.',
    );
  Store.save(next);
  db = next;
  baseline = JSON.stringify(next);
  render();
  status('Cambios guardados en este navegador.');
}
function render() {
  $('previousBox').hidden = !Store.previous();
  const query = $('adminSearch').value.trim().toLowerCase(),
    filter = $('statusFilter').value;
  const list = db.tires.filter(
    (t) =>
      (t.brand + ' ' + t.model + ' ' + t.size + ' ' + t.load + t.speed)
        .toLowerCase()
        .includes(query) &&
      (!filter || (filter === 'published' ? t.published : !t.published)),
  );
  $('tireList').innerHTML = list.length
    ? list
        .map(
          (t) =>
            '<article class="admin-row">' +
            (t.image
              ? '<img src="' + esc(t.image) + '" alt="">'
              : '<div class="no-photo">Sin foto</div>') +
            '<div class="info"><span class="badge ' +
            (t.published ? 'live' : '') +
            '">' +
            (t.published ? 'Publicada' : 'Borrador') +
            '</span><h3>' +
            esc(t.brand + ' ' + t.model) +
            '</h3><p>' +
            esc(t.size + ' ' + t.load + t.speed) +
            ' · ' +
            esc(t.type) +
            '</p></div><div class="actions"><button class="btn outline compact" data-edit="' +
            esc(t.id) +
            '">Editar</button><button class="btn outline compact" data-clone="' +
            esc(t.id) +
            '">Crear variante</button><button class="btn compact danger" data-delete="' +
            esc(t.id) +
            '">Eliminar</button></div></article>',
        )
        .join('')
    : '<div class="empty">No hay variantes con este filtro.</div>';
  $('vehicleList').innerHTML = db.vehicles
    .map(
      (v) =>
        '<article class="admin-row">' +
        (v.image
          ? '<img src="' + esc(v.image) + '" alt="">'
          : '<div class="no-photo">Sin foto</div>') +
        '<div class="info"><h3>' +
        esc(v.make + ' ' + v.model) +
        '</h3><p>' +
        v.sizes.map(esc).join(' · ') +
        '</p></div><div class="actions"><button class="btn outline compact" data-edit-vehicle="' +
        esc(v.id) +
        '">Editar</button><button class="btn compact danger" data-delete-vehicle="' +
        esc(v.id) +
        '">Eliminar</button></div></article>',
    )
    .join('');
  $('brandList').innerHTML = (db.brands || []).length
    ? db.brands
        .map(
          (b, i) =>
            '<article class="admin-row">' +
            (b.logo
              ? '<img src="' + esc(b.logo) + '" alt="">'
              : '<div class="no-photo">Sin logo</div>') +
            '<div class="info"><h3>' +
            esc(b.name) +
            '</h3></div><div class="actions"><button class="btn outline compact" data-brand-up="' +
            esc(b.id) +
            '"' +
            (i === 0 ? ' disabled' : '') +
            ' aria-label="Subir ' +
            esc(b.name) +
            '">↑</button><button class="btn outline compact" data-brand-down="' +
            esc(b.id) +
            '"' +
            (i === db.brands.length - 1 ? ' disabled' : '') +
            ' aria-label="Bajar ' +
            esc(b.name) +
            '">↓</button><button class="btn outline compact" data-edit-brand="' +
            esc(b.id) +
            '">Editar</button><button class="btn compact danger" data-delete-brand="' +
            esc(b.id) +
            '">Eliminar</button></div></article>',
        )
        .join('')
    : '<div class="empty">Aún no hay marcas. El carrusel de marcas se oculta mientras la lista esté vacía.</div>';
}
function setTab(value) {
  tab = value;
  document
    .querySelectorAll('[data-tab]')
    .forEach((b) =>
      b.setAttribute('aria-selected', String(b.dataset.tab === tab)),
    );
  ['tires', 'vehicles', 'brands', 'settings', 'backup'].forEach(
    (x) => ($('panel-' + x).hidden = x !== tab),
  );
  if (tab === 'settings') loadSettings();
}
function preview(id, src) {
  $(id).hidden = !src;
  if (src) $(id).src = src;
  else $(id).removeAttribute('src');
}
function fillTire(t) {
  $('tBrand').value = t.brand || '';
  $('tModel').value = t.model || '';
  $('tSize').value = t.size || '';
  $('tLoad').value = t.load || '';
  $('tSpeed').value = t.speed || '';
}
function openTire(id, duplicate = false) {
  photoJob++;
  $('saveTire').disabled = false;
  $('tireForm').reset();
  $('tireError').textContent = '';
  fileInfo = null;
  $('useFilename').hidden = true;
  const t = db.tires.find((x) => x.id === id);
  editingTire = duplicate ? null : t?.id || null;
  tireImage = t?.image || '';
  $('tireTitle').textContent = t
    ? duplicate
      ? 'Crear otra variante'
      : 'Editar variante'
    : 'Nueva variante';
  fillTire(t || {});
  $('tType').value = t?.type || 'Todo terreno';
  $('tDescription').value = duplicate ? '' : t?.description || '';
  $('tSpecs').value = duplicate
    ? ''
    : (t?.specs || []).map((r) => r.join(' | ')).join('\n');
  $('tPublished').checked = duplicate ? false : (t?.published ?? true);
  if (duplicate) {
    $('tSize').value = '';
    $('tLoad').value = '';
    $('tSpeed').value = '';
    tireImage = '';
    $('tireError').textContent =
      'Completa la medida, los índices y la foto de esta variante. La ficha técnica no se copia de otra medida.';
  }
  preview('tirePreview', tireImage);
  $('tireEditor').showModal();
}
$('newTire').onclick = () => openTire();
$('tirePhoto').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const job = ++photoJob;
  $('saveTire').disabled = true;
  $('tireError').textContent = 'Procesando foto…';
  try {
    const result = await Store.readImage(file);
    if (job !== photoJob) return;
    tireImage = result;
    preview('tirePreview', tireImage);
    fileInfo = Store.filenameInfo(file.name);
    $('useFilename').hidden = !fileInfo;
    if (fileInfo && !editingTire && !$('tBrand').value && !$('tModel').value)
      fillTire(fileInfo);
    $('tireError').textContent = fileInfo
      ? 'Datos detectados. Revisa marca, modelo, medida e índices antes de guardar.'
      : 'Foto lista. Completa los datos de esta variante.';
  } catch (error) {
    if (job === photoJob) $('tireError').textContent = error.message;
  } finally {
    if (job === photoJob) $('saveTire').disabled = false;
  }
};
$('useFilename').onclick = () => {
  if (fileInfo) fillTire(fileInfo);
};
$('removePhoto').onclick = () => {
  photoJob++;
  tireImage = '';
  fileInfo = null;
  $('useFilename').hidden = true;
  $('saveTire').disabled = false;
  $('tirePhoto').value = '';
  preview('tirePreview', '');
};
$('tireForm').onsubmit = (e) => {
  e.preventDefault();
  if ($('saveTire').disabled) return;
  try {
    const specs = $('tSpecs')
      .value.split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((line) => {
        const pos = line.indexOf('|');
        if (pos < 1 || !line.slice(pos + 1).trim())
          throw Error('Usa Nombre | Valor en cada especificación.');
        return [line.slice(0, pos).trim(), line.slice(pos + 1).trim()];
      });
    const t = {
      id: editingTire || uid(),
      brand: $('tBrand').value.trim(),
      model: $('tModel').value.trim(),
      type: $('tType').value,
      size: Store.normalizeSize($('tSize').value),
      load: $('tLoad').value.trim(),
      speed: $('tSpeed').value.trim().toUpperCase(),
      image: tireImage,
      description: $('tDescription').value.trim(),
      specs,
      published: $('tPublished').checked,
    };
    const next = Store.clone(db),
      index = next.tires.findIndex((x) => x.id === t.id);
    if (index < 0) next.tires.push(t);
    else next.tires[index] = t;
    commit(next);
    $('tireEditor').close();
  } catch (error) {
    $('tireError').textContent = error.message;
  }
};
function openVehicle(id) {
  vehiclePhotoJob++;
  $('saveVehicle').disabled = false;
  const v = db.vehicles.find((x) => x.id === id);
  editingVehicle = v?.id || null;
  vehicleImage = v?.image || '';
  $('vehicleForm').reset();
  $('vehicleError').textContent = '';
  $('vMake').value = v?.make || '';
  $('vModel').value = v?.model || '';
  $('vBody').value = v?.body || 'sedan';
  $('vSizes').value = v?.sizes.join('\n') || '';
  preview('vehiclePreview', vehicleImage);
  $('vehicleEditor').showModal();
}
$('newVehicle').onclick = () => openVehicle();
$('vPhoto').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const job = ++vehiclePhotoJob;
  $('saveVehicle').disabled = true;
  try {
    const img = await Store.readImage(file);
    if (job !== vehiclePhotoJob) return;
    vehicleImage = img;
    preview('vehiclePreview', img);
    $('vehicleError').textContent = '';
  } catch (error) {
    if (job === vehiclePhotoJob) $('vehicleError').textContent = error.message;
  } finally {
    if (job === vehiclePhotoJob) $('saveVehicle').disabled = false;
  }
};
$('removeVehiclePhoto').onclick = () => {
  vehiclePhotoJob++;
  vehicleImage = '';
  $('saveVehicle').disabled = false;
  $('vPhoto').value = '';
  preview('vehiclePreview', '');
};
$('vehicleForm').onsubmit = (e) => {
  e.preventDefault();
  if ($('saveVehicle').disabled) return;
  try {
    const v = {
      id: editingVehicle || uid(),
      make: $('vMake').value.trim(),
      model: $('vModel').value.trim(),
      body: $('vBody').value,
      sizes: [
        ...new Set(
          $('vSizes')
            .value.split(/[\n;]/)
            .map(Store.normalizeSize)
            .filter(Boolean),
        ),
      ],
      image: vehicleImage,
    };
    if (
      db.vehicles.some(
        (x) =>
          x.id !== v.id &&
          x.make.toLowerCase() === v.make.toLowerCase() &&
          x.model.toLowerCase() === v.model.toLowerCase(),
      )
    )
      throw Error('Esta referencia de vehículo ya existe.');
    const next = Store.clone(db),
      i = next.vehicles.findIndex((x) => x.id === v.id);
    if (i < 0) next.vehicles.push(v);
    else next.vehicles[i] = v;
    commit(next);
    $('vehicleEditor').close();
  } catch (error) {
    $('vehicleError').textContent = error.message;
  }
};
function openBrand(id) {
  brandPhotoJob++;
  $('saveBrand').disabled = false;
  const b = (db.brands || []).find((x) => x.id === id);
  editingBrand = b?.id || null;
  brandLogo = b?.logo || '';
  $('brandForm').reset();
  $('brandError').textContent = '';
  $('bName').value = b?.name || '';
  $('brandTitle').textContent = b ? 'Editar marca' : 'Nueva marca';
  preview('brandPreview', brandLogo);
  $('brandEditor').showModal();
}
$('newBrand').onclick = () => openBrand();
$('bLogo').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const job = ++brandPhotoJob;
  $('saveBrand').disabled = true;
  try {
    const img = await Store.readImage(file, 500);
    if (job !== brandPhotoJob) return;
    brandLogo = img;
    preview('brandPreview', img);
    $('brandError').textContent = '';
  } catch (error) {
    if (job === brandPhotoJob) $('brandError').textContent = error.message;
  } finally {
    if (job === brandPhotoJob) $('saveBrand').disabled = false;
  }
};
$('removeBrandLogo').onclick = () => {
  brandPhotoJob++;
  brandLogo = '';
  $('saveBrand').disabled = false;
  $('bLogo').value = '';
  preview('brandPreview', '');
};
$('brandForm').onsubmit = (e) => {
  e.preventDefault();
  if ($('saveBrand').disabled) return;
  try {
    const b = {
      id: editingBrand || uid(),
      name: $('bName').value.trim(),
      logo: brandLogo,
    };
    const next = Store.clone(db);
    next.brands = next.brands || [];
    if (
      next.brands.some(
        (x) => x.id !== b.id && x.name.toLowerCase() === b.name.toLowerCase(),
      )
    )
      throw Error('Esta marca ya existe.');
    const i = next.brands.findIndex((x) => x.id === b.id);
    if (i < 0) next.brands.push(b);
    else next.brands[i] = b;
    commit(next);
    $('brandEditor').close();
  } catch (error) {
    $('brandError').textContent = error.message;
  }
};
function moveBrand(id, delta) {
  const next = Store.clone(db),
    i = next.brands.findIndex((x) => x.id === id),
    j = i + delta;
  if (i < 0 || j < 0 || j >= next.brands.length) return;
  [next.brands[i], next.brands[j]] = [next.brands[j], next.brands[i]];
  try {
    commit(next);
  } catch (error) {
    status(error.message, true);
  }
}
function confirmAction(text, fn) {
  $('confirmText').textContent = text;
  pendingConfirm = fn;
  $('confirmDialog').showModal();
}
$('confirmYes').onclick = () => {
  const fn = pendingConfirm;
  pendingConfirm = null;
  $('confirmDialog').close();
  try {
    fn?.();
  } catch (error) {
    status(error.message, true);
  }
};
$('confirmDialog').addEventListener('close', () => {
  pendingConfirm = null;
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.hasAttribute('data-close')) b.closest('dialog').close();
  if (!loggedIn()) return;
  if (b.dataset.tab) setTab(b.dataset.tab);
  if (b.dataset.edit) openTire(b.dataset.edit);
  if (b.dataset.clone) openTire(b.dataset.clone, true);
  if (b.dataset.delete) {
    const t = db.tires.find((t) => t.id === b.dataset.delete);
    confirmAction(
      '¿Eliminar ' +
        t.brand +
        ' ' +
        t.model +
        ' ' +
        t.size +
        ' ' +
        t.load +
        t.speed +
        '? Se quitará también del catálogo y de los pedidos locales al volver a abrirlos.',
      () => {
        const next = Store.clone(db);
        next.tires = next.tires.filter((x) => x.id !== t.id);
        commit(next);
      },
    );
  }
  if (b.dataset.editBrand) openBrand(b.dataset.editBrand);
  if (b.dataset.brandUp) moveBrand(b.dataset.brandUp, -1);
  if (b.dataset.brandDown) moveBrand(b.dataset.brandDown, 1);
  if (b.dataset.deleteBrand) {
    const br = db.brands.find((x) => x.id === b.dataset.deleteBrand);
    confirmAction('¿Eliminar la marca ' + br.name + ' del carrusel?', () => {
      const next = Store.clone(db);
      next.brands = next.brands.filter((x) => x.id !== br.id);
      commit(next);
    });
  }
  if (b.dataset.editVehicle) openVehicle(b.dataset.editVehicle);
  if (b.dataset.deleteVehicle) {
    const v = db.vehicles.find((x) => x.id === b.dataset.deleteVehicle);
    confirmAction(
      '¿Eliminar la referencia ' + v.make + ' ' + v.model + '?',
      () => {
        const next = Store.clone(db);
        next.vehicles = next.vehicles.filter((x) => x.id !== v.id);
        commit(next);
      },
    );
  }
});
$('adminSearch').oninput = render;
$('statusFilter').onchange = render;
function loadSettings() {
  $('whatsapp').value = db.settings.whatsapp;
  $('hours').value = db.settings.hours;
  $('address').value = db.settings.address;
}
$('settingsForm').onsubmit = (e) => {
  e.preventDefault();
  try {
    const next = Store.clone(db);
    next.settings = {
      whatsapp: $('whatsapp').value.replace(/[+\s()-]/g, ''),
      hours: $('hours').value.trim(),
      address: $('address').value.trim(),
      background: db.settings.background,
    };
    commit(next);
  } catch (error) {
    status(error.message, true);
  }
};
$('exportBackup').onclick = () =>
  Store.download(
    'ElReyDeLasLlantas-respaldo-' +
      new Date().toISOString().slice(0, 10) +
      '.json',
    JSON.stringify(db, null, 2),
  );
$('exportSite').onclick = () => {
  const out = Store.clone(db);
  delete out.seedRevision;
  out.revision = new Date().toISOString(); // los navegadores con copia vieja se actualizan solos
  Store.download(
    'data.js',
    '// Catálogo exportado desde el administrador local.\nwindow.RDL_SEED = ' +
      JSON.stringify(out, null, 2) +
      ';\n',
    'text/javascript',
  );
};
$('downloadPrevious').onclick = () => {
  const raw = Store.previous();
  if (raw)
    Store.download('ElReyDeLasLlantas-copia-anterior.json', raw);
};
$('importBackup').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 15 * 1024 * 1024)
      throw Error('El respaldo supera los 15 MB.');
    const next = Store.validate(JSON.parse(await file.text()));
    confirmAction(
      'Este respaldo contiene ' +
        next.tires.length +
        ' variantes y ' +
        next.vehicles.length +
        ' referencias de vehículos y ' +
        (next.brands || []).length +
        ' marcas. Reemplazará el catálogo local, los ajustes y las fotos. Exporta primero tu catálogo actual si deseas conservarlo.',
      () => commit(next),
    );
  } catch (error) {
    status('No se importó el archivo. ' + error.message, true);
  } finally {
    e.target.value = '';
  }
};
window.addEventListener('storage', (e) => {
  if (e.key === Store.KEY) {
    status(
      'El catálogo cambió en otra pestaña. Recarga la página antes de guardar.',
      true,
    );
  }
});
showSession();
if (window.RDL_STORAGE_ERROR) status(window.RDL_STORAGE_ERROR, true);
