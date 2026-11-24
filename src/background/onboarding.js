// Welcome (onboarding) page: shown once per profile — on a fresh install
// (onInstalled reason 'install') and on the first export that finds no folder
// at all (deferToRegrant mode 'pick'). The flag is written before the tab
// opens so the two triggers cannot race into two tabs.
const WELCOME_FLAG = 'ce.onboarding.welcomeShown';
const WELCOME_TRIGGER_KEY = 'ce.onboarding.trigger';
const WELCOME_URL = 'welcome.html';

export async function hasSeenWelcome() {
  try {
    const got = await chrome.storage.local.get(WELCOME_FLAG);
    return !!(got && got[WELCOME_FLAG]);
  } catch (e) {
    return true; // storage unavailable — do not nag
  }
}

// Returns true only when this call opened the welcome tab.
export async function maybeOpenWelcome(trigger) {
  try {
    const got = await chrome.storage.local.get(WELCOME_FLAG);
    if (got && got[WELCOME_FLAG]) return false;
    await chrome.storage.local.set({
      [WELCOME_FLAG]: Date.now(),
      [WELCOME_TRIGGER_KEY]: trigger || null
    });
    await chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_URL) });
    return true;
  } catch (e) {
    return false;
  }
}
