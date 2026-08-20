const STORAGE_KEY = 'wifi-payment-data';
let data = { names: [], months: [], status: {} };

const MONTH_NAMES_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      data = JSON.parse(raw);
    }
  }catch(e){
    // belum ada data tersimpan, mulai dari kosong
  }
  render();
}

function saveData(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }catch(e){
    console.error('Gagal menyimpan data', e);
  }
}

let dragMonth = null;

function onDragStart(e){
  dragMonth = e.currentTarget.dataset.month;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const target = e.currentTarget;
  if(target.dataset.month !== dragMonth){
    target.classList.add('drag-over');
  }
}

function onDragLeave(e){
  e.currentTarget.classList.remove('drag-over');
}

function onDrop(e){
  e.preventDefault();
  const target = e.currentTarget;
  target.classList.remove('drag-over');
  const dropMonth = target.dataset.month;
  if(!dragMonth || dragMonth === dropMonth) return;

  const fromIdx = data.months.indexOf(dragMonth);
  const toIdx = data.months.indexOf(dropMonth);
  if(fromIdx === -1 || toIdx === -1) return;

  data.months.splice(fromIdx, 1);
  data.months.splice(toIdx, 0, dragMonth);

  render();
  saveData();
}

function onDragEnd(e){
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.month-col').forEach(el => el.classList.remove('drag-over'));
  dragMonth = null;
}

function cellKey(name, month){ return name + '___' + month; }

function cellSymbol(state){
  if(state === 'paid') return '✓';
  if(state === 'unpaid') return '✕';
  return '';
}

function render(){
  const wrap = document.getElementById('tableWrap');
  const summary = document.getElementById('summaryText');

  if(data.names.length === 0){
    wrap.innerHTML = `<div class="empty-state">
      <div class="big">📶</div>
      <p><strong>Belum ada data</strong></p>
      <p>Tambahkan nama pelanggan untuk mulai mencatat.</p>
    </div>`;
    summary.textContent = 'Belum ada pelanggan tercatat';
    return;
  }

  if(data.months.length === 0){
    wrap.innerHTML = `<div class="empty-state">
      <div class="big">🗓️</div>
      <p><strong>Belum ada kolom bulan</strong></p>
      <p>Tambahkan bulan untuk mulai mencatat pembayaran.</p>
    </div>`;
    summary.textContent = data.names.length + ' pelanggan';
    return;
  }

  const lastMonth = data.months[data.months.length - 1];
  let paidCount = 0;
  data.names.forEach(n => {
    if(data.status[cellKey(n, lastMonth)] === 'paid') paidCount++;
  });
  summary.textContent = `${data.names.length} pelanggan · ${paidCount}/${data.names.length} lunas bulan ${lastMonth}`;

  let html = '<table><thead><tr><th class="name-col">Nama</th>';
  data.months.forEach(m => {
    html += `<th class="month-col" draggable="true" data-month="${escapeAttr(m)}"
      ondragstart="onDragStart(event)" ondragover="onDragOver(event)"
      ondrop="onDrop(event)" ondragend="onDragEnd(event)" ondragleave="onDragLeave(event)">
      <div class="month-head">
        <span class="drag-hint">⠿</span>
        <span>${escapeHtml(m)}</span>
        <button class="month-del" onclick="deleteMonth('${escapeAttr(m)}')" aria-label="Hapus bulan ${escapeAttr(m)}">hapus</button>
      </div></th>`;
  });
  html += '</tr></thead><tbody>';

  data.names.forEach((name, idx) => {
    html += `<tr><td class="name-col"><div class="name-row">
      <span class="row-num">${idx+1}.</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(name)}</span>
      <button class="del-btn" onclick="deleteName('${escapeAttr(name)}')" aria-label="Hapus ${escapeAttr(name)}">✕</button>
    </div></td>`;
    data.months.forEach(m => {
      const key = cellKey(name, m);
      const state = data.status[key] || '';
      const cls = state === 'paid' ? 'paid' : (state === 'unpaid' ? 'unpaid' : '');
      html += `<td><button class="cell-btn ${cls}" onclick="openStatusModal('${escapeAttr(name)}','${escapeAttr(m)}')">${cellSymbol(state)}</button></td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
}
function escapeAttr(str){
  return String(str).replace(/'/g, "\\'");
}

let currentCellName = null;
let currentCellMonth = null;

function openStatusModal(name, month){
  currentCellName = name;
  currentCellMonth = month;
  document.getElementById('statusModalTitle').textContent = `${name} — ${month}`;
  document.getElementById('statusModal').classList.add('open');
}

function setCellStatus(status){
  if(currentCellName === null || currentCellMonth === null) return;
  const key = cellKey(currentCellName, currentCellMonth);
  if(status === ''){
    delete data.status[key];
  }else{
    data.status[key] = status;
  }
  closeModal('statusModal');
  currentCellName = null;
  currentCellMonth = null;
  render();
  saveData();
}

function deleteName(name){
  if(!confirm(`Hapus "${name}" dari catatan?`)) return;
  data.names = data.names.filter(n => n !== name);
  Object.keys(data.status).forEach(k => {
    if(k.startsWith(name + '___')) delete data.status[k];
  });
  render();
  saveData();
}

function deleteMonth(month){
  if(!confirm(`Hapus kolom "${month}"?`)) return;
  data.months = data.months.filter(m => m !== month);
  Object.keys(data.status).forEach(k => {
    if(k.endsWith('___' + month)) delete data.status[k];
  });
  render();
  saveData();
}

function openNameModal(){
  document.getElementById('nameModal').classList.add('open');
  setTimeout(() => document.getElementById('nameInput').focus(), 50);
}
function openMonthModal(){
  const now = new Date();
  document.getElementById('monthInput').value = now.getFullYear();
  document.getElementById('monthModal').classList.add('open');
  setTimeout(() => document.getElementById('monthInput').select(), 50);
}
function closeModal(id){
  document.getElementById(id).classList.remove('open');
}

function addName(){
  const input = document.getElementById('nameInput');
  const val = input.value.trim();
  if(!val) { input.focus(); return; }
  if(data.names.includes(val)){
    alert('Nama ini sudah ada di daftar.');
    return;
  }
  data.names.push(val);
  input.value = '';
  closeModal('nameModal');
  render();
  saveData();
}

function addMonth(){
  const input = document.getElementById('monthInput');
  const val = input.value.trim();
  const year = parseInt(val, 10);
  if(!val || isNaN(year) || year < 2000 || year > 2100){
    alert('Masukkan tahun yang valid, contoh: 2026');
    input.focus();
    return;
  }
  let added = 0;
  MONTH_NAMES_ID.forEach(m => {
    const label = m + ' ' + year;
    if(!data.months.includes(label)){
      data.months.push(label);
      added++;
    }
  });
  input.value = '';
  closeModal('monthModal');
  render();
  saveData();
  if(added === 0){
    alert('Semua kolom bulan tahun ' + year + ' sudah ada.');
  }
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if(e.target === overlay) overlay.classList.remove('open');
  });
});
document.getElementById('nameInput').addEventListener('keydown', e => { if(e.key === 'Enter') addName(); });
document.getElementById('monthInput').addEventListener('keydown', e => { if(e.key === 'Enter') addMonth(); });

loadData();
