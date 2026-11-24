// Welcome (onboarding) page: shown once per profile — on a fresh install
// (onInstalled reason 'install') and on the first export that finds no folder
// at all (deferToRegrant mode 'pick'). The flag is written before the tab
// opens and concurrent calls share one in-flight attempt, so the two triggers
// cannot race into two tabs.
const WELCOME_FLAG = 'ce.onboarding.welcomeShown';
const WELCOME_TRIGGER_KEY = 'ce.onboarding.trigger';
const WELCOME_URL = 'welcome.html';

let opening = null;

export async function hasSeenWelcome() {
  try {
    const got = await chrome.storage.local.get(WELCOME_FLAG);
    return !!(got && got[WELCOME_FLAG]);
  } catch (e) {
    return true; // storage unavailable — do not nag
  }
}

async function openOnce(trigger) {
  let flagged = false;
  try {
    const got = await chrome.storage.local.get(WELCOME_FLAG);
    if (got && got[WELCOME_FLAG]) return false;
    await chrome.storage.local.set({
      [WELCOME_FLAG]: Date.now(),
      [WELCOME_TRIGGER_KEY]: trigger || null
    });
    flagged = true;
    await chrome.tabs.create({ url: chrome.runtime.getURL(WELCOME_URL) });
    return true;
  } catch (e) {
    // The tab never opened: clear the flag so the next trigger can try again.
    if (flagged) await chrome.storage.local.remove([WELCOME_FLAG, WELCOME_TRIGGER_KEY]).catch(function () {});
    return false;
  }
}

// Returns true only when this call opened the welcome tab.
export function maybeOpenWelcome(trigger) {
  if (opening) {
    return opening.then(function () {
      return false;
    });
  }
  opening = openOnce(trigger).finally(function () {
    opening = null;
  });
  return opening;
}

// Updates from a version without onboarding: existing users already know the
// extension, so mark the page as seen without opening it.
export async function markWelcomeSeen(trigger) {
  try {
    const got = await chrome.storage.local.get(WELCOME_FLAG);
    if (got && got[WELCOME_FLAG]) return false;
    await chrome.storage.local.set({
      [WELCOME_FLAG]: Date.now(),
      [WELCOME_TRIGGER_KEY]: trigger || null
    });
    return true;
  } catch (e) {
    return false;
  }
}

// runtime.onInstalled: welcome tab on a fresh install, silent flag on update.
export function onInstalledWelcome(details) {
  const reason = details && details.reason;
  if (reason === 'install') return maybeOpenWelcome('install');
  if (reason === 'update') return markWelcomeSeen('update');
  return Promise.resolve(false);
}
