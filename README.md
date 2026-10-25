# DevQuest English

Tiếng Anh cho developer Việt Nam: đọc tài liệu, viết ticket, code review và làm việc cùng nhóm quốc tế.
Hai lộ trình gồm ngữ pháp theo bậc CEFR (A1 → C2) và từ vựng theo 25 chủ đề. Mỗi bài đã phát hành gồm phần học
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

Dev dùng `.next-dev`, production build dùng `.next`, E2E dùng `.next-e2e` để các tiến trình không
ghi đè chunk của nhau khi chạy đồng thời.

Mặc định `LLM_FAKE=1`: pipeline sinh nội dung chạy bằng LLM giả lập, không gọi API. Bật Claude thật: `LLM_FAKE=0`
và `ANTHROPIC_API_KEY`. Admin: đăng nhập rồi `pnpm grant-role <email> admin`, vào `/admin`.

## Kiểm tra

`pnpm lint && pnpm typecheck && pnpm test && pnpm db:test && pnpm test:integration && pnpm e2e`

## Nội dung

- Lộ trình: `content/curriculum/stages.yaml`; ngữ pháp `content/curriculum/5-grammar/*.yaml` (mỗi file một bậc),
  từ vựng `content/curriculum/6-vocab/*.yaml` (mỗi file một chủ đề). Giữ nguyên slug và thứ tự các bài đã có.
- Đề cương tham khảo: `content/developer/{grammar,topics}.yaml`. Đây là tài liệu nội dung, không được
  import vào ứng dụng. Tên chặng, mô tả, mục tiêu và bài học sử dụng trực tiếp YAML trong
  `content/curriculum/` qua loader và seed sẵn có. ForumFlash cung cấp cấu trúc tham khảo;
  nội dung developer được viết mới.
- Đề cương có 101 chủ điểm ngữ pháp và 250 bài từ vựng. Một số bài ngữ pháp đã có được giữ thêm ngoài danh mục
  tham khảo để không mất tiến độ. Giữ nguyên giao diện và quy tắc mở khoá của ứng dụng.
- Nội dung hiện có: 127 bài ngữ pháp (gồm 101 chủ điểm tham khảo và 26 bài bổ sung), 250 bài từ vựng
  thuộc đủ 25 chủ đề, tổng cộng 5.000 mục từ theo ngữ cảnh. Ví dụ, từ vựng và bài tập gắn với stand-up,
  tài liệu API, debug, PR, bảo mật, bàn giao và giao tiếp đời thường trong nhóm developer.
  Các nghĩa từ trùng cách viết ở nhiều chủ đề có slug riêng để giữ đúng định nghĩa và ví dụ theo ngữ cảnh.
- Câu hỏi ngữ pháp viết tay và từ vựng: `content/curated/{questions,vocab}/*.yaml`.
- `pnpm seed:content` kiểm tra mọi tham chiếu và nạp nội dung (idempotent). Mỗi bài từ vựng có ngân hàng
  ít nhất 16 câu, phủ toàn bộ mục từ; mỗi lần làm chỉ lấy 16 câu. Sau một lượt hoàn tất (đạt hoặc chưa đạt),
  lượt kế tiếp chuyển sang nhóm câu tiếp theo. Bộ 36 từ được phủ hết sau tối đa ba lượt; lượt đang dở
  được tiếp tục với nguyên bộ câu. `question_count` vẫn là 16, tổng ngân hàng hiện có 7.332 câu.
  Cần chạy lệnh này để cập nhật tên, mô tả và phát hành các bài mới trong database.

Bản game pixel-art cũ được giữ ở git tag `game-v1`.

## Tài liệu

- Triển khai: `docs/DEPLOY.md` · Ra mắt: `docs/LAUNCH.md`
