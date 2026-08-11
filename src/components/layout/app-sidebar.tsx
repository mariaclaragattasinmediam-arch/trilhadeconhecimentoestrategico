import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  Layers,
  FileStack,
  Route as RouteIcon,
  Users,
  PlaySquare,
} from "lucide-react";
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
import { useAuth } from "@/hooks/use-auth";

const alunoItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Cursos", url: "/cursos", icon: BookOpen },
  { title: "Minha Trilha", url: "/minha-trilha", icon: RouteIcon },
  { title: "Materiais", url: "/materiais", icon: FileStack },
  { title: "Perfil", url: "/perfil", icon: Users },
];

const adminItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Cursos", url: "/admin/cursos", icon: FolderKanban },
  { title: "Módulos", url: "/admin/modulos", icon: Layers },
  { title: "Aulas", url: "/admin/aulas", icon: PlaySquare },
  { title: "Acompanhamento", url: "/admin/acompanhamento", icon: LineChart },
  { title: "Arquivos", url: "/admin/arquivos", icon: FileStack },
  { title: "Usuários", url: "/admin/usuarios", icon: Users },
];

export function AppSidebar() {
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = isAdmin ? adminItems : alunoItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate font-display text-sm font-semibold text-sidebar-foreground">
              Trilha Ongoing
            </span>
            <span className="block truncate text-xs text-sidebar-foreground/60">
              {isAdmin ? "Administrador" : "Aluno"}
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{isAdmin ? "Gestão" : "Aprendizagem"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={pathname === item.url || pathname.startsWith(`${item.url}/`)}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Visão do aluno</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Cursos"
                    isActive={pathname.startsWith("/cursos")}
                  >
                    <Link to="/cursos">
                      <BookOpen className="h-4 w-4" />
                      <span>Cursos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Perfil" isActive={pathname === "/perfil"}>
                    <Link to="/perfil">
                      <Users className="h-4 w-4" />
                      <span>Perfil</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
    </Sidebar>
  );
}
