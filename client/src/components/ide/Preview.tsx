import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, ExternalLink, Smartphone, Monitor, Tablet, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PreviewProps {
  html?: string;
  url?: string;
  isLoading?: boolean;
}

type DeviceMode = "desktop" | "tablet" | "mobile";

interface ConsoleMessage {
  id: number;
  type: "log" | "warn" | "error" | "info";
  message: string;
  timestamp: Date;
}

interface NetworkRequest {
  id: number;
  method: string;
  url: string;
  status: number | null;
  type: string;
  size: string;
  time: string;
  timestamp: Date;
  requestId?: string;
}

export function Preview({ html, url, isLoading }: PreviewProps) {
  const [key, setKey] = useState(0);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([]);
  const [networkRequests, setNetworkRequests] = useState<NetworkRequest[]>([]);
  const [devToolsTab, setDevToolsTab] = useState<"console" | "network">("console");
  const [devToolsCollapsed, setDevToolsCollapsed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messageIdRef = useRef(0);
  const networkIdRef = useRef(0);
  
  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };
  
  const clearConsole = () => {
    setConsoleLogs([]);
  };

  const clearNetwork = () => {
    setNetworkRequests([]);
  };
  
  const deviceWidths: Record<DeviceMode, string> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  // Script to inject into iframe to capture console logs
  const consoleInterceptScript = `
    <script>
      (function() {
        const originalConsole = {
          log: console.log,
          warn: console.warn,
          error: console.error,
          info: console.info
        };
        
        function sendToParent(type, args) {
          try {
            const message = Array.from(args).map(arg => {
              if (typeof arg === 'object') {
                try {
                  return JSON.stringify(arg, null, 2);
                } catch (e) {
                  return String(arg);
                }
              }
              return String(arg);
            }).join(' ');
            
            window.parent.postMessage({
              type: 'console',
              logType: type,
              message: message
            }, '*');
          } catch (e) {
            // Silent fail
          }
        }
        
        console.log = function() {
          sendToParent('log', arguments);
          originalConsole.log.apply(console, arguments);
        };
        
        console.warn = function() {
          sendToParent('warn', arguments);
          originalConsole.warn.apply(console, arguments);
        };
        
        console.error = function() {
          sendToParent('error', arguments);
          originalConsole.error.apply(console, arguments);
        };
        
        console.info = function() {
          sendToParent('info', arguments);
          originalConsole.info.apply(console, arguments);
        };
        
        // Capture uncaught errors
        window.onerror = function(message, source, lineno, colno, error) {
          sendToParent('error', [message + ' at ' + source + ':' + lineno + ':' + colno]);
          return false;
        };
        
        // Capture unhandled promise rejections
        window.onunhandledrejection = function(event) {
          sendToParent('error', ['Unhandled Promise Rejection: ' + event.reason]);
        };
        
        // Intercept fetch for network tab
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
          const startTime = performance.now();
          const method = init?.method || 'GET';
          const url = typeof input === 'string' ? input : input.url;
          const requestId = Math.random().toString(36).substr(2, 9);
          
          window.parent.postMessage({
            type: 'network-start',
            method: method,
            url: url,
            requestId: requestId
          }, '*');
          
          return originalFetch.apply(this, arguments)
            .then(response => {
              const endTime = performance.now();
              const time = Math.round(endTime - startTime);
              
              // Try to get size from Content-Length header first
              let size = 0;
              const contentLength = response.headers.get('content-length');
              if (contentLength) {
                size = parseInt(contentLength, 10);
                window.parent.postMessage({
                  type: 'network-end',
                  method: method,
                  url: url,
                  requestId: requestId,
                  status: response.status,
                  size: size,
                  time: time
                }, '*');
              } else {
                // Try to read body, but handle failures gracefully
                response.clone().text()
                  .then(text => {
                    window.parent.postMessage({
                      type: 'network-end',
                      method: method,
                      url: url,
                      requestId: requestId,
                      status: response.status,
                      size: text.length,
                      time: time
                    }, '*');
                  })
                  .catch(() => {
                    // Body read failed (opaque response, binary, etc.)
                    window.parent.postMessage({
                      type: 'network-end',
                      method: method,
                      url: url,
                      requestId: requestId,
                      status: response.status,
                      size: -1,
                      time: time
                    }, '*');
                  });
              }
              return response;
            })
            .catch(error => {
              const endTime = performance.now();
              window.parent.postMessage({
                type: 'network-error',
                method: method,
                url: url,
                requestId: requestId,
                time: Math.round(endTime - startTime),
                error: error.message
              }, '*');
              throw error;
            });
        };
        
        // Intercept XMLHttpRequest
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
          const xhr = new originalXHR();
          const startTime = { value: 0 };
          let method = 'GET';
          let url = '';
          let requestId = '';
          
          const originalOpen = xhr.open;
          xhr.open = function(m, u) {
            method = m;
            url = u;
            requestId = Math.random().toString(36).substr(2, 9);
            return originalOpen.apply(this, arguments);
          };
          
          const originalSend = xhr.send;
          xhr.send = function() {
            startTime.value = performance.now();
            window.parent.postMessage({
              type: 'network-start',
              method: method,
              url: url,
              requestId: requestId
            }, '*');
            
            xhr.addEventListener('load', function() {
              const endTime = performance.now();
              let size = 0;
              try {
                size = xhr.responseText?.length || 0;
              } catch (e) {
                size = -1;
              }
              window.parent.postMessage({
                type: 'network-end',
                method: method,
                url: url,
                requestId: requestId,
                status: xhr.status,
                size: size,
                time: Math.round(endTime - startTime.value)
              }, '*');
            });
            
            xhr.addEventListener('error', function() {
              const endTime = performance.now();
              window.parent.postMessage({
                type: 'network-error',
                method: method,
                url: url,
                requestId: requestId,
                time: Math.round(endTime - startTime.value),
                error: 'Request failed'
              }, '*');
            });
            
            xhr.addEventListener('timeout', function() {
              const endTime = performance.now();
              window.parent.postMessage({
                type: 'network-error',
                method: method,
                url: url,
                requestId: requestId,
                time: Math.round(endTime - startTime.value),
                error: 'Request timeout'
              }, '*');
            });
            
            return originalSend.apply(this, arguments);
          };
          
          return xhr;
        };
      })();
    </script>
  `;
  
  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console') {
        setConsoleLogs(prev => [...prev, {
          id: messageIdRef.current++,
          type: event.data.logType as "log" | "warn" | "error" | "info",
          message: event.data.message,
          timestamp: new Date()
        }]);
      } else if (event.data?.type === 'network-start') {
        setNetworkRequests(prev => [...prev, {
          id: networkIdRef.current++,
          method: event.data.method,
          url: event.data.url,
          status: null,
          type: 'fetch',
          size: '-',
          time: 'pending',
          timestamp: new Date(),
          requestId: event.data.requestId
        }]);
      } else if (event.data?.type === 'network-end') {
        setNetworkRequests(prev => prev.map(req => {
          if (req.requestId === event.data.requestId) {
            return {
              ...req,
              status: event.data.status,
              size: event.data.size === -1 ? '?' : formatBytes(event.data.size),
              time: event.data.time + 'ms'
            };
          }
          return req;
        }));
      } else if (event.data?.type === 'network-error') {
        setNetworkRequests(prev => prev.map(req => {
          if (req.requestId === event.data.requestId) {
            return {
              ...req,
              status: 0,
              size: '-',
              time: event.data.time ? event.data.time + 'ms' : 'error'
            };
          }
          return req;
        }));
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Clear logs when preview refreshes
  useEffect(() => {
    setConsoleLogs([]);
    setNetworkRequests([]);
  }, [key]);
  
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const getLogColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'info': return 'text-blue-500';
      default: return 'text-foreground';
    }
  };

  const getStatusColor = (status: number | null) => {
    if (status === null) return 'text-muted-foreground';
    if (status >= 200 && status < 300) return 'text-green-500';
    if (status >= 300 && status < 400) return 'text-yellow-500';
    if (status >= 400) return 'text-red-500';
    return 'text-muted-foreground';
  };
  
  const hasContent = html || url;

  // Inject console interceptor into HTML
  const getEnhancedHtml = useCallback(() => {
    if (!html) return '';
    // Insert script right after <head> or at the beginning
    if (html.includes('<head>')) {
      return html.replace('<head>', '<head>' + consoleInterceptScript);
    } else if (html.includes('<html>')) {
      return html.replace('<html>', '<html><head>' + consoleInterceptScript + '</head>');
    } else {
      return consoleInterceptScript + html;
    }
  }, [html, consoleInterceptScript]);
  
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b">
        <span className="text-xs font-medium text-muted-foreground">Preview</span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeviceMode("mobile")}
            className={cn("h-6 w-6", deviceMode === "mobile" && "bg-accent")}
            data-testid="button-preview-mobile"
          >
            <Smartphone className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeviceMode("tablet")}
            className={cn("h-6 w-6", deviceMode === "tablet" && "bg-accent")}
            data-testid="button-preview-tablet"
          >
            <Tablet className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setDeviceMode("desktop")}
            className={cn("h-6 w-6", deviceMode === "desktop" && "bg-accent")}
            data-testid="button-preview-desktop"
          >
            <Monitor className="h-3 w-3" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            className="h-6 w-6"
            data-testid="button-preview-refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          {url && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => window.open(url, "_blank")}
              className="h-6 w-6"
              data-testid="button-preview-external"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={cn(
          "flex items-start justify-center p-4 bg-muted/30 overflow-auto",
          devToolsCollapsed ? "flex-1" : "flex-[2]"
        )}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Carregando preview...</span>
              </div>
            </div>
          ) : hasContent ? (
            <div 
              className="bg-white rounded-md shadow-lg overflow-hidden transition-all duration-300"
              style={{ 
                width: deviceWidths[deviceMode],
                maxWidth: "100%",
                height: deviceMode === "desktop" ? "100%" : "auto",
                minHeight: deviceMode === "mobile" ? "667px" : deviceMode === "tablet" ? "500px" : "auto",
              }}
            >
              {url ? (
                <iframe
                  ref={iframeRef}
                  key={key}
                  src={url}
                  title="Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
              ) : html ? (
                <iframe
                  ref={iframeRef}
                  key={key}
                  srcDoc={getEnhancedHtml()}
                  title="Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                  style={{ minHeight: "400px" }}
                />
              ) : null}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div className="text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum preview disponivel</p>
                <p className="text-sm mt-1">
                  Clique em "Run" para executar o projeto
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Developer Tools Panel */}
        <div className={cn(
          "border-t bg-background flex flex-col shrink-0",
          devToolsCollapsed ? "h-8" : "flex-1 min-h-[150px]"
        )}>
          {/* DevTools Header */}
          <div className="h-8 flex items-center justify-between px-2 border-b bg-muted/30">
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDevToolsCollapsed(!devToolsCollapsed)}
                className="h-5 w-5"
                data-testid="button-devtools-toggle"
              >
                {devToolsCollapsed ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
              {!devToolsCollapsed && (
                <Tabs value={devToolsTab} onValueChange={(v) => setDevToolsTab(v as "console" | "network")}>
                  <TabsList className="h-6 p-0.5 bg-transparent">
                    <TabsTrigger 
                      value="console" 
                      className="text-[11px] px-2 py-0.5 h-5 data-[state=active]:bg-background"
                      data-testid="devtools-tab-console"
                    >
                      Console
                      {consoleLogs.length > 0 && (
                        <span className="ml-1 text-[10px] text-muted-foreground">({consoleLogs.length})</span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="network" 
                      className="text-[11px] px-2 py-0.5 h-5 data-[state=active]:bg-background"
                      data-testid="devtools-tab-network"
                    >
                      Network
                      {networkRequests.length > 0 && (
                        <span className="ml-1 text-[10px] text-muted-foreground">({networkRequests.length})</span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
            {!devToolsCollapsed && (
              <Button
                size="icon"
                variant="ghost"
                onClick={devToolsTab === 'console' ? clearConsole : clearNetwork}
                className="h-5 w-5"
                data-testid="button-devtools-clear"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* DevTools Content */}
          {!devToolsCollapsed && (
            <div className="flex-1 overflow-auto">
              {devToolsTab === 'console' ? (
                <div className="font-mono text-xs p-2 space-y-0.5" data-testid="devtools-console-output">
                  {url && consoleLogs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-4">
                      DevTools nao disponivel para URLs externas
                    </div>
                  ) : consoleLogs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-4">
                      Console vazio
                    </div>
                  ) : (
                    consoleLogs.map(log => (
                      <div 
                        key={log.id} 
                        className={cn(
                          "flex items-start gap-2 py-0.5 px-1 rounded hover:bg-muted/50",
                          getLogColor(log.type)
                        )}
                      >
                        <span className="text-muted-foreground shrink-0 w-16">
                          {log.timestamp.toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit' 
                          })}
                        </span>
                        <span className="break-all whitespace-pre-wrap">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-xs" data-testid="devtools-network-output">
                  {url && networkRequests.length === 0 ? (
                    <div className="text-muted-foreground text-center py-4">
                      DevTools nao disponivel para URLs externas
                    </div>
                  ) : networkRequests.length === 0 ? (
                    <div className="text-muted-foreground text-center py-4">
                      Nenhuma requisicao
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr className="text-left text-muted-foreground">
                          <th className="px-2 py-1 font-medium">Metodo</th>
                          <th className="px-2 py-1 font-medium">URL</th>
                          <th className="px-2 py-1 font-medium">Status</th>
                          <th className="px-2 py-1 font-medium">Tamanho</th>
                          <th className="px-2 py-1 font-medium">Tempo</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {networkRequests.map(req => (
                          <tr 
                            key={req.id} 
                            className="border-b border-border/50 hover:bg-muted/30"
                          >
                            <td className="px-2 py-1">
                              <span className={cn(
                                "font-medium",
                                req.method === 'GET' ? 'text-green-500' :
                                req.method === 'POST' ? 'text-blue-500' :
                                req.method === 'PUT' ? 'text-yellow-500' :
                                req.method === 'DELETE' ? 'text-red-500' :
                                'text-foreground'
                              )}>
                                {req.method}
                              </span>
                            </td>
                            <td className="px-2 py-1 truncate max-w-[200px]" title={req.url}>
                              {req.url}
                            </td>
                            <td className={cn("px-2 py-1", getStatusColor(req.status))}>
                              {req.status === null ? 'pending' : req.status}
                            </td>
                            <td className="px-2 py-1 text-muted-foreground">{req.size}</td>
                            <td className="px-2 py-1 text-muted-foreground">{req.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
