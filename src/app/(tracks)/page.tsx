import type { Metadata } from "next";
import { TracksHome } from "./TracksHome";

export const metadata: Metadata = {
  title: "DevSpeak · Học ngữ pháp và từ vựng theo lộ trình",
  description:
    "Ngữ pháp theo bậc CEFR A1 → C2 và từ vựng theo chủ đề. Mỗi bài gồm phần học và bài kiểm tra; câu trả lời chưa đúng được lưu để ôn lại.",
};

export default function HomePage() {
  return <TracksHome />;
}
