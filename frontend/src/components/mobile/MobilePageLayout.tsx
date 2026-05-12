import { cn } from "@/lib/utils";
import { getMobileScrollContainerClassName } from "@/lib/pageLayout";

interface MobilePageLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function MobilePageLayout({
  header,
  children,
  className,
}: MobilePageLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur-lg px-4 pt-4 pb-3">
        {header}
      </div>
      <div className={getMobileScrollContainerClassName()}>
        {children}
      </div>
    </div>
  );
}
