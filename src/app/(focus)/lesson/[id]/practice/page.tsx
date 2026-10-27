import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeRunner } from "@/components/learn/PracticeRunner";

export const metadata: Metadata = { title: "Luyện tập · DevSpeak" };

export default async function PracticePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <PracticeRunner lessonId={id} />;
}
