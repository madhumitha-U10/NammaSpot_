import { ImagePlus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { fileToCompressedDataUrl } from "@/lib/image-upload";

/**
 * Image picker used for seller profile and catalogue photos.
 * Images are contained rather than cropped so the complete upload remains visible.
 */
export function PhotoPicker({
  src,
  alt,
  label,
  className = "aspect-[4/5] w-full rounded-lg",
  onPicked,
}: {
  src?: string | undefined;
  alt: string;
  label: string;
  className?: string;
  onPicked: (dataUrl: string) => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);

  return (
    <div className="w-full shrink-0">
      <label
        htmlFor={inputId}
        title={src ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
        className={`grid cursor-pointer place-items-center overflow-hidden border border-border bg-secondary text-muted-foreground transition-opacity hover:opacity-80 ${className}`}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="h-full w-full object-contain"
          />
        ) : (
          <ImagePlus className="size-5" aria-hidden />
        )}
        <span className="sr-only">
          {src ? "Change" : "Add"} {label} for {alt}
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            onPicked(await fileToCompressedDataUrl(file));
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not use that image");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
