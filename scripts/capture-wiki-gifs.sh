#!/usr/bin/env bash
set -euo pipefail
FFMPEG=/opt/homebrew/bin/ffmpeg
EXT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$EXT_ROOT/docs/wiki-capture/providers"
WIKI="$(cd "$EXT_ROOT/../chat-export-extension.wiki" && pwd)/providers"

record_gif() {
  local id=$1 pid=$2
  local dir="$STAGE/$id"
  mkdir -p "$dir" "$WIKI/$id"
  local mp4="$dir/demo.mp4"
  local gif="$dir/demo.gif"
  chrome-devtools select_page "$pid" --bringToFront true >/dev/null
  chrome-devtools screencast_start "$pid" --filePath "$mp4" >/dev/null 2>&1
  sleep 0.6
  local uid
  uid=$(chrome-devtools take_snapshot "$pid" 2>/dev/null | grep -E 'Export format|Формат экспорта' | head -1 | sed -n 's/.*uid=\([^ ]*\).*/\1/p')
  if [[ -n "$uid" ]]; then
    chrome-devtools click "$pid" "$uid" >/dev/null 2>&1 || true
    sleep 0.7
    chrome-devtools press_key "$pid" "Escape" >/dev/null 2>&1 || true
  fi
  sleep 0.3
  chrome-devtools screencast_stop "$pid" >/dev/null 2>&1
  if [[ ! -f "$mp4" ]]; then
    echo "skip gif $id (no mp4)"
    return
  fi
  "$FFMPEG" -y -i "$mp4" -vf "fps=10,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer" -loop 0 "$gif" 2>/dev/null
  local sz
  sz=$(stat -f%z "$gif" 2>/dev/null || stat -c%s "$gif")
  if [[ "$sz" -gt 3145728 ]]; then
    "$FFMPEG" -y -i "$mp4" -vf "fps=8,scale=420:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" -loop 0 "$gif" 2>/dev/null
  fi
  cp -f "$gif" "$WIKI/$id/demo.gif"
  echo "gif $id $(stat -f%z "$gif" 2>/dev/null || stat -c%s "$gif") bytes"
}

record_gif chatgpt 20
record_gif grok 17
record_gif grok-x 4
record_gif claude 22
record_gif copilot 3
record_gif qwen 5
record_gif deepseek 8
record_gif perplexity 18

cp -f "$STAGE/chatgpt/demo.gif" "$EXT_ROOT/docs/media/demo-export.gif"
echo done
