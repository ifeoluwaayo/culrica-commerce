#!/usr/bin/env bash
set -euo pipefail
: "${CHORD_API_KEY:?Export CHORD_API_KEY with MCP permissions}"
: "${CHORD_WORKSPACE_ID:?Export CHORD_WORKSPACE_ID}"
: "${CHORD_TEAMMATE_ID:?Export CHORD_TEAMMATE_ID}"
: "${CHORD_MCP_TOKEN:?Export CHORD_MCP_TOKEN}"
BASE="${CHORD_BASE_URL:-https://api.chordhq.xyz}"
SERVER_URL="${CULRICA_MCP_URL:-https://culrica-commerce.vercel.app/api/mcp}"

echo "Registering MCP server as disabled..."
response=$(curl -fsS -X POST "$BASE/v1/workspaces/$CHORD_WORKSPACE_ID/mcp-servers" \
  -H "Authorization: Bearer $CHORD_API_KEY" -H 'Content-Type: application/json' \
  --data "$(python3 -c 'import json,os; print(json.dumps({"name":"Culrica commerce demo","url":os.getenv("CULRICA_MCP_URL","https://culrica-commerce.vercel.app/api/mcp"),"auth_type":"bearer","auth_token":os.environ["CHORD_MCP_TOKEN"],"transport":"streamable_http","enabled":False}))')")
)
echo "$response"
SERVER_ID=$(printf '%s' "$response" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')

echo "Restricting teammate to server $SERVER_ID..."
curl -fsS -X PUT "$BASE/v1/teammates/$CHORD_TEAMMATE_ID" \
  -H "Authorization: Bearer $CHORD_API_KEY" -H 'Content-Type: application/json' \
  --data "{\"set_mcp_server_ids\":[\"$SERVER_ID\"]}" >/dev/null

echo 'Enabling allowlisted business tools...'
curl -fsS -X PUT "$BASE/v1/workspaces/$CHORD_WORKSPACE_ID/mcp-servers/$SERVER_ID" \
  -H "Authorization: Bearer $CHORD_API_KEY" -H 'Content-Type: application/json' \
  --data '{"enabled":true,"enabled_tools":["search_products","quote_product","place_order","verify_order_payment"]}' >/dev/null

echo 'Tool discovery:'
curl -fsS -X POST "$BASE/v1/workspaces/$CHORD_WORKSPACE_ID/mcp-servers/$SERVER_ID/tools" \
  -H "Authorization: Bearer $CHORD_API_KEY"
echo
echo 'Health status:'
curl -fsS -X POST "$BASE/v1/workspaces/$CHORD_WORKSPACE_ID/mcp-servers/$SERVER_ID/health" \
  -H "Authorization: Bearer $CHORD_API_KEY"
echo
printf '\nMCP_SERVER_ID=%s\n' "$SERVER_ID"
