const WELL_KNOWN = [
  [/(размышлен|thinking)/i, 'thinking'],
  [/(быстр|fast)/i, 'fast'],
  [/(глубок[\s\S]*?исслед|deep[\s-]*research)/i, 'deep-research'],
  [/(^ask\b|спроси)/i, 'ask'],
  [/(agent)/i, 'agent'],
  [/(авто|auto)/i, 'auto'],
  [/(эксперт|expert)/i, 'expert'],
  [/(тяжёл|heavy)/i, 'heavy'],
  [/(build)/i, 'build'],
  [/(^think\b|мысл)/i, 'think'],
  [/(^efficiency\b|efficiency)/i, 'efficiency'],
  [/(^balance\b|balance)/i, 'balance'],
  [/(^intelligence\b|intelligence)/i, 'intelligence'],
  [/(сфокусир|focused)/i, 'focused']
];

function stripDiacritics(s) {
  try {
    return String(s)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');
  } catch (e) {
    return String(s);
  }
}

export function normalizeId(label) {
  var raw = String(label == null ? '' : label).trim();
  if (!raw) return '';
  var i;
  for (i = 0; i < WELL_KNOWN.length; i++) {
    if (WELL_KNOWN[i][0].test(raw)) return WELL_KNOWN[i][1];
  }
  return stripDiacritics(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normToken(s) {
  return stripDiacritics(String(s || ''))
    .trim()
    .toLowerCase();
}

export function matchOption(options, wanted) {
  if (!wanted && wanted !== 0) return null;
  if (!Array.isArray(options) || !options.length) return null;
  var w = normToken(wanted);
  var slug = normalizeId(wanted);
  var i;
  var opt;
  for (i = 0; i < options.length; i++) {
    opt = options[i];
    if (!opt) continue;
    if (normToken(opt.id) === w || normToken(opt.label) === w) return opt;
    if (slug && (normToken(opt.id) === slug || normalizeId(opt.label) === slug)) return opt;
  }
  for (i = 0; i < options.length; i++) {
    opt = options[i];
    if (!opt) continue;
    if (w && normToken(opt.label).indexOf(w) >= 0) return opt;
    if (slug && normalizeId(opt.label).indexOf(slug) >= 0) return opt;
  }
  return null;
}
