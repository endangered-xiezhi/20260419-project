import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  content: React.ReactNode;
  type?: "blue" | "red";
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, content, type = "blue", className }) => {
  const borderColor = type === "red" ? "border-t-mck-red" : "border-t-mck-blue";
  return (
    <div className={cn("bg-white border border-mck-border p-6 transition-all", borderColor, "border-t-4", className)}>
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-mck-navy/60 mb-4 font-sans">
        {title}
      </h3>
      <div className="text-2xl font-serif font-bold text-mck-navy">{content}</div>
    </div>
  );
};
