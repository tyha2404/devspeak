import type { Metadata } from "next";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = { title: "Cài đặt · DevSpeak" };

export default function SettingsPage() {
  return <SettingsClient />;
}
