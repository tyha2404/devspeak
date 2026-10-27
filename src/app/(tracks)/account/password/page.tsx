import type { Metadata } from "next";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = {
  title: "Đặt mật khẩu · DevSpeak",
  robots: { index: false },
};

export default function PasswordPage() {
  return <PasswordForm />;
}
