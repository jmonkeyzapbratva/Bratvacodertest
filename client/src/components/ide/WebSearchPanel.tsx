import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Globe, 
  ExternalLink, 
  Loader2,
  FileText,
  Clock,
  ArrowRight
} from "lucide-react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
}

interface WebSearchPanelProps {
  onInsertResult?: (result: SearchResult) => void;
}

export function WebSearchPanel({ onInsertResult }: WebSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest("POST", "/api/search", { query: searchQuery });
      return response.json();
    },
    onSuccess: (data: SearchResponse) => {
      setResults(data.results || []);
      setSearchTime(data.searchTime || 0);
    },
    onError: (error: any) => {
      toast({ title: "Erro na busca", description: error.message, variant: "destructive" });
    },
  });

  const handleSearch = () => {
    if (!query.trim()) return;
    searchMutation.mutate(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <Card className="border-0 shadow-none h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Busca Web
        </CardTitle>
        <CardDescription className="text-xs">
          Pesquise documentação, tutoriais e soluções
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar na web..."
            className="flex-1"
            data-testid="input-web-search"
          />
          <Button
            onClick={handleSearch}
            disabled={searchMutation.isPending || !query.trim()}
            data-testid="button-search"
          >
            {searchMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {searchTime !== null && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {results.length} resultados em {searchTime}ms
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {results.map((result, index) => (
              <div
                key={index}
                className="p-3 rounded-md border bg-card hover-elevate cursor-pointer"
                onClick={() => onInsertResult?.(result)}
                data-testid={`card-resultado-busca-${index}`}
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {result.title}
                      </a>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {result.snippet}
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-1.5">
                      {result.source}
                    </Badge>
                  </div>
                  {onInsertResult && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      title="Inserir no chat"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInsertResult(result);
                      }}
                      data-testid={`button-inserir-resultado-${index}`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {results.length === 0 && !searchMutation.isPending && query && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum resultado encontrado</p>
              </div>
            )}

            {results.length === 0 && !query && (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Digite algo para buscar</p>
                <p className="text-xs mt-1">
                  Documentação, tutoriais, Stack Overflow...
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
