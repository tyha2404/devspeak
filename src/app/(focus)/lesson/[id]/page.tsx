import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/learn/LessonPlayer";

export const metadata: Metadata = { title: "Bài học · DevSpeak" };

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <LessonPlayer lessonId={id} />;
}
