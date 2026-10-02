# Firebase — Extended Reference


OAuth provider setup and authentication flows

**When to use**: Social login implementation

# SOCIAL LOGIN WITH FIREBASE AUTH

import {
  getAuth, signInWithPopup, signInWithRedirect,
  GoogleAuthProvider, GithubAuthProvider, OAuthProvider
} from "firebase/auth";

const auth = getAuth();

// GOOGLE
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.setCustomParameters({ prompt: "select_account" });

async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    if (error.code === "auth/account-exists-with-different-credential") {
      return handleAccountConflict(error);
    }
    throw error;
  }
}

// GITHUB
const githubProvider = new GithubAuthProvider();
githubProvider.addScope("read:user");

// APPLE (Required for iOS apps!)
const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

### Popup vs Redirect Auth

When to use popup vs redirect for OAuth

**When to use**: Choosing authentication flow

# Popup: Desktop, SPA (simpler, can be blocked)
# Redirect: Mobile, iOS Safari (always works)

async function signIn(provider) {
  if (/iPhone|iPad|Android/i.test(navigator.userAgent)) {
    return signInWithRedirect(auth, provider);
  }
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === "auth/popup-blocked") {
      return signInWithRedirect(auth, provider);
    }
    throw e;
  }
}

// Check redirect result on page load
useEffect(() => {
  getRedirectResult(auth).then(r => r && setUser(r.user));
}, []);

### Account Linking

Link multiple providers to one account

**When to use**: User has accounts with different providers

import { fetchSignInMethodsForEmail, linkWithCredential } from "firebase/auth";

async function handleAccountConflict(error) {
  const email = error.customData?.email;
  const pendingCred = OAuthProvider.credentialFromError(error);
  const methods = await fetchSignInMethodsForEmail(auth, email);

  if (methods.includes("google.com")) {
    alert("Sign in with Google to link accounts");
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    await linkWithCredential(result.user, pendingCred);
    return result.user;
  }
}

// Link new provider
await linkWithPopup(auth.currentUser, new GithubAuthProvider());

// Unlink provider (keep at least one!)
await unlink(auth.currentUser, "github.com");

### Auth State Persistence

Control session lifetime

**When to use**: Managing user sessions

import { setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";

// LOCAL: survives browser close (default)
// SESSION: cleared on tab close

async function signInWithRememberMe(email, pass, remember) {
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  return signInWithEmailAndPassword(auth, email, pass);
}

// React auth hook
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setLoading(false); }), []);
  return { user, loading };
}

### Email Verification and Password Reset

Complete email auth flow

**When to use**: Email/password authentication

import { sendEmailVerification, sendPasswordResetEmail, reauthenticateWithCredential } from "firebase/auth";

// Sign up with verification
async function signUp(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(result.user);
  return result.user;
}

// Password reset
await sendPasswordResetEmail(auth, email);

// Change password (requires recent auth)
const cred = EmailAuthProvider.credential(user.email, currentPass);
await reauthenticateWithCredential(user, cred);
await updatePassword(user, newPass);

### Token Management for APIs

Handle ID tokens for backend calls

**When to use**: Authenticating with backend APIs

import { getIdToken, onIdTokenChanged } from "firebase/auth";

// Get token (auto-refreshes if expired)
const token = await getIdToken(auth.currentUser);

// API helper with auto-retry
async function apiCall(url, opts = {}) {
  const token = await getIdToken(auth.currentUser);
  const res = await fetch(url, {
    ...opts,
    headers: { ...opts.headers, Authorization: "Bearer " + token }
  });
  if (res.status === 401) {
    const newToken = await getIdToken(auth.currentUser, true);
    return fetch(url, { ...opts, headers: { ...opts.headers, Authorization: "Bearer " + newToken }});
  }
  return res;
}

// Sync to cookie for SSR
onIdTokenChanged(auth, async u => {
  document.cookie = u ? "__session=" + await u.getIdToken() : "__session=; max-age=0";
});

// Check admin claim
const { claims } = await auth.currentUser.getIdTokenResult();
const isAdmin = claims.admin === true;

## Collaboration

### Delegation Triggers

- user needs complex OAuth flow -> authentication-oauth (Firebase Auth handles basics, complex flows need OAuth skill)
- user needs payment integration -> stripe (Firebase + Stripe common pattern)
- user needs email functionality -> email (Firebase doesn't include email - use SendGrid, Resend, etc.)
- user needs container deployment -> devops (Beyond Firebase Hosting - Kubernetes, Docker)
- user needs relational data model -> postgres-wizard (Firestore is wrong choice for highly relational data)
- user needs full-text search -> elasticsearch-search (Firestore doesn't support full-text search - use Algolia/Elastic)

## Related Skills

Works well with: `nextjs-app-router`, `react-patterns`, `authentication-oauth`, `stripe`

## When to Use
- User mentions or implies: firebase
- User mentions or implies: firestore
- User mentions or implies: firebase auth
- User mentions or implies: cloud functions
- User mentions or implies: firebase storage
- User mentions or implies: realtime database
- User mentions or implies: firebase hosting
- User mentions or implies: firebase emulator
- User mentions or implies: security rules
- User mentions or implies: firebase admin

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
