import { useId } from 'react';

const paths = {
  home: 'm3 10 9-7 9 7v10H7V10m3 10v-6h4v6',
  trophy:
    'M8 3h8v6a4 4 0 0 1-8 0V3Zm8 2h4v3a4 4 0 0 1-4 4M8 5H4v3a4 4 0 0 0 4 4m4 1v5m-4 3h8m-7-3h6',
  ranking: 'M4 20V10h4v10m2 0V4h4v16m2 0v-7h4v7',
  crown: 'm3 6 5 4 4-6 4 6 5-4-2 13H5L3 6Zm2 10h14',
  shop: 'M3 9h18l-2-6H5L3 9Zm1 0v11h16V9M9 20v-6h6v6M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2H4Z',
  chest: 'M4 11V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v3M3 11h18v9H3v-9Zm7-2h4v6h-4V9ZM7 20v-7m10 7v-7',
  calendar: 'M5 5h14v15H5V5Zm0 5h14M8 3v4m8-4v4m-8 7h3m-3 3h6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  info: 'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
  logout: 'M9 4H4v16h5m5-13 5 5-5 5m-6-5h13',
  swords: 'm4 3 17 17m-5-17L3 16m0-5 10 10m1-7 7-7M3 3l1 6 5-5-6-1Zm18 0-6 1 5 5 1-6Z',
} as const;
export type IconName = keyof typeof paths;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
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
      <path d={paths[name]} />
    </svg>
  );
}
export function Crest({ size = 60 }: { size?: number }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size * 1.125}
      viewBox="0 0 64 72"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id} x2="0.6" y2="1">
          <stop stopColor="#fff1b7" />
          <stop offset=".5" stopColor="#ffc743" />
          <stop offset="1" stopColor="#bb6e0c" />
        </linearGradient>
      </defs>
      <path
        d="m32 3 12 7h14v31c0 13-26 27-26 27S6 54 6 41V10h14Z"
        fill={`url(#${id})`}
        stroke="#ffdd79"
        strokeWidth="2"
      />
      <path
        d="m32 11 10 6h9v23c0 8-19 20-19 20S13 48 13 40V17h9Z"
        fill="#102c54"
        stroke="#6f510f"
        strokeWidth="2"
      />
      <path
        d="m21 29 7 5 4-10 4 10 7-5-3 16H24Z"
        fill={`url(#${id})`}
        stroke="#ffdb68"
        strokeWidth="1.5"
      />
      <path d="M25 42h14" stroke="#9f6612" strokeWidth="2" />
    </svg>
  );
}
