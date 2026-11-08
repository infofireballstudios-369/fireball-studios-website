import type { Config, Context } from "@netlify/functions";
import { createNetlifyContactHandler } from "../../src/lib/server/netlifyContact";

const handleContact = createNetlifyContactHandler();

export default async function contact(request: Request, context: Context): Promise<Response> {
  return handleContact(request, context);
}

// Static values are required for Netlify's deploy-time rule extraction.
// A custom path disables the default /.netlify/functions/contact endpoint.
export const config: Config = {
  path: "/api/contact",
  method: "POST",
  rateLimit: {
    action: "rate_limit",
    windowLimit: 2,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
  },
};
