import { createContactHandler } from "@/lib/server/contactHandler";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export const POST = createContactHandler();
