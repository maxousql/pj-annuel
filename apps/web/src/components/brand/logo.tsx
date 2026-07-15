type LogoMarkProps = {
  size?: number;
  className?: string;
};

/**
 * Marque "l'asterisque" : le signe de renvoi des imprimeurs (l'idee)
 * enferme dans un cachet circulaire (l'atelier). Le point final se place
 * dans le wordmark, en vermillon : de l'idee jusqu'a la publication.
 */
export function LogoMark({ size = 38, className }: LogoMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="24"
        cy="24"
        r="21.5"
        stroke="currentColor"
        strokeWidth="2.6"
      />
      <g
        stroke="var(--rubric, #d8401f)"
        strokeWidth="4.4"
        strokeLinecap="round"
      >
        <line x1="24" y1="13" x2="24" y2="35" />
        <line x1="14.5" y1="18.5" x2="33.5" y2="29.5" />
        <line x1="14.5" y1="29.5" x2="33.5" y2="18.5" />
      </g>
    </svg>
  );
}

type BrandLockupProps = {
  sub?: string;
};

/** Logotype complet : cachet + wordmark, point final en vermillon. */
export function BrandLockup({ sub }: BrandLockupProps) {
  return (
    <>
      <span className="brand-mark">
        <LogoMark />
      </span>
      <span>
        Content AI<span style={{ color: "var(--rubric)" }}>.</span>
        {sub ? <span className="brand-sub">{sub}</span> : null}
      </span>
    </>
  );
}
