# DevQuest English

Học tiếng Anh theo hai lộ trình: ngữ pháp theo bậc CEFR (A1 → C2) và từ vựng theo 25 chủ đề. Mỗi bài gồm phần học
(năm màn kiến thức hoặc thẻ lật) và bài kiểm tra 16 câu có giới hạn thời gian; qua bài từ 80%, có sao và XP. Bậc ngữ
pháp mở lần lượt hoặc qua bài vượt cấp. Từ đã học được ôn theo FSRS; streak tính theo ngày có làm bài.

## Chạy local

```bash
corepack pnpm@10 install
corepack pnpm@10 db:start          # cần Docker
cp .env.example .env.local         # điền key in ra từ db:start
corepack pnpm@10 seed:all          # tải dataset mở (NGSL, CEFR-J, Tatoeba) + nội dung tự viết
corepack pnpm@10 dev               # http://localhost:3000
```

Mặc định `LLM_FAKE=1`: pipeline sinh nội dung chạy bằng LLM giả lập, không gọi API. Bật Claude thật: `LLM_FAKE=0`
và `ANTHROPIC_API_KEY`. Admin: đăng nhập rồi `pnpm grant-role <email> admin`, vào `/admin`.

## Kiểm tra

`pnpm lint && pnpm typecheck && pnpm test && pnpm db:test && pnpm test:integration && pnpm e2e`

## Nội dung

- Lộ trình: `content/curriculum/stages.yaml`; ngữ pháp `content/curriculum/5-grammar/*.yaml` (mỗi file một bậc),
  từ vựng `content/curriculum/6-vocab/*.yaml` (mỗi file một chủ đề). Unit `status: draft` hiện là "Sắp ra mắt".
- Câu hỏi ngữ pháp viết tay và từ vựng: `content/curated/{questions,vocab}/*.yaml`.
- `pnpm seed:content` kiểm tra mọi tham chiếu, sinh bài kiểm tra 16 câu cho từng bài và nạp tất cả (idempotent).

Bản game pixel-art cũ được giữ ở git tag `game-v1`.

## Tài liệu

- Triển khai: `docs/DEPLOY.md` · Ra mắt: `docs/LAUNCH.md`
