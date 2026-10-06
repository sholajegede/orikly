import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("release overdue jobs", { minutes: 15 }, internal.maintenance.releaseOverdueJobs, {});
crons.interval("clear old rate limits", { hours: 1 }, internal.maintenance.clearRateLimits, {});
export default crons;
