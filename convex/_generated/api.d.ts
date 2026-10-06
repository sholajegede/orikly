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
import type * as admin from "../admin.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as bachs from "../bachs.js";
import type * as creators from "../creators.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_counters from "../lib/counters.js";
import type * as lib_events from "../lib/events.js";
import type * as lib_jobs from "../lib/jobs.js";
import type * as lib_limit from "../lib/limit.js";
import type * as maintenance from "../maintenance.js";
import type * as ops from "../ops.js";
import type * as packs from "../packs.js";
import type * as payments from "../payments.js";
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
  admin: typeof admin;
  assets: typeof assets;
  auth: typeof auth;
  bachs: typeof bachs;
  creators: typeof creators;
  crons: typeof crons;
  events: typeof events;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/counters": typeof lib_counters;
  "lib/events": typeof lib_events;
  "lib/jobs": typeof lib_jobs;
  "lib/limit": typeof lib_limit;
  maintenance: typeof maintenance;
  ops: typeof ops;
  packs: typeof packs;
  payments: typeof payments;
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
