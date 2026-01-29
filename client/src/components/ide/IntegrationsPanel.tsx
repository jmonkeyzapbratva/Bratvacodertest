import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plug, Plus, CheckCircle2, Webhook, MessageCircle, Copy, Trash2, RefreshCw, QrCode, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SiWhatsapp } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WebhookData {
  webhookId: string;
  path: string;
  url: string;
  enabled: boolean;
  createdAt: string;
}

interface WhatsAppSession {
  status: "disconnected" | "qr_pending" | "connected";
  qrCode?: string;
  phoneNumber?: string;
}

interface IntegrationsPanelProps {
  projectId?: number;
}

export function IntegrationsPanel({ projectId }: IntegrationsPanelProps) {
  const [webhookPath, setWebhookPath] = useState("/webhook");
  const { toast } = useToast();

  const { data: webhooks = [], isLoading: isLoadingWebhooks } = useQuery<WebhookData[]>({
    queryKey: ["/api/managed-projects", projectId, "webhooks"],
    queryFn: async () => {
      if (!projectId) return [];
      const res = await fetch(`/api/managed-projects/${projectId}/webhooks`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: whatsappSession, isLoading: isLoadingWhatsApp } = useQuery<WhatsAppSession>({
    queryKey: ["/api/managed-projects", projectId, "whatsapp/session"],
    queryFn: async () => {
      if (!projectId) return { status: "disconnected" as const };
      const res = await fetch(`/api/managed-projects/${projectId}/whatsapp/session`);
      if (!res.ok) return { status: "disconnected" as const };
      return res.json();
    },
    enabled: !!projectId,
    refetchInterval: (query) => query.state.data?.status === "qr_pending" ? 5000 : false,
  });

  const createWebhookMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/managed-projects/${projectId}/webhooks`, { path: webhookPath });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managed-projects", projectId, "webhooks"] });
      toast({ title: "Webhook criado", description: "O webhook foi criado com sucesso" });
      setWebhookPath("/webhook");
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao criar webhook", variant: "destructive" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      return apiRequest("DELETE", `/api/managed-projects/${projectId}/webhooks/${webhookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managed-projects", projectId, "webhooks"] });
      toast({ title: "Webhook removido" });
    },
  });

  const connectWhatsAppMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/managed-projects/${projectId}/whatsapp/connect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managed-projects", projectId, "whatsapp/session"] });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao conectar WhatsApp", variant: "destructive" });
    },
  });

  const disconnectWhatsAppMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/managed-projects/${projectId}/whatsapp/disconnect`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/managed-projects", projectId, "whatsapp/session"] });
      toast({ title: "WhatsApp desconectado" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "URL copiada para a area de transferencia" });
  };

  if (!projectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-sidebar">
        <Plug className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Selecione um projeto para gerenciar integracoes</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Integracoes</span>
        </div>
      </div>
      
      <Tabs defaultValue="webhooks" className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2">
          <TabsTrigger value="webhooks" className="text-xs" data-testid="tab-webhooks">
            <Webhook className="h-3 w-3 mr-1" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="text-xs" data-testid="tab-whatsapp">
            <SiWhatsapp className="h-3 w-3 mr-1" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="flex-1 overflow-auto p-3 space-y-3 m-0">
          <div className="text-xs text-muted-foreground mb-2">
            Crie endpoints publicos para receber dados externos
          </div>

          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={webhookPath}
                  onChange={(e) => setWebhookPath(e.target.value)}
                  placeholder="/webhook"
                  className="h-8 text-xs"
                  data-testid="input-webhook-path"
                />
                <Button
                  size="sm"
                  onClick={() => createWebhookMutation.mutate()}
                  disabled={createWebhookMutation.isPending}
                  data-testid="button-create-webhook"
                >
                  {createWebhookMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoadingWebhooks ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              Nenhum webhook criado ainda
            </div>
          ) : (
            webhooks.map((webhook) => (
              <Card key={webhook.webhookId}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          ALL
                        </Badge>
                        <span className="text-xs font-mono truncate">{webhook.path}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1 py-0.5 rounded truncate block max-w-[200px]">
                          {webhook.url}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => copyToClipboard(webhook.url)}
                          data-testid={`copy-webhook-${webhook.webhookId}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => deleteWebhookMutation.mutate(webhook.webhookId)}
                      data-testid={`delete-webhook-${webhook.webhookId}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="whatsapp" className="flex-1 overflow-auto p-3 space-y-3 m-0">
          <div className="text-xs text-muted-foreground mb-2">
            Conecte seu WhatsApp para testar bots e automacoes
          </div>

          <Card>
            <CardContent className="p-4">
              {isLoadingWhatsApp ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : whatsappSession?.status === "connected" ? (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Conectado</span>
                  </div>
                  {whatsappSession.phoneNumber && (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{whatsappSession.phoneNumber}</span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => disconnectWhatsAppMutation.mutate()}
                    disabled={disconnectWhatsAppMutation.isPending}
                    data-testid="button-disconnect-whatsapp"
                  >
                    Desconectar
                  </Button>
                </div>
              ) : whatsappSession?.status === "qr_pending" ? (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-amber-600">
                    <QrCode className="h-5 w-5" />
                    <span className="font-medium">Escaneie o QR Code</span>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-show-qr">
                        Ver QR Code
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>QR Code do WhatsApp</DialogTitle>
                      </DialogHeader>
                      <div className="flex flex-col items-center gap-4 p-4">
                        {whatsappSession.qrCode && (
                          <img 
                            src={whatsappSession.qrCode} 
                            alt="WhatsApp QR Code" 
                            className="w-64 h-64 border rounded-lg"
                          />
                        )}
                        <p className="text-sm text-muted-foreground text-center">
                          Abra o WhatsApp no seu celular, va em Configuracoes &gt; Dispositivos conectados &gt; Conectar dispositivo
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => queryClient.invalidateQueries({ 
                            queryKey: ["/api/managed-projects", projectId, "whatsapp/session"] 
                          })}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Atualizar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <p className="text-xs text-muted-foreground">
                    Aguardando escaneamento...
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <SiWhatsapp className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">WhatsApp nao conectado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Conecte para testar seu bot WhatsApp
                    </p>
                  </div>
                  <Button
                    onClick={() => connectWhatsAppMutation.mutate()}
                    disabled={connectWhatsAppMutation.isPending}
                    data-testid="button-connect-whatsapp"
                  >
                    {connectWhatsAppMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4 mr-2" />
                    )}
                    Conectar WhatsApp
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
