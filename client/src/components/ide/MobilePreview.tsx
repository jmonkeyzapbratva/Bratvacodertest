import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Smartphone, 
  Tablet, 
  Monitor,
  RotateCcw,
  RefreshCw,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  ChevronLeft,
  ChevronRight,
  Home,
  Square,
  QrCode
} from "lucide-react";

type DeviceType = "iphone" | "android" | "ipad" | "web";
type Orientation = "portrait" | "landscape";

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  scale: number;
  hasNotch: boolean;
  hasHomeButton: boolean;
}

const devices: Record<DeviceType, DeviceConfig> = {
  iphone: { name: "iPhone 14 Pro", width: 393, height: 852, scale: 0.6, hasNotch: true, hasHomeButton: false },
  android: { name: "Pixel 7", width: 412, height: 915, scale: 0.55, hasNotch: false, hasHomeButton: false },
  ipad: { name: "iPad Pro 11", width: 834, height: 1194, scale: 0.4, hasNotch: false, hasHomeButton: false },
  web: { name: "Web Preview", width: 1280, height: 800, scale: 0.5, hasNotch: false, hasHomeButton: false },
};

interface MobilePreviewProps {
  url?: string;
  html?: string;
  projectType?: "expo" | "react-native" | "web";
}

export function MobilePreview({ url, html, projectType = "web" }: MobilePreviewProps) {
  const [device, setDevice] = useState<DeviceType>("iphone");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const orientationLabel = orientation === "portrait" ? "Retrato" : "Paisagem";
  const [isOnline, setIsOnline] = useState(true);
  const [key, setKey] = useState(0);

  const config = devices[device];
  const width = orientation === "portrait" ? config.width : config.height;
  const height = orientation === "portrait" ? config.height : config.width;

  const refresh = () => setKey(k => k + 1);

  return (
    <div className="h-full flex flex-col bg-zinc-900">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <Tabs value={device} onValueChange={(v) => setDevice(v as DeviceType)}>
            <TabsList className="h-7 bg-zinc-800">
              <TabsTrigger value="iphone" className="text-xs h-6 px-2" data-testid="device-iphone">
                <Smartphone className="w-3 h-3 mr-1" />
                iOS
              </TabsTrigger>
              <TabsTrigger value="android" className="text-xs h-6 px-2" data-testid="device-android">
                <Smartphone className="w-3 h-3 mr-1" />
                Android
              </TabsTrigger>
              <TabsTrigger value="ipad" className="text-xs h-6 px-2" data-testid="device-ipad">
                <Tablet className="w-3 h-3 mr-1" />
                iPad
              </TabsTrigger>
              <TabsTrigger value="web" className="text-xs h-6 px-2" data-testid="device-web">
                <Monitor className="w-3 h-3 mr-1" />
                Web
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-600">
            {config.name}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400"
            onClick={() => setOrientation(o => o === "portrait" ? "landscape" : "portrait")}
            data-testid="button-rotate"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400"
            onClick={() => setIsOnline(!isOnline)}
            data-testid="button-toggle-network"
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-zinc-400"
            onClick={refresh}
            data-testid="button-refresh-mobile"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div
          className="relative bg-black rounded-[40px] shadow-2xl"
          style={{
            width: width * config.scale + 24,
            height: height * config.scale + 24,
            padding: 12,
          }}
        >
          {config.hasNotch && orientation === "portrait" && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-2xl z-10" />
          )}

          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 text-white text-[10px] z-10">
            {!config.hasNotch && (
              <>
                <span>9:41</span>
                <Signal className="w-3 h-3 ml-2" />
                <Wifi className="w-3 h-3" />
                <Battery className="w-4 h-3" />
              </>
            )}
          </div>

          <div
            className="bg-white rounded-[28px] overflow-hidden"
            style={{ width: width * config.scale, height: height * config.scale }}
          >
            {url ? (
              <iframe
                key={key}
                src={url}
                className="w-full h-full border-0"
                style={{ 
                  transform: `scale(${config.scale})`,
                  transformOrigin: "top left",
                  width: width,
                  height: height,
                }}
                title="Mobile Preview"
              />
            ) : html ? (
              <iframe
                key={key}
                srcDoc={html}
                className="w-full h-full border-0"
                style={{ 
                  transform: `scale(${config.scale})`,
                  transformOrigin: "top left",
                  width: width,
                  height: height,
                }}
                title="Mobile Preview"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                <div className="text-center text-zinc-400">
                  <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Preview Mobile</p>
                  <p className="text-xs">Nenhum conteúdo para exibir</p>
                </div>
              </div>
            )}
          </div>

          {device !== "web" && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-8">
              <button className="w-3 h-3 rounded-full border-2 border-zinc-600 focus:ring-2 focus:ring-zinc-500" data-testid="button-mobile-back" aria-label="Voltar" />
              <button className="w-10 h-1 bg-zinc-600 rounded-full focus:ring-2 focus:ring-zinc-500" data-testid="button-mobile-home" aria-label="Início" />
              <button className="w-3 h-3 rounded border border-zinc-600 focus:ring-2 focus:ring-zinc-500" data-testid="button-mobile-apps" aria-label="Apps recentes" />
            </div>
          )}
        </div>
      </div>

      {projectType !== "web" && (
        <div className="px-3 py-2 border-t border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-600">
              {projectType === "expo" ? "Expo Go" : "React Native"}
            </Badge>
            <span className="text-[10px] text-zinc-500">
              Escaneie o QR code no app Expo Go
            </span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" data-testid="button-show-qr">
            <QrCode className="w-3 h-3 mr-1" />
            Código QR
          </Button>
        </div>
      )}
    </div>
  );
}
