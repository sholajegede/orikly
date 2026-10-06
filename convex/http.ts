import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Phase 2 (Opus): add the Paystack webhook route here.

export default http;
