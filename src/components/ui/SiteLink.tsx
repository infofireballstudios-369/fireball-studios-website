import NextLink from "next/link";
import type { ComponentProps } from "react";

/** Fetch a route when it is chosen, keeping unused previews out of the free-tier budget. */
export default function SiteLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}
