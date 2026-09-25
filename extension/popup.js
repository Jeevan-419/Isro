/**
 * ============================================================================
 * PRIVYVISION POPUP SCRIPT (Manifest V3)
 * Controls page inspection, visual overlays, and local action dispatch
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  const activeUrlEl = document.getElementById('active-url');
  const groundedCountEl = document.getElementById('grounded-count');
  const piiCountEl = document.getElementById('pii-count');
  const toggleOverlaysEl = document.getElementById('toggle-overlays');
  const btnInspectNow = document.getElementById('btn-inspect-now');
  const btnOpenDashboard = document.getElementById('btn-open-dashboard');
  const actionInputEl = document.getElementById('action-input');
  const btnClickAction = document.getElementById('btn-click-action');

  // Trigger page inspection on active tab
  function inspectPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) return;
      const tab = tabs[0];
      activeUrlEl.textContent = tab.url || 'Active Tab';

      chrome.runtime.sendMessage({ type: 'INSPECT_CURRENT_TAB' }, (res) => {
        if (res && res.success && res.data) {
          const data = res.data;
          groundedCountEl.textContent = data.elementsCount || 0;
          piiCountEl.textContent = data.piiCount || 0;
        } else {
          groundedCountEl.textContent = '0';
          piiCountEl.textContent = '0';
          if (res?.error) {
            console.warn('[PrivyVision] Inspection note:', res.error);
          }
        }
      });
    });
  }

  // Initial load
  inspectPage();

  btnInspectNow.addEventListener('click', () => {
    btnInspectNow.textContent = 'Scanning Viewport...';
    inspectPage();
    setTimeout(() => {
      btnInspectNow.textContent = '⚡ Inspect Current Active Page';
    }, 600);
  });

  toggleOverlaysEl.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({
      type: 'TOGGLE_OVERLAYS',
      payload: { enabled: e.target.checked },
    });
  });

  btnOpenDashboard.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_STUDIO_DASHBOARD' });
  });

  btnClickAction.addEventListener('click', () => {
    const selector = actionInputEl.value.trim();
    if (!selector) return;

    chrome.runtime.sendMessage(
      {
        type: 'EXECUTE_BROWSER_ACTION',
        payload: { actionType: 'click', targetSelector: selector },
      },
      (res) => {
        if (res?.success) {
          btnClickAction.textContent = 'Done!';
          setTimeout(() => {
            btnClickAction.textContent = 'Click';
          }, 1200);
        } else {
          alert(`Execution error: ${res?.error || 'Target not found'}`);
        }
      }
    );
  });
});
