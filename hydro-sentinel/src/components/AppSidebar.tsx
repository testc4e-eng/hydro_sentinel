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
  Siren,
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
  {
    title: "Alertes",
    url: "/alertes",
    icon: Siren,
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
            className="relative flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 transition-all hover:bg-white/10 hover:text-white"
            activeClassName="bg-white/12 font-semibold text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-[#22d3ee]"
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
          <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 transition-all hover:bg-white/10 hover:text-white">
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.title}</span>
            {open ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
            {item.children.map((child) => (
              <SidebarMenuButton key={child.url} asChild>
                <NavLink
                  to={child.url}
                  className="relative flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  activeClassName="bg-white/12 font-semibold text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-[#22d3ee]"
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
    <Sidebar className="border-r border-white/5 bg-gradient-to-b from-[#0b1220] via-[#0f1a2b] to-[#0b1220] shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]">
      <SidebarHeader className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-2">
          <Droplets className="h-7 w-7 text-[#2dd4bf] drop-shadow" />
          <div>
            <h1 className="text-base font-semibold text-white">Hydro-Meteo Sebou</h1>
            <p className="text-[10px] leading-tight text-white/60">Systeme d'aide a la decision</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-white/50">
            <span className="rounded-full bg-white/5 px-2 py-1">Donnees</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <CollapsibleNavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.2em] text-white/50">
            <span className="rounded-full bg-white/5 px-2 py-1">Administration</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="relative flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 transition-all hover:bg-white/10 hover:text-white"
                      activeClassName="bg-white/12 font-semibold text-white shadow-sm before:absolute before:left-0 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-[#22d3ee]"
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
