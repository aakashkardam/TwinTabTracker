interface LogoProps {
  size?: number;
}

export function Logo({ size = 22 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" fill="#0F6E6A" />
      <rect x="7" y="8" width="13" height="11" rx="2.5" fill="#D6EFED" />
      <rect x="11" y="12" width="13" height="11" rx="2.5" fill="#FFFFFF" />
      <circle cx="24" cy="8" r="3.2" fill="#F59E0B" />
    </svg>
  );
}
