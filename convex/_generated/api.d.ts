/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as EmailOTP from "../EmailOTP.js";
import type * as account from "../account.js";
import type * as admin from "../admin.js";
import type * as announcements from "../announcements.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as bachs from "../bachs.js";
import type * as crons from "../crons.js";
import type * as director from "../director.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_counters from "../lib/counters.js";
import type * as lib_design from "../lib/design.js";
import type * as lib_events from "../lib/events.js";
import type * as lib_limit from "../lib/limit.js";
import type * as maintenance from "../maintenance.js";
import type * as packs from "../packs.js";
import type * as projects from "../projects.js";
import type * as users from "../users.js";
import type * as wishes from "../wishes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  EmailOTP: typeof EmailOTP;
  account: typeof account;
  admin: typeof admin;
  announcements: typeof announcements;
  assets: typeof assets;
  auth: typeof auth;
  bachs: typeof bachs;
  crons: typeof crons;
  director: typeof director;
  events: typeof events;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/counters": typeof lib_counters;
  "lib/design": typeof lib_design;
  "lib/events": typeof lib_events;
  "lib/limit": typeof lib_limit;
  maintenance: typeof maintenance;
  packs: typeof packs;
  projects: typeof projects;
  users: typeof users;
  wishes: typeof wishes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
