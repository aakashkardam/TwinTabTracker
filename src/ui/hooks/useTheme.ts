import { useEffect } from 'react';
import type { ColorAccent, ThemePreference } from '../../shared/types';

export function useTheme(theme: ThemePreference, accent: ColorAccent = 'teal'): void {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    if (accent === 'teal') {
      root.removeAttribute('data-accent');
    } else {
      root.setAttribute('data-accent', accent);
    }
  }, [accent, theme]);
}
