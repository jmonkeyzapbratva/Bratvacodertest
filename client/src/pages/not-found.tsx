import { Link } from "wouter";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-12 pb-8 px-8">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
            <span className="text-4xl font-bold text-muted-foreground">404</span>
          </div>
          <h1 className="text-2xl font-semibold mb-2">Página não encontrada</h1>
          <p className="text-muted-foreground mb-8">
            A página que você está procurando não existe ou foi movida.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="outline" onClick={() => window.history.back()} className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button asChild className="gap-2 w-full sm:w-auto">
              <Link href="/">
                <Home className="h-4 w-4" />
                Ir para Início
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
