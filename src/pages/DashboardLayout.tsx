import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { getCurrentBusiness } from "@/lib/store";
import { Business } from "@/lib/types";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const biz = getCurrentBusiness();
    if (!biz) {
      navigate("/register");
      return;
    }
    setBusiness(biz);
  }, [navigate, location]);

  if (!business) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar business={business} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 bg-card">
            <SidebarTrigger className="mr-3" />
            <h2 className="font-semibold text-foreground">{business.name}</h2>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet context={{ business }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
