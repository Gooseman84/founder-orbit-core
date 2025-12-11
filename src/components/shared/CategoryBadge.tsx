// Unified category/platform/risk badge component
import { cn } from "@/lib/utils";
import { 
  Laptop, Smartphone, Globe, ShoppingBag, Briefcase, 
  Palette, Wrench, BookOpen, Video, Music,
  AlertTriangle, AlertCircle, Shield
} from "lucide-react";

type BadgeType = "category" | "platform" | "risk" | "generic";

interface CategoryBadgeProps {
  type?: BadgeType;
  value: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  tiktok: Video,
  youtube: Video,
  instagram: Smartphone,
  twitter: Globe,
  x: Globe,
  linkedin: Briefcase,
  substack: BookOpen,
  medium: BookOpen,
  podcast: Music,
  newsletter: BookOpen,
  saas: Laptop,
  ecommerce: ShoppingBag,
  mobile: Smartphone,
  web: Globe,
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  creator: Palette,
  automation: Wrench,
  saas: Laptop,
  content: BookOpen,
  ecommerce: ShoppingBag,
  service: Briefcase,
  agency: Briefcase,
  product: ShoppingBag,
};

const RISK_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  low: {
    icon: Shield,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
  },
  medium: {
    icon: AlertCircle,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  high: {
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
  },
};

export function CategoryBadge({ 
  type = "generic", 
  value, 
  size = "md", 
  showIcon = false,
  className 
}: CategoryBadgeProps) {
  if (!value) return null;
  
  const normalizedValue = value.toLowerCase();
  
  let Icon: React.ElementType | null = null;
  let colorClass = "text-muted-foreground";
  let bgClass = "bg-muted";
  
  if (type === "platform") {
    Icon = PLATFORM_ICONS[normalizedValue] || Globe;
    colorClass = "text-foreground";
    bgClass = "bg-muted";
  } else if (type === "category") {
    Icon = CATEGORY_ICONS[normalizedValue] || Briefcase;
    colorClass = "text-foreground";
    bgClass = "bg-muted";
  } else if (type === "risk") {
    const riskConfig = RISK_CONFIG[normalizedValue] || RISK_CONFIG.medium;
    Icon = riskConfig.icon;
    colorClass = riskConfig.color;
    bgClass = riskConfig.bgColor;
  }
  
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-0.5",
    md: "px-2 py-0.5 text-xs gap-1",
    lg: "px-2.5 py-1 text-sm gap-1.5",
  };
  
  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  };
  
  // Format display value
  const displayValue = value
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium",
      sizeClasses[size],
      bgClass,
      colorClass,
      className
    )}>
      {showIcon && Icon && <Icon className={iconSizes[size]} />}
      {displayValue}
    </span>
  );
}

// Effort/Difficulty badge
interface EffortBadgeProps {
  effort: "low" | "medium" | "high" | string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const EFFORT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  low: {
    label: "Low Effort",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
  },
  medium: {
    label: "Medium Effort",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  high: {
    label: "High Effort",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
  },
};

export function EffortBadge({ effort, size = "md", className }: EffortBadgeProps) {
  if (!effort) return null;
  
  const config = EFFORT_CONFIG[effort.toLowerCase()] || EFFORT_CONFIG.medium;
  
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
    lg: "px-2.5 py-1 text-sm",
  };
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium",
      sizeClasses[size],
      config.bgColor,
      config.color,
      className
    )}>
      {config.label}
    </span>
  );
}
