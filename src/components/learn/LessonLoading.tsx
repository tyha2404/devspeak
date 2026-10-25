import { BookOpen, CloudUpload, LoaderCircle } from "lucide-react";
import { TracksHeader } from "@/components/app/TracksHeader";

export function LessonLoading() {
  return (
    <div className="min-h-dvh">
      <TracksHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16" aria-busy="true">
        <LessonPendingState />
      </main>
    </div>
  );
}

/** Shared waiting state for opening a lesson and saving its result. */
export function LessonPendingState({ saving = false }: { saving?: boolean }) {
  const Icon = saving ? CloudUpload : BookOpen;
  return (
    <section
      aria-busy="true"
      className="flex min-h-[45svh] flex-col items-center justify-center px-4 py-10 text-center"
    >
      <div className="relative mb-6 flex size-20 items-center justify-center" aria-hidden="true">
        <LoaderCircle className="dq-spin text-merged/60 absolute inset-0 size-20" strokeWidth={1} />
        <div className="bg-amber-soft text-amber flex size-14 items-center justify-center rounded-full">
          <Icon className="size-6" strokeWidth={1.5} />
        </div>
      </div>
      <div className="max-w-xs" role="status">
        <h1 className="text-xl sm:text-2xl">
          {saving ? "Đang lưu kết quả" : "Đang chuẩn bị bài học"}
        </h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          {saving
            ? "Tiến độ của bạn đang được cập nhật."
            : "Bài học của bạn sẽ sẵn sàng trong giây lát."}
        </p>
      </div>
    </section>
  );
}
