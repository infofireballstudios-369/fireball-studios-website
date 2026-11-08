import Image from "next/image";
import Link from "next/link";

export function Brand({ footer = false, onClick }: { footer?: boolean; onClick?: () => void }) {
  return (
    <Link className={"brand" + (footer ? " brand-footer" : "")} href="/" onClick={onClick} aria-label="Fireball Studios — home">
      <Image src="/brand/fireball-mark.webp" alt="" width={35} height={48} />
      <span className="brand-wordmark">fireball<span>STUDIOS</span></span>
    </Link>
  );
}
