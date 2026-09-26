import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  accent?: "amber" | "emerald" | "blue" | "purple";
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  accent = "amber",
}: MetricCardProps) {
  const accentClasses = {
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    purple: "border-purple-500/20 bg-purple-500/5 text-purple-400",
  }[accent];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 backdrop-blur-sm transition-all hover:border-zinc-700">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">{title}</span>
        <div className={`rounded-xl p-2.5 border ${accentClasses}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trendPositive ? "text-emerald-400" : "text-zinc-400"
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
