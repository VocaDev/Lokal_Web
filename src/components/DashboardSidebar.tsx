import { LayoutDashboard, Calendar, Scissors, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Business } from "@/lib/types";
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
  { title: "Profile", url: "/dashboard/profile", icon: User },
];

export function DashboardSidebar({ business }: { business: Business }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
                      to={item.url}
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

        {!collapsed && (
          <div className="mt-auto p-4 border-t">
            <p className="text-xs text-muted-foreground">
              Public site:
              <a href={`/biz/${business.subdomain}`} className="text-primary ml-1 underline" target="_blank">
                /{business.subdomain}
              </a>
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
