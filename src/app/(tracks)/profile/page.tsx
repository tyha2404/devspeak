import type { Metadata } from "next";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = { title: "Hồ sơ · DevQuest English" };

export default function ProfilePage() {
  return <ProfileClient />;
}
