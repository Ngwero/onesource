#!/usr/bin/env bash
# Reliable iOS run: USB cable + Xcode log streaming env.
set -euo pipefail
cd "$(dirname "$0")"

export IDEPreferLogStreaming=YES

echo "→ Plug iPhone in via USB (wireless debugging often fails to attach)."
echo "→ Running with IDEPreferLogStreaming=YES"
flutter run "$@"
