import Link from "next/link";

/** A growing C: the earth's arc, a leaf at its crown, and the contours of cultivated land. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg className={`brand-symbol ${className}`} width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M30.4 8.3a15.5 15.5 0 1 0 1 23.8" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M25.1 12.5C23.5 5.8 28.6 2.7 37 3c-.2 8.6-5.1 12.2-11.9 9.5Z" fill="currentColor" />
      <path d="M16 11.6c-3.8 6.3-3.8 13.1 0 19.4M8 21.5c7.7-3.8 15.1-3.8 23 0M10.5 28c6.2-3.4 12.4-3.4 18.8 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".75" />
    </svg>
  );
}

export function Brand({ className = "" }: { className?: string }) {
  return <Link href="/" className={`brand ${className}`} aria-label="Culrica home"><BrandMark /><span>culrica<span className="brand-period">.</span></span></Link>;
}
