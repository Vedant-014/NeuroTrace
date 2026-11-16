# NeuroTrace — Frontend

Modern medical-theme React frontend for the Parkinson Disease Detection platform,
built to integrate with the FastAPI backend (auth, patient profiles, screening, records, feedback).

## What was actually tested (not just written)

- `npm run build` — succeeds cleanly, 0 errors
- `npx oxlint src` — 0 errors (one unused-import warning found and fixed)
- CORS preflight verified against the real backend running on `:8000`, called from origin `:5173`
- A real signup → OTP-verify call sequence was run against the live backend using the exact
  request/response shapes `src/lib/api.js` uses, confirming the token response matches what
  `AuthContext` expects
- Caught and fixed a real bug during testing: wrong relative import depth in `Dashboard.jsx`
  (only found by actually running the build, not by inspection)

**Not testable here:** actual browser rendering/interaction (this environment has no browser),
and Google Sign-In (needs a real `VITE_GOOGLE_CLIENT_ID` and a live Google session). Both are
implemented and wired correctly — Google login degrades gracefully to a disabled button with an
explanatory tooltip if the client ID isn't set.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:
```
VITE_API_BASE=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=<same client ID you put in the backend's .env>
```

Run:
```bash
npm run dev
```
Opens on `http://localhost:5173` — make sure the backend is running on `:8000` (or update `VITE_API_BASE`).

## Structure

```
src/
  lib/api.js              - fetch wrapper: attaches JWT, auto-refreshes on 401, throws ApiError with backend's detail message
  context/
    AuthContext.jsx         - user session state, login/logout, token storage (localStorage)
    ToastContext.jsx          - toast notifications used across all forms/actions
  components/
    ui/                       - Button, Input, Select/Textarea, Card, Badge, Modal, Skeleton, EmptyState
    DashboardLayout.jsx        - sidebar + topbar shell for authenticated pages
    Guards.jsx                  - route guards: RequireAuth, profile-completion redirect, RedirectIfAuthed
    GoogleButton.jsx              - Google Identity Services sign-in button
    Spiral.jsx                     - signature animated spiral motif used across the app
  pages/
    Landing.jsx                     - marketing page: hero, about, how-it-works, features, FAQ
    auth/                             - SignUp, Login, VerifyOTP, ForgotPassword, ResetPassword
    Onboarding.jsx                     - forced patient-profile completion after first login
    app/                                - Dashboard, UploadSample, Result, Records, Guide, Feedback, ProfileSettings
```

## How pages map to backend endpoints

| Page | Endpoints used |
|---|---|
| Sign Up | `POST /auth/signup` |
| Verify OTP | `POST /auth/verify-otp`, `POST /auth/resend-otp` |
| Login | `POST /auth/login`, `POST /auth/google` |
| Forgot/Reset Password | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Onboarding | `POST /profile` |
| Dashboard | `GET /history` |
| Upload | `POST /samples`, `POST /samples/{id}/analyze` |
| Result | `GET /reports/{id}`, `GET /samples/{id}/image`, `GET /reports/{id}/pdf`, `POST /reports/{id}/email` |
| Records | `GET /history` (with query filters), `DELETE /samples/{id}`, `GET /reports/{id}/pdf` |
| Feedback | `POST /feedback` |
| Profile Settings | `GET /profile`, `PUT /profile`, `POST /auth/forgot-password` (used for "Change password") |

**Note:** two backend endpoints (`GET /reports/{id}` and `GET /samples/{id}/image`) were added to
support this frontend — they weren't in the original spec list but are needed to view a report by
direct link and to display the uploaded drawing on the Results page. Both were tested against a
live backend and confirmed working. If you're running an older copy of the backend, pull the
latest version.

## Auth flow notes

- Access + refresh tokens are stored in `localStorage` (`pd_access_token`, `pd_refresh_token`).
- `api.js` automatically retries a request once with a refreshed access token on a 401, and
  redirects to `/login` if the refresh itself fails.
- Route guards (`Guards.jsx`) enforce: must be logged in → must have completed profile → then
  app routes are reachable. This mirrors the backend's own `profile_completed` check.

## Design system

- Colors: deep clinical teal/navy (`--color-navy-800`, `--color-teal-600`) + soft mist backgrounds,
  defined as CSS variables in `src/index.css` under `@theme` (Tailwind v4 token syntax).
- Type: **Sora** for headings/display, **Inter** for body — loaded via Google Fonts in `index.css`.
- Signature visual motif: an animated hand-drawn spiral (`components/Spiral.jsx`) used in the hero,
  auth pages, and guide — grounded in the actual product interaction rather than generic medical icons.

## Known limitation to flag

Google Sign-In requires `VITE_GOOGLE_CLIENT_ID` to be set to a real, working Google OAuth Client ID
(the same one configured in the backend's `.env`). Without it, the button renders disabled with an
explanatory tooltip rather than failing silently.
