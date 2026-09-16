#!/usr/bin/env bash
# SentinelFi ZAP authenticated scanner (Linux/macOS secondary script).
# Usage:
#   ./zap-scan.sh -t http://localhost:3001 -e user@x.com -p 'pass' -i solution_energy
# Safety guard: refuses to scan non-local hosts unless -a (allow-prod) is set.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
REPORT_DIR="${SCRIPT_DIR}/reports"
ZAP_IMAGE="${ZAP_IMAGE:-ghcr.io/zaproxy/zaproxy:stable}"
TARGET="http://localhost:3001"
EMAIL=""
PASSWORD=""
TENANT_ID=""
ALLOW_PROD=0

usage() { echo "Usage: $0 -t <target> -e <email> -p <password> -i <tenantId> [-a]"; exit 1; }
while getopts "t:e:p:i:a" opt; do
  case "$opt" in
    t) TARGET="$OPTARG" ;;
    e) EMAIL="$OPTARG" ;;
    p) PASSWORD="$OPTARG" ;;
    i) TENANT_ID="$OPTARG" ;;
    a) ALLOW_PROD=1 ;;
    *) usage ;;
  esac
done

if [[ -z "$EMAIL" || -z "$PASSWORD" || -z "$TENANT_ID" ]]; then usage; fi
if [[ ! "$TARGET" =~ ^(localhost|127\.0\.0\.1|\[::1\]|.*\.local) ]] && [[ "$ALLOW_PROD" -eq 0 ]]; then
  echo "REFUSING to scan non-local target '$TARGET' without -a. Set -a only if you truly mean it." >&2
  exit 2
fi

command -v docker >/dev/null 2>&1 || { echo "docker is required." >&2; exit 1; }
mkdir -p "$REPORT_DIR"

# Render the automation plan from template with real values.
sed -e "s|{{TARGET_URL}}|${TARGET}|g" \
    -e "s|{{ZAP_EMAIL}}|${EMAIL}|g" \
    -e "s|{{ZAP_PASSWORD}}|${PASSWORD}|g" \
    -e "s|{{ZAP_TENANTID}}|${TENANT_ID}|g" \
    "${SCRIPT_DIR}/zap.yaml" > "$REPORT_DIR/zap-plan.yml"

echo "Running ZAP scan against $TARGET ..."
docker run --rm \
  -v "${SCRIPT_DIR}:/zap/scripts:ro" \
  -v "${REPORT_DIR}:/zap/wrk/reports" \
  "$ZAP_IMAGE" zap.sh -cmd -autorun /zap/wrk/reports/zap-plan.yml

echo "Reports: $REPORT_DIR/zap-report.html and $REPORT_DIR/zap-report.json"