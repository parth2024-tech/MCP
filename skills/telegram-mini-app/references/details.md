# Telegram Mini App — Code Reference

## ### Basic Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
</head>
<body>
  <script>
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // User data
    const user = tg.initDataUnsafe.user;
    console.log(user.first_name, user.id);
  </script>
</body>
</html>
```


## ### React Setup

```jsx
// hooks/useTelegram.js
export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    queryId: tg?.initDataUnsafe?.query_id,
    expand: () => tg?.expand(),
    close: () => tg?.close(),
    ready: () => tg?.ready(),
  };
}

// App.jsx
function App() {
  const { tg, user, expand, ready } = useTelegram();

  useEffect(() => {
    ready();
    expand();
  }, []);

  return <div>Hello, {user?.first_name}</div>;
}
```


## ### Send TON Transaction

```jsx
import { useTonConnectUI } from '@tonconnect/ui-react';

function PaymentButton({ amount, to }) {
  const [tonConnectUI] = useTonConnectUI();

  const handlePay = async () => {
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [{
        address: to,
        amount: (amount * 1e9).toString(), // TON to nanoton
      }]
    };

    await tonConnectUI.sendTransaction(transaction);
  };

  return <button onClick={handlePay}>Pay {amount} TON</button>;
}
```


## ### Viral Mechanics

```

### Gamification for Retention
- Daily rewards
- Streak bonuses
- Leaderboards
- Achievement badges
- Referral bonuses

### Mini App UX Patterns

UX specific to Telegram Mini Apps

**When to use**: When designing Mini App interfaces

## Mini App UX

### Platform Conventions
| Element | Implementation |
|---------|----------------|
| Main Button | tg.MainButton |
| Back Button | tg.BackButton |
| Theme | tg.themeParams |
| Haptics | tg.HapticFeedback |

### Main Button
```javascript


## ### Haptic Feedback

```

## Sharp Edges

### Not validating initData from Telegram

Severity: HIGH

Situation: Backend trusts user data without verification

Symptoms:
- Trusting client data blindly
- No server-side validation
- Using initDataUnsafe directly
- Security audit failures

Why this breaks:
initData can be spoofed.
Security vulnerability.
Users can impersonate others.
Data tampering possible.

Recommended fix:

## Validating initData

### Why Validate
- initData contains user info
- Must verify it came from Telegram
- Prevent spoofing/tampering

### Node.js Validation
```javascript


## ### Using in API

```

### TON Connect not working on mobile

Severity: HIGH

Situation: Wallet connection fails on mobile Telegram

Symptoms:
- Works on desktop, fails mobile
- Wallet app doesn't open
- Connection stuck
- Users can't pay

Why this breaks:
Deep linking issues.
Wallet app not opening.
Return URL problems.
Different behavior iOS vs Android.

Recommended fix:

## TON Connect Mobile Issues

### Common Problems
1. Wallet doesn't open
2. Return to Mini App fails
3. Transaction confirmation lost

### Fixes
```jsx


## ### Fallback

```

### Mini App feels slow and janky

Severity: MEDIUM

Situation: App lags, slow transitions, poor UX

Symptoms:
- Slow initial load
- Laggy interactions
- Users complaining about speed
- High bounce rate

Why this breaks:
Too much JavaScript.
No code splitting.
Large bundle size.
No loading optimization.

Recommended fix:

## Mini App Performance

### Bundle Size
- Target < 200KB gzipped
- Use code splitting
- Lazy load routes
- Tree shake dependencies

### Quick Wins
```jsx


## ### Vite Optimization

```

### Custom buttons instead of MainButton

Severity: MEDIUM

Situation: App has custom submit buttons that feel non-native

Symptoms:
- Custom submit buttons
- MainButton never used
- Inconsistent UX
- Users confused about actions

Why this breaks:
MainButton is expected UX.
Custom buttons feel foreign.
Inconsistent with Telegram.
Users don't know what to tap.

Recommended fix:

## Using MainButton Properly

### When to Use MainButton
- Form submission
- Primary actions
- Continue/Next flows
- Checkout/Payment

### Implementation
```javascript


## ### React Hook

```jsx
function useMainButton(text, onClick, visible = true) {
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    if (!tg) return;

    if (visible) {
      tg.MainButton.setText(text);
      tg.MainButton.onClick(onClick);
      tg.MainButton.show();
    } else {
      tg.MainButton.hide();
    }

    return () => {
      tg.MainButton.offClick(onClick);
    };
  }, [text, onClick, visible]);
}
```


