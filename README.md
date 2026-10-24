# DevQuest English

Học tiếng Anh công việc IT qua game: nhân vật lập trình viên đi lại trong văn phòng pixel-art, nói chuyện với đồng
nghiệp NPC, học 5 từ vựng mỗi ngày, ôn tập theo FSRS, thăng tiến từ Intern lên Tech Lead.

## Chạy local

```bash
corepack pnpm@10 install
corepack pnpm@10 db:start          # cần Docker
cp .env.example .env.local         # điền key in ra từ db:start
corepack pnpm@10 seed:all          # tải dataset mở (NGSL, CEFR-J, Tatoeba) + nội dung tự viết
corepack pnpm@10 dev               # http://localhost:3000 → /play
```

Mặc định `LLM_FAKE=1`: sinh nội dung và chat NPC chạy bằng LLM giả lập, không gọi API. Bật Claude thật: `LLM_FAKE=0`
và `ANTHROPIC_API_KEY`. Admin: đăng nhập rồi `pnpm grant-role <email> admin`, vào `/admin`.

## Kiểm tra

`pnpm lint && pnpm typecheck && pnpm test && pnpm db:test && pnpm test:integration && pnpm e2e`

## Điều khiển

WASD/mũi tên để đi, Shift chạy, E/Space/Enter tương tác, N mở sổ tay, Esc đóng. Mobile: joystick + nút hành động.
Nút 👥 liệt kê mọi người/đồ vật trong phòng (dùng được với trình đọc màn hình).

## Tài liệu

- Kế hoạch: `/Users/tyha/.claude/plans/jaunty-churning-beacon.md`
- Triển khai: `docs/DEPLOY.md` · Ra mắt: `docs/LAUNCH.md`
