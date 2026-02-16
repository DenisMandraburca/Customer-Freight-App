import { Router } from 'express';

import type { FreightRepository } from '@antigravity/db';

import { config } from '../config.js';
import { checkCompanyDomain } from '../middleware/checkCompanyDomain.js';
import { clearSessionCookie, setSessionCookie, signSession } from '../security.js';

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  id_token: string;
  token_type: string;
  scope: string;
};

type GoogleProfile = {
  email: string;
  name: string;
  email_verified: boolean;
};

async function exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: config.googleClientId,
    client_secret: config.googleClientSecret,
    redirect_uri: config.googleCallbackUrl,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }

  return (await response.json()) as GoogleTokenResponse;
}

async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Google profile: ${text}`);
  }

  return (await response.json()) as GoogleProfile;
}

export function authRouter(repository: FreightRepository): Router {
  const router = Router();

  router.get('/google/start', (_req, res) => {
    if (!config.googleClientId || !config.googleClientSecret) {
      res.status(500).json({ error: 'Google OAuth credentials are not configured.' });
      return;
    }

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', config.googleClientId);
    url.searchParams.set('redirect_uri', config.googleCallbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('prompt', 'select_account');
    url.searchParams.set('access_type', 'online');

    res.redirect(url.toString());
  });

  router.get(
    '/google/callback',
    async (req, res, next) => {
      try {
        const code = req.query.code;
        if (typeof code !== 'string' || !code.trim()) {
          res.status(400).json({ error: 'Missing OAuth code.' });
          return;
        }

        const tokens = await exchangeCodeForToken(code);
        const profile = await fetchGoogleProfile(tokens.access_token);

        req.authEmail = profile.email;
        req.oauthProfile = {
          email: profile.email,
          name: profile.name,
          emailVerified: profile.email_verified,
        };

        next();
      } catch (error) {
        next(error);
      }
    },
    checkCompanyDomain,
    async (req, res, next) => {
      try {
        const profile = req.oauthProfile;

        if (!profile) {
          res.status(500).json({ error: 'OAuth profile not found in callback flow.' });
          return;
        }

        if (!profile.emailVerified) {
          res.status(403).json({ error: 'Google email is not verified.' });
          return;
        }

        const user = await repository.upsertUserFromGoogle(profile.email, profile.name || profile.email);

        if (user.role === 'BANNED') {
          res.status(403).json({ error: 'This account is banned from the portal.' });
          return;
        }

        const token = signSession({
          sub: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        });

        setSessionCookie(res, token);
        res.redirect(`${config.appUrl}/`);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.status(204).send();
  });

  return router;
}