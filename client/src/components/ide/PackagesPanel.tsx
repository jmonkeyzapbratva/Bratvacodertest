import { useState, useEffect } from "react";
import { Package, Plus, Trash2, RefreshCw, Search, ExternalLink, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PackageInfo {
  name: string;
  version: string;
  type: "dependency" | "devDependency";
}

interface PackagesPanelProps {
  projectId?: number;
  files?: { path: string; content: string }[];
  onInstallPackage?: (name: string) => void;
  onRemovePackage?: (name: string) => void;
}

function parsePackageJson(files: { path: string; content: string }[]): PackageInfo[] {
  const packageJson = files.find(f => f.path === "package.json");
  if (!packageJson) return [];
  
  try {
    const pkg = JSON.parse(packageJson.content);
    const deps: PackageInfo[] = [];
    
    if (pkg.dependencies) {
      Object.entries(pkg.dependencies).forEach(([name, version]) => {
        deps.push({ name, version: version as string, type: "dependency" });
      });
    }
    
    if (pkg.devDependencies) {
      Object.entries(pkg.devDependencies).forEach(([name, version]) => {
        deps.push({ name, version: version as string, type: "devDependency" });
      });
    }
    
    return deps.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

function parseRequirementsTxt(files: { path: string; content: string }[]): PackageInfo[] {
  const reqFile = files.find(f => f.path === "requirements.txt");
  if (!reqFile) return [];
  
  const lines = reqFile.content.split("\n").filter(l => l.trim() && !l.startsWith("#"));
  return lines.map(line => {
    const match = line.match(/^([a-zA-Z0-9_-]+)(?:([=<>!~]+)(.+))?/);
    if (match) {
      return {
        name: match[1],
        version: match[3] || "latest",
        type: "dependency" as const,
      };
    }
    return { name: line.trim(), version: "latest", type: "dependency" as const };
  });
}

export function PackagesPanel({ projectId, files = [], onInstallPackage, onRemovePackage }: PackagesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [newPackage, setNewPackage] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [missingPackages, setMissingPackages] = useState<string[]>([]);
  const [isAutoInstalling, setIsAutoInstalling] = useState(false);
  const [installedPackages, setInstalledPackages] = useState<PackageInfo[]>([]);
  const { toast } = useToast();
  
  const npmPackages = files.length > 0 ? parsePackageJson(files) : installedPackages.filter(p => p.type === "dependency" || p.type === "devDependency");
  const pipPackages = parseRequirementsTxt(files);
  
  const hasNpm = files.some(f => f.path === "package.json") || installedPackages.length > 0;
  const hasPip = files.some(f => f.path === "requirements.txt");
  
  const filteredNpm = npmPackages.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredPip = pipPackages.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchPackages = async () => {
    if (!projectId) return;
    
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/packages`, {
        credentials: "include"
      });
      
      if (response.ok) {
        const data = await response.json();
        setInstalledPackages(data.packages || []);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
    setIsRefreshing(false);
  };

  const fetchMissingPackages = async () => {
    if (!projectId) return;
    
    try {
      const response = await fetch(`/api/projects/${projectId}/packages/missing`, {
        credentials: "include"
      });
      
      if (response.ok) {
        const data = await response.json();
        setMissingPackages(data.missing || []);
      }
    } catch (error) {
      console.error("Error detecting missing packages:", error);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchPackages();
      fetchMissingPackages();
    }
  }, [projectId]);
  
  const handleInstall = async () => {
    if (!newPackage.trim()) return;
    
    setIsInstalling(true);
    
    try {
      if (projectId) {
        const response = await apiRequest("POST", `/api/projects/${projectId}/packages/install`, {
          packages: [newPackage.trim()],
          isDev: false
        });
        
        if (response.success) {
          toast({
            title: "Pacote instalado",
            description: `${newPackage} foi adicionado ao projeto.`,
          });
          setNewPackage("");
          await fetchPackages();
          await fetchMissingPackages();
        }
      } else {
        if (onInstallPackage) {
          onInstallPackage(newPackage);
        }
        toast({
          title: "Pacote instalado",
          description: `${newPackage} foi adicionado ao projeto.`,
        });
        setNewPackage("");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao instalar",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setIsInstalling(false);
  };

  const handleAutoInstall = async () => {
    if (!projectId || missingPackages.length === 0) return;
    
    setIsAutoInstalling(true);
    try {
      const response = await apiRequest("POST", `/api/projects/${projectId}/packages/auto-install`);
      
      if (response.success) {
        toast({
          title: "Pacotes instalados",
          description: `${response.installed?.length || 0} pacotes instalados automaticamente.`,
        });
        await fetchPackages();
        await fetchMissingPackages();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao auto-instalar",
        description: error.message,
        variant: "destructive"
      });
    }
    setIsAutoInstalling(false);
  };
  
  const handleRemove = async (name: string) => {
    if (projectId) {
      try {
        const response = await apiRequest("DELETE", `/api/projects/${projectId}/packages/${encodeURIComponent(name)}`);
        
        if (response.success) {
          toast({
            title: "Pacote removido",
            description: `${name} foi removido do projeto.`,
          });
          await fetchPackages();
        }
      } catch (error: any) {
        toast({
          title: "Erro ao remover",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      if (onRemovePackage) {
        onRemovePackage(name);
      }
      toast({
        title: "Pacote removido",
        description: `${name} foi removido do projeto.`,
      });
    }
  };
  
  const handleOpenNpm = (name: string) => {
    window.open(`https://www.npmjs.com/package/${name}`, "_blank");
  };
  
  const handleOpenPypi = (name: string) => {
    window.open(`https://pypi.org/project/${name}`, "_blank");
  };
  
  const renderPackageList = (packages: PackageInfo[], type: "npm" | "pip") => {
    if (packages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm">
          <Package className="h-8 w-8 mb-2 opacity-50" />
          <span>Nenhum pacote encontrado</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-1">
        {packages.map((pkg) => (
          <div
            key={pkg.name}
            className="flex items-center justify-between p-2 rounded-md hover-elevate group"
            data-testid={`package-${pkg.name}`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">{pkg.name}</span>
              <Badge variant="outline" className="text-xs shrink-0">
                {pkg.version}
              </Badge>
              {pkg.type === "devDependency" && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  dev
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => type === "npm" ? handleOpenNpm(pkg.name) : handleOpenPypi(pkg.name)}
                data-testid={`package-open-${pkg.name}`}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => handleRemove(pkg.name)}
                data-testid={`package-remove-${pkg.name}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Packages</h3>
          <Button 
            size="icon" 
            variant="ghost" 
            onClick={() => { fetchPackages(); fetchMissingPackages(); }}
            disabled={isRefreshing}
            data-testid="button-refresh-packages"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {missingPackages.length > 0 && (
          <div className="mb-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-xs mb-2">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{missingPackages.length} pacote(s) faltando</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {missingPackages.slice(0, 5).map(pkg => (
                <Badge key={pkg} variant="outline" className="text-xs">
                  {pkg}
                </Badge>
              ))}
              {missingPackages.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{missingPackages.length - 5}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full gap-1 text-xs"
              onClick={handleAutoInstall}
              disabled={isAutoInstalling}
              data-testid="button-auto-install"
            >
              {isAutoInstalling ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
              Instalar automaticamente
            </Button>
          </div>
        )}
        
        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar pacotes..."
            className="h-8 pl-7 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-packages"
          />
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Nome do pacote..."
            className="h-8 text-sm flex-1"
            value={newPackage}
            onChange={(e) => setNewPackage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInstall()}
            data-testid="input-new-package"
          />
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={!newPackage.trim() || isInstalling}
            className="gap-1"
            data-testid="button-install-package"
          >
            {isInstalling ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Instalar
          </Button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <Tabs defaultValue="npm" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b h-9 bg-transparent p-0">
            <TabsTrigger 
              value="npm" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              data-testid="tab-npm"
            >
              npm ({npmPackages.length})
            </TabsTrigger>
            <TabsTrigger 
              value="pip"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              data-testid="tab-pip"
            >
              pip ({pipPackages.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="npm" className="p-3 m-0">
            {hasNpm ? (
              renderPackageList(filteredNpm, "npm")
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm text-center p-4">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <span>Nenhum package.json encontrado</span>
                <span className="text-xs mt-1">Gere um projeto Node.js para ver os pacotes</span>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="pip" className="p-3 m-0">
            {hasPip ? (
              renderPackageList(filteredPip, "pip")
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm text-center p-4">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <span>Nenhum requirements.txt encontrado</span>
                <span className="text-xs mt-1">Gere um projeto Python para ver os pacotes</span>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
}
