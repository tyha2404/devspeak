# DevQuest English

Lộ trình tiếng Anh cho lập trình viên Việt Nam, A2 → B2: 4 chặng, 36 unit (tình huống công việc + kiến thức kỹ thuật
bằng tiếng Anh). Mỗi unit gồm từ vựng, hội thoại với đồng nghiệp, mẫu câu, luyện tập, lỗi hay gặp và một nhiệm vụ thực
tế do AI chấm. Ôn tập theo FSRS, mục tiêu ngày + streak, checkpoint cuối chặng có chứng nhận.

## Chạy local

```bash
corepack pnpm@10 install
corepack pnpm@10 db:start          # cần Docker
cp .env.example .env.local         # điền key in ra từ db:start
corepack pnpm@10 seed:all          # tải dataset mở (NGSL, CEFR-J, Tatoeba) + nội dung & lộ trình tự viết
corepack pnpm@10 dev               # http://localhost:3000 (ngữ pháp & từ vựng), /career (lộ trình công việc)
```

Mặc định `LLM_FAKE=1`: sinh nội dung và chat NPC chạy bằng LLM giả lập, không gọi API. Bật Claude thật: `LLM_FAKE=0`
và `ANTHROPIC_API_KEY`. Admin: đăng nhập rồi `pnpm grant-role <email> admin`, vào `/admin`.

## Kiểm tra

`pnpm lint && pnpm typecheck && pnpm test && pnpm db:test && pnpm test:integration && pnpm e2e`

## Nội dung

- Lộ trình: `content/curriculum/stages.yaml` và `content/curriculum/<n>-<stage>/*.yaml` (mỗi file một unit).
  Unit `status: draft` hiện là "Sắp ra mắt" và bị bỏ qua khi mở khóa tuần tự.
- Câu hỏi, từ vựng, hội thoại: `content/curated/**`; lỗi hay gặp: `content/mistakes/`; thư viện tình huống: `content/situations/`.
- `pnpm seed:content` nạp tất cả (idempotent) và kiểm tra mọi tham chiếu.

Bản game pixel-art cũ được giữ ở git tag `game-v1`.

## Tài liệu

- Kế hoạch: `/Users/tyha/.claude/plans/jaunty-churning-beacon.md`
- Triển khai: `docs/DEPLOY.md` · Ra mắt: `docs/LAUNCH.md`
