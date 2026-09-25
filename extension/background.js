/**
 * ============================================================================
 * PRIVYVISION BACKGROUND SERVICE WORKER (Manifest V3)
 * Handles messaging between Popup, Content Script, and Storage Telemetry
 * ============================================================================
 */

// Initialize telemetry defaults upon installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    telemetry: {
      totalInspections: 0,
      totalActionsExecuted: 0,
      totalPiiProtected: 0,
      recentLogs: [],
      installedAt: new Date().toISOString(),
    },
    activeSettings: {
      firewallEnforced: true,
      visualOverlaysEnabled: true,
      detectionMode: 'multi_modal',
    },
  });
  console.log('[PrivyVision] Extension background service worker initialized.');
});

// Central Message Dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    case 'INSPECT_CURRENT_TAB': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0 || !tabs[0].id) {
          sendResponse({ success: false, error: 'No active tab found' });
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'RUN_LOCAL_PERCEPTION' },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message,
              });
              return;
            }

            // Record telemetry
            chrome.storage.local.get(['telemetry'], (result) => {
              const tel = result.telemetry || {};
              tel.totalInspections = (tel.totalInspections || 0) + 1;
              tel.totalPiiProtected = (tel.totalPiiProtected || 0) + (response?.piiCount || 0);
              chrome.storage.local.set({ telemetry: tel });
            });

            sendResponse({ success: true, data: response });
          }
        );
      });
      return true; // Keep message channel open for async response
    }

    case 'EXECUTE_BROWSER_ACTION': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0 || !tabs[0].id) {
          sendResponse({ success: false, error: 'No active tab' });
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'EXECUTE_ACTION', action: payload },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message,
              });
              return;
            }

            // Record action telemetry
            chrome.storage.local.get(['telemetry'], (result) => {
              const tel = result.telemetry || {};
              tel.totalActionsExecuted = (tel.totalActionsExecuted || 0) + 1;
              chrome.storage.local.set({ telemetry: tel });
            });

            sendResponse({ success: true, data: response });
          }
        );
      });
      return true;
    }

    case 'TOGGLE_OVERLAYS': {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'TOGGLE_VISUAL_OVERLAYS',
            enabled: payload?.enabled,
          });
        }
      });
      sendResponse({ success: true });
      break;
    }

    case 'OPEN_STUDIO_DASHBOARD': {
      chrome.tabs.create({ url: 'http://localhost:5173/' });
      sendResponse({ success: true });
      break;
    }

    case 'GET_TELEMETRY': {
      chrome.storage.local.get(['telemetry'], (result) => {
        sendResponse({ success: true, telemetry: result.telemetry });
      });
      return true;
    }

    default:
      sendResponse({ success: false, error: `Unknown message type: ${type}` });
  }
});
