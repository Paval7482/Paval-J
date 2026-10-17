"use client";

import React, { useState } from "react";

interface InfoTipProps {
  content: string;
  title?: string;
  className?: string;
}

export function InfoTip({ content, title, className = "" }: InfoTipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className={`relative inline-flex items-center align-middle group cursor-pointer ml-1 ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(!open);
      }}
    >
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted-foreground/20 text-[10px] font-semibold text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-all duration-200">
        i
      </span>

      {/* Floating Meta Ads Manager Style Popover (Matching Screenshot 2) */}
      {open && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-2xl border border-border/80 bg-popover/95 p-3.5 text-xs leading-relaxed text-popover-foreground shadow-2xl z-50 backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-150"
          style={{ filter: "drop-shadow(0 10px 25px rgba(0,0,0,0.15))" }}
        >
          {title && (
            <span className="block font-bold text-foreground mb-1 text-xs">
              {title}
            </span>
          )}
          <span className="block text-[11px] text-muted-foreground leading-relaxed font-normal">
            {content}
          </span>
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover/95" />
        </span>
      )}
    </span>
  );
}
