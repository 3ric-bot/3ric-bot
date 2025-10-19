(function () {
  const STORAGE_KEY = 'learnzo.accessToken';
  const REFRESH_KEY = 'learnzo.refreshToken';
  const DEVICE_KEY = 'learnzo.deviceId';
  const datasetBase = document.body?.dataset?.apiBase;
  const effectiveDatasetBase =
    datasetBase && !datasetBase.includes('{{') && datasetBase.trim() !== '' ? datasetBase : null;
  const API_BASE =
    window.LEARNZO_API_BASE || effectiveDatasetBase || 'http://localhost:4000';

  function ensureDeviceId() {
    try {
      let deviceId = localStorage.getItem(DEVICE_KEY);
      if (!deviceId) {
        deviceId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `device-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(DEVICE_KEY, deviceId);
      }
      return deviceId;
    } catch (error) {
      console.warn('Kon deviceId niet opslaan', error);
      return null;
    }
  }

  function getAccessToken() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Geen toegang tot localStorage', error);
      return null;
    }
  }

  function sendEvent(name, metadata) {
    const token = getAccessToken();
    if (!token) {
      return;
    }
    const payload = {
      type: name,
      metadata: metadata || {},
      source: 'web'
    };
    fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Device-ID': ensureDeviceId() || ''
      },
      body: JSON.stringify(payload)
    }).catch((error) => {
      console.warn('Event tracking mislukt', error);
    });
  }

  function parseMetaAttribute(value) {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch (error) {
      return { label: value };
    }
  }

  window.learnzoTrack = function (name, metadata) {
    sendEvent(name, metadata);
  };

  window.learnzoGetDeviceId = ensureDeviceId;
  ensureDeviceId();

  document.querySelectorAll('[data-track-event]').forEach((element) => {
    element.addEventListener('click', () => {
      const eventName = element.getAttribute('data-track-event');
      const meta = parseMetaAttribute(element.getAttribute('data-track-meta'));
      sendEvent(eventName, meta);
    });
  });

  document.addEventListener('learnzo:auth', (event) => {
    if (!event.detail) return;
    try {
      if (event.detail.accessToken) {
        localStorage.setItem(STORAGE_KEY, event.detail.accessToken);
      }
      if (event.detail.refreshToken) {
        localStorage.setItem(REFRESH_KEY, event.detail.refreshToken);
      }
    } catch (error) {
      console.warn('Kon tokens niet opslaan', error);
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    sendEvent('page.view', { path: window.location.pathname });
  });
})();
