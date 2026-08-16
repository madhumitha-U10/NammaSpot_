import { ImagePlus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { fileToCompressedDataUrl } from "@/lib/image-upload";

/** Reusable image picker for seller/catalogue images. Customer DP mode is intentionally display-only. */
export function PhotoPicker({ src, alt, label, className = "size-16 rounded-lg", onPicked }: { src?: string; alt: string; label: string; className?: string; onPicked: (dataUrl: string) => void }) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  if (label === "DP") {
    return <div className={`grid shrink-0 place-items-center overflow-hidden border border-border bg-secondary text-muted-foreground ${className}`}>{src ? <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" /> : <span className="text-xs font-semibold">{alt.charAt(0).toUpperCase()}</span>}</div>;
  }
  return <div className="shrink-0"><label htmlFor={inputId} title={src ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`} className={`grid cursor-pointer place-items-center overflow-hidden border border-border bg-secondary text-muted-foreground transition-opacity hover:opacity-80 ${className}`}>{src ? <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" /> : <ImagePlus className="size-4" aria-hidden />}<span className="sr-only">{src ? "Change" : "Add"} {label} for {alt}</span></label><input id={inputId} type="file" accept="image/*" className="sr-only" disabled={busy} onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;setBusy(true);try{onPicked(await fileToCompressedDataUrl(file))}catch(err){toast.error(err instanceof Error?err.message:"Could not use that image")}finally{setBusy(false)}}}/></div>;
}
