import Link from "@/components/ui/SiteLink";
import { ArrowRight } from "lucide-react";
export default function NotFound() {
  return <main id="main" className="not-found-page section-pad"><p className="eyebrow"><span /> 404 / A different perspective</p><h1>This view isn’t here.</h1><p>The page may have moved, or the address may be incomplete.</p><Link className="button button-amber" href="/">Back to the studio <ArrowRight size={17} /></Link></main>;
}
