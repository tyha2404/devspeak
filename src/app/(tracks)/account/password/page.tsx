import type { Metadata } from "next";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = {
  title: "Đặt mật khẩu · DevQuest English",
  robots: { index: false },
};

export default function PasswordPage() {
  return <PasswordForm />;
}
