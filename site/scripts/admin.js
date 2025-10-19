const apiBase = document.body?.dataset?.apiBase || '';
const feedback = document.getElementById('admin-feedback');
const promotionsTableBody = document.getElementById('promotions-body');
const includeArchivedToggle = document.getElementById('include-archived');
const tokenInput = document.getElementById('admin-token');

function setFeedback(message, tone = 'info') {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.dataset.tone = tone;
}

function getAuthHeaders() {
  const token = (tokenInput?.value || '').trim();
  if (!token) {
    throw new Error('missing_token');
  }
  return {
    Authorization: `Bearer ${token}`,
    'X-Device-ID': 'admin-console'
  };
}

async function request(path, options = {}) {
  if (!apiBase) {
    throw new Error('missing_api_base');
  }
  const headers = new Headers(options.headers || {});
  if (options.json) {
    headers.set('Content-Type', 'application/json');
  }
  let authHeaders = {};
  try {
    authHeaders = getAuthHeaders();
  } catch (error) {
    if (error.message === 'missing_token') {
      setFeedback('Provide an admin access token before making requests.', 'warn');
      throw error;
    }
    throw error;
  }
  Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body || null,
    credentials: 'include'
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || response.statusText;
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function renderPromotionRow(promotion) {
  const row = document.createElement('tr');
  const statusTone = promotion.status === 'active' ? 'success' : promotion.status === 'paused' ? 'warn' : 'muted';
  row.innerHTML = `
    <td>${promotion.name}</td>
    <td><code>${promotion.code}</code></td>
    <td>${promotion.discountType === 'percentage' ? `${promotion.value}%` : `€ ${(promotion.value / 100).toFixed(2)}`}</td>
    <td>${promotion.startsAt ? new Date(promotion.startsAt).toLocaleString() : '—'}</td>
    <td>${promotion.endsAt ? new Date(promotion.endsAt).toLocaleString() : '—'}</td>
    <td data-tone="${statusTone}">${promotion.status}</td>
    <td>${promotion.lifecycleStatus}</td>
    <td>${promotion.appliesTo?.plans?.join(', ') || 'All plans'}</td>
  `;
  return row;
}

async function loadPromotions() {
  if (!promotionsTableBody) return;
  promotionsTableBody.innerHTML = '';
  try {
    const params = includeArchivedToggle?.checked ? '?includeArchived=true' : '';
    const data = await request(`/admin/promotions${params}`);
    if (!Array.isArray(data.promotions) || data.promotions.length === 0) {
      const empty = document.createElement('tr');
      empty.innerHTML = '<td colspan="8">No campaigns found for this filter.</td>';
      promotionsTableBody.appendChild(empty);
      return;
    }
    data.promotions.forEach((promotion) => {
      promotionsTableBody.appendChild(renderPromotionRow(promotion));
    });
    setFeedback('Loaded promotions.', 'info');
  } catch (error) {
    if (error.message !== 'missing_token' && error.message !== 'missing_api_base') {
      setFeedback(`Failed to load promotions: ${error.message}`, 'error');
    }
  }
}

const loadButton = document.getElementById('load-promotions');
loadButton?.addEventListener('click', (event) => {
  event.preventDefault();
  loadPromotions();
});

const adminActionsForm = document.querySelector('.admin-actions');
adminActionsForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  loadPromotions();
});

includeArchivedToggle?.addEventListener('change', () => {
  loadPromotions();
});

const createForm = document.getElementById('create-promotion-form');
createForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(createForm);
  const payload = {
    name: formData.get('name'),
    code: formData.get('code'),
    discountType: formData.get('discountType'),
    value: Number(formData.get('value') || 0),
    startsAt: formData.get('startsAt') || null,
    endsAt: formData.get('endsAt') || null,
    usageLimit: formData.get('usageLimit') ? Number(formData.get('usageLimit')) : null,
    perUserLimit: formData.get('perUserLimit') ? Number(formData.get('perUserLimit')) : null,
    stackable: formData.get('stackable') === 'on',
    appliesTo: {
      plans: (formData.get('plans') || '')
        .split(',')
        .map((plan) => plan.trim())
        .filter(Boolean)
    },
    notes: formData.get('notes') || null
  };
  try {
    await request('/admin/promotions', { method: 'POST', json: payload });
    setFeedback('Promotion created. Activate it when you are ready.', 'success');
    createForm.reset();
    loadPromotions();
  } catch (error) {
    if (error.message === 'missing_api_base') {
      setFeedback('Configure API_BASE_URL so the admin console can reach the backend.', 'warn');
    } else if (error.message !== 'missing_token') {
      setFeedback(`Creation failed: ${error.message}`, 'error');
    }
  }
});

const updateForm = document.getElementById('update-promotion-form');
updateForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(updateForm);
  const promotionId = formData.get('promotionId');
  if (!promotionId) {
    setFeedback('Provide a promotion ID to update.', 'warn');
    return;
  }
  const payload = {};
  if (formData.get('name')) payload.name = formData.get('name');
  if (formData.get('code')) payload.code = formData.get('code');
  if (formData.get('value')) payload.value = Number(formData.get('value'));
  if (formData.get('startsAt')) payload.startsAt = formData.get('startsAt');
  if (formData.get('endsAt')) payload.endsAt = formData.get('endsAt');
  if (formData.get('usageLimit')) payload.usageLimit = Number(formData.get('usageLimit'));
  if (formData.get('perUserLimit')) payload.perUserLimit = Number(formData.get('perUserLimit'));
  if (formData.get('notes')) payload.notes = formData.get('notes');
  if (formData.get('plans')) {
    payload.appliesTo = {
      plans: formData
        .get('plans')
        .split(',')
        .map((plan) => plan.trim())
        .filter(Boolean)
    };
  }
  try {
    await request(`/admin/promotions/${promotionId}`, { method: 'PATCH', json: payload });
    setFeedback('Promotion updated.', 'success');
    updateForm.reset();
    loadPromotions();
  } catch (error) {
    if (error.message === 'missing_api_base') {
      setFeedback('Configure API_BASE_URL so the admin console can reach the backend.', 'warn');
    } else if (error.message !== 'missing_token') {
      setFeedback(`Update failed: ${error.message}`, 'error');
    }
  }
});

const actionForm = document.getElementById('promotion-action-form');
actionForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(actionForm);
  const promotionId = formData.get('promotionId');
  const action = formData.get('action');
  if (!promotionId || !action) {
    setFeedback('Select a promotion and action to continue.', 'warn');
    return;
  }
  try {
    await request(`/admin/promotions/${promotionId}/${action}`, { method: 'POST' });
    setFeedback(`Promotion ${action}d successfully.`, 'success');
    actionForm.reset();
    loadPromotions();
  } catch (error) {
    if (error.message === 'missing_api_base') {
      setFeedback('Configure API_BASE_URL so the admin console can reach the backend.', 'warn');
    } else if (error.message !== 'missing_token') {
      setFeedback(`Action failed: ${error.message}`, 'error');
    }
  }
});

if (!apiBase) {
  setFeedback('Configure API_BASE_URL so the admin console can reach the backend.', 'warn');
}
