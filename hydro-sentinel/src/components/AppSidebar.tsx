import { useState } from "react";
import {
  CloudRain,
  Database as DbIcon,
  ChevronDown,
  ChevronRight,
  Droplets,
  Map,
  Plug,
  ScanSearch,
  Settings,
  Upload,
  Waves,
} from "lucide-react";

import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  children?: { title: string; url: string }[];
}

const navItems: NavItem[] = [
  { title: "Carte & Synthese", url: "/", icon: Map },
  { title: "Cartes thematiques", url: "/carte-synthese", icon: Map },
  {
    title: "Precipitations",
    url: "/precipitations",
    icon: CloudRain,
    children: [
      { title: "Par station", url: "/precipitations/station" },
      { title: "Par bassin", url: "/precipitations/bassin" },
    ],
  },
  {
    title: "Debits",
    url: "/debits",
    icon: Waves,
    children: [{ title: "Par station", url: "/debits/station" }],
  },
  {
    title: "Apports",
    url: "/apports",
    icon: DbIcon,
    children: [{ title: "Par barrage", url: "/apports/barrage" }],
  },
  {
    title: "Volume",
    url: "/volume",
    icon: DbIcon,
    children: [{ title: "Par barrage", url: "/volume/barrage" }],
  },
  {
    title: "Recapitulatif",
    url: "/recap-barrage",
    icon: DbIcon,
  },
];

const adminItems = [
  { title: "Import", url: "/import", icon: Upload },
  { title: "Gestion Donnees", url: "/data-management", icon: DbIcon },
  { title: "Scan de donnees", url: "/data-scan", icon: ScanSearch },
  { title: "Parametres", url: "/settings", icon: Settings },
  { title: "Environnement", url: "/environment", icon: Plug },
];

function CollapsibleNavItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(true);

  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
            activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent">
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.title}</span>
            {open ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
            {item.children.map((child) => (
              <SidebarMenuButton key={child.url} asChild>
                <NavLink
                  to={child.url}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                >
                  <span>{child.title}</span>
                </NavLink>
              </SidebarMenuButton>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Droplets className="h-7 w-7 text-sidebar-primary" />
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground">Hydro-Meteo Sebou</h1>
            <p className="text-[10px] leading-tight text-sidebar-foreground/60">Systeme d'aide a la decision</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Donnees</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <CollapsibleNavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent font-medium text-sidebar-accent-foreground"
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
