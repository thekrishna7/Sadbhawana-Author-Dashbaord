import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function stageProgress(stage: string): number {
  const stages = [
    "submitted",
    "review",
    "editing",
    "designing",
    "isbn_processing",
    "printing",
    "published",
  ];
  const idx = stages.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / stages.length) * 100);
}
