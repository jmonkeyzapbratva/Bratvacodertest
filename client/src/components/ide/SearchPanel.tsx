import { useState, useMemo } from "react";
import { Search, File, ChevronDown, ChevronRight, Replace, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectFile } from "./FileExplorer";

interface SearchPanelProps {
  files: ProjectFile[];
  onSelectFile: (path: string) => void;
  onSelectMatch?: (path: string, lineNumber: number) => void;
  onReplaceInFile?: (path: string, searchTerm: string, replaceTerm: string, caseSensitive: boolean, wholeWord: boolean) => void;
  onReplaceAll?: (searchTerm: string, replaceTerm: string, caseSensitive: boolean, wholeWord: boolean) => void;
}

interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

interface FileSearchResult {
  file: ProjectFile;
  matches: SearchMatch[];
}

export function SearchPanel({ files, onSelectFile, onSelectMatch, onReplaceInFile, onReplaceAll }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showReplace, setShowReplace] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const searchResults = useMemo(() => {
    if (!query.trim() || query.length < 2) return [];

    const results: FileSearchResult[] = [];
    const searchTerm = caseSensitive ? query : query.toLowerCase();

    for (const file of files) {
      const lines = file.content.split("\n");
      const matches: SearchMatch[] = [];

      lines.forEach((line, index) => {
        const compareLine = caseSensitive ? line : line.toLowerCase();
        let searchIndex = 0;
        let pos = compareLine.indexOf(searchTerm, searchIndex);

        while (pos !== -1) {
          if (wholeWord) {
            const before = pos > 0 ? compareLine[pos - 1] : " ";
            const after = pos + searchTerm.length < compareLine.length ? compareLine[pos + searchTerm.length] : " ";
            const isWordBoundary = /\W/.test(before) && /\W/.test(after);
            if (!isWordBoundary) {
              searchIndex = pos + 1;
              pos = compareLine.indexOf(searchTerm, searchIndex);
              continue;
            }
          }
          matches.push({
            lineNumber: index + 1,
            lineContent: line,
            matchStart: pos,
            matchEnd: pos + query.length,
          });
          searchIndex = pos + 1;
          pos = compareLine.indexOf(searchTerm, searchIndex);
        }
      });

      if (matches.length > 0) {
        results.push({ file, matches });
      }
    }

    return results;
  }, [query, files, caseSensitive, wholeWord]);

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleMatchClick = (path: string, lineNumber: number) => {
    onSelectFile(path);
    onSelectMatch?.(path, lineNumber);
  };

  const handleReplaceInFile = (path: string) => {
    if (onReplaceInFile && query.trim()) {
      onReplaceInFile(path, query, replaceText, caseSensitive, wholeWord);
    }
  };

  const handleReplaceAll = () => {
    if (onReplaceAll && query.trim()) {
      onReplaceAll(query, replaceText, caseSensitive, wholeWord);
    }
  };

  const highlightMatch = (content: string, start: number, end: number) => {
    const before = content.slice(0, start);
    const match = content.slice(start, end);
    const after = content.slice(end);
    
    return (
      <>
        <span className="text-muted-foreground">{before}</span>
        <span className="bg-yellow-500/30 text-yellow-300 font-medium">{match}</span>
        <span className="text-muted-foreground">{after}</span>
      </>
    );
  };

  const totalMatches = searchResults.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="px-3 py-2 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no projeto..."
            className="pl-8 pr-8 h-8 text-sm bg-background"
            data-testid="input-search-project"
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setShowReplace(!showReplace)}
            data-testid="button-toggle-replace"
          >
            <Replace className={cn("h-3.5 w-3.5", showReplace && "text-primary")} />
          </Button>
        </div>

        {showReplace && (
          <div className="flex items-center gap-1">
            <Input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Substituir por..."
              className="h-8 text-sm bg-background flex-1"
              data-testid="input-replace-text"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleReplaceAll}
              disabled={!query.trim() || totalMatches === 0}
              title="Substituir todos"
              data-testid="button-replace-all"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={cn(
              "px-1.5 py-0.5 rounded font-mono border",
              caseSensitive 
                ? "bg-primary/20 border-primary text-primary" 
                : "border-transparent text-muted-foreground hover-elevate"
            )}
            data-testid="button-case-sensitive"
            title="Diferenciar maiúsculas/minúsculas"
          >
            Aa
          </button>
          <button
            onClick={() => setWholeWord(!wholeWord)}
            className={cn(
              "px-1.5 py-0.5 rounded font-mono border",
              wholeWord 
                ? "bg-primary/20 border-primary text-primary" 
                : "border-transparent text-muted-foreground hover-elevate"
            )}
            data-testid="button-whole-word"
            title="Palavra inteira"
          >
            ab
          </button>
        </div>

        {query.length >= 2 && (
          <div className="text-xs text-muted-foreground" data-testid="search-results-count">
            {totalMatches} resultado(s) em {searchResults.length} arquivo(s)
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {query.length < 2 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Digite pelo menos 2 caracteres para buscar
          </div>
        ) : searchResults.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Nenhum resultado encontrado
          </div>
        ) : (
          <div className="py-1">
            {searchResults.map((result) => {
              const isExpanded = expandedFiles.has(result.file.path);
              const fileName = result.file.path.split("/").pop() || result.file.path;

              return (
                <div key={result.file.path}>
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleFile(result.file.path)}
                      className="flex-1 flex items-center gap-1 px-2 py-1 text-sm hover-elevate active-elevate-2"
                      data-testid={`search-result-file-${result.file.path}`}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{fileName}</span>
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">
                        {result.matches.length}
                      </span>
                    </button>
                    {showReplace && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 mr-1"
                        onClick={() => handleReplaceInFile(result.file.path)}
                        title="Substituir neste arquivo"
                        data-testid={`button-replace-file-${result.file.path}`}
                      >
                        <Replace className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="pl-6">
                      {result.matches.slice(0, 50).map((match, idx) => (
                        <button
                          key={`${match.lineNumber}-${idx}`}
                          onClick={() => handleMatchClick(result.file.path, match.lineNumber)}
                          className={cn(
                            "w-full flex items-start gap-2 px-2 py-0.5 text-xs font-mono hover-elevate active-elevate-2",
                            "text-left"
                          )}
                          data-testid={`search-match-${result.file.path}-${match.lineNumber}`}
                        >
                          <span className="text-muted-foreground w-8 shrink-0 text-right">
                            {match.lineNumber}
                          </span>
                          <span className="truncate">
                            {highlightMatch(
                              match.lineContent.slice(
                                Math.max(0, match.matchStart - 20),
                                Math.min(match.lineContent.length, match.matchEnd + 40)
                              ),
                              Math.min(20, match.matchStart),
                              Math.min(20, match.matchStart) + (match.matchEnd - match.matchStart)
                            )}
                          </span>
                        </button>
                      ))}
                      {result.matches.length > 50 && (
                        <div className="px-2 py-1 text-xs text-muted-foreground">
                          ... e mais {result.matches.length - 50} resultados
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
