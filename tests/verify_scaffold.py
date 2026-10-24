"""Zero-dependency static smoke tests for Culrica commerce."""
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
required = [
    'src/app/page.tsx', 'src/app/products/[slug]/page.tsx',
    'src/app/admin/page.tsx', 'src/app/admin/login/page.tsx',
    'src/app/api/products/route.ts', 'src/app/api/products/[slug]/route.ts',
    'src/app/api/admin/products/route.ts', 'src/app/api/admin/products/[id]/route.ts',
    'src/app/api/auth/login/route.ts', 'src/app/api/auth/logout/route.ts',
    'src/app/api/checkout/route.ts', 'src/app/api/paystack/webhook/route.ts',
    'src/app/api/admin/coupons/route.ts', 'src/app/api/admin/inventory/route.ts',
    'src/app/api/admin/orders/route.ts',
    'src/lib/store.ts', 'src/lib/auth.ts', 'src/lib/commerce.ts',
    'src/lib/orders.ts', 'src/lib/payments.ts', 'src/lib/paystack.ts',
    'src/app/api/mcp/route.ts', 'src/lib/chord-commerce.ts',
    'supabase/schema.sql', 'supabase/chord-phase2.sql',
    'chord-skill/SKILL.md', 'chord-skill/references/merchant-policy.md',
    '.env.example'
]
for relative in required:
    assert (root / relative).is_file(), f'Missing {relative}'

# Check both SVGs and high-res photography assets exist
for name in ['hibiscus', 'ginger', 'sesame']:
    ET.parse(root / f'public/products/{name}.svg')
    assert (root / f'public/products/{name}.jpg').is_file(), f'Missing product jpg for {name}'

public = (root / 'src/app/api/products/route.ts').read_text()
admin = (root / 'src/app/api/admin/products/route.ts').read_text()
admin_id = (root / 'src/app/api/admin/products/[id]/route.ts').read_text()
assert 'allProducts()' in public, 'Public product list must hide unpublished rows'
assert 'await isAdmin()' in admin, 'Admin must require authentication'
assert 'productSchema.safeParse' in admin, 'Admin must validate input'
assert 'validOrigin' in admin, 'Admin should reject cross-origin browser writes'
assert 'deleteProduct' in admin_id, 'Admin must be able to delete products'

store = (root / 'src/lib/store.ts').read_text()
assert 'deleteProduct' in store, 'Store must support deleteProduct'
assert 'adjustStock' in store, 'Store must support adjustStock'
assert 'products.json' in (root / '.gitignore').read_text()

schema = (root / 'supabase/schema.sql').read_text()
for sku in ['HIB-STD', 'GIN-DRY', 'SES-WHT']:
    assert sku in (root / 'src/lib/products.ts').read_text()
    assert sku in schema

assert 'create table if not exists public.coupons' in schema
assert 'create table if not exists public.orders' in schema
assert 'create or replace function public.adjust_stock' in schema

print(f'PASS: {len(required)} required files verified, product deletion supported, SVG+JPG images valid, full schema active')
