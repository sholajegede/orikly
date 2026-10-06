import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUser, isAdminEmail, requireUser } from "./lib/auth";
import { logEvent } from "./lib/events";
import { bump } from "./lib/counters";

// Who the customer is making celebrations for, and where they heard about us. Asked once, at onboarding.
export const SEGMENTS = ["myself", "family", "clients"] as const;
export const HEARD = ["instagram", "tiktok", "whatsapp", "friend", "saw_one", "google", "other"] as const;

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email ?? null,
      name: user.name ?? null,
      isAdmin: isAdminEmail(user.email),
      credits: user.credits ?? 0,
      segment: user.segment ?? null,
      onboarded: !!user.onboardedAt,
    };
  },
});

export const setProfile = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, { name }) => {
    const user = await requireUser(ctx);
    if (name !== undefined) await ctx.db.patch(user._id, { name: name.trim().slice(0, 80) });
  },
});

export const finishOnboarding = mutation({
  args: { name: v.string(), segment: v.string(), heardFrom: v.string() },
  handler: async (ctx, a) => {
    const user = await requireUser(ctx);
    const name = a.name.trim().slice(0, 80);
    if (name.length < 2) throw new ConvexError("Tell us your name.");
    if (!(SEGMENTS as readonly string[]).includes(a.segment)) throw new ConvexError("Pick one.");
    if (!(HEARD as readonly string[]).includes(a.heardFrom)) throw new ConvexError("Pick one.");
    const first = !user.onboardedAt;
    await ctx.db.patch(user._id, { name, segment: a.segment, heardFrom: a.heardFrom, onboardedAt: user.onboardedAt ?? Date.now() });
    if (first) {
      await bump(ctx, `segment:${a.segment}`, { lifetime: true });
      await bump(ctx, `heard:${a.heardFrom}`, { lifetime: true });
      await logEvent(ctx, { name: "onboarded", userId: user._id, props: { segment: a.segment, heardFrom: a.heardFrom } });
    }
  },
});
