import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { allProducts, inventoryMovements, storeMode } from "@/lib/store";
import { allCoupons, allOrders } from "@/lib/orders";
import { allSupportTickets } from "@/lib/support";
import { AdminDashboard } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const [products, coupons, orders, movements, tickets] = await Promise.all([
    allProducts(true),
    allCoupons(),
    allOrders(),
    inventoryMovements(150),
    allSupportTickets()
  ]);

  return (
    <AdminDashboard
      initialProducts={products}
      initialCoupons={coupons}
      initialOrders={orders}
      initialMovements={movements}
      initialTickets={tickets}
      storage={storeMode()}
    />
  );
}

