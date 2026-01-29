import { useLocation, Link } from "wouter";
import { 
  MessageSquare, 
  FolderKanban, 
  Settings, 
  LogOut,
  Plus,
  Code2,
  Sparkles,
  LayoutGrid
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const mainNavItems = [
  {
    title: "Chat IA",
    url: "/",
    icon: MessageSquare,
    description: "Converse com a IA",
  },
  {
    title: "IDE",
    url: "/ide",
    icon: LayoutGrid,
    description: "Editor de código completo",
  },
  {
    title: "Meus Projetos",
    url: "/projetos",
    icon: FolderKanban,
    description: "Projetos salvos",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const getDisplayName = () => {
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "Usuário";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Code2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg tracking-tight">BRATVACODER</span>
            <span className="text-xs text-muted-foreground">Gerador de Código IA</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="px-2">
            <Link href="/">
              <Button 
                className="w-full justify-start gap-2" 
                data-testid="button-new-chat"
              >
                <Plus className="h-4 w-4" />
                Nova Conversa
              </Button>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-4">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.description}
                    data-testid={`nav-${item.url.replace("/", "") || "chat"}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-4">
            Templates Rápidos
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Crie rapidamente com IA">
                  <Link href="/templates">
                    <Sparkles className="h-4 w-4" />
                    <span>Ver Templates</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-4" />
        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-9 w-9">
            <AvatarImage 
              src={user?.profileImageUrl ?? undefined} 
              alt={getDisplayName()}
              className="object-cover"
            />
            <AvatarFallback className="text-sm font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getDisplayName()}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            asChild
            data-testid="button-logout"
          >
            <a href="/api/logout">
              <LogOut className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
