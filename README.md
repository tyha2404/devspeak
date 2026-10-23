# DevQuest English

Học tiếng Anh công việc IT qua game: nhân vật lập trình viên đi lại trong văn phòng pixel-art,
nói chuyện với đồng nghiệp NPC, học 5 từ vựng mỗi ngày và ôn tập theo FSRS.

## Chạy local

```bash
corepack pnpm@10 install
corepack pnpm@10 db:start          # cần Docker; in ra key local
cp .env.example .env.local         # điền NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY và SUPABASE_SECRET_KEY
corepack pnpm@10 dev               # http://localhost:3000, vào /play
```

Kiểm tra: `pnpm lint && pnpm typecheck && pnpm test && pnpm db:test && pnpm build && pnpm e2e`.

Điều khiển: WASD/mũi tên để đi, Shift để chạy, E/Space/Enter để nói chuyện, Enter/Esc để đóng hội thoại.
