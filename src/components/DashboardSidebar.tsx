import { LayoutDashboard, Calendar, Scissors, User, Clock, Image } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState, useEffect } from "react";
import { Business } from "@/lib/types";
import { getCurrentBusiness } from "@/lib/store";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Bookings", url: "/dashboard/bookings", icon: Calendar },
  { title: "Services", url: "/dashboard/services", icon: Scissors },
  { title: "Business Hours", url: "/dashboard/hours", icon: Clock },
  { title: "Gallery", url: "/dashboard/gallery", icon: Image },
  { title: "Profile", url: "/dashboard/profile", icon: User },
];

export function DashboardSidebar({ business }: { business: Business }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [subdomain, setSubdomain] = useState<string | null>(null);

  useEffect(() => {
    getCurrentBusiness().then(biz => {
      if (biz?.subdomain) setSubdomain(biz.subdomain);
    });
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-xs">LW</span>
            </div>
            {!collapsed && <span className="font-bold text-sm text-foreground truncate">LokalWeb</span>}
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      href={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && subdomain && (
          <div className="mt-auto p-4 border-t">
            <a
              href={`/${subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
            >
              View my website
            </a>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
