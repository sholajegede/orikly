/* eslint-disable */
/**
 * Generated `api` utility. (Hand-written placeholder: `npx convex dev` regenerates this file.)
 * @module
 */
import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as admin from "../admin.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as creators from "../creators.js";
import type * as crons from "../crons.js";
import type * as maintenance from "../maintenance.js";
import type * as ops from "../ops.js";
import type * as packs from "../packs.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as payments from "../payments.js";
import type * as projects from "../projects.js";
import type * as users from "../users.js";
import type * as wishes from "../wishes.js";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  assets: typeof assets;
  auth: typeof auth;
  creators: typeof creators;
  crons: typeof crons;
  maintenance: typeof maintenance;
  ops: typeof ops;
  packs: typeof packs;
  events: typeof events;
  http: typeof http;
  payments: typeof payments;
  projects: typeof projects;
  users: typeof users;
  wishes: typeof wishes;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
