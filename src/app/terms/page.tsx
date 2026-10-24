import type { Metadata } from "next";

export const metadata: Metadata = { title: "Điều khoản sử dụng · DevQuest English" };

export default function Terms() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-12 leading-relaxed">
      <h1 className="text-3xl font-bold">Điều khoản sử dụng</h1>
      <p className="text-sm text-[#c9c6b5]">
        Cập nhật: 24/10/2026 · Bản nháp cần luật sư rà soát trước khi ra mắt.
      </p>
      <ol className="list-decimal space-y-2 pl-6">
        <li>
          DevQuest English là công cụ học tập; nội dung do AI tạo đã qua kiểm duyệt nhưng có thể còn
          sai sót — hãy dùng nút “Báo câu hỏi sai”.
        </li>
        <li>
          Không dùng chat NPC để tạo nội dung vi phạm pháp luật, quấy rối, hoặc cố vượt qua giới hạn
          của hệ thống.
        </li>
        <li>
          Không gian lận điểm số (bot, script tự động). Tài khoản vi phạm có thể bị đặt lại tiến
          trình.
        </li>
        <li>
          Dữ liệu từ vựng có nguồn mở được ghi công tại trang Credits; nội dung dẫn xuất từ nguồn CC
          BY-SA được chia sẻ theo cùng giấy phép.
        </li>
        <li>
          Chúng tôi có thể thay đổi tính năng; thay đổi quan trọng sẽ được thông báo trong ứng dụng.
        </li>
      </ol>
    </main>
  );
}
