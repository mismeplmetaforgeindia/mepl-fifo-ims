import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isAdmin={isAdmin} email={user.email} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar isAdmin={isAdmin} />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
