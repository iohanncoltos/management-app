import { type LucideIcon, type LucideProps } from "lucide-react";
import { forwardRef } from "react";

interface IconWrapperProps extends LucideProps {
  icon: LucideIcon;
}

/**
 * Wrapper component for lucide-react icons that suppresses hydration warnings.
 * This is necessary because browser extensions (like Dark Reader) may modify
 * SVG attributes on the client, causing hydration mismatches.
 */
export const Icon = forwardRef<SVGSVGElement, IconWrapperProps>(({ icon: IconComponent, ...props }, ref) => {
  return (
    <span suppressHydrationWarning>
      <IconComponent ref={ref} {...props} />
    </span>
  );
});

Icon.displayName = "Icon";
