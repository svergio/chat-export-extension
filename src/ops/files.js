import { hostErr, waitFor } from './helpers.js';

function b64ToBytes(b64) {
  var bin = atob(String(b64 || ''));
  var out = new Uint8Array(bin.length);
  var i;
  for (i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function assignInputFiles(input, fileList) {
  try {
    input.files = fileList;
    if (input.files && input.files.length) return;
  } catch (e) {}
  try {
    Object.defineProperty(input, 'files', { configurable: true, writable: true, value: fileList });
  } catch (e2) {
    hostErr('ATTACH_UNSUPPORTED', (e2 && e2.message) || 'cannot set file input');
  }
}

export function setFileInputFiles(input, wireFiles) {
  if (!input || String(input.type || '').toLowerCase() !== 'file') {
    hostErr('ATTACH_UNSUPPORTED', 'file input not found');
  }
  var list = Array.isArray(wireFiles) ? wireFiles : [];
  if (!list.length) return 0;
  var doc = input.ownerDocument;
  var view = doc.defaultView || window;
  if (!view || !view.File || !view.DataTransfer) {
    hostErr('ATTACH_UNSUPPORTED', 'File/DataTransfer unavailable');
  }
  var dt = new view.DataTransfer();
  var i;
  var wf;
  var bytes;
  var file;
  for (i = 0; i < list.length; i++) {
    wf = list[i] || {};
    bytes = b64ToBytes(wf.b64);
    if (wf.size != null && Number(wf.size) >= 0 && bytes.length > Number(wf.size)) {
      hostErr('FILE_TOO_LARGE', wf.name || 'file');
    }
    file = new view.File([bytes], wf.name || 'upload.bin', { type: wf.mime || 'application/octet-stream' });
    dt.items.add(file);
  }
  assignInputFiles(input, dt.files);
  try {
    input.dispatchEvent(new view.Event('input', { bubbles: true }));
    input.dispatchEvent(new view.Event('change', { bubbles: true }));
  } catch (e) {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return dt.files.length;
}

function countAttachChips(root) {
  if (!root || !root.querySelectorAll) return 0;
  var sel = [
    '[data-testid*="attach" i]:not(button):not(input)',
    '[data-testid*="file-chip" i]',
    '[data-testid*="composer-attachment" i]',
    '[class*="AttachmentChip" i]',
    '[class*="attachment-chip" i]',
    '[class*="file-chip" i]',
    '[aria-label*="attached file" i]',
    '[aria-label*="прикрепл" i]'
  ].join(',');
  var nodes = root.querySelectorAll(sel);
  var n = 0;
  var i;
  for (i = 0; i < nodes.length; i++) {
    if (nodes[i].tagName === 'INPUT') continue;
    if (nodes[i].getAttribute && nodes[i].getAttribute('role') === 'progressbar') continue;
    n++;
  }
  return n;
}

function inputHasFiles(input, n, names) {
  if (!input || !input.files) return false;
  if (input.files.length < n) return false;
  if (!names || !names.length) return true;
  var have = {};
  var i;
  for (i = 0; i < input.files.length; i++) have[String(input.files[i].name || '').toLowerCase()] = true;
  for (i = 0; i < names.length; i++) {
    if (!have[String(names[i] || '').toLowerCase()]) return false;
  }
  return true;
}

function rootHasFileNames(root, names) {
  if (!root || !names || !names.length) return false;
  var text = String(root.textContent || '').toLowerCase();
  var i;
  for (i = 0; i < names.length; i++) {
    if (text.indexOf(String(names[i] || '').toLowerCase()) < 0) return false;
  }
  return true;
}

export function waitAttachChips(composer, expectedCount, opts) {
  opts = opts || {};
  var n = Math.max(0, Number(expectedCount) || 0);
  if (n === 0) return Promise.resolve(0);
  var root = composer && composer.querySelectorAll ? composer : document;
  var names = Array.isArray(opts.names) ? opts.names : null;
  var fileInput = opts.fileInput || null;
  var baseMs = opts.timeoutMs != null ? opts.timeoutMs : Math.min(120000, 45000 + n * 20000);
  return waitFor(
    function () {
      if (fileInput && inputHasFiles(fileInput, n, names)) {
        var chipsReady = countAttachChips(root) >= n || rootHasFileNames(root, names);
        var spinners = root.querySelectorAll(
          '[role="progressbar"], [data-testid*="spinner" i], [class*="spinner" i]'
        );
        if (chipsReady && (spinners.length === 0 || opts.allowSpinner)) return n;
        if (inputHasFiles(fileInput, n, names) && (spinners.length === 0 || opts.allowSpinner)) return n;
      }
      var chips = countAttachChips(root);
      if (names && rootHasFileNames(root, names) && chips >= 1) chips = Math.max(chips, names.length);
      var busy = root.querySelectorAll('[role="progressbar"], [data-testid*="spinner" i], [class*="spinner" i]');
      if (chips >= n && busy.length === 0) return chips;
      if (chips >= n && opts.allowSpinner) return chips;
      return null;
    },
    {
      timeoutMs: baseMs,
      intervalMs: opts.intervalMs != null ? opts.intervalMs : 250,
      message: opts.message || 'ATTACH_TIMEOUT'
    }
  );
}
