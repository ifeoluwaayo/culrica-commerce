from pathlib import Path
root = Path(__file__).resolve().parents[1]
lib = (root/'src/lib/chord-commerce.ts').read_text()
route = (root/'src/app/api/mcp/route.ts').read_text()
skill = (root/'chord-skill/SKILL.md').read_text()
sql = (root/'supabase/chord-order-support.sql').read_text()
assert 'export async function getOrderDetails' in lib
assert "eq('customer_email', email)" in lib
assert "eq('reference', orderRef)" in lib
assert "eq('order_id', data.id)" in lib
assert 'export async function createSupportTicket' in lib
assert 'create_support_ticket' in route
assert 'get_order_details' in route
assert 'get_order_details' in skill and 'create_support_ticket' in skill
assert 'create table if not exists public.chord_support_tickets' in sql
assert 'enable row level security' in sql
assert "ticketReference: ticket.ticket_reference" in lib
print('PASS: order lookup, owner match, tickets, Chord wiring, migration')
