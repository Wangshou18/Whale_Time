import type { ReactNode } from 'react'

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7.5" height="9" rx="1.8" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.8" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.8" />
    </>
  ),
  tasks: (
    <>
      <path d="M9 6h11M9 12h11M9 18h7" />
      <path d="m3.5 6 1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h2M14 14h2M8 17.5h2" />
    </>
  ),
  attendance: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  notes: (
    <>
      <path d="M6 3h9l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v6h6M8 13h8M8 17h5" />
    </>
  ),
  review: (
    <>
      <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
      <path d="M9 4.5V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5v1" />
      <path d="m8.5 11.5 2 2 4.5-4.5" />
      <path d="M8.5 17.5h7" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6h.09A1.7 1.7 0 0 0 10.1 3.05V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 9.5" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="8.5" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    </>
  ),
  paperclip: <path d="m20.5 11.5-8 8a6 6 0 0 1-8.5-8.5l8-8a4 4 0 0 1 5.7 5.7l-8 8a2 2 0 0 1-2.8-2.8l7.3-7.3" />,
  download: (
    <>
      <path d="M12 3v12M7 11l5 5 5-5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4M7 9l5-5 5 5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8z" />
      <path d="M10 19a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1.2" />
    </>
  ),
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z" />,
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v6h6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </>
  ),
  restore: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5" />
      <path d="M3.5 3.5v5h5" />
    </>
  ),
  keyboard: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
      <path d="M5.5 4h13l2.5 9v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7l-1.6-5.5L5 10.6 10.4 9z" />
      <path d="M18.5 16.5 19.2 19l2.5.7-2.5.7-.7 2.4-.7-2.4-2.5-.7 2.5-.7z" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  sort: <path d="M7 4v16m-3-3 3 3 3-3M17 20V4m-3 3 3-3 3 3" />,
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.6 3 8.2 7 9.5 4-1.3 7-4.9 7-9.5V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  hardDrive: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 14h18M7 17.5h.01M11 17.5h.01" />
    </>
  ),
  text: <path d="M4 6h16M4 12h10M4 18h13" />,
  work: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12h18" />
    </>
  ),
  rest: (
    <>
      <path d="M4 13h16v5H4z" />
      <path d="M6 13V9.5A2.5 2.5 0 0 1 8.5 7h1A2.5 2.5 0 0 1 12 9.5V13M12 13V9.5A2.5 2.5 0 0 1 14.5 7h1A2.5 2.5 0 0 1 18 9.5V13" />
      <path d="M3 18h18M4 21h16" />
    </>
  ),
  notePlus: (
    <>
      <path d="M6 3h9l5 5v13H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M14 3v6h6M9 14h6M12 11v6" />
    </>
  ),
  calendarPlus: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18M12 13v5M9.5 15.5h5" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  )
}

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="whale-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b86ff" />
          <stop offset="1" stopColor="#2b52d8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#whale-brand)" />
      <path
        d="M14 35c0-8.3 7.6-15 17-15 8.4 0 15.5 5.4 16.7 12.5 1.6.2 2.7 1.1 2.7 2.4 0 1.5-1.6 2.6-3.6 2.6-.6 5.8-6.4 10.4-13.6 10.4H27c-7.2 0-13-4.7-13-10.6V35z"
        fill="#ffffff"
        opacity=".96"
      />
      <path d="M22 47c2.8 2.7 6.6 4.2 10.8 4.2 5.1 0 9.5-2.2 12.4-5.7" fill="none" stroke="#bcd0ff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
      <circle cx="39" cy="33" r="2.4" fill="#2b52d8" />
      <path d="M31 18c0-3 2.2-5.4 5-5.4 1.4 0 2.6.5 3.5 1.4-1.7.6-2.8 1.9-3 3.6-.1 2 1 3.3 2.4 4.4-3.6.6-7.9-1.1-7.9-4z" fill="#9fc0ff" opacity=".9" />
      <path d="M17 30c-1.4-2.1-3.8-3-5.9-2.3 1 1 1.6 2.3 1.8 3.8.1 1.3-.2 2.6-.9 3.7 2.7.6 5.3-1.4 5.8-4.2z" fill="#9fc0ff" opacity=".85" />
    </svg>
  )
}
