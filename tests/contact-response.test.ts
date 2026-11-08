import assert from "node:assert/strict";
import { test } from "node:test";
import { deliveryError, readEnquiryAcknowledgement } from "../src/lib/contactResponse";

test("an empty Netlify rate-limit response produces a useful retry notice", async () => {
  await assert.rejects(readEnquiryAcknowledgement(new Response(null, { status: 429 })), /wait three minutes.*email.*details are still here/);
});

test("only the accepted application acknowledgement can show enquiry success", async () => {
  await readEnquiryAcknowledgement(Response.json({ ok: true }, { status: 202 }));
  for (const response of [Response.json({ ok: true }, { status: 200 }), Response.json({ ok: false }, { status: 202 }), new Response("<html>Error</html>", { status: 502 })]) {
    await assert.rejects(readEnquiryAcknowledgement(response), { message: deliveryError });
  }
});

test("unavailable email configuration retains the server's honest fallback message", async () => {
  const message = "The enquiry form is not yet available. Please email info@fireballstudios.co.uk.";
  await assert.rejects(readEnquiryAcknowledgement(Response.json({ ok: false, message }, { status: 503 })), { message });
});
