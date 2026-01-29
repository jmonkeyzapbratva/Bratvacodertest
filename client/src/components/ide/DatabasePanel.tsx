import { useState } from "react";
import { Database, Plus, Trash2, RefreshCw, Table2, Key, Wand2, Play, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";

interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
}

interface DatabaseConfig {
  type: string | null;
  name?: string;
  tables: TableSchema[];
}

interface DatabasePanelProps {
  projectId?: number;
}

const columnTypes = [
  { value: "serial", label: "Serial (Auto ID)" },
  { value: "integer", label: "Integer" },
  { value: "text", label: "Text" },
  { value: "varchar", label: "Varchar" },
  { value: "boolean", label: "Boolean" },
  { value: "timestamp", label: "Timestamp" },
  { value: "date", label: "Date" },
  { value: "real", label: "Real (Float)" },
  { value: "jsonb", label: "JSON" },
  { value: "uuid", label: "UUID" },
];

export function DatabasePanel({ projectId }: DatabasePanelProps) {
  const { toast } = useToast();
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newColumns, setNewColumns] = useState<ColumnSchema[]>([
    { name: "id", type: "serial", primaryKey: true },
  ]);
  const [autoSetupDescription, setAutoSetupDescription] = useState("");
  const [showAutoSetup, setShowAutoSetup] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM users LIMIT 10;");

  const { data: dbConfig, isLoading, refetch } = useQuery<DatabaseConfig>({
    queryKey: ["/api/projects", projectId, "database"],
    enabled: !!projectId,
  });

  const initDbMutation = useMutation({
    mutationFn: async (type: string) => {
      return apiRequest("POST", `/api/projects/${projectId}/database/init`, { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "database"] });
      toast({
        title: "Banco inicializado",
        description: "Banco de dados configurado com sucesso.",
      });
    },
  });

  const addTableMutation = useMutation({
    mutationFn: async (table: TableSchema) => {
      return apiRequest("POST", `/api/projects/${projectId}/database/tables`, table);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "database"] });
      setIsAddingTable(false);
      setNewTableName("");
      setNewColumns([{ name: "id", type: "serial", primaryKey: true }]);
      toast({
        title: "Tabela criada",
        description: "Tabela adicionada ao schema.",
      });
    },
  });

  const removeTableMutation = useMutation({
    mutationFn: async (tableName: string) => {
      return apiRequest("DELETE", `/api/projects/${projectId}/database/tables/${tableName}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "database"] });
      toast({
        title: "Tabela removida",
        description: "Tabela removida do schema.",
      });
    },
  });

  const autoSetupMutation = useMutation({
    mutationFn: async (description: string) => {
      return apiRequest("POST", `/api/projects/${projectId}/database/auto-setup`, { description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "database"] });
      setShowAutoSetup(false);
      setAutoSetupDescription("");
      toast({
        title: "Database configurado",
        description: "Tabelas criadas automaticamente a partir da descricao.",
      });
    },
  });

  const addColumn = () => {
    setNewColumns([...newColumns, { name: "", type: "text" }]);
  };

  const updateColumn = (index: number, updates: Partial<ColumnSchema>) => {
    const updated = [...newColumns];
    updated[index] = { ...updated[index], ...updates };
    setNewColumns(updated);
  };

  const removeColumn = (index: number) => {
    if (newColumns.length > 1) {
      setNewColumns(newColumns.filter((_, i) => i !== index));
    }
  };

  const handleAddTable = () => {
    if (newTableName.trim() && newColumns.length > 0) {
      const validColumns = newColumns.filter(c => c.name.trim());
      if (validColumns.length > 0) {
        addTableMutation.mutate({ name: newTableName.trim(), columns: validColumns });
      }
    }
  };

  if (!projectId) {
    return (
      <div className="h-full flex flex-col bg-sidebar items-center justify-center p-4">
        <Database className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Selecione um projeto para gerenciar o banco de dados.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="px-3 py-2 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Database</span>
          {dbConfig?.type && (
            <Badge variant="outline" className="text-xs">{dbConfig.type}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-db"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="tables" className="h-full flex flex-col">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 shrink-0">
            <TabsTrigger 
              value="tables" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-3 py-2 text-xs"
            >
              Tabelas
            </TabsTrigger>
            <TabsTrigger 
              value="query" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-3 py-2 text-xs"
            >
              Query
            </TabsTrigger>
            <TabsTrigger 
              value="setup" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-3 py-2 text-xs"
            >
              Setup
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tables" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                {!dbConfig?.type ? (
                  <div className="py-6 text-center">
                    <Database className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-xs text-muted-foreground mb-3">
                      Banco de dados nao configurado.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => initDbMutation.mutate("postgresql")}
                        disabled={initDbMutation.isPending}
                        data-testid="button-init-postgres"
                      >
                        PostgreSQL
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => initDbMutation.mutate("sqlite")}
                        disabled={initDbMutation.isPending}
                        data-testid="button-init-sqlite"
                      >
                        SQLite
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Tabelas ({dbConfig.tables?.length || 0})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingTable(true)}
                        data-testid="button-add-table"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Nova
                      </Button>
                    </div>

                    {isAddingTable && (
                      <Card>
                        <CardContent className="p-3 space-y-3">
                          <Input
                            value={newTableName}
                            onChange={(e) => setNewTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                            placeholder="nome_da_tabela"
                            className="text-sm font-mono"
                            data-testid="input-new-table-name"
                          />
                          
                          <div className="space-y-2">
                            <span className="text-xs text-muted-foreground">Colunas:</span>
                            {newColumns.map((col, index) => (
                              <div key={index} className="flex gap-2 items-center">
                                <Input
                                  value={col.name}
                                  onChange={(e) => updateColumn(index, { name: e.target.value })}
                                  placeholder="nome"
                                  className="text-xs font-mono flex-1"
                                />
                                <Select
                                  value={col.type}
                                  onValueChange={(value) => updateColumn(index, { type: value })}
                                >
                                  <SelectTrigger className="w-[120px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {columnTypes.map(t => (
                                      <SelectItem key={t.value} value={t.value} className="text-xs">
                                        {t.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {newColumns.length > 1 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeColumn(index)}
                                    className="shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={addColumn}
                              className="w-full"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Coluna
                            </Button>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleAddTable}
                              disabled={!newTableName.trim() || addTableMutation.isPending}
                            >
                              Criar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsAddingTable(false);
                                setNewTableName("");
                                setNewColumns([{ name: "id", type: "serial", primaryKey: true }]);
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {dbConfig.tables?.length === 0 && !isAddingTable ? (
                      <div className="py-6 text-center text-muted-foreground text-sm">
                        <Table2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        Nenhuma tabela criada.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dbConfig.tables?.map((table) => (
                          <Card key={table.name} className="overflow-hidden">
                            <CardHeader className="py-2 px-3 flex flex-row items-center justify-between gap-2">
                              <CardTitle className="text-sm font-mono flex items-center gap-2">
                                <Table2 className="h-3.5 w-3.5 text-primary" />
                                {table.name}
                              </CardTitle>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeTableMutation.mutate(table.name)}
                                disabled={removeTableMutation.isPending}
                                data-testid={`button-delete-table-${table.name}`}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                              <div className="divide-y border-t">
                                {table.columns.map((col) => (
                                  <div 
                                    key={col.name} 
                                    className="px-3 py-1.5 flex items-center justify-between text-xs"
                                  >
                                    <div className="flex items-center gap-2">
                                      {col.primaryKey && (
                                        <Key className="h-3 w-3 text-amber-500" />
                                      )}
                                      <span className="font-mono">{col.name}</span>
                                    </div>
                                    <Badge variant="secondary" className="text-xs font-mono">
                                      {col.type}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="query" className="flex-1 overflow-hidden mt-0">
            <div className="p-3 space-y-3 h-full flex flex-col">
              <div className="text-xs text-muted-foreground">
                Execute queries SQL diretamente no banco.
              </div>
              <Textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="flex-1 font-mono text-xs min-h-[100px] resize-none"
                placeholder="SELECT * FROM users LIMIT 10;"
                data-testid="input-sql-query"
              />
              <Button size="sm" className="w-full" data-testid="run-query">
                <Play className="h-4 w-4 mr-2" />
                Executar Query
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="setup" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wand2 className="h-4 w-4" />
                      Setup Automatico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Descreva seu projeto e as tabelas serao criadas automaticamente.
                    </p>
                    <Textarea
                      value={autoSetupDescription}
                      onChange={(e) => setAutoSetupDescription(e.target.value)}
                      placeholder="Ex: loja online com produtos, usuarios, pedidos e categorias"
                      className="text-sm min-h-[80px]"
                      data-testid="input-auto-setup-description"
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => autoSetupMutation.mutate(autoSetupDescription)}
                      disabled={!autoSetupDescription.trim() || autoSetupMutation.isPending}
                    >
                      {autoSetupMutation.isPending ? (
                        <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                      ) : (
                        <Wand2 className="h-3.5 w-3.5 mr-2" />
                      )}
                      Criar Tabelas Automaticamente
                    </Button>
                  </CardContent>
                </Card>
                
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Palavras-chave detectadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {["usuarios", "produtos", "pedidos", "posts", "comentarios", "categorias", "tarefas"].map(word => (
                      <Badge key={word} variant="outline" className="text-xs">{word}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
