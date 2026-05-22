import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  color = "violet",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  color?: "violet" | "blue" | "rose" | "amber";
}) {
  const colorMap = {
    violet: {
      bg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      glow: "rgba(139, 92, 246, 0.15)",
    },
    blue: {
      bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      glow: "rgba(59, 130, 246, 0.15)",
    },
    rose: {
      bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      glow: "rgba(244, 63, 94, 0.15)",
    },
    amber: {
      bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      glow: "rgba(245, 158, 11, 0.15)",
    },
  };

  const selectedColor = colorMap[color] || colorMap.violet;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative flex flex-col items-center justify-center gap-6 rounded-3xl border border-white/6 glass-strong p-16 text-center shadow-2xl overflow-hidden"
    >
      {/* Dynamic Background Glow */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-[60px]"
        style={{ backgroundColor: selectedColor.glow }}
      />

      {/* Icon Frame */}
      <div className={`relative flex h-20 w-20 items-center justify-center rounded-2xl border shadow-lg ${selectedColor.bg}`}>
        <Icon className="h-10 w-10" />
      </div>

      {/* Copy */}
      <div className="space-y-2.5 max-w-md relative z-10">
        <h3 className="text-2xl font-bold tracking-tight text-white">{title}</h3>
        <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
      </div>

      {/* Action Buttons */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 relative z-10">
          {action}
          {secondaryAction}
        </div>
      )}
    </motion.div>
  );
}

