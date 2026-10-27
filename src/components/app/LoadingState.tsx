import { LoaderCircle } from "lucide-react";

export function Spinner() {
  return <LoaderCircle aria-hidden="true" className="dq-spin h-4 w-4 shrink-0" />;
}

export function LoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Nội dung đang được chuẩn bị"
      className="space-y-4 py-4 sm:space-y-6"
    >
      <div aria-hidden="true" className="space-y-4 sm:space-y-6">
        <div className="space-y-3">
          <div className="dq-skeleton h-8 w-2/3 max-w-sm rounded-lg" />
          <div className="dq-skeleton h-4 w-1/2 max-w-xs rounded" />
        </div>
        {!compact && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="border-line bg-surface space-y-4 rounded-2xl border p-4 sm:p-5"
              >
                <div className="dq-skeleton h-5 w-1/2 rounded" />
                <div className="dq-skeleton h-3 w-full rounded" />
                <div className="dq-skeleton h-3 w-3/4 rounded" />
                <div className="dq-skeleton mt-6 h-10 w-32 rounded-xl" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
