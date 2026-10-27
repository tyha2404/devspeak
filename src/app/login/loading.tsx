import { TracksHeader } from "@/components/app/TracksHeader";

export default function Loading() {
  return (
    <div className="min-h-dvh">
      <TracksHeader />
      <main className="mx-auto max-w-md px-4 py-6 sm:py-10">
        <div
          role="status"
          aria-label="Nội dung đang được chuẩn bị"
          className="border-line bg-surface space-y-5 rounded-3xl border p-4 sm:p-8"
        >
          <div aria-hidden="true" className="space-y-5">
            <div className="dq-skeleton h-8 w-2/3 rounded-lg" />
            <div className="dq-skeleton h-11 rounded-xl" />
            <div className="dq-skeleton h-11 rounded-xl" />
            <div className="dq-skeleton h-12 rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
