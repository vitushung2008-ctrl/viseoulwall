import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getAllGuestbookEntries, insertGuestbookEntry, getDb } from "./db";
import { guestbookEntries } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/** Admin-only procedure that checks user role */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

/** Minimal HTML-entity escaping to prevent XSS when rendering user content */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const guestbookRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        role: z.string().transform(s => s.trim()).pipe(z.string().min(1, "역할을 입력해주세요.").max(500)),
        dream: z.string().transform(s => s.trim()).pipe(z.string().min(1, "꿈을 입력해주세요.").max(2000)),
        location: z.string().transform(s => s.trim()).pipe(z.string().min(1, "위치를 입력해주세요.").max(500)),
      })
    )
    .mutation(async ({ input }) => {
      await insertGuestbookEntry({
        role: escapeHtml(input.role),
        dream: escapeHtml(input.dream),
        location: escapeHtml(input.location),
      });
      return { success: true };
    }),

  list: publicProcedure.query(async () => {
    const entries = await getAllGuestbookEntries();
    return entries;
  }),

  toggleLike: publicProcedure
    .input(z.object({ entryId: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { guestbookEntries } = await import("../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");
      
      // Atomic increment to avoid lost updates on concurrent likes
      await db.execute(
        sql`UPDATE guestbook_entries SET likes = likes + 1 WHERE id = ${input.entryId}`
      );
      
      // Fetch updated value
      const entry = await db.select().from(guestbookEntries).where(eq(guestbookEntries.id, input.entryId)).limit(1);
      if (!entry.length) throw new Error("Entry not found");
      
      return { success: true, likes: entry[0]!.likes };
    }),

  stats: adminProcedure.query(async () => {
    const entries = await getAllGuestbookEntries();
    
    // Total count
    const totalCount = entries.length;
    
    // Daily stats (last 7 days)
    const now = new Date();
    const dailyStats: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = 0;
    }
    
    entries.forEach(entry => {
      const dateStr = entry.createdAt.toISOString().split('T')[0];
      if (dateStr in dailyStats) {
        dailyStats[dateStr]++;
      }
    });
    
    // Top locations
    const locationCount: Record<string, number> = {};
    entries.forEach(entry => {
      locationCount[entry.location] = (locationCount[entry.location] ?? 0) + 1;
    });
    const topLocations = Object.entries(locationCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([location, count]) => ({ location, count }));
    
    // Top roles
    const roleCount: Record<string, number> = {};
    entries.forEach(entry => {
      roleCount[entry.role] = (roleCount[entry.role] ?? 0) + 1;
    });
    const topRoles = Object.entries(roleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([role, count]) => ({ role, count }));
    
    // Total likes
    const totalLikes = entries.reduce((sum, entry) => sum + entry.likes, 0);
    
    return {
      totalCount,
      totalLikes,
      dailyStats,
      topLocations,
      topRoles,
    };
  }),

  toggleHidden: adminProcedure
    .input(z.object({ entryId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const entry = await db.select().from(guestbookEntries).where(eq(guestbookEntries.id, input.entryId)).limit(1);
      if (!entry.length) throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found" });

      const newHiddenState = entry[0]!.isHidden === 0 ? 1 : 0;
      await db.update(guestbookEntries).set({ isHidden: newHiddenState }).where(eq(guestbookEntries.id, input.entryId));

      return { success: true, isHidden: newHiddenState };
    }),

  delete: adminProcedure
    .input(z.object({ entryId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const entry = await db.select().from(guestbookEntries).where(eq(guestbookEntries.id, input.entryId)).limit(1);
      if (!entry.length) throw new TRPCError({ code: "NOT_FOUND", message: "Entry not found" });

      await db.delete(guestbookEntries).where(eq(guestbookEntries.id, input.entryId));

      return { success: true };
    }),

  listAll: adminProcedure.query(async () => {
    const entries = await getAllGuestbookEntries();
    return entries.map(entry => ({
      ...entry,
      role: escapeHtml(entry.role),
      dream: escapeHtml(entry.dream),
      location: escapeHtml(entry.location),
    }));
  }),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  guestbook: guestbookRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
