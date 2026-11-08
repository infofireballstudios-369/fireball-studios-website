import { Plus } from "lucide-react";
import { faqs } from "@/lib/faqs";
import { JsonLd } from "./JsonLd";
import { getFAQSchema } from "@/lib/schema";

export function FaqSection() {
  return (
    <section className="section section-pad faq-section">
      <JsonLd data={getFAQSchema(faqs)} />
      <div><p className="eyebrow"><span /> Clear answers</p><h2>Before we<br /><span className="text-muted">begin.</span></h2><p className="faq-intro">A few things you might want to know about bringing your next idea to life.</p></div>
      <div className="faq-list">{faqs.map((item) => <details key={item.question} name="studio-faq"><summary>{item.question}<Plus size={18} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
    </section>
  );
}
