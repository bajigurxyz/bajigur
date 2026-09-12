/**
 * A placeholder the size of the thing that is coming.
 *
 * Not decoration: a page that renders its empty state while data is still in
 * flight tells the user something false. The profile used to offer "Activate
 * your account" to people whose account already existed, purely because the
 * mirror node had not answered yet.
 *
 * Always aria-hidden. The status and its live message belong on the region that
 * owns the load, so a screen reader hears "loading" once rather than per box.
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded bg-gray-100 ${className}`} />;
}

/** A loading region: skeletons plus the one announcement that covers them. */
export function SkeletonRegion({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}
