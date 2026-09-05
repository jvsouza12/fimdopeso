import { useEffect, useRef, useState } from "react";
import { Barcode, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function getDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return ctor ?? null;
}

/** Leitor de código de barras pela câmera, com digitação manual como alternativa. */
export function BarcodeScanner({ onCode, busy }: { onCode: (code: string) => void; busy?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(Boolean(getDetectorCtor()) && typeof navigator !== "undefined" && !!navigator.mediaDevices);
  }, []);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    const Ctor = getDetectorCtor();
    if (!Ctor) {
      setError("Seu navegador não permite ler o código pela câmera. Digite os números abaixo.");
      return;
    }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const detector = new Ctor({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      const tick = async () => {
        if (!streamRef.current) return;
        try {
          const found = await detector.detect(video);
          const code = found[0]?.rawValue;
          if (code) {
            stop();
            onCode(code);
            return;
          }
        } catch {
          /* frame ignorado */
        }
        requestAnimationFrame(() => void tick());
      };
      void tick();
    } catch {
      setError("Não conseguimos acessar a câmera. Autorize o acesso ou digite o código.");
      stop();
    }
  };

  return (
    <div className="space-y-4">
      <div className="card-surface space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Barcode className="size-4 text-primary" />
          <p className="font-semibold">Código de barras</p>
        </div>

        {scanning ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-primary/80" />
            </div>
            <Button variant="secondary" className="w-full" onClick={stop}>
              <X className="size-4" /> Parar leitura
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={start} disabled={busy || !supported}>
            <Camera className="size-4" /> {supported ? "Escanear com a câmera" : "Câmera indisponível"}
          </Button>
        )}

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <div className="space-y-2">
          <Label htmlFor="barcode-manual">Ou digite o código do produto</Label>
          <div className="flex gap-2">
            <Input
              id="barcode-manual"
              inputMode="numeric"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, "").slice(0, 14))}
              placeholder="7891000100103"
            />
            <Button onClick={() => onCode(manual)} disabled={manual.length < 8 || busy}>
              Buscar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
