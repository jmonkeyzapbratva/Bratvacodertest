import { Users, UserPlus, Link2, Crown, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const collaborators = [
  { id: 1, name: "Voce", initials: "EU", isOwner: true, isOnline: true },
];

export function MultiplayerPanel() {
  return (
    <div className="h-full flex flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-2 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Multiplayer</span>
        </div>
        <Badge variant="secondary" className="text-xs">{collaborators.length}</Badge>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Colaboradores</CardTitle>
            <CardDescription className="text-xs">
              Trabalhe em tempo real com outros
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            {collaborators.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
                  </Avatar>
                  <Circle 
                    className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${
                      user.isOnline ? "text-green-500 fill-green-500" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{user.name}</span>
                    {user.isOwner && <Crown className="h-3 w-3 text-amber-500" />}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {user.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            ))}
            
            <div className="pt-2 border-t border-border space-y-2">
              <Button variant="outline" size="sm" className="w-full" data-testid="invite-collaborator">
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar
              </Button>
              <Button variant="ghost" size="sm" className="w-full" data-testid="copy-invite-link">
                <Link2 className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-xs text-muted-foreground space-y-2">
          <p>No modo multiplayer:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Editem o mesmo arquivo</li>
            <li>Vejam cursores em tempo real</li>
            <li>Chat integrado</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
