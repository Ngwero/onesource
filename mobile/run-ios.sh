#!/usr/bin/env bash
# Reliable iOS run: USB cable + Xcode log streaming env.
set -euo pipefail
cd "$(dirname "$0")"

export IDEPreferLogStreaming=YES
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

DEVICE_ID="${FLUTTER_DEVICE_ID:-}"
USE_RELEASE="${FLUTTER_RELEASE:-}"

echo "→ Plug iPhone in via USB for debug + hot reload."
echo "→ Running with IDEPreferLogStreaming=YES"

DEVICE_INFO="$(python3 - <<'PY'
import json, subprocess, sys

out = subprocess.check_output(["flutter", "devices"], text=True, stderr=subprocess.STDOUT, timeout=45)
machine = json.loads(subprocess.check_output(["flutter", "devices", "--machine"], timeout=45))
physical = [d for d in machine if d.get("targetPlatform") == "ios" and not d.get("emulator")]
if not physical:
    sys.exit(1)
device_id = physical[0]["id"]
wireless = False
if "wirelessly connected device" in out:
    wireless = device_id in out.split("wirelessly connected device", 1)[1]
print(device_id)
print("wireless" if wireless else "usb")
PY
)" || {
  echo "→ No physical iPhone found. Plug in via USB, unlock, and trust this Mac."
  exit 1
}

DETECTED_ID="$(echo "$DEVICE_INFO" | sed -n '1p')"
CONNECTION="$(echo "$DEVICE_INFO" | sed -n '2p')"

if [[ -z "$DEVICE_ID" ]]; then
  DEVICE_ID="$DETECTED_ID"
fi

echo "→ Using device: $DEVICE_ID ($CONNECTION)"

if [[ "$USE_RELEASE" == "1" ]] || [[ "$CONNECTION" == "wireless" ]]; then
  echo "→ Release mode (wireless debugging cannot attach a debugger reliably)."
  flutter run -d "$DEVICE_ID" --release "$@"
else
  # iOS 18+ physical devices crash in debug JIT — use profile on device, debug on simulator only.
  echo "→ Profile mode on physical device (debug JIT crashes on iOS 18+)."
  flutter run -d "$DEVICE_ID" --profile "$@"
fi
