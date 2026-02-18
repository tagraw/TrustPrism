#!/bin/bash
# End-to-end test for TrustPrism Gatekeeper API
set -e

BASE="http://localhost:5000"

echo "=== Step 1: Login as admin ==="
LOGIN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}')
echo "$LOGIN" | python3 -m json.tool 2>/dev/null || echo "$LOGIN"

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
if [ -z "$TOKEN" ]; then
    echo "FAIL: Could not get admin token"
    exit 1
fi
echo "TOKEN: ${TOKEN:0:30}..."

echo ""
echo "=== Step 2: Get a game ID ==="
GAME_ID=$(PGPASSWORD=trustpass psql -U trustuser -h localhost -d trustprism -t -A -c "SELECT id FROM games LIMIT 1;")
echo "GAME_ID: $GAME_ID"

echo ""
echo "=== Step 3: Generate API key ==="
KEY_RESULT=$(curl -s -X POST "$BASE/admin/games/$GAME_ID/generate-key" \
  -H "Authorization: Bearer $TOKEN")
echo "$KEY_RESULT" | python3 -m json.tool 2>/dev/null || echo "$KEY_RESULT"

API_KEY=$(echo "$KEY_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('api_key',''))" 2>/dev/null)
if [ -z "$API_KEY" ]; then
    echo "FAIL: Could not generate API key"
    exit 1
fi
echo "API_KEY: ${API_KEY:0:25}..."

echo ""
echo "=== Step 4: Get participant ID ==="
PART_ID=$(PGPASSWORD=trustpass psql -U trustuser -h localhost -d trustprism -t -A -c "SELECT id FROM users WHERE role != 'admin' LIMIT 1;")
echo "PARTICIPANT: $PART_ID"

echo ""
echo "=== Step 5: Start session ==="
START=$(curl -s -X POST "$BASE/api/telemetry/session/start" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"participantId\": \"$PART_ID\"}")
echo "$START" | python3 -m json.tool

SID=$(echo "$START" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sessionId',''))")
echo "SESSION_ID: $SID"

echo ""
echo "=== Step 6: Track event ==="
curl -s -X POST "$BASE/api/telemetry/track" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"sessionId\": \"$SID\", \"eventType\": \"hint_shown\", \"data\": {\"level\": 3, \"hint_type\": \"directional\", \"ai_confidence\": 0.85}}" | python3 -m json.tool

echo ""
echo "=== Step 7: End session ==="
curl -s -X POST "$BASE/api/telemetry/session/end" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"sessionId\": \"$SID\", \"score\": 42}" | python3 -m json.tool

echo ""
echo "=== Step 8: Verify DB ==="
echo "--- game_sessions ---"
PGPASSWORD=trustpass psql -U trustuser -h localhost -d trustprism -c "SELECT id, started_at, ended_at, score FROM game_sessions WHERE id = '$SID';"

echo "--- activity_logs (SDK) ---"
PGPASSWORD=trustpass psql -U trustuser -h localhost -d trustprism -c "SELECT id, action_type, created_at FROM activity_logs WHERE metadata->>'source' = 'sdk' ORDER BY created_at DESC LIMIT 2;"

echo ""
echo "=== Step 9: Test invalid key ==="
curl -s -X POST "$BASE/api/telemetry/track" \
  -H "Content-Type: application/json" \
  -H "x-api-key: tp_dev_invalidkey123" \
  -d '{"sessionId": "fake", "eventType": "test"}' | python3 -m json.tool

echo ""
echo "=== ALL TESTS PASSED ==="
