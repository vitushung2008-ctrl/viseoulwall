import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

// ─── Relative time formatter (Korean & English) ────────
function getRelativeTimeKR(date: Date): { kr: string; en: string } {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return { kr: "방금 전", en: "just now" };
  if (diffMins < 60) return { kr: `${diffMins}분 전`, en: `${diffMins}m ago` };
  if (diffHours < 24) return { kr: `${diffHours}시간 전`, en: `${diffHours}h ago` };
  if (diffDays < 7) return { kr: `${diffDays}일 전`, en: `${diffDays}d ago` };
  if (diffDays < 30) return { kr: `${Math.floor(diffDays / 7)}주 전`, en: `${Math.floor(diffDays / 7)}w ago` };
  if (diffDays < 365) return { kr: `${Math.floor(diffDays / 30)}개월 전`, en: `${Math.floor(diffDays / 30)}mo ago` };
  return { kr: `${Math.floor(diffDays / 365)}년 전`, en: `${Math.floor(diffDays / 365)}y ago` };
}

// ─── Sticky note color cycle ──────────────────────────
const NOTE_COLORS = [
  "note-yellow",
  "note-green",
  "note-orange",
  "note-blue",
  "note-pink",
  "note-purple",
] as const;

// Deterministic rotation per entry id (avoids hydration mismatch)
function getNoteRotation(id: number): string {
  const rotations = [-2.8, 1.5, -1.2, 2.4, -0.8, 1.9, -2.1, 0.7, -1.7, 2.2];
  const deg = rotations[id % rotations.length];
  return `rotate(${deg}deg)`;
}

// ─── Main Component ───────────────────────────────────
export default function Home() {
  const [role, setRole] = useState("");
  const [dream, setDream] = useState("");
  const [location, setLocation] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "likes">("newest");
  const [showQRCode, setShowQRCode] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;
      lastScrollY.current = currentScrollY;

      if (scrollingDown && currentScrollY > 100) {
        setHeaderVisible(false);
      } else if (!scrollingDown) {
        setHeaderVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const {
    data: entries,
    isLoading: listLoading,
    error: listError,
    refetch,
  } = trpc.guestbook.list.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const submitMutation = trpc.guestbook.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      refetch();
      setTimeout(() => {
        wallRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 600);
    },
    onError: (err) => {
      setError(err.message || "오류가 발생했어요. 다시 시도해주세요.");
    },
  });

  const likeMutation = trpc.guestbook.toggleLike.useMutation();
  const [likeStates, setLikeStates] = useState<Record<number, number>>({});
  const [likePendingIds, setLikePendingIds] = useState<Set<number>>(new Set());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role.trim()) {
      setError("Q01 — 역할을 입력해주세요.");
      return;
    }
    if (!dream.trim()) {
      setError("Q02 — 꿈을 입력해주세요.");
      return;
    }
    if (!location.trim()) {
      setError("Q03 — 위치를 입력해주세요.");
      return;
    }
    submitMutation.mutate({ role: role.trim(), dream: dream.trim(), location: location.trim() });
  }

  const totalCount = entries?.length ?? 0;

  // Sort entries based on selected sort option
  const sortedEntries = entries
    ? [...entries].sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else {
          return b.likes - a.likes;
        }
      })
    : [];

  return (
    <div className="concrete-wall">
      {/* ── Header Bar ── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "52px",
          backgroundColor: "#39ff14",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: "16px",
          paddingRight: "16px",
          zIndex: 1000,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          transform: headerVisible ? "translateY(0)" : "translateY(-52px)",
          transition: "transform 0.3s ease-out",
        }}
      >
        {/* Logo */}
        <img
          src={import.meta.env.VITE_LOGO_URL || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' fill='%23333'/%3E%3Ctext x='20' y='25' textAnchor='middle' fill='%23fff' fontSize='16' fontFamily='monospace' fontWeight='bold'%3ELOGO%3C/text%3E%3C/svg%3E"}
          alt="Logo"
          style={{
            height: "40px",
            width: "auto",
            objectFit: "contain",
          }}
        />
        {/* Instagram Handle */}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            fontWeight: 500,
            color: "#000",
            letterSpacing: "0.05em",
          }}
        >
          ig: vis.art.projects
        </span>
      </header>

      {/* ── Page content ── */}
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "120px 20px 80px",
        }}
      >
        {/* ── Creator Introduction Card ── */}
        <div className="paper-card" style={{ padding: "28px 24px", marginTop: 24, marginBottom: 32 }}>
          <div className="tape-strip" aria-hidden="true" />
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <p style={{ margin: "0 0 12px 0", fontWeight: 500, color: "#2a2520" }}>
              안녕하세요, 저는 ViS 이고 아직 학생입니다.
            </p>
            <p style={{ margin: "0 0 16px 0", fontSize: 10, color: "rgba(42,37,32,0.5)", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
              hi, i'm ViS, i'm still a student.
            </p>
            <p style={{ margin: "0 0 8px 0", fontWeight: 400, color: "#2a2520" }}>
              제 꿈은 세계 곳곳을 여행하며 각지에 작은 흔적을 남기는 것입니다.
              <br />
              이 스티커도 그 흔적 중 하나예요.
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "rgba(42,37,32,0.5)", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
              my dream is to travel the world and leave small marks wherever i go.
              <br />
              this sticker is one of them.
            </p>
          </div>
        </div>

        {/* ── Paper Card ── */}
        <div className="paper-card" style={{ padding: "48px 32px 32px", marginTop: 24 }}>
          {/* Tape strip */}
          <div className="tape-strip" aria-hidden="true" />

          {/* Rubber stamp */}
          <div className="rubber-stamp" aria-hidden="true">
            SEOUL
            <br />
            2026
          </div>

          {/* ── Headline ── */}
          <div style={{ marginBottom: 20 }}>
            <h1 className="headline-kr">당신은 진짜 누구인가요?</h1>
            <span className="headline-en">who are you, really?</span>
          </div>

          {/* ── Intro ── */}
          <div style={{ marginBottom: 28 }}>
            <p className="intro-kr">
              이 도시 어딘가의 벽에서 스티커를 발견했군요.
              <br />
              익명으로 흔적을 남겨보세요.
            </p>
            <span className="intro-en">
              you found a sticker on a wall somewhere in this city.
              <br />
              leave a mark — anonymously.
            </span>
          </div>

          {/* ── Divider ── */}
          <div
            style={{
              borderTop: "1px solid rgba(42,37,32,0.15)",
              marginBottom: 28,
            }}
          />

          {/* ── Form or Confirmation ── */}
          {submitted ? (
            <div className="confirmation-msg confirm-enter">
              <span className="kr">𖤗 벽에 당신의 흔적이 남았어요.</span>
              <span className="en">your mark is on the wall.</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  } catch (err) {
                    console.error("Failed to copy:", err);
                  }
                }}
                style={{
                  marginTop: 16,
                  padding: "10px 16px",
                  backgroundColor: copyFeedback ? "rgba(42,37,32,0.12)" : "rgba(42,37,32,0.08)",
                  border: "1px solid rgba(42,37,32,0.2)",
                  borderRadius: "2px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#2a2520",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  opacity: copyFeedback ? 1 : 0.7,
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = "rgba(42,37,32,0.15)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = copyFeedback
                    ? "rgba(42,37,32,0.12)"
                    : "rgba(42,37,32,0.08)";
                }}
              >
                {copyFeedback ? "✓ 복사됨" : "복사"}
              </button>
              <button
                type="button"
                onClick={() => setShowQRCode(!showQRCode)}
                style={{
                  marginTop: 12,
                  marginLeft: 8,
                  padding: "10px 16px",
                  backgroundColor: showQRCode ? "rgba(42,37,32,0.12)" : "rgba(42,37,32,0.08)",
                  border: "1px solid rgba(42,37,32,0.2)",
                  borderRadius: "2px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "#2a2520",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  opacity: showQRCode ? 1 : 0.7,
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = "rgba(42,37,32,0.15)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = showQRCode
                    ? "rgba(42,37,32,0.12)"
                    : "rgba(42,37,32,0.08)";
                }}
              >
                {showQRCode ? "QR 코드 숨기기" : "QR 코드"}
              </button>
              {showQRCode && (
                <div
                  ref={qrRef}
                  style={{
                    marginTop: 16,
                    padding: 16,
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <QRCodeSVG
                    value={window.location.href}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const svg = qrRef.current?.querySelector('svg');
                      if (svg) {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const img = new Image();
                        img.onload = () => {
                          canvas.width = img.width;
                          canvas.height = img.height;
                          ctx?.drawImage(img, 0, 0);
                          const link = document.createElement('a');
                          link.href = canvas.toDataURL('image/png');
                          link.download = 'seoul-guestbook-qr.png';
                          link.click();
                        };
                        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#2a2520",
                      color: "#fff",
                      border: "none",
                      borderRadius: "2px",
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = "#1a1510";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = "#2a2520";
                    }}
                  >
                    다운로드
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Q01 */}
              <div style={{ marginBottom: 22 }}>
                <label htmlFor="role">
                  <span className="label-kr">
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        opacity: 0.5,
                        marginRight: 6,
                      }}
                    >
                      Q01
                    </span>
                    사회에서 당신이 맡고 있는 역할은 무엇인가요?
                  </span>
                  <span className="label-en">what role do you play in society?</span>
                </label>
                <input
                  id="role"
                  type="text"
                  className="wall-input"
                  placeholder="학생, 직장인, 딸, 방황하는 사람..."
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={500}
                  autoComplete="off"
                />
              </div>

              {/* Q02 */}
              <div style={{ marginBottom: 24 }}>
                <label htmlFor="dream">
                  <span className="label-kr">
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        opacity: 0.5,
                        marginRight: 6,
                      }}
                    >
                      Q02
                    </span>
                    당신이 진짜 꿈꾸는 것은 무엇인가요?
                  </span>
                  <span className="label-en">what do you actually dream about?</span>
                </label>
                <textarea
                  id="dream"
                  className="wall-input"
                  placeholder="듣기 좋은 말 말고 — 진짜 원하는 것."
                  value={dream}
                  onChange={(e) => setDream(e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
              </div>

              {/* Q03 */}
              <div style={{ marginBottom: 22 }}>
                <label htmlFor="location">
                  <span className="label-kr">
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        opacity: 0.5,
                        marginRight: 6,
                      }}
                    >
                      Q03
                    </span>
                    이 스티커를 어디서 발견했나요?
                  </span>
                  <span className="label-en">where did you find this sticker?</span>
                </label>
                <input
                  id="location"
                  type="text"
                  className="wall-input"
                  placeholder="대략적인 위치나 장소를 적어주세요..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={500}
                  autoComplete="off"
                />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    opacity: 0.5,
                    display: "block",
                    marginTop: 4,
                  }}
                >
                  a rough location is fine...
                </span>
              </div>

              {/* Error */}
              {error && (
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "#c0392b",
                    marginBottom: 12,
                  }}
                >
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="submit-btn"
                disabled={submitMutation.isPending}
                style={submitMutation.isPending ? { opacity: 0.6 } : undefined}
              >
                흔적 남기기 →
              </button>
            </form>
          )}
        </div>

        {/* ── Message Wall ── */}
        <div ref={wallRef} style={{ marginTop: 64 }}>
          {/* Section header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <div className="section-title">
              이 벽을 발견한 사람들
              <span className="en-sub">others who found this wall</span>
            </div>
            <div className="count-badge">{totalCount}</div>
          </div>

          {/* Sort Controls */}
          {totalCount > 0 && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 20,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setSortBy("newest")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: sortBy === "newest" ? "#39ff14" : "transparent",
                  color: sortBy === "newest" ? "#000" : "#fff",
                  border: "1px solid #39ff14",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
              >
                최신순
              </button>
              <button
                onClick={() => setSortBy("likes")}
                style={{
                  padding: "8px 16px",
                  backgroundColor: sortBy === "likes" ? "#39ff14" : "transparent",
                  color: sortBy === "likes" ? "#000" : "#fff",
                  border: "1px solid #39ff14",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 500,
                  transition: "all 0.2s ease",
                }}
              >
                인기순 ❤️
              </button>
            </div>
          )}

          {/* Notes grid */}
          {listLoading ? (
            <p className="empty-state" style={{ opacity: 0.5 }}>
              불러오는 중...
            </p>
          ) : listError ? (
            <p className="empty-state" style={{ color: "rgba(192,57,43,0.7)" }}>
              오류가 발생했어요. 페이지를 새로고침해주세요.
            </p>
          ) : totalCount === 0 ? (
            <p className="empty-state">
              — 아직 아무도 없어요. 첫 번째가 되어보세요. —
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "28px 20px",
              }}
              className="notes-grid"
            >
              {sortedEntries.map((entry, idx) => {
                const colorClass = NOTE_COLORS[idx % NOTE_COLORS.length];
                const rotation = getNoteRotation(entry.id);
                const entryNumber = entries!.length - entries!.findIndex(e => e.id === entry.id);
                const likeCount = likeStates[entry.id] ?? entry.likes;
                
                return (
                  <div
                    key={entry.id}
                    className={`sticky-note ${colorClass} note-enter`}
                    style={{
                      transform: rotation,
                      animationDelay: `${Math.min(idx * 40, 400)}ms`,
                    }}
                  >
                    <div className="note-tape" aria-hidden="true" />
                    <p className="note-role">{entry.role}</p>
                    <p style={{ fontSize: 11, opacity: 0.65, marginBottom: 8, fontFamily: "var(--font-mono)" }}>
                      📍 {entry.location}
                    </p>
                    <p className="note-dream">{entry.dream}</p>
                    <div className="note-time">
                      <div>{getRelativeTimeKR(new Date(entry.createdAt)).kr}</div>
                      <div style={{ fontSize: 8, opacity: 0.6, marginTop: 1 }}>
                        {getRelativeTimeKR(new Date(entry.createdAt)).en}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                      <p className="note-number">#{entryNumber}</p>
                      <button
                        onClick={() => {
                          setLikePendingIds(prev => new Set(Array.from(prev).concat(entry.id)));
                          likeMutation.mutate({ entryId: entry.id }, {
                            onSuccess: (result) => {
                              setLikeStates(prev => ({ ...prev, [entry.id]: result.likes }));
                              setLikePendingIds(prev => {
                                const next = new Set(Array.from(prev));
                                next.delete(entry.id);
                                return next;
                              });
                            },
                            onError: () => {
                              setError("좋아요 처리 중 오류가 발생했어요. 다시 시도해주세요.");
                              setTimeout(() => setError(null), 3000);
                              setLikePendingIds(prev => {
                                const next = new Set(Array.from(prev));
                                next.delete(entry.id);
                                return next;
                              });
                            },
                          });
                        }}
                        disabled={likePendingIds.has(entry.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: likePendingIds.has(entry.id) ? "not-allowed" : "pointer",
                          fontSize: 14,
                          padding: 0,
                          opacity: likePendingIds.has(entry.id) ? 0.4 : 0.7,
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) => !likePendingIds.has(entry.id) && (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={(e) => !likePendingIds.has(entry.id) && (e.currentTarget.style.opacity = "0.7")}
                        title="좋아요"
                      >
                        {likePendingIds.has(entry.id) ? "⚡" : "❤️"} {likeCount > 0 ? likeCount : ""}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Responsive: single column on mobile */}
      <style>{`
        @media (max-width: 520px) {
          .notes-grid {
            grid-template-columns: 1fr !important;
          }
          .paper-card {
            padding: 44px 20px 24px !important;
          }
          .rubber-stamp {
            top: 14px !important;
            right: 12px !important;
            font-size: 9px !important;
          }
        }
      `}</style>
    </div>
  );
}
