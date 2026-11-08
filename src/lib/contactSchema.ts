import { z } from "zod";

/** Enquiries are plain text; remove markup and non-printing control characters. */
export function sanitiseText(value: string): string {
  return value.replace(/<[^<>]*>/g, "").replace(/[<>]/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
}

const text = (min: number, max: number, message: string) => z.string().max(max * 2).transform(sanitiseText).pipe(z.string().min(min, message).max(max, "Please shorten this field."));
const phoneMessage = "Please enter a valid UK or international phone number.";

export const contactSchema = z.object({
  name: text(2, 100, "Please enter your name.").refine((value) => !/[\r\n\t]/.test(value), "Please enter your name on one line."),
  phone: text(7, 40, phoneMessage).refine((value) => {
    const digits = value.replace(/\D/g, "");
    return /^\+?[\d(][\d ().-]*$/.test(value) && digits.length >= 7 && digits.length <= 15;
  }, phoneMessage),
  email: z.string().max(508).transform(sanitiseText).pipe(z.string().max(254).email("Please enter a valid email address.")),
  message: text(10, 4000, "Please add a little more detail about your project."),
  // This field is never delivered; preserve its contents so markup cannot bypass the honeypot.
  website: z.string().max(200),
}).strict();

export type ContactPayload = z.infer<typeof contactSchema>;
