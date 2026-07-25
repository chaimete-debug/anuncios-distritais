'use strict';

const state = {
  token: localStorage.getItem('districtAnnouncementsToken') || '',
  user: null,
  config: {},
  meetings: [],
  churches: [],
  announcements: [],
  users: [],
  activePanel: 'homePanel',
  worshipItems: [],
  worshipIndex: 0
};

const $ = id => document.getElementById(id);
const isAdmin = () => ['SYS_ADMIN', 'DISTRICT_ADMIN'].includes(state.user?.role);
const roleLabels = {
  SYS_ADMIN: 'Administrador do sistema',
  DISTRICT_ADMIN: 'Secretário distrital',
  LOCAL_SECRETARY: 'Secretário local'
};
const statusLabels = {
  SUBMITTED: 'Submetido', RETURNED: 'Devolvido', APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado', ANNOUNCED: 'Anunciado', ARCHIVED: 'Arquivado'
};
const priorityLabels = { NORMAL: 'Normal', HIGH: 'Alta', URGENT: 'Urgente' };

async function api(action, payload = {}) {
  const response = await fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload, token: state.token })
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error('O servidor devolveu uma resposta inválida.'); }
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
  return result.data;
}

function toast(message, type = '') {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.className = 'toast', 3800);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

function formatDate(value, includeTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat('pt-PT', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(d);
}

function selectedMeetingName(id) {
  return state.meetings.find(m => String(m.id) === String(id))?.name || '';
}
function selectedChurchName(id) {
  return state.churches.find(c => String(c.id) === String(id))?.name ||
    state.announcements.find(a => String(a.churchId) === String(id))?.churchName || '';
}

function setBusy(button, busy, label = 'A processar...') {
  if (!button) return;
  if (busy) {
    button.dataset.original = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.original || button.textContent;
    button.disabled = false;
  }
}

function showLogin() {
  $('loginView').hidden = false;
  $('appView').hidden = true;
}

function showApp() {
  $('loginView').hidden = true;
  $('appView').hidden = false;
  $('districtName').textContent = state.config.DISTRICT_NAME || 'Distrito';
  $('appName').textContent = state.config.APP_NAME || 'Anúncios Distritais';
  $('currentUserName').textContent = state.user.name;
  $('currentUserRole').textContent = roleLabels[state.user.role] || state.user.role;
  renderNav();
  populateSelects();
  renderAll();
  if (state.user.mustChangePassword) showPanel('passwordPanel');
  else showPanel('homePanel');
}

function renderNav() {
  const items = state.user.mustChangePassword ? [
    ['passwordPanel', 'Alterar palavra-passe']
  ] : isAdmin() ? [
    ['homePanel', 'Painel'],
    ['announcementsPanel', 'Anúncios'],
    ['announcementFormPanel', 'Novo anúncio'],
    ['meetingsPanel', 'Reuniões'],
    ['managementPanel', 'Igrejas e utilizadores'],
    ['worshipPanel', 'Modo Culto'],
    ['passwordPanel', 'Palavra-passe']
  ] : [
    ['homePanel', 'Início'],
    ['announcementFormPanel', 'Enviar anúncio'],
    ['announcementsPanel', 'Meus anúncios'],
    ['passwordPanel', 'Palavra-passe']
  ];
  $('mainNav').innerHTML = items.map(([id, label]) =>
    `<button type="button" class="nav-btn" data-panel="${id}">${escapeHtml(label)}</button>`
  ).join('');
  $('mainNav').querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showPanel(btn.dataset.panel));
  });
}

function showPanel(id) {
  document.querySelectorAll('main.content > .panel').forEach(p => p.hidden = p.id !== id);
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.panel === id));
  state.activePanel = id;
  if (id === 'homePanel') renderHome();
  if (id === 'announcementsPanel') renderAnnouncements();
  if (id === 'meetingsPanel') renderMeetings();
  if (id === 'managementPanel') renderUsers();
  if (id === 'worshipPanel') prepareWorship();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function populateSelects() {
  const meetingOptions = state.meetings.map(m =>
    `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} — ${formatDate(m.date)}</option>`
  ).join('');
  const openMeetings = state.meetings.filter(m => m.status === 'OPEN');
  $('announcementMeeting').innerHTML = openMeetings.length
    ? openMeetings.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)} — prazo: ${formatDate(m.deadline, true)}</option>`).join('')
    : '<option value="">Não há reuniões abertas</option>';
  $('filterMeeting').innerHTML = `<option value="">Todas as reuniões</option>${meetingOptions}`;
  $('worshipMeeting').innerHTML = `<option value="">Seleccionar reunião</option>${meetingOptions}`;

  const churchOptions = state.churches.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
  $('announcementChurch').innerHTML = churchOptions;
  $('userChurch').innerHTML = `<option value="">Seleccionar igreja</option>${churchOptions}`;
  $('announcementChurchWrap').hidden = !isAdmin();
}

function renderAll() {
  renderHome();
  renderAnnouncements();
  renderMeetings();
  renderUsers();
}

function renderHome() {
  const items = state.announcements;
  const submitted = items.filter(a => a.status === 'SUBMITTED').length;
  const approved = items.filter(a => a.status === 'APPROVED').length;
  const returned = items.filter(a => a.status === 'RETURNED').length;
  const announced = items.filter(a => a.status === 'ANNOUNCED').length;
  const title = isAdmin() ? 'Painel do Secretário Distrital' : 'Área da Igreja Local';
  const intro = isAdmin()
    ? 'Acompanhe os anúncios recebidos e prepare a ordem de apresentação no culto distrital.'
    : 'Submeta os anúncios da sua igreja e acompanhe a respectiva aprovação.';
  const actions = isAdmin() ? [
    ['announcementsPanel', 'Analisar anúncios', 'Ver os anúncios pendentes e tomar uma decisão.'],
    ['meetingsPanel', 'Criar reunião', 'Abrir uma reunião e definir o prazo de submissão.'],
    ['worshipPanel', 'Abrir Modo Culto', 'Ler apenas os anúncios aprovados.']
  ] : [
    ['announcementFormPanel', 'Enviar anúncio', 'Preencher e submeter um novo anúncio.'],
    ['announcementsPanel', 'Consultar anúncios', 'Ver o estado dos anúncios já submetidos.']
  ];
  $('homePanel').innerHTML = `
    <div class="section-head"><div><p class="eyebrow">Visão geral</p><h2>${escapeHtml(title)}</h2><p class="muted">${escapeHtml(intro)}</p></div></div>
    <div class="stats">
      <div class="stat"><strong>${submitted}</strong><span>Submetidos</span></div>
      <div class="stat"><strong>${approved}</strong><span>Aprovados</span></div>
      <div class="stat"><strong>${returned}</strong><span>Devolvidos</span></div>
      <div class="stat"><strong>${announced}</strong><span>Anunciados</span></div>
    </div>
    <div class="quick-actions">${actions.map(([id, t, d]) => `
      <button type="button" class="quick-card" data-go="${id}"><strong>${escapeHtml(t)}</strong><span>${escapeHtml(d)}</span></button>
    `).join('')}</div>`;
  $('homePanel').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => showPanel(b.dataset.go)));
}

function filteredAnnouncements() {
  const meetingId = $('filterMeeting').value;
  const status = $('filterStatus').value;
  return state.announcements.filter(a => (!meetingId || a.meetingId === meetingId) && (!status || a.status === status));
}

function renderAnnouncements() {
  $('announcementsHeading').textContent = isAdmin() ? 'Todos os anúncios' : 'Meus anúncios';
  const list = filteredAnnouncements();
  if (!list.length) {
    $('announcementsList').innerHTML = '<div class="empty-state">Nenhum anúncio encontrado para os filtros seleccionados.</div>';
    return;
  }
  $('announcementsList').innerHTML = list.map(a => announcementCard(a)).join('');
  bindAnnouncementActions();
}

function announcementCard(a) {
  const canLocalEdit = !isAdmin() && ['SUBMITTED', 'RETURNED'].includes(a.status);
  const adminButtons = isAdmin() ? `
    <button class="btn small ghost" data-edit="${a.id}">Editar</button>
    ${a.status !== 'APPROVED' ? `<button class="btn small success" data-decision="APPROVED" data-id="${a.id}">Aprovar</button>` : ''}
    ${a.status !== 'RETURNED' ? `<button class="btn small warning" data-decision="RETURNED" data-id="${a.id}">Devolver</button>` : ''}
    ${a.status !== 'REJECTED' ? `<button class="btn small danger" data-decision="REJECTED" data-id="${a.id}">Rejeitar</button>` : ''}
    ${a.status === 'APPROVED' ? `<button class="btn small primary" data-decision="ANNOUNCED" data-id="${a.id}">Marcar anunciado</button>` : ''}
    ${!['ARCHIVED'].includes(a.status) ? `<button class="btn small ghost" data-decision="ARCHIVED" data-id="${a.id}">Arquivar</button>` : ''}
  ` : canLocalEdit ? `<button class="btn small primary" data-edit="${a.id}">${a.status === 'RETURNED' ? 'Corrigir e reenviar' : 'Editar'}</button>` : '';
  const details = [
    a.eventDate && `Data: ${formatDate(a.eventDate)}`,
    a.eventTime && `Hora: ${escapeHtml(a.eventTime)}`,
    a.eventLocation && `Local: ${escapeHtml(a.eventLocation)}`,
    a.audience && `Público: ${escapeHtml(a.audience)}`,
    a.contactPhone && `Contacto: ${escapeHtml(a.contactPhone)}`
  ].filter(Boolean).join(' · ');
  return `<article class="card announcement-card">
    <div class="announcement-top">
      <div>
        <p class="eyebrow">${escapeHtml(a.churchName || selectedChurchName(a.churchId))}</p>
        <h3 class="announcement-title">${escapeHtml(a.title)}</h3>
        <div class="meta-row">
          <span>${escapeHtml(a.meetingName || selectedMeetingName(a.meetingId))}</span>
          <span>Submetido: ${formatDate(a.submittedAt, true)}</span>
          <span class="priority-${escapeHtml(a.priority)}">Prioridade: ${escapeHtml(priorityLabels[a.priority] || a.priority)}</span>
        </div>
      </div>
      <span class="badge status-${escapeHtml(a.status)}">${escapeHtml(statusLabels[a.status] || a.status)}</span>
    </div>
    <div class="read-text">${escapeHtml(a.readText)}</div>
    ${details ? `<div class="meta-row">${details}</div>` : ''}
    ${a.adminNote ? `<div class="note"><strong>Observação:</strong> ${escapeHtml(a.adminNote)}</div>` : ''}
    <div class="actions">${adminButtons}</div>
  </article>`;
}

function bindAnnouncementActions() {
  document.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => editAnnouncement(btn.dataset.edit)));
  document.querySelectorAll('[data-decision]').forEach(btn => btn.addEventListener('click', () => openDecision(btn.dataset.id, btn.dataset.decision)));
}

function resetAnnouncementForm() {
  $('announcementForm').reset();
  $('announcementId').value = '';
  $('announcementFormTitle').textContent = 'Enviar anúncio';
  $('saveAnnouncementBtn').textContent = 'Submeter anúncio';
  $('cancelAnnouncementEdit').hidden = true;
  populateSelects();
}

function editAnnouncement(id) {
  const a = state.announcements.find(x => String(x.id) === String(id));
  if (!a) return;
  $('announcementId').value = a.id;
  $('announcementMeeting').innerHTML = state.meetings.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join('');
  $('announcementMeeting').value = a.meetingId;
  if (isAdmin()) $('announcementChurch').value = a.churchId;
  $('announcementTitle').value = a.title || '';
  $('announcementCategory').value = a.category || '';
  $('announcementReadText').value = a.readText || '';
  $('announcementEventDate').value = String(a.eventDate || '').slice(0, 10);
  $('announcementEventTime').value = a.eventTime || '';
  $('announcementEventLocation').value = a.eventLocation || '';
  $('announcementAudience').value = a.audience || '';
  $('announcementContactName').value = a.contactName || '';
  $('announcementContactPhone').value = a.contactPhone || '';
  $('announcementPriority').value = a.priority || 'NORMAL';
  $('announcementFormTitle').textContent = 'Editar anúncio';
  $('saveAnnouncementBtn').textContent = 'Guardar alterações';
  $('cancelAnnouncementEdit').hidden = false;
  showPanel('announcementFormPanel');
}

function announcementPayload() {
  return {
    id: $('announcementId').value,
    meetingId: $('announcementMeeting').value,
    churchId: isAdmin() ? $('announcementChurch').value : undefined,
    title: $('announcementTitle').value,
    category: $('announcementCategory').value,
    readText: $('announcementReadText').value,
    eventDate: $('announcementEventDate').value,
    eventTime: $('announcementEventTime').value,
    eventLocation: $('announcementEventLocation').value,
    audience: $('announcementAudience').value,
    contactName: $('announcementContactName').value,
    contactPhone: $('announcementContactPhone').value,
    priority: $('announcementPriority').value
  };
}

function openDecision(id, status) {
  $('decisionAnnouncementId').value = id;
  $('decisionStatus').value = status;
  $('decisionNote').value = '';
  const settings = {
    APPROVED: ['Aprovar anúncio', 'O anúncio ficará disponível no Modo Culto.'],
    RETURNED: ['Devolver para correcção', 'Indique claramente o que a igreja deve corrigir.'],
    REJECTED: ['Rejeitar anúncio', 'Indique o motivo da rejeição.'],
    ANNOUNCED: ['Marcar como anunciado', 'Confirme que o anúncio já foi apresentado no culto.'],
    ARCHIVED: ['Arquivar anúncio', 'O anúncio permanecerá no histórico.']
  };
  const [title, help] = settings[status] || ['Actualizar anúncio', ''];
  $('decisionTitle').textContent = title;
  $('decisionHelp').textContent = help;
  $('decisionNote').required = ['RETURNED', 'REJECTED'].includes(status);
  $('decisionDialog').showModal();
}

function renderMeetings() {
  if (!isAdmin()) return;
  if (!state.meetings.length) {
    $('meetingsList').innerHTML = '<div class="empty-state">Ainda não foi criada nenhuma reunião.</div>';
    return;
  }
  $('meetingsList').innerHTML = state.meetings.map(m => `<article class="card">
    <div class="announcement-top"><div><h3>${escapeHtml(m.name)}</h3><div class="meta-row"><span>${formatDate(m.date)}</span><span>${escapeHtml(m.location || 'Local por indicar')}</span><span>Prazo: ${formatDate(m.deadline, true)}</span></div></div><span class="badge status-${m.status === 'OPEN' ? 'APPROVED' : 'ARCHIVED'}">${m.status === 'OPEN' ? 'Aberta' : m.status === 'CLOSED' ? 'Encerrada' : 'Arquivada'}</span></div>
    <div class="actions">
      ${m.status !== 'OPEN' ? `<button class="btn small success" data-meeting-status="OPEN" data-id="${m.id}">Reabrir</button>` : `<button class="btn small warning" data-meeting-status="CLOSED" data-id="${m.id}">Encerrar submissões</button>`}
      ${m.status !== 'ARCHIVED' ? `<button class="btn small ghost" data-meeting-status="ARCHIVED" data-id="${m.id}">Arquivar</button>` : ''}
    </div>
  </article>`).join('');
  $('meetingsList').querySelectorAll('[data-meeting-status]').forEach(b => b.addEventListener('click', () => changeMeetingStatus(b.dataset.id, b.dataset.meetingStatus)));
}

async function changeMeetingStatus(id, status) {
  try {
    await api('updateMeeting', { id, status });
    const m = state.meetings.find(x => x.id === id);
    if (m) m.status = status;
    populateSelects();
    renderMeetings();
    toast('Estado da reunião actualizado.');
  } catch (err) { toast(err.message, 'error'); }
}

function renderUsers() {
  if (!isAdmin()) return;
  if (!state.users.length) {
    $('usersList').innerHTML = '<div class="empty-state">Nenhum utilizador encontrado.</div>';
    return;
  }
  $('usersList').innerHTML = `<table><thead><tr><th>Nome</th><th>Utilizador</th><th>Perfil</th><th>Igreja</th><th>Acção</th></tr></thead><tbody>${state.users.map(u => `
    <tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.username)}</td><td>${escapeHtml(roleLabels[u.role] || u.role)}</td><td>${escapeHtml(selectedChurchName(u.churchId) || '—')}</td><td><button class="btn small ghost" data-reset-user="${u.id}">Redefinir senha</button></td></tr>
  `).join('')}</tbody></table>`;
  $('usersList').querySelectorAll('[data-reset-user]').forEach(b => b.addEventListener('click', () => resetUserPassword(b.dataset.resetUser)));
}

async function resetUserPassword(userId) {
  try {
    const result = await api('resetUserPassword', { userId });
    alert(`Nova palavra-passe temporária:\n\n${result.temporaryPassword}\n\nCopie e entregue ao utilizador.`);
  } catch (err) { toast(err.message, 'error'); }
}

function prepareWorship() {
  const meetingId = $('worshipMeeting').value;
  state.worshipItems = state.announcements.filter(a => a.meetingId === meetingId && a.status === 'APPROVED');
  state.worshipIndex = 0;
  renderWorship();
}

function renderWorship() {
  const items = state.worshipItems;
  if (!items.length) {
    $('worshipEmpty').hidden = false;
    $('worshipCard').hidden = true;
    $('worshipEmpty').textContent = $('worshipMeeting').value
      ? 'Não existem anúncios aprovados para esta reunião.'
      : 'Seleccione uma reunião com anúncios aprovados.';
    return;
  }
  $('worshipEmpty').hidden = true;
  $('worshipCard').hidden = false;
  state.worshipIndex = Math.max(0, Math.min(state.worshipIndex, items.length - 1));
  const a = items[state.worshipIndex];
  $('worshipCounter').textContent = `Anúncio ${state.worshipIndex + 1} de ${items.length}`;
  $('worshipChurch').textContent = a.churchName || selectedChurchName(a.churchId);
  $('worshipTitle').textContent = a.title;
  $('worshipText').textContent = a.readText;
  const details = [
    a.eventDate && `Data: ${formatDate(a.eventDate)}`,
    a.eventTime && `Hora: ${a.eventTime}`,
    a.eventLocation && `Local: ${a.eventLocation}`,
    a.contactPhone && `Contacto: ${a.contactPhone}`
  ].filter(Boolean);
  $('worshipDetails').innerHTML = details.map(d => `<span>${escapeHtml(d)}</span>`).join('');
  $('worshipPrev').disabled = state.worshipIndex === 0;
  $('worshipNext').disabled = state.worshipIndex === items.length - 1;
}

function printWorshipList() {
  const meetingId = $('worshipMeeting').value;
  const items = state.announcements.filter(a => a.meetingId === meetingId && ['APPROVED', 'ANNOUNCED'].includes(a.status));
  if (!items.length) return toast('Não existem anúncios aprovados para imprimir.', 'error');
  const meeting = state.meetings.find(m => m.id === meetingId);
  const w = window.open('', '_blank');
  if (!w) return toast('O navegador bloqueou a janela de impressão.', 'error');
  w.opener = null;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Folha de anúncios</title><style>body{font-family:Arial,sans-serif;margin:36px;color:#111}h1{margin-bottom:4px}.muted{color:#555}.item{page-break-inside:avoid;border-top:2px solid #8b0000;padding:20px 0}.church{text-transform:uppercase;font-size:12px;font-weight:bold;color:#8b0000}.text{white-space:pre-wrap;line-height:1.6;font-size:18px}</style></head><body>
    <h1>${escapeHtml(meeting?.name || 'Anúncios Distritais')}</h1><p class="muted">${formatDate(meeting?.date)} · ${escapeHtml(meeting?.location || '')}</p>
    ${items.map((a, i) => `<section class="item"><div class="church">${i + 1}. ${escapeHtml(a.churchName || selectedChurchName(a.churchId))}</div><h2>${escapeHtml(a.title)}</h2><div class="text">${escapeHtml(a.readText)}</div></section>`).join('')}
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

async function refreshBootstrap() {
  const data = await api('bootstrap');
  state.user = data.user;
  state.config = data.config || {};
  state.meetings = data.meetings || [];
  state.churches = data.churches || [];
  state.announcements = data.announcements || [];
  state.users = data.users || [];
  showApp();
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.submitter;
  setBusy(btn, true, 'A entrar...');
  $('loginError').hidden = true;
  try {
    const result = await api('login', { username: $('loginUsername').value, password: $('loginPassword').value });
    state.token = result.token;
    state.user = result.user;
    localStorage.setItem('districtAnnouncementsToken', state.token);
    await refreshBootstrap();
  } catch (err) {
    $('loginError').textContent = err.message;
    $('loginError').hidden = false;
  } finally { setBusy(btn, false); }
});

$('logoutBtn').addEventListener('click', async () => {
  try { await api('logout'); } catch (_) {}
  state.token = '';
  state.user = null;
  localStorage.removeItem('districtAnnouncementsToken');
  showLogin();
});

$('announcementForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.submitter;
  setBusy(btn, true);
  try {
    const payload = announcementPayload();
    if (payload.id) await api('updateAnnouncement', payload);
    else await api('createAnnouncement', payload);
    await refreshBootstrap();
    resetAnnouncementForm();
    showPanel('announcementsPanel');
    toast(payload.id ? 'Anúncio actualizado.' : 'Anúncio submetido com sucesso.');
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(btn, false); }
});

$('cancelAnnouncementEdit').addEventListener('click', () => { resetAnnouncementForm(); showPanel('announcementsPanel'); });
$('filterMeeting').addEventListener('change', renderAnnouncements);
$('filterStatus').addEventListener('change', renderAnnouncements);

$('decisionCancel').addEventListener('click', () => $('decisionDialog').close());

$('decisionForm').addEventListener('submit', async e => {
  e.preventDefault();
  const status = $('decisionStatus').value;
  const note = $('decisionNote').value;
  if (['RETURNED', 'REJECTED'].includes(status) && !note.trim()) return toast('Escreva a observação necessária.', 'error');
  const btn = $('decisionConfirm');
  setBusy(btn, true);
  try {
    await api('setAnnouncementStatus', { id: $('decisionAnnouncementId').value, status, note });
    $('decisionDialog').close();
    await refreshBootstrap();
    showPanel(state.activePanel === 'worshipPanel' ? 'worshipPanel' : 'announcementsPanel');
    toast('Estado do anúncio actualizado.');
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(btn, false); }
});

$('meetingForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.submitter;
  setBusy(btn, true);
  try {
    await api('createMeeting', {
      name: $('meetingName').value, date: $('meetingDate').value,
      location: $('meetingLocation').value, deadline: $('meetingDeadline').value,
      status: 'OPEN'
    });
    e.target.reset();
    await refreshBootstrap();
    showPanel('meetingsPanel');
    toast('Reunião criada e aberta para submissões.');
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(btn, false); }
});

$('churchForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.submitter;
  setBusy(btn, true);
  try {
    await api('createChurch', {
      name: $('churchName').value, zone: $('churchZone').value,
      secretary: $('churchSecretary').value, phone: $('churchPhone').value
    });
    e.target.reset();
    await refreshBootstrap();
    showPanel('managementPanel');
    toast('Igreja cadastrada.');
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(btn, false); }
});

$('userRole').addEventListener('change', () => {
  $('userChurchWrap').hidden = $('userRole').value !== 'LOCAL_SECRETARY';
  $('userChurch').required = $('userRole').value === 'LOCAL_SECRETARY';
});

$('userForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.submitter;
  setBusy(btn, true);
  try {
    const result = await api('createUser', {
      name: $('userName').value, username: $('userUsername').value,
      role: $('userRole').value, churchId: $('userChurch').value,
      phone: $('userPhone').value, temporaryPassword: $('userTemporaryPassword').value
    });
    e.target.reset();
    $('userRole').dispatchEvent(new Event('change'));
    await refreshBootstrap();
    showPanel('managementPanel');
    alert(`Utilizador criado com sucesso.\n\nUtilizador: ${result.user.username}\nPalavra-passe temporária: ${result.temporaryPassword}\n\nCopie estes dados e entregue ao utilizador.`);
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(btn, false); }
});

$('passwordForm').addEventListener('submit', async e => {
  e.preventDefault();
  if ($('newPassword').value !== $('confirmPassword').value) return toast('As novas palavras-passe não coincidem.', 'error');
  const btn = e.submitter;
  setBusy(btn, true);
  try {
    await api('changePassword', { currentPassword: $('currentPassword').value, newPassword: $('newPassword').value });
    e.target.reset();
    state.user.mustChangePassword = false;
    await refreshBootstrap();
    toast('Palavra-passe alterada com sucesso.');
  } catch (err) { toast(err.message, 'error'); }
  finally { setBusy(btn, false); }
});

$('worshipMeeting').addEventListener('change', prepareWorship);
$('worshipPrev').addEventListener('click', () => { state.worshipIndex--; renderWorship(); });
$('worshipNext').addEventListener('click', () => { state.worshipIndex++; renderWorship(); });
$('printWorshipBtn').addEventListener('click', printWorshipList);
$('worshipAnnounced').addEventListener('click', async () => {
  const item = state.worshipItems[state.worshipIndex];
  if (!item) return;
  try {
    await api('setAnnouncementStatus', { id: item.id, status: 'ANNOUNCED', note: 'Apresentado no culto distrital.' });
    item.status = 'ANNOUNCED';
    const globalItem = state.announcements.find(a => a.id === item.id);
    if (globalItem) globalItem.status = 'ANNOUNCED';
    state.worshipItems.splice(state.worshipIndex, 1);
    if (state.worshipIndex >= state.worshipItems.length) state.worshipIndex = Math.max(0, state.worshipItems.length - 1);
    renderWorship();
    renderHome();
    toast('Anúncio marcado como apresentado.');
  } catch (err) { toast(err.message, 'error'); }
});

async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  $('userRole').dispatchEvent(new Event('change'));
  if (!state.token) return showLogin();
  try { await refreshBootstrap(); }
  catch (err) {
    localStorage.removeItem('districtAnnouncementsToken');
    state.token = '';
    showLogin();
    toast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);
