#!/usr/bin/env bash
set -euo pipefail
FFMPEG=/opt/homebrew/bin/ffmpeg
EXT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$EXT_ROOT/docs/wiki-capture/providers"
WIKI="$(cd "$EXT_ROOT/../chat-export-extension.wiki" && pwd)/providers"
WIKI_MEDIA="$(cd "$EXT_ROOT/../chat-export-extension.wiki" && pwd)/media"
POPUP_SHOT="$EXT_ROOT/docs/wiki-capture/popup-export-settings.png"

mkdir -p "$STAGE" "$WIKI" "$WIKI_MEDIA"

fmt_uid() {
  local pid=$1
  chrome-devtools take_snapshot "$pid" 2>/dev/null | grep -E 'Export format|Формат экспорта' | head -1 | sed -n 's/.*uid=\([^ ]*\).*/\1/p'
}

wait_bar() {
  local pid=$1
  for _ in $(seq 1 50); do
    if chrome-devtools evaluate_script "() => !!document.querySelector('[data-chat-export-bar]')" --pageId "$pid" --output-format json 2>/dev/null | tail -1 | grep -q 'true'; then
      return 0
    fi
    sleep 0.4
  done
  echo "WARN: no bar on page $pid" >&2
  return 1
}

shot_uid() {
  local pid=$1 uid=$2 out=$3
  chrome-devtools take_screenshot "$pid" --uid "$uid" --filePath "$out" >/dev/null
}

open_menu_shot() {
  local pid=$1 out=$2
  local uid
  uid=$(fmt_uid "$pid")
  chrome-devtools click "$pid" "$uid" >/dev/null 2>&1 || true
  sleep 0.5
  chrome-devtools take_screenshot "$pid" --filePath "$out" >/dev/null
  chrome-devtools press_key "$pid" "Escape" >/dev/null 2>&1 || true
  sleep 0.2
}

capture_provider() {
  local id=$1 pid=$2
  local dir="$STAGE/$id"
  mkdir -p "$dir" "$WIKI/$id"
  chrome-devtools select_page "$pid" --bringToFront true >/dev/null
  chrome-devtools navigate_page "$pid" --type reload >/dev/null 2>&1 || true
  wait_bar "$pid" || return 0
  local uid
  uid=$(fmt_uid "$pid")
  chrome-devtools emulate "$pid" --colorScheme dark >/dev/null 2>&1 || true
  shot_uid "$pid" "$uid" "$dir/bar-dark.png"
  chrome-devtools emulate "$pid" --colorScheme light >/dev/null 2>&1 || true
  shot_uid "$pid" "$uid" "$dir/bar-light.png"
  chrome-devtools emulate "$pid" --colorScheme dark >/dev/null 2>&1 || true
  open_menu_shot "$pid" "$dir/menu.png"
  cp -f "$dir"/*.png "$WIKI/$id/"
  echo "OK $id"
}

record_demo_gif() {
  local pid=$1 id=$2
  local dir="$STAGE/$id"
  local webm="$dir/demo.webm"
  local gif="$dir/demo.gif"
  chrome-devtools select_page "$pid" --bringToFront true >/dev/null
  wait_bar "$pid" || return 0
  local uid
  uid=$(fmt_uid "$pid")
  chrome-devtools screencast_start "$pid" >/dev/null 2>&1 || return 0
  chrome-devtools click "$pid" "$uid" >/dev/null 2>&1 || true
  sleep 0.8
  chrome-devtools click "$pid" "$uid" >/dev/null 2>&1 || true
  sleep 0.3
  chrome-devtools screencast_stop "$pid" --filePath "$webm" >/dev/null 2>&1 || chrome-devtools screencast_stop "$pid" >/dev/null 2>&1 || true
  if [[ -f "$webm" ]]; then
    "$FFMPEG" -y -i "$webm" -vf "fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer" -loop 0 "$gif" 2>/dev/null || true
    rm -f "$webm"
    if [[ -f "$gif" ]]; then
      local sz
      sz=$(stat -f%z "$gif" 2>/dev/null || stat -c%s "$gif")
      if [[ "$sz" -gt 3145728 ]]; then
        "$FFMPEG" -y -i "$gif" -vf "fps=8,scale=480:-1" "$gif.tmp.gif" 2>/dev/null && mv "$gif.tmp.gif" "$gif"
      fi
      cp -f "$gif" "$WIKI/$id/demo.gif"
    fi
  fi
}

capture_provider chatgpt 20
capture_provider grok 17
capture_provider grok-x 4
capture_provider claude 22
capture_provider copilot 3
capture_provider qwen 5
capture_provider deepseek 8
capture_provider perplexity 18

for pair in "chatgpt 20" "grok 17" "grok-x 4" "claude 22" "copilot 3" "qwen 5" "deepseek 8" "perplexity 18"; do
  set -- $pair
  record_demo_gif "$2" "$1"
done

POP_PID=$(chrome-devtools list_pages --output-format json 2>/dev/null | tail -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((p['id'] for p in d['pages'] if 'popup.html' in p.get('url','')), ''))")
if [[ -z "$POP_PID" ]]; then
  chrome-devtools new_page "chrome-extension://hhfiadhandpdamghcphoffmnldokgmec/popup.html" >/dev/null 2>&1 || true
  POP_PID=$(chrome-devtools list_pages --output-format json 2>/dev/null | tail -1 | python3 -c "import sys,json; d=json.load(sys.stdin); print(next((p['id'] for p in d['pages'] if 'popup.html' in p.get('url','')), ''))")
fi
if [[ -n "$POP_PID" ]]; then
  chrome-devtools select_page "$POP_PID" --bringToFront true >/dev/null
  chrome-devtools evaluate_script "() => { const toggles=[...document.querySelectorAll('.ce-advanced-toggle')]; const t=toggles.find(el=>/export settings|настройки экспорта/i.test(el.textContent)); if(t && !t.classList.contains('is-open')) t.click(); return !!t; }" --pageId "$POP_PID" >/dev/null 2>&1
  sleep 0.3
  chrome-devtools take_screenshot "$POP_PID" --filePath "$POPUP_SHOT" >/dev/null
  cp -f "$POPUP_SHOT" "$WIKI_MEDIA/popup-export-settings.png"
fi

CHATGPT_GIF="$STAGE/chatgpt/demo.gif"
if [[ -f "$CHATGPT_GIF" ]]; then
  cp -f "$CHATGPT_GIF" "$EXT_ROOT/docs/media/demo-export.gif"
fi

echo "Done: $STAGE -> $WIKI"
