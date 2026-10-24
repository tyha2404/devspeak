import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TestOutRunner } from "@/components/learn/TestOutRunner";

export const metadata: Metadata = { title: "Bài kiểm tra vượt cấp · DevQuest English" };

export default async function TestOutPage({ params }: { params: Promise<{ id: string }> }) {
  const n = Number((await params).id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <TestOutRunner unitId={n} backHref="/grammar" />;
}
