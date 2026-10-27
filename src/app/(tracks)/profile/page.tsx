import type { Metadata } from "next";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = { title: "Hồ sơ · DevSpeak" };

export default function ProfilePage() {
  return <ProfileClient />;
}
