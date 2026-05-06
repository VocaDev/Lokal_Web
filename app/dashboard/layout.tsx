'use client'

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentBusiness } from "@/lib/store";
import { Business } from "@/lib/types";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import InstallAppButton from "@/components/InstallAppButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    getCurrentBusiness().then(biz => {
      setBusiness(biz);
    }).catch(err => {
      console.error(err);
      // No automatic redirect to avoid loops
    });
  }, [router, pathname]);

  if (!business) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar business={business} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between gap-3 border-b px-4 bg-card">
            <div className="flex items-center min-w-0">
              <SidebarTrigger className="mr-3 shrink-0" />
              <h2 className="font-semibold text-foreground truncate">{business.name}</h2>
            </div>
            <div className="hidden sm:block shrink-0">
              <InstallAppButton />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
