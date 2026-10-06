import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const status = v.union(
  v.literal("draft"),
  v.literal("payment_claimed"),
  v.literal("paid"),
  v.literal("suspended"),
);

export default defineSchema({
  ...authTables,

  // Same fields as the Convex Auth default, plus a few we collect for the business.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    whatsapp: v.optional(v.string()),
    source: v.optional(v.string()),
    firstSeenAt: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
    marketingOptOut: v.optional(v.boolean()),
    credits: v.optional(v.number()),
    segment: v.optional(v.string()),
    heardFrom: v.optional(v.string()),
    onboardedAt: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  projects: defineTable({
    ownerId: v.id("users"),
    occasion: v.union(v.literal("wedding"), v.literal("birthday"), v.literal("anniversary")),
    slug: v.string(),
    status,
    names: v.string(),
    eventDate: v.optional(v.string()),
    headline: v.optional(v.string()),
    story: v.optional(v.string()),
    message: v.optional(v.string()),
    wishesOn: v.boolean(),
    venue: v.optional(v.string()),
    eventTime: v.optional(v.string()),
    dressCode: v.optional(v.string()),
    mapUrl: v.optional(v.string()),
    giftBank: v.optional(v.string()),
    giftAccountName: v.optional(v.string()),
    giftAccountNumber: v.optional(v.string()),
    showOnWall: v.optional(v.boolean()),
    slugChanges: v.optional(v.number()),
    videoPlan: v.optional(v.any()),
    siteDesign: v.optional(v.any()),
    // What the studio is doing for this celebration. `charged` credits go back to the customer if a run fails.
    studio: v.optional(v.object({ stage: v.string(), runs: v.number(), at: v.number(), note: v.optional(v.string()), charged: v.optional(v.number()), design: v.optional(v.boolean()), films: v.optional(v.boolean()), letters: v.optional(v.boolean()) })),
    hasFilms: v.optional(v.boolean()),
    // "Open when…" letters: an add-on page of sealed envelopes, with its own film.
    letters: v.optional(v.array(v.object({ id: v.string(), when: v.string(), text: v.string(), photo: v.optional(v.id("assets")), opensOn: v.optional(v.string()) }))),
    lettersOn: v.optional(v.boolean()),
    lettersFilm: v.optional(v.boolean()),
    directedCount: v.optional(v.number()),
    siteStyle: v.string(),
    palette: v.string(),
    videoStyles: v.array(v.string()),
    songChoice: v.optional(v.string()),
    songStorageId: v.optional(v.id("_storage")),
    songName: v.optional(v.string()),
    coverAssetId: v.optional(v.id("assets")),
    promoCode: v.optional(v.string()),
    deliverables: v.optional(
      v.array(v.object({ label: v.string(), format: v.string(), storageId: v.id("_storage") })),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_wall", ["showOnWall", "paidAt"]),

  assets: defineTable({
    projectId: v.id("projects"),
    ownerId: v.id("users"),
    kind: v.union(v.literal("photo"), v.literal("video")),
    storageId: v.id("_storage"),
    order: v.number(),
    size: v.number(),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_project", ["projectId", "order"]),

  wishes: defineTable({
    projectId: v.id("projects"),
    guestName: v.string(),
    message: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("hidden")),
    createdAt: v.number(),
  }).index("by_project", ["projectId", "createdAt"]),

  payments: defineTable({
    projectId: v.id("projects"),
    ownerId: v.id("users"),
    method: v.union(v.literal("bachs"), v.literal("credit"), v.literal("comp"), v.literal("transfer")),
    amountKobo: v.number(),
    status: v.union(v.literal("claimed"), v.literal("confirmed"), v.literal("failed"), v.literal("refunded")),
    reference: v.optional(v.string()),
    senderName: v.optional(v.string()),
    note: v.optional(v.string()),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_status", ["status", "createdAt"]),

  // One append-only stream of everything that happens. The admin app reads this.
  events: defineTable({
    at: v.number(),
    name: v.string(),
    userId: v.optional(v.id("users")),
    projectId: v.optional(v.id("projects")),
    anonId: v.optional(v.string()),
    source: v.optional(v.string()),
    device: v.optional(v.string()),
    props: v.optional(v.any()),
  })
    .index("by_name_time", ["name", "at"])
    .index("by_time", ["at"])
    .index("by_user", ["userId", "at"])
    .index("by_project", ["projectId", "at"]),

  // Admin notes and tags per customer.
  notes: defineTable({
    userId: v.id("users"),
    body: v.string(),
    tag: v.optional(v.string()),
    authorEmail: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),

  // Daily counters split across shards so a busy page never makes writers queue behind each other.
  counters: defineTable({
    key: v.string(),
    day: v.number(),
    shard: v.number(),
    n: v.number(),
  }).index("by_key_day", ["key", "day", "shard"]),

  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_window", ["windowStart"]),

  // Bulk packs: partners (planners, photographers, vendors) buy celebrations in bulk at a lower price each.
  packOrders: defineTable({
    userId: v.id("users"),
    packId: v.string(),
    credits: v.number(),
    amountKobo: v.number(),
    status: v.union(v.literal("claimed"), v.literal("confirmed"), v.literal("rejected")),
    senderName: v.string(),
    reference: v.optional(v.string()),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  // One row per online payment attempt. The webhook finds it by our reference.
  checkouts: defineTable({
    reference: v.string(),
    kind: v.union(v.literal("project"), v.literal("credits"), v.literal("pack")),
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    packId: v.optional(v.string()),
    credits: v.optional(v.number()),
    films: v.optional(v.boolean()),
    letters: v.optional(v.boolean()),
    amountKobo: v.number(),
    status: v.union(v.literal("open"), v.literal("paid")),
    checkoutId: v.optional(v.string()),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_reference", ["reference"])
    .index("by_user", ["userId", "createdAt"]),

  // Short updates shown to signed-in customers. Written in the admin app.
  announcements: defineTable({
    title: v.string(),
    body: v.string(),
    linkUrl: v.optional(v.string()),
    linkLabel: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_active", ["active", "createdAt"]),

  // Webhook event ids we already handled. Delivery is at least once.
  webhookEvents: defineTable({ eventId: v.string(), type: v.string(), at: v.number() }).index("by_event", ["eventId"]),
});
