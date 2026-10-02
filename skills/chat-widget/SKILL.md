---
name: chat-widget
description: Build a real-time support chat system with a floating widget for users and an admin dashboard for support staff. Use when the user wants live chat, customer support chat, real-time messaging, or in-app support.
risk: unknown
source: community
---

# Live Support Chat Widget

Build a real-time support chat system with a floating widget for users and an admin dashboard for support staff.

## When to Use This Skill

Use when the user wants to:
- Add a live chat widget to their app
- Build customer support chat functionality
- Create real-time messaging between users and admins
- Add an in-app support channel

## Architecture Overview

> See [references/details.md](references/details.md) for full code examples.

## Implementation Guide

### Step 1: Data Models

Create two tables: `support_chats` and `support_messages`.

**support_chats**
```
id              - primary key (UUID recommended)
user_id         - foreign key to users (UNIQUE - one chat per user)
last_message_at - timestamp (for sorting chats by recency)
admin_viewed_at - timestamp (tracks when admin last viewed)
archived_at     - timestamp (null = active, set = archived)
created_at
updated_at
```

**support_messages**
```
id              - primary key (UUID recommended)
chat_id         - foreign key to support_chats
content         - text (required)
sender_type     - enum: 'user' | 'admin'
read_at         - timestamp (null = unread)
created_at
updated_at
```

**Key indexes:**
- `support_chats.user_id` (unique)
- `support_chats.last_message_at` (for sorting)
- `support_chats.archived_at` (for filtering)
- `support_messages.chat_id`
- `support_messages.(chat_id, created_at)` (composite, for ordering)

**Model relationships:**
```
User has_one SupportChat
SupportChat belongs_to User
SupportChat has_many SupportMessages
SupportMessage belongs_to SupportChat
```

**Model methods to implement:**

Chat model:
> See [references/details.md](references/details.md) for full code examples.

Message model:
```pseudo
after_create:
  chat.touch_last_message()
  if sender_type == 'user' and chat.archived?:
    chat.unarchive()  // Auto-reactivate on new user message

after_create_commit:
  broadcast_to_chat_channel(message_data)
  if sender_type == 'user':
    broadcast_to_admin_notification_channel(message_data, chat_info)
  if sender_type == 'admin':
    schedule_email_notification(delay: 5.minutes)
```

### Step 2: API Endpoints

**User-facing:**
```
GET  /support_chat       - Get or create user's chat with messages
PATCH /support_chat/mark_read - Mark admin messages as read
```

**Admin-facing:**
```
GET  /admin/chats              - List chats (query: archived=true/false)
GET  /admin/chats/:id          - Get chat with messages
POST /admin/chats/:id/archive  - Archive chat
POST /admin/chats/:id/unarchive - Restore chat
```

**Controller logic:**

User GET /support_chat:
```pseudo
function show()
  chat = current_user.support_chat || create_chat(user: current_user)
  return {
    id: chat.id,
    messages: chat.messages.map(m => serialize_message(m))
  }
```

Admin GET /admin/chats:
```pseudo
function index()
  chats = SupportChat
    .where(archived_at: params.archived ? not_null : null)
    .includes(:user, :messages)
    .order(last_message_at: desc)

  return chats.map(c => {
    id: c.id,
    user_email: c.user.email,
    last_message_preview: c.messages.last?.content.truncate(100),
    last_message_sender: c.messages.last?.sender_type,
    message_count: c.messages.count,
    unread: c.unread_for_admin?,
    archived: c.archived?
  })
```

### Step 3: WebSocket Channels

Create two channels for real-time communication.

**ChatChannel** (specific to each chat):
```pseudo
class ChatChannel
  on_subscribe(chat_id):
    chat = find_chat(chat_id)
    if not authorized(chat):
      reject()
      return
    stream_from "support_chat:#{chat_id}"

  function authorized(chat):
    return chat.user_id == current_user.id OR current_user.is_admin

  action send_message(content):
    if content.blank: return
    sender_type = current_user.is_admin ? 'admin' : 'user'
    chat.messages.create(content: content, sender_type: sender_type)
```

**AdminNotificationChannel** (global for all admins):
```pseudo
class AdminNotificationChannel
  on_subscribe:
    if not current_user.is_admin:
      reject()
      return
    stream_from "admin_support_notifications"
```

**Broadcasting (from Message model):**
> See [references/details.md](references/details.md) for full code examples.

### Step 4: Frontend - User Widget

Create a floating chat widget with these components:

**Component structure:**
```
ChatWidget (root container)
├── ChatButton (fixed position, bottom-right)
│   ├── Icon (message bubble when closed, X when open)
│   └── UnreadBadge (shows count, caps at "9+")
└── ChatPanel (slides up when open)
    ├── Header (title + connection status dot)
    ├── MessageList (scrollable)
    │   └── MessageBubble (styled by sender_type)
    └── InputArea
        ├── Textarea (auto-expanding)
        └── SendButton
```

**State management hook:**
> See [references/details.md](references/details.md) for full code examples.

**Widget behavior:**
- Show floating button at bottom-right corner (fixed position)
- Display unread count badge (count messages where sender_type='admin' and read_at=null)
- Toggle panel open/closed on button click
- Auto-call markAsRead() when panel opens
- Auto-scroll to bottom when new messages arrive
- Show connection status indicator (green dot = connected)
- Keyboard: Enter to send, Shift+Enter for newline

**Message styling:**
- User messages: right-aligned, primary color background
- Admin messages: left-aligned, secondary/muted background
- Show timestamp on each message

### Step 5: Frontend - Admin Dashboard

Create two pages: chat list and chat detail.

**Chat List Page:**
```
Header: "Support Chats"
Tabs: [Active] [Archived]

Chat cards (sorted by last_message_at desc):
┌─────────────────────────────────────────┐
│ [Unread indicator] user@example.com     │
│ Last message preview text...            │
│ 5 messages · 2 minutes ago              │
└─────────────────────────────────────────┘
```

Features:
- Tab filtering (active vs archived)
- Unread indicator (highlight border or badge)
- Click to navigate to detail
- Show "You: " prefix if last message was from admin

**Chat Detail Page:**
```
Header: user@example.com [Archive/Restore button]
Back link

Messages (grouped by date):
──── Monday, January 29 ────
[User bubble]  Message content
               10:30 AM

          [Admin bubble] Reply content
                         10:35 AM

Input area (same as widget)
```

Features:
- Group messages by date with dividers
- User messages left, admin messages right (opposite of user widget)
- Show sender label ("You" for admin, user email/name for user)
- Archive/restore toggle button
- Same WebSocket subscription as user widget for real-time updates
- Call mark_viewed_by_admin() when page loads (server-side)

### Step 6: Email Notifications

Send email to user when admin replies and user hasn't seen it.

**Job/worker:**
```pseudo
class SupportReplyNotificationJob
  perform(message):
    if message.sender_type != 'admin': return
    if message.read_at != null: return  // Already read, skip

    send_email(
      to: message.chat.user.email,
      subject: "New reply from Support",
      body: "You have a new message from our support team..."
    )
```

**Scheduling:**
- Schedule job with 5-minute delay when admin sends message
- This gives user time to see message in-app before email
- Job checks if still unread before sending

### Step 7: TypeScript Types

> See [references/details.md](references/details.md) for full code examples.

## Key Design Decisions

1. **One chat per user** - Simplifies UX, user always has same conversation history
2. **Soft-delete via archiving** - Preserves history, allows restore
3. **Auto-unarchive** - When user sends message to archived chat, reactivate it
4. **Delayed email notifications** - 5 min delay prevents spam for rapid replies
5. **Message deduplication** - Track seen IDs to prevent duplicates from send + broadcast echo
6. **Separate admin channel** - Allows future features like global unread count, desktop notifications

## Testing Checklist

After implementation:
- [ ] User can open widget and send message
- [ ] Admin sees message in real-time on dashboard
- [ ] Admin can reply and user sees it instantly
- [ ] Unread badge shows correct count
- [ ] Badge clears when widget opens
- [ ] Connection indicator reflects actual status
- [ ] Archive/restore works correctly
- [ ] Auto-unarchive triggers on user message
- [ ] Email sends after 5 min if message unread
- [ ] Email does NOT send if user already read message
- [ ] Messages appear in chronological order
- [ ] No duplicate messages appear

## Common Pitfalls

1. **Forgetting deduplication** - Messages sent by current user echo back via broadcast
2. **Race conditions on read status** - Use database transactions
3. **WebSocket auth** - Verify user can access the specific chat
4. **Stale connection status** - Handle reconnection gracefully
5. **Missing indexes** - Add composite index on (chat_id, created_at)
6. **Email timing** - Use background job, not synchronous send

---

## Framework-Specific Guidance

### Ruby on Rails

**Models:**
> See [references/details.md](references/details.md) for full code examples.

**Channel:**
```ruby
# app/channels/support_chat_channel.rb
class SupportChatChannel < ApplicationCable::Channel
  def subscribed
    @chat = SupportChat.find(params[:chat_id])
    reject unless @chat.user_id == current_user.id || current_user.admin?
    stream_from "support_chat:#{@chat.id}"
  end

  def send_message(data)
    @chat.support_messages.create!(
      content: data["content"],
      sender_type: current_user.admin? ? :admin : :user
    )
  end
end
```

**Migration:**
```ruby
create_table :support_chats, id: :uuid do |t|
  t.references :user, type: :uuid, null: false, foreign_key: true, index: { unique: true }
  t.datetime :last_message_at
  t.datetime :admin_viewed_at
  t.datetime :archived_at
  t.timestamps
end

create_table :support_messages, id: :uuid do |t|
  t.references :support_chat, type: :uuid, null: false, foreign_key: true
  t.text :content, null: false
  t.integer :sender_type, default: 0
  t.datetime :read_at
  t.timestamps
end
add_index :support_messages, [:support_chat_id, :created_at]
```

### React (with any backend)

**Hook:**
> See [references/details.md](references/details.md) for full code examples.

**Widget Component:**

### Next.js (App Router)

**API Route:**
> See [references/details.md](references/details.md) for full code examples.

**WebSocket with Pusher/Ably (serverless-friendly):**
```typescript
// For serverless, use Pusher, Ably, or similar
import Pusher from 'pusher'
const pusher = new Pusher({ appId, key, secret, cluster })

// When message is created:
await pusher.trigger(`support-chat-${chatId}`, 'new-message', messageData)

// Client-side with pusher-js:
const channel = pusher.subscribe(`support-chat-${chatId}`)
channel.bind('new-message', (data) => { /* update state */ })
```

### PHP/Laravel

**Models:**
> See [references/details.md](references/details.md) for full code examples.

**Broadcasting Event:**
```php
// app/Events/NewSupportMessage.php
class NewSupportMessage implements ShouldBroadcast
{
    public function __construct(public SupportMessage $message) {}

    public function broadcastOn() {
        return new PrivateChannel('support-chat.' . $this->message->support_chat_id);
    }

    public function broadcastAs() { return 'new-message'; }
}
```

### Vue.js

**Composable:**
> See [references/details.md](references/details.md) for full code examples.

---

## Database Recommendations

### PostgreSQL (Recommended)
- Use UUID primary keys for security (non-guessable IDs)
- Use `timestamptz` for all datetime columns
- Add GIN index on content for full-text search (optional)

### MySQL
- Use `CHAR(36)` or `BINARY(16)` for UUIDs
- Use `DATETIME(6)` for microsecond precision
- Consider `utf8mb4` charset for emoji support

### SQLite (Development/Small Scale)
- Works fine for prototyping
- Store UUIDs as TEXT
- No native datetime type, store as ISO8601 strings

### MongoDB (Document Store)
- Embed messages in chat document if message count is bounded
- Or use separate collection with chat_id reference
- Use TTL index on archived chats for auto-cleanup (optional)

---

## Email Processing Recommendations

### Transactional Email Services
- **Postmark** - Best deliverability, simple API
- **SendGrid** - Good free tier, robust
- **AWS SES** - Cheapest at scale
- **Resend** - Modern DX, React email templates

### Implementation Pattern
```pseudo
// Always use background jobs for email
Job: SendSupportReplyNotification
  delay: 5 minutes after admin message

  perform(message_id):
    message = find_message(message_id)

    // Guard clauses - don't send if:
    if message.sender_type != 'admin': return
    if message.read_at != null: return        // Already read
    if message.chat.archived?: return         // Chat archived

    send_email(
      to: message.chat.user.email,
      template: 'support_reply',
      data: { message_preview: message.content.truncate(200) }
    )
> See [references/details.md](references/details.md) for full code examples.
// Poll every 5 seconds when disconnected
if (!websocket.connected) {
  setInterval(() => {
    fetch('/api/support-chat/messages?since=' + lastMessageTime)
      .then(newMessages => appendMessages(newMessages))
  }, 5000)
}
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
