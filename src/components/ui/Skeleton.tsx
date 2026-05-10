import { cn } from "@/src/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/5", className)}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="aspect-[4/5] w-full rounded-3xl" />
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <Skeleton className="h-6 w-1/2 rounded-lg" />
          <Skeleton className="h-6 w-1/4 rounded-lg" />
        </div>
        <Skeleton className="h-4 w-1/3 rounded-lg" />
        <div className="pt-4 flex gap-2">
           <Skeleton className="h-10 flex-1 rounded-2xl" />
           <Skeleton className="h-10 w-10 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
