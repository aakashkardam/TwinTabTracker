import logoUrl from '../assets/logo.png';

interface LogoProps {
  size?: number;
}

export function Logo({ size = 22 }: LogoProps) {
  return <img src={logoUrl} width={size} height={size} alt="" />;
}
