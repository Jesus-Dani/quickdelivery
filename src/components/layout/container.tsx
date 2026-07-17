// Shared layout primitive (UI_VISUAL_DESIGN_DIRECTION.md Section 5): caps
// content at ~1200px, centered, with the mobile/desktop horizontal padding
// the spec calls for — so every page shares the same container instead of
// each screen inventing its own max-width/padding.
export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1200px] px-6 sm:px-12 lg:px-16 ${className}`}>
      {children}
    </div>
  );
}
