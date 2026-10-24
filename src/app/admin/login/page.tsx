import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminLogin } from "@/components/admin-login";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <AdminLogin showDemoAccess={process.env.NODE_ENV !== "production" && !process.env.ADMIN_PASSWORD} />;
}
