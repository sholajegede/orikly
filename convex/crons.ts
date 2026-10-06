import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("clear old rate limits", { hours: 1 }, internal.maintenance.clearRateLimits, {});
export default crons;
