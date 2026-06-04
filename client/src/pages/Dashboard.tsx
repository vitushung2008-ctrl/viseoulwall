import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Check if user is owner
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  const { data: stats, isLoading } = trpc.guestbook.stats.useQuery();
  const { data: allEntries, isLoading: entriesLoading, refetch: refetchEntries } = trpc.guestbook.listAll.useQuery();
  const toggleHiddenMutation = trpc.guestbook.toggleHidden.useMutation();
  const deleteMutation = trpc.guestbook.delete.useMutation();
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const handleToggleHidden = async (entryId: number) => {
    setLoadingIds(prev => new Set(prev).add(entryId));
    try {
      await toggleHiddenMutation.mutateAsync({ entryId });
      await refetchEntries();
      toast.success("已更新留言狀態");
    } catch (error) {
      toast.error("操作失敗");
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!confirm("確認要刪除此留言嗎？")) return;
    setLoadingIds(prev => new Set(prev).add(entryId));
    try {
      await deleteMutation.mutateAsync({ entryId });
      await refetchEntries();
      toast.success("已刪除留言");
    } catch (error) {
      toast.error("刪除失敗");
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  };

  if (authLoading || isLoading || entriesLoading) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "#fff" }}>
        讀取中...
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "#000",
        minHeight: "100vh",
        padding: "80px 20px 40px",
        color: "#fff",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 40, color: "#39ff14" }}>
          📊 管理儀表板
        </h1>

        {/* Overview Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #39ff14",
              padding: 20,
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
              總留言數
            </div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#39ff14" }}>
              {stats?.totalCount ?? 0}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #39ff14",
              padding: 20,
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "#999", marginBottom: 8 }}>
              總愛心數
            </div>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#39ff14" }}>
              {stats?.totalLikes ?? 0}
            </div>
          </div>
        </div>

        {/* Daily Stats */}
        <div
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            padding: 24,
            borderRadius: 8,
            marginBottom: 40,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 16, color: "#39ff14" }}>
            📅 最近 7 天留言數
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}>
            {stats?.dailyStats &&
              Object.entries(stats.dailyStats)
                .reverse()
                .map(([date, count]) => {
                  const maxCount = Math.max(
                    ...Object.values(stats.dailyStats),
                    1
                  );
                  const height = (count / maxCount) * 100;
                  return (
                    <div
                      key={date}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: `${height}%`,
                          backgroundColor: "#39ff14",
                          borderRadius: 4,
                          minHeight: 4,
                        }}
                      />
                      <div style={{ fontSize: 10, color: "#999" }}>
                        {date.slice(5)}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: "bold" }}>
                        {count}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Top Locations */}
        <div
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            padding: 24,
            borderRadius: 8,
            marginBottom: 40,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 16, color: "#39ff14" }}>
            📍 熱門位置
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {stats?.topLocations && stats.topLocations.length > 0 ? (
              stats.topLocations.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: 8,
                    borderBottom: "1px solid #333",
                  }}
                >
                  <span>{item.location}</span>
                  <span style={{ color: "#39ff14", fontWeight: "bold" }}>
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: "#666" }}>暫無數據</div>
            )}
          </div>
        </div>

        {/* Top Roles */}
        <div
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            padding: 24,
            borderRadius: 8,
            marginBottom: 40,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 16, color: "#39ff14" }}>
            👤 熱門角色
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {stats?.topRoles && stats.topRoles.length > 0 ? (
              stats.topRoles.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: 8,
                    borderBottom: "1px solid #333",
                  }}
                >
                  <span>{item.role}</span>
                  <span style={{ color: "#39ff14", fontWeight: "bold" }}>
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: "#666" }}>暫無數據</div>
            )}
          </div>
        </div>

        {/* Message Moderation */}
        <div
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            padding: 24,
            borderRadius: 8,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 16, color: "#39ff14" }}>
            🔍 留言審核
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: 600, overflowY: "auto" }}>
            {allEntries && allEntries.length > 0 ? (
              allEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    backgroundColor: entry.isHidden ? "#2a1a1a" : "#0a2a0a",
                    border: `1px solid ${entry.isHidden ? "#663333" : "#336633"}`,
                    padding: 16,
                    borderRadius: 6,
                    opacity: entry.isHidden ? 0.6 : 1,
                  }}
                >
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: "#39ff14", fontWeight: "bold" }}>#{entry.id}</span>
                    <span style={{ color: "#999", marginLeft: 8, fontSize: 12 }}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#999" }}>角色：</div>
                    <div>{entry.role}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: "#999" }}>位置：</div>
                    <div>{entry.location}</div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "#999" }}>夢想：</div>
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{entry.dream}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleToggleHidden(entry.id)}
                      disabled={loadingIds.has(entry.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: entry.isHidden ? "#39ff14" : "#666",
                        color: entry.isHidden ? "#000" : "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: loadingIds.has(entry.id) ? "not-allowed" : "pointer",
                        fontSize: 12,
                        opacity: loadingIds.has(entry.id) ? 0.6 : 1,
                      }}
                    >
                      {loadingIds.has(entry.id) ? "處理中..." : entry.isHidden ? "顯示" : "隱藏"}
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={loadingIds.has(entry.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#cc0000",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: loadingIds.has(entry.id) ? "not-allowed" : "pointer",
                        fontSize: 12,
                        opacity: loadingIds.has(entry.id) ? 0.6 : 1,
                      }}
                    >
                      {loadingIds.has(entry.id) ? "處理中..." : "刪除"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "#666" }}>暫無留言</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
