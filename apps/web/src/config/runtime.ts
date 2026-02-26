function trimToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolvePortalLoginUrl(): string {
  const explicit = trimToNull(import.meta.env.VITE_PORTAL_LOGIN_URL);
  if (explicit) {
    return explicit;
  }

  return import.meta.env.DEV ? '/login' : '/apps/hub/login';
}

export const portalLoginUrl = resolvePortalLoginUrl();

export function redirectToPortalLogin(): void {
  window.location.href = portalLoginUrl;
}
