import type { Metadata } from "next";
import Link from "next/link";
import { ReviewClient } from "./ReviewClient";

export const metadata: Metadata = { title: "Ôn tập · DevQuest English" };

export default function ReviewPage() {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[1.75rem] font-bold">Ôn tập</h1>
        <Link href="/words" className="text-muted text-sm underline">
          Sổ tay từ vựng
        </Link>
      </div>
      <p className="text-muted mt-1 max-w-[60ch]">
        Những từ bạn đã học quay lại đúng lúc sắp quên. Trả lời câu kiểm tra trước, rồi tự đánh giá
        mức độ nhớ.
      </p>
      <div className="mt-6">
        <ReviewClient />
      </div>
    </div>
  );
}
