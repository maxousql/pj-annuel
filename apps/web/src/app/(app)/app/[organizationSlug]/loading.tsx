import { LoadingSpinner } from "@/components/shell/loading-state";

export default function Loading() {
  return (
    <div className="grid min-h-96 place-items-center">
      <LoadingSpinner className="size-8 text-ink" />
    </div>
  );
}
