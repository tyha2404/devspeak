import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Chính sách quyền riêng tư · DevQuest English" };

// Draft aligned with Vietnam's PDPD (Decree 13/2023/NĐ-CP) and the 2025 Personal Data Protection Law.
// Have counsel review before launch.
export default function Privacy() {
  return (
    <main className="prose-invert mx-auto max-w-2xl space-y-4 px-4 py-12 leading-relaxed">
      <h1 className="text-3xl font-bold">Chính sách quyền riêng tư</h1>
      <p className="text-sm text-[#c9c6b5]">
        Cập nhật: 24/10/2026 · Bản nháp cần luật sư rà soát trước khi ra mắt.
      </p>
      <h2 className="text-xl font-semibold">1. Dữ liệu chúng tôi thu thập</h2>
      <ul className="list-disc pl-6">
        <li>
          Tài khoản: email (nếu bạn đăng ký), tên hiển thị, tài khoản Google (nếu liên kết). Khách
          chơi ẩn danh không cần email.
        </li>
        <li>
          Tiến trình học: XP, cấp độ, từ trong sổ tay, câu trả lời, lịch ôn tập, nhiệm vụ, thành
          tựu, vị trí trong game.
        </li>
        <li>
          Tin nhắn chat với NPC (AI): lưu 30 ngày để chống lạm dụng và cải thiện chất lượng, sau đó
          tự động xóa.
        </li>
        <li>Dữ liệu kỹ thuật: nhật ký lỗi, thống kê sử dụng ẩn danh (nếu bật).</li>
      </ul>
      <h2 className="text-xl font-semibold">2. Mục đích</h2>
      <p>
        Cung cấp trò chơi học tập, lưu tiến trình, cá nhân hóa từ vựng và ôn tập, bảo mật và chống
        gian lận.
      </p>
      <h2 className="text-xl font-semibold">
        3. Bên xử lý dữ liệu và chuyển dữ liệu ra nước ngoài
      </h2>
      <p>
        Dữ liệu được lưu trên Supabase (Singapore) và Vercel (Singapore). Tin nhắn chat và nội dung
        bài viết được gửi tới Anthropic (Hoa Kỳ) để tạo phản hồi; chúng tôi không gửi email hay
        thông tin định danh của bạn tới Anthropic. Thống kê sử dụng (PostHog) và theo dõi lỗi
        (Sentry) chỉ bật khi được cấu hình.
      </p>
      <h2 className="text-xl font-semibold">4. Quyền của bạn</h2>
      <p>
        Bạn có thể xem, tải về (Hồ sơ → “Tải toàn bộ dữ liệu của tôi”), chỉnh sửa và xóa vĩnh viễn
        tài khoản bất kỳ lúc nào trong trang{" "}
        <Link href="/profile" className="underline">
          Hồ sơ
        </Link>
        . Bạn có thể rút lại sự đồng ý bằng cách xóa tài khoản.
      </p>
      <h2 className="text-xl font-semibold">5. Liên hệ</h2>
      <p>privacy@devquest.example (thay bằng địa chỉ thật trước khi ra mắt).</p>
    </main>
  );
}
