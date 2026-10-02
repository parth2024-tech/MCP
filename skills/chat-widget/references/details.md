# Chat Widget — Code Reference

## ## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
├─────────────────────────────┬───────────────────────────────────┤
│   User Widget               │   Admin Dashboard                 │
│   - Floating chat button    │   - Chat list (active/archived)   │
│   - Message panel           │   - Conversation view             │
│   - Unread badge            │   - Archive/restore controls      │
│   - Connection indicator    │   - User info display             │
└─────────────┬───────────────┴───────────────┬───────────────────┘
              │                               │
              │     WebSocket + REST API      │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│   Channels                  │   Controllers                     │
│   - ChatChannel (per chat)  │   - User: get/create chat         │
│   - AdminChannel (global)   │   - Admin: list, view, archive    │
├─────────────────────────────┼───────────────────────────────────┤
│   Models                    │   Jobs                            │
│   - Chat (1 per user)       │   - Email notification (delayed)  │
│   - Message (many per chat) │                                   │
└─────────────────────────────────────────────────────────────────┘
```


## ### Step 1: Data Models

```pseudo
function touch_last_message()
  update last_message_at = now()

function unread_for_admin?()
  return exists message where sender_type = 'user'
    and created_at > admin_viewed_at

function mark_viewed_by_admin()
  update admin_viewed_at = now()

function archive()
  update archived_at = now()

function unarchive()
  update archived_at = null

function archived?()
  return archived_at != null
```


## ### Step 3: WebSocket Channels

```pseudo
function broadcast_message():
  message_data = {
    id: id,
    content: content,
    sender_type: sender_type,
    read_at: read_at,
    created_at: created_at
  }

  // Broadcast to chat subscribers (user + any viewing admins)
  broadcast("support_chat:#{chat.id}", {
    type: "new_message",
    message: message_data
  })

  // Notify all admins when user sends message
  if sender_type == 'user':
    broadcast("admin_support_notifications", {
      type: "new_user_message",
      chat_id: chat.id,
      user_email: chat.user.email,
      message: message_data
    })
```


## ### Step 4: Frontend - User Widget

```pseudo
function useSupportChat():
  state:
    chat: Chat | null
    connected: boolean
    loading: boolean

  refs:
    consumer: WebSocketConsumer
    subscription: ChannelSubscription
    seenMessageIds: Set<string>  // For deduplication

  on_mount:
    fetch('/support_chat')
      .then(data => {
        chat = data
        seenMessageIds.addAll(data.messages.map(m => m.id))
      })

  when chat.id changes:
    subscription = consumer.subscribe('ChatChannel', { chat_id: chat.id })
    subscription.on_received(data => {
      if data.type == 'new_message':
        if seenMessageIds.has(data.message.id): return  // Dedupe
        seenMessageIds.add(data.message.id)
        chat.messages.push(data.message)
        if data.message.sender_type == 'admin':
          play_notification_sound()
    })
    subscription.on_connected(() => connected = true)
    subscription.on_disconnected(() => connected = false)

  on_unmount:
    subscription.unsubscribe()

  function sendMessage(content):
    subscription.perform('send_message', { content: content.trim() })

  function markAsRead():
    fetch('/support_chat/mark_read', { method: 'PATCH' })
    // Update local state to mark admin messages as read

  return { chat, connected, loading, sendMessage, markAsRead }
```


## ### Step 7: TypeScript Types

```typescript
interface SupportMessage {
  id: string
  content: string
  sender_type: 'user' | 'admin'
  read_at: string | null  // ISO8601
  created_at: string      // ISO8601
}

interface SupportChat {
  id: string
  messages: SupportMessage[]
}

interface SupportChatListItem {
  id: string
  user_id: string
  user_email: string
  last_message_at: string | null
  last_message_preview: string | null
  last_message_sender: 'user' | 'admin' | null
  message_count: number
  unread: boolean
  archived: boolean
}

interface AdminSupportChat {
  id: string
  user_id: string
  user_email: string
  archived: boolean
  messages: SupportMessage[]
}

// WebSocket message types
interface ChatChannelMessage {
  type: 'new_message'
  message: SupportMessage
}

interface AdminNotificationMessage {
  type: 'new_user_message'
  chat_id: string
  user_email: string
  message: SupportMessage
}
```


## ### Ruby on Rails

```ruby
# app/models/support_chat.rb
class SupportChat < ApplicationRecord
  belongs_to :user
  has_many :support_messages, dependent: :destroy

  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }
  scope :recent_first, -> { order(last_message_at: :desc) }

  def touch_last_message
    update_column(:last_message_at, Time.current)
  end

  def unread_for_admin?
    support_messages.where(sender_type: :user)
      .where("created_at > ?", admin_viewed_at || Time.at(0)).exists?
  end

  def archive!
    update_column(:archived_at, Time.current)
  end

  def unarchive!
    update_column(:archived_at, nil)
  end
end

# app/models/support_message.rb
class SupportMessage < ApplicationRecord
  belongs_to :support_chat
  enum :sender_type, { user: 0, admin: 1 }
  validates :content, presence: true

  after_create :update_chat_timestamp
  after_create :auto_unarchive, if: :user?
  after_create_commit :broadcast_message
  after_create_commit :schedule_notification, if: :admin?

  private

  def broadcast_message
    ActionCable.server.broadcast("support_chat:#{support_chat_id}", {
      type: "new_message",
      message: { id:, content:, sender_type:, read_at:, created_at: }
    })
  end

  def schedule_notification
    SupportReplyNotificationJob.set(wait: 5.minutes).perform_later(self)
  end
end
```


## ### React (with any backend)

```typescript
// hooks/useSupportChat.ts
import { useEffect, useState, useRef, useCallback } from 'react'

export function useSupportChat(websocketUrl: string) {
  const [chat, setChat] = useState<Chat | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const seenIds = useRef(new Set<string>())

  useEffect(() => {
    fetch('/api/support_chat').then(r => r.json()).then(data => {
      setChat(data)
      data.messages.forEach((m: Message) => seenIds.current.add(m.id))
    })
  }, [])

  useEffect(() => {
    if (!chat?.id) return
    const ws = new WebSocket(`${websocketUrl}?chat_id=${chat.id}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'new_message' && !seenIds.current.has(data.message.id)) {
        seenIds.current.add(data.message.id)
        setChat(prev => prev ? { ...prev, messages: [...prev.messages, data.message] } : prev)
      }
    }
    return () => ws.close()
  }, [chat?.id])

  const sendMessage = useCallback((content: string) => {
    wsRef.current?.send(JSON.stringify({ action: 'send_message', content }))
  }, [])

  return { chat, connected, sendMessage }
}
```


```tsx
// components/ChatWidget.tsx
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { chat, connected, sendMessage } = useSupportChat('/ws/chat')
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const unreadCount = chat?.messages.filter(
    m => m.sender_type === 'admin' && !m.read_at
  ).length ?? 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat?.messages])

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col">
          <header className="p-3 border-b flex justify-between items-center">
            <span>Support Chat</span>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
          </header>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chat?.messages.map(m => (
              <div key={m.id} className={`p-2 rounded ${m.sender_type === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'}`}>
                {m.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1 border rounded px-2" placeholder="Type a message..." />
            <button onClick={handleSend} className="px-3 py-1 bg-blue-500 text-white rounded">Send</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="w-14 h-14 bg-blue-500 rounded-full text-white relative">
          💬
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
```


## ### Next.js (App Router)

```typescript
// app/api/support-chat/route.ts
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let chat = await prisma.supportChat.findUnique({
    where: { userId: session.user.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  })

  if (!chat) {
    chat = await prisma.supportChat.create({
      data: { userId: session.user.id },
      include: { messages: true }
    })
  }

  return Response.json(chat)
}
```


## ### PHP/Laravel

```php
// app/Models/SupportChat.php
class SupportChat extends Model
{
    protected $casts = ['last_message_at' => 'datetime', 'archived_at' => 'datetime'];

    public function user() { return $this->belongsTo(User::class); }
    public function messages() { return $this->hasMany(SupportMessage::class); }

    public function scopeActive($query) { return $query->whereNull('archived_at'); }
    public function scopeArchived($query) { return $query->whereNotNull('archived_at'); }

    public function isUnreadForAdmin(): bool {
        return $this->messages()
            ->where('sender_type', 'user')
            ->where('created_at', '>', $this->admin_viewed_at ?? '1970-01-01')
            ->exists();
    }
}

// app/Models/SupportMessage.php
class SupportMessage extends Model
{
    protected static function booted() {
        static::created(function ($message) {
            $message->supportChat->update(['last_message_at' => now()]);
            broadcast(new NewSupportMessage($message))->toOthers();

            if ($message->sender_type === 'admin') {
                SendSupportReplyNotification::dispatch($message)->delay(now()->addMinutes(5));
            }
        });
    }
}
```


## ### Vue.js

```typescript
// composables/useSupportChat.ts
import { ref, onMounted, onUnmounted } from 'vue'

export function useSupportChat() {
  const chat = ref<Chat | null>(null)
  const connected = ref(false)
  let ws: WebSocket | null = null
  const seenIds = new Set<string>()

  onMounted(async () => {
    const res = await fetch('/api/support-chat')
    chat.value = await res.json()
    chat.value?.messages.forEach(m => seenIds.add(m.id))

    ws = new WebSocket(`/ws/chat?id=${chat.value?.id}`)
    ws.onopen = () => connected.value = true
    ws.onclose = () => connected.value = false
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'new_message' && !seenIds.has(data.message.id)) {
        seenIds.add(data.message.id)
        chat.value?.messages.push(data.message)
      }
    }
  })

  onUnmounted(() => ws?.close())

  const sendMessage = (content: string) => {
    ws?.send(JSON.stringify({ action: 'send_message', content }))
  }

  return { chat, connected, sendMessage }
}
```


## ### Implementation Pattern

```

### Email Template Tips
- Include message preview (truncated)
- Add direct link to open chat (if web app)
- Keep subject simple: "New reply from [App] Support"
- Include unsubscribe link for compliance

---

## Real-Time Technology Options

| Technology | Best For | Serverless? |
|------------|----------|-------------|
| ActionCable (Rails) | Rails apps | No |
| Socket.IO | Node.js apps | No |
| Pusher | Any stack | Yes |
| Ably | Any stack | Yes |
| Supabase Realtime | Supabase users | Yes |
| Firebase RTDB | Firebase users | Yes |
| Server-Sent Events | Simple one-way | Yes |

### Fallback Strategy
If WebSocket unavailable, implement polling:
```pseudo


