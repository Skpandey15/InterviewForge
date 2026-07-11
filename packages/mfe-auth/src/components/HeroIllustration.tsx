/** Decorative flat illustration for the login hero panel. */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 320 220" width="100%" role="img" aria-label="Person practicing an interview on a laptop">
      {/* backdrop blob */}
      <ellipse cx="160" cy="196" rx="130" ry="16" fill="#dbeafe" />
      <circle cx="252" cy="60" r="34" fill="#eff6ff" />
      <circle cx="58" cy="48" r="22" fill="#eff6ff" />

      {/* chat bubble left */}
      <g>
        <rect x="30" y="70" width="64" height="44" rx="10" fill="#2563eb" />
        <path d="M46 114 l0 12 14 -12 z" fill="#2563eb" />
        <circle cx="50" cy="92" r="4" fill="#fff" />
        <circle cx="63" cy="92" r="4" fill="#fff" opacity="0.8" />
        <circle cx="76" cy="92" r="4" fill="#fff" opacity="0.6" />
      </g>

      {/* mini analytics card right */}
      <g>
        <rect x="228" y="88" width="66" height="52" rx="10" fill="#ffffff" stroke="#dbeafe" strokeWidth="2" />
        <rect x="238" y="118" width="8" height="14" rx="2" fill="#93c5fd" />
        <rect x="252" y="108" width="8" height="24" rx="2" fill="#3b82f6" />
        <rect x="266" y="98" width="8" height="34" rx="2" fill="#2563eb" />
      </g>

      {/* person */}
      <g>
        {/* head */}
        <circle cx="160" cy="92" r="22" fill="#f8b88b" />
        <path d="M138 88 a22 22 0 0 1 44 0 l0 -6 a22 16 0 0 0 -44 0 z" fill="#2b2b3f" />
        {/* body */}
        <path d="M122 178 q0 -46 38 -46 q38 0 38 46 z" fill="#2563eb" />
        {/* arms toward laptop */}
        <path d="M132 156 q10 14 24 16 l0 8 q-22 -2 -30 -18 z" fill="#f8b88b" />
        <path d="M188 156 q-10 14 -24 16 l0 8 q22 -2 30 -18 z" fill="#f8b88b" />
      </g>

      {/* laptop */}
      <g>
        <rect x="120" y="172" width="80" height="10" rx="3" fill="#1e3a8a" />
        <rect x="128" y="146" width="64" height="30" rx="4" fill="#3b82f6" />
        <rect x="134" y="152" width="52" height="18" rx="2" fill="#dbeafe" />
      </g>

      {/* speech bubble near head */}
      <g>
        <rect x="196" y="52" width="52" height="30" rx="8" fill="#60a5fa" />
        <path d="M204 82 l-2 10 12 -10 z" fill="#60a5fa" />
        <rect x="204" y="62" width="36" height="4" rx="2" fill="#fff" opacity="0.9" />
        <rect x="204" y="70" width="24" height="4" rx="2" fill="#fff" opacity="0.7" />
      </g>
    </svg>
  );
}
