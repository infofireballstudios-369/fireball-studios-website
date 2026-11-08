"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./Brand";

export const navigation = [
  { href: "/", label: "Home" }, { href: "/projects", label: "Projects" },
  { href: "/industries", label: "Industries" }, { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" }, { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Brand onClick={() => setOpen(false)} />
        <nav className={"nav-links" + (open ? " is-open" : "")} id="primary-navigation" aria-label="Primary navigation">
          {navigation.map(({ href, label }) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={(href === "/" ? pathname === href : pathname.startsWith(href)) ? "page" : undefined}>{label}</Link>)}
          <Link className="button button-amber nav-cta" href="/contact" onClick={() => setOpen(false)}>Start Project <ArrowUpRight size={16} aria-hidden="true" /></Link>
        </nav>
        <button className="menu-toggle icon-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
    </header>
  );
}
