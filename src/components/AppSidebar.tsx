import { BarChart3, Waves, Building2, Upload, Settings, Droplets, Plug } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Tableau de bord", url: "/", icon: BarChart3 },
  { title: "Stations", url: "/stations", icon: Waves },
  { title: "Barrages", url: "/barrages", icon: Building2 },
  { title: "Import", url: "/import", icon: Upload },
  { title: "Paramètres", url: "/settings", icon: Settings },
  { title: "Environnement", url: "/environment", icon: Plug },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Droplets className="h-7 w-7 text-sidebar-primary" />
          <div>
            <h1 className="font-bold text-base text-sidebar-foreground">Hydro Dashboard</h1>
            <p className="text-[10px] text-sidebar-foreground/60 leading-tight">SIG Hydrologie & Barrages</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
