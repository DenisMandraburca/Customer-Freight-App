process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.APP_URL = 'http://localhost:5174';
process.env.API_URL = 'http://localhost:8787';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'test-google-client';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? 'test-google-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:8787/api/auth/google/callback';
