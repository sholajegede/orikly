import { notFound } from "next/navigation";

/** Where the middleware sends paths that must not exist on this host. */
export default function NotHere() {
  notFound();
}
