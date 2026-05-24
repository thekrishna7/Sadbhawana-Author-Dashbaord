"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  glow = false,
  hover = true,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  hover?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "glass rounded-3xl p-8 text-left w-full",
        glow && "glow-gold",
        hover && "transition-all duration-300 hover:border-white/12 hover:shadow-xl",
        className
      )}
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </Comp>
  );
}
