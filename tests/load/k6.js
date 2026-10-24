// Load test: 200 concurrent guests opening a lesson and answering its timed test.
// Run against staging only:  k6 run -e BASE_URL=https://staging.example -e SUPABASE_URL=... -e ANON_KEY=... tests/load/k6.js
import http from "k6/http";
import { check, sleep } from "k6";
import encoding from "k6/encoding";

const BASE = __ENV.BASE_URL;
const SUPABASE = __ENV.SUPABASE_URL;
const ANON = __ENV.ANON_KEY;

export const options = {
  scenarios: {
    learners: { executor: "constant-vus", vus: 200, duration: "5m", exec: "learner" },
  },
  thresholds: {
    "http_req_failed{scenario:learners}": ["rate<0.005"],
    "http_req_duration{name:answer}": ["p(95)<250"],
  },
};

/** Each VU signs in as a fresh guest and calls the API with the Supabase auth cookie. */
function guestCookie() {
  const r = http.post(`${SUPABASE}/auth/v1/signup`, JSON.stringify({}), {
    headers: { apikey: ANON, "Content-Type": "application/json" },
  });
  const s = r.json();
  const ref = new URL(SUPABASE).hostname.split(".")[0];
  const value = `base64-${encoding.b64encode(JSON.stringify(s))}`;
  return `sb-${ref}-auth-token=${value}`;
}

export function learner() {
  const cookie = guestCookie();
  const h = { headers: { Cookie: cookie, "Content-Type": "application/json" } };
  const stages = http.get(`${BASE}/api/path`, h).json("data.stages");
  const lesson = stages?.[0]?.units?.[0]?.lessons?.[0];
  if (!lesson) return;
  const s = http
    .post(`${BASE}/api/lessons/start`, JSON.stringify({ lessonId: lesson.id }), h)
    .json("data");
  for (let i = 0; i < 5; i++) {
    const d = http.get(`${BASE}/api/quiz/next?sessionId=${s.sessionId}`, h).json("data");
    if (!d || d.done) break;
    sleep(1);
    const opt = d.prompt.options?.[0]?.id;
    const res = http.post(
      `${BASE}/api/quiz/answer`,
      JSON.stringify({
        deliveryId: d.deliveryId,
        response: opt ? { kind: "choice", optionId: opt } : { kind: "text", text: "x" },
      }),
      { ...h, tags: { name: "answer" } },
    );
    check(res, { "answer ok": (r) => r.status === 200 });
  }
  sleep(2);
}
