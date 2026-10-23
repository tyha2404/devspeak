import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-4 py-16">
      <p className="text-sm tracking-widest text-[#f2a65a] uppercase">DevQuest English</p>
      <h1 className="text-4xl leading-tight font-bold sm:text-5xl">
        Tiếng Anh cho lập trình viên, học bằng cách đi làm trong game.
      </h1>
      <p className="text-lg text-[#c9c6b5]">
        Standup với Scrum Master, review code với Tech Lead, báo bug với QA. Mỗi ngày 5 từ vựng IT,
        ôn tập đúng lúc sắp quên.
      </p>
      <div>
        <Link
          href="/play"
          className="inline-block rounded bg-[#f2a65a] px-6 py-3 font-semibold text-[#1b1b28] hover:bg-[#f5b97a]"
        >
          Chơi ngay
        </Link>
      </div>
    </main>
  );
}
