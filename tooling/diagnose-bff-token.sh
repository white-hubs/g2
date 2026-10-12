#!/usr/bin/env bash
# Feedback loop: local gateway /gw-bff/auth/token vs cube-test.
# Green for "secret configured" = same CAPTCHA-class error as cube-test (not OAuth client secret missing).
set -euo pipefail
PAYLOAD='{"grant_type":"pwd_simple_code","username":"x","password":"y","captchaType":"BLOCK_PUZZLE","key":"k"}'
local_body=$(curl -sS --max-time 15 -X POST 'http://127.0.0.1:8080/gw-bff/auth/token' \
  -H 'content-type: application/json' -d "$PAYLOAD")
remote_body=$(curl -sS --max-time 15 -X POST 'https://cube-test.guhecloud.com:3000/gw-bff/auth/token' \
  -H 'content-type: application/json' -d "$PAYLOAD")
echo "local:  $local_body"
echo "remote: $remote_body"
if echo "$local_body" | grep -q 'OAuth client secret is not configured'; then
  echo "FAIL: local BFF missing OAUTH_CLIENT_SECRET (set deploy/docker-compose/.env and recreate bff)" >&2
  exit 1
fi
if echo "$local_body" | grep -qE 'CAPTCHA|验证码|6110'; then
  echo "OK: local BFF injected OAuth credentials (captcha-class response like cube-test)"
  exit 0
fi
echo "WARN: unexpected local response class — inspect manually" >&2
exit 2
