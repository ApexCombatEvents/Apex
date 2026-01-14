import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

export function Button({
  className,
  variant = "default",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const variants = {
    default:
      "bg-purple-600 text-white hover:bg-purple-700 focus-visible:ring-purple-500",
    outline:
      "border border-input bg-transparent hover:bg-purple-50 hover:text-purple-700",
    ghost:
      "hover:bg-purple-100 hover:text-purple-700 text-purple-600",
  };

  return (
    <button
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}
