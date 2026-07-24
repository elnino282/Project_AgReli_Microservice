import React from "react";
import { ImageOff, type LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib";

export interface ImagePlaceholderProps {
  icon?: LucideIcon;
  label?: string;
  className?: string;
}

export function ImagePlaceholder({
  label = "Chưa có ảnh",
  className,
}: ImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden bg-earth-100",
        className
      )}
    >
      <img src="/Dashboard2.png" alt={label} className="h-full w-full object-cover" />
    </div>
  );
}
