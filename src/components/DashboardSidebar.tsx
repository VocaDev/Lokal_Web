import { LayoutDashboard, Calendar, Scissors, User, Clock, Image, LogOut, Loader2, ChevronDown, Building2, Check, UserPlus } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Business } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { clearCurrentBusiness, getUserBusinesses, setCurrentBusiness } from "@/lib/store";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const router = useRouter();
  const supabase = createClient();
  const subdomain = business?.subdomain || null;
  const [loggingOut, setLoggingOut] = useState(false);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    getUserBusinesses().then(setAllBusinesses);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    clearCurrentBusiness();
    router.push("/login");
    router.refresh();
  };

  const handleSwitch = (id: string) => {
    setCurrentBusiness(id);
    router.refresh();
    window.location.reload(); // Force reload to ensure all stores are updated
  };

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

        {/* Business Switcher */}
        <div className="px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="w-full justify-start gap-2 px-2 hover:bg-muted/50 border border-border/40">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <Building2 className="h-3 w-3" />
                </div>
                {!collapsed && (
                  <>
                    <div className="flex flex-col items-start text-left text-xs">
                      <span className="font-semibold truncate w-[140px]">{business.name}</span>
                      <span className="text-[10px] text-muted-foreground">{business.subdomain}.lokalweb.com</span>
                    </div>
                    <ChevronDown className="ml-auto h-3 w-3 text-muted-foreground" />
                  </>
                )}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Switch Business</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allBusinesses.map((b) => (
                <DropdownMenuItem 
                  key={b.id} 
                  onClick={() => handleSwitch(b.id)}
                  className={b.id === business.id ? "bg-accent" : ""}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{b.name}</span>
                    <span className="text-[10px] text-muted-foreground">{b.subdomain}</span>
                  </div>
                  {b.id === business.id && <Check className="ml-auto h-4 w-4" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/register")}>
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Register new business</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

        <div className="mt-auto p-4 border-t space-y-2">
          {!collapsed && subdomain && (
            <a
              href={`/${subdomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline font-medium px-2 py-1"
            >
              <Image className="h-4 w-4" /> View my website
            </a>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive font-medium px-2 py-1 transition-colors w-full"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
