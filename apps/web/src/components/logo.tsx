import React from 'react';
import { cn } from '@/lib/utils';

export function Logo({ 
  className = '', 
  size = 36, 
  showSubtitle = true,
  imageOnly = false 
}: { 
  className?: string; 
  size?: number; 
  showSubtitle?: boolean;
  imageOnly?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 select-none group", className)}>
      <div 
        className="relative flex items-center justify-center rounded-xl overflow-hidden bg-black/60 ring-1 ring-white/20 shadow-xl shadow-purple-500/10 transition-transform duration-300 group-hover:scale-105 shrink-0"
        style={{ width: size, height: size }}
      >
        <img 
          src="/logo.png" 
          alt="MODERATORS Attacker Team" 
          className="w-full h-full object-cover"
        />
      </div>

      {!imageOnly && (
        <div className="flex flex-col leading-none">
          <span className="text-base sm:text-lg font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 font-serif drop-shadow-sm">
            MODERATORS
          </span>
          {showSubtitle && (
            <span className="text-[9px] sm:text-[10px] tracking-[0.25em] text-pink-300 font-semibold uppercase mt-0.5 opacity-90">
              ATTACKER TEAM
            </span>
          )}
        </div>
      )}
    </div>
  );
}