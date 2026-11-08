import Link from "next/link";
import { Building2, Armchair, Car, Scan, ArrowUpRight } from "lucide-react";
const services = [
  { icon: Building2, title: "Spaces worth experiencing.", text: "Interior and exterior imagery that helps people understand the place before it exists.", label: "Architecture & property", anchor: "real-estate" },
  { icon: Armchair, title: "Products worth a closer look.", text: "Furniture and product imagery with careful attention to shape, finish and context.", label: "Furniture & products", anchor: "products" },
  { icon: Car, title: "A different kind of presence.", text: "Visual storytelling for vehicles, accessories and automotive concepts.", label: "Automotive visualisation", anchor: "automotive" },
  { icon: Scan, title: "Give curiosity somewhere to go.", text: "Interactive tours and product demonstrations that put the visitor in control.", label: "Interactive experiences", anchor: "architecture" },
];
export function ServicesOverlay() {
  return (
    <section className="section section-pad">
      <div className="section-heading"><div><p className="eyebrow"><span /> From idea to experience</p><h2>See the possibility.<br /><span className="text-muted">Feel the difference.</span></h2></div><p>3D imagery, film and interactive experiences, shaped around what your audience needs to see.</p></div>
      <div className="service-grid">{services.map(({ icon: Icon, ...service }) => <Link href={"/industries#" + service.anchor} className="service-card panel" key={service.title}><Icon size={25} strokeWidth={1.5} /><span className="small-label">{service.label}</span><h3>{service.title}</h3><p>{service.text}</p><ArrowUpRight size={20} className="card-arrow" aria-hidden="true" /></Link>)}</div>
    </section>
  );
}
