import { MessageCircle, Server, Layout, Cog, Globe, Database, User, Code } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { codeTemplates, type CodeTemplate } from "@shared/schema";

const iconMap = {
  MessageCircle,
  Server,
  Layout,
  Cog,
  Globe,
  Database,
  User,
  Code,
};

interface TemplateSelectorProps {
  onSelect: (template: CodeTemplate) => void;
  disabled?: boolean;
}

export function TemplateSelector({ onSelect, disabled }: TemplateSelectorProps) {
  const getIcon = (iconName: string) => {
    const Icon = iconMap[iconName as keyof typeof iconMap] || Cog;
    return Icon;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {codeTemplates.map((template) => {
        const Icon = getIcon(template.icon);
        return (
          <Card
            key={template.id}
            className={`hover-elevate active-elevate-2 cursor-pointer transition-all ${
              disabled ? "opacity-50 pointer-events-none" : ""
            }`}
            onClick={() => !disabled && onSelect(template)}
            data-testid={`template-${template.id}`}
          >
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">{template.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant="outline">
                  {template.language}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
