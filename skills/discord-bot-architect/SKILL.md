---
name: discord-bot-architect
description: Specialized skill for building production-ready Discord bots. Use when the task involves discord bot architect.
  Covers Discord.js (JavaScript) and Pycord (Python), gateway intents, slash
  commands, interactive components, rate limiting, and sharding.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Discord Bot Architect

Specialized skill for building production-ready Discord bots.
Covers Discord.js (JavaScript) and Pycord (Python), gateway intents,
slash commands, interactive components, rate limiting, and sharding.

## Principles

- Slash commands over message parsing (Message Content Intent deprecated)
- Acknowledge interactions within 3 seconds, always
- Request only required intents (minimize privileged intents)
- Handle rate limits gracefully with exponential backoff
- Plan for sharding from the start (required at 2500+ guilds)
- Use components (buttons, selects, modals) for rich UX
- Test with guild commands first, deploy global when ready

## Patterns

### Discord.js v14 Foundation

Modern Discord bot setup with Discord.js v14 and slash commands

**When to use**: Building Discord bots with JavaScript/TypeScript,Need full gateway connection with events,Building bots with complex interactions

> See [references/details.md](references/details.md) for full code examples.




### Structure

discord-bot/
├── src/
│   ├── index.js           # Main entry point
│   ├── deploy-commands.js # Command registration script
│   ├── commands/          # Slash command handlers
│   │   └── ping.js
│   └── events/            # Event handlers
│       ├── ready.js
│       └── interactionCreate.js
├── .env
└── package.json

### Pycord Bot Foundation

Discord bot with Pycord (Python) and application commands

**When to use**: Building Discord bots with Python,Prefer async/await patterns,Need good slash command support

> See [references/details.md](references/details.md) for full code examples.


### Structure

discord-bot/
├── main.py           # Main bot file
├── cogs/             # Command groups
│   └── general.py
├── .env
└── requirements.txt

### Interactive Components Pattern

Using buttons, select menus, and modals for rich UX

**When to use**: Need interactive user interfaces,Collecting user input beyond slash command options,Building menus, confirmations, or forms

> See [references/details.md](references/details.md) for full code examples.



### Limits

- 5 ActionRows per message/modal
- 5 buttons per ActionRow
- 1 select menu per ActionRow (takes all 5 slots)
- 5 select menus max per message
- 25 options per select menu
- Modal must be first response (cannot defer first)

### Deferred Response Pattern

Handle slow operations without timing out

**When to use**: Operation takes more than 3 seconds,Database queries, API calls, LLM responses,File processing or generation

> See [references/details.md](references/details.md) for full code examples.

```python
# Pycord - Deferred response
@bot.slash_command(name="slow-task")
async def slow_task(ctx: discord.ApplicationContext):
    # Defer immediately
    await ctx.defer()
    # For ephemeral: await ctx.defer(ephemeral=True)

    try:
        result = await slow_database_query()
        ai_response = await call_openai(result)

        await ctx.followup.send(f"Result: {ai_response}")
    except Exception as e:
        await ctx.followup.send("An error occurred")
```

### Timing

- Initial_response: 3 seconds
- Deferred_followup: 15 minutes
- Ephemeral_note: Can only be set on initial response, not changed later

### Embed Builder Pattern

Rich embedded messages for professional-looking content

**When to use**: Displaying formatted information,Status updates, help menus, logs,Data with structure (fields, images)

> See [references/details.md](references/details.md) for full code examples.


### Limits

- 10 embeds per message
- 6000 characters total across all embeds
- 256 characters for title
- 4096 characters for description
- 25 fields per embed
- 256 characters per field name
- 1024 characters per field value

### Rate Limit Handling Pattern

Gracefully handle Discord API rate limits

**When to use**: High-volume operations,Bulk messaging or role assignments,Any repeated API calls

> See [references/details.md](references/details.md) for full code examples.


### Rate_limits

- Global: 50 requests per second
- Gateway: 120 requests per 60 seconds
- Specific: Messages to same channel: 5/5s, Bulk delete: 1/1s, Guild member requests: varies by guild size

### Sharding Pattern

Scale bots to 2500+ servers with sharding

**When to use**: Bot approaching 2500 guilds (required),Want horizontal scaling,Memory optimization for large bots

> See [references/details.md](references/details.md) for full code examples.


### Scaling_guide

- 1-2500 guilds: No sharding required
- 2500+ guilds: Sharding required by Discord
- Recommended: ~1000 guilds per shard
- Memory: Each shard runs in separate process

## Sharp Edges

### Interaction Timeout (3 Second Rule)

Severity: CRITICAL

Situation: Handling slash commands, buttons, select menus, or modals

Symptoms:
User sees "This interaction failed" or "The application did not respond."
Command works locally but fails in production.
Slow operations never complete.

Why this breaks:
Discord requires ALL interactions to be acknowledged within 3 seconds:
- Slash commands
- Button clicks
- Select menu selections
- Context menu commands

If you do ANY slow operation (database, API, file I/O) before responding,
you'll miss the window. Discord shows an error even if your bot processes
the request correctly afterward.

After acknowledgment, you have 15 minutes for follow-up responses.

Recommended fix:

## Acknowledge immediately, process later

```javascript
// Discord.js - Defer for slow operations
module.exports = {
  async execute(interaction) {
    // DEFER IMMEDIATELY - before any slow operation
    await interaction.deferReply();
    // For ephemeral: await interaction.deferReply({ ephemeral: true });

    // Now you have 15 minutes
    const result = await slowDatabaseQuery();
    const aiResponse = await callLLM(result);

    // Edit the deferred reply
    await interaction.editReply(`Result: ${aiResponse}`);
  }
};
```

```python
# Pycord
@bot.slash_command()
async def slow_command(ctx):
    await ctx.defer()  # Acknowledge immediately
    # await ctx.defer(ephemeral=True)  # For private response

    result = await slow_operation()
    await ctx.followup.send(f"Result: {result}")
```

## For components (buttons, menus)

```javascript
// If you're updating the message
await interaction.deferUpdate();

// If you're sending a new response
await interaction.deferReply({ ephemeral: true });
> See [references/details.md](references/details.md) for full code examples.
1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to Bot section
4. Scroll to Privileged Gateway Intents
5. Toggle ON the intents you need
```

## Step 2: Request in code

```javascript
// Discord.js
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,       // PRIVILEGED
    // GatewayIntentBits.GuildPresences,  // PRIVILEGED
    // GatewayIntentBits.MessageContent,  // PRIVILEGED - avoid!
  ]
});
```

```python
# Pycord
intents = discord.Intents.default()
intents.members = True       # PRIVILEGED
# intents.presences = True   # PRIVILEGED
# intents.message_content = True  # PRIVILEGED - avoid!

bot = commands.Bot(intents=intents)
> See [references/details.md](references/details.md) for full code examples.
// deploy-commands.js - Run manually, not on bot start
const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function deploy() {
  // For development: Guild commands (instant)
  if (process.env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log('Guild commands deployed instantly');
  }

  // For production: Global commands (up to 1 hour)
  else {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('Global commands deployed (may take up to 1 hour)');
  }
}

deploy();
```

```python
# Pycord - Don't sync on every startup
@bot.event
async def on_ready():
    # DON'T DO THIS:
    # await bot.sync_commands()

    print(f"Ready! Commands should already be registered.")

# Instead, sync manually or use a flag
if __name__ == "__main__":
    if "--sync" in sys.argv:
        # Only sync when explicitly requested
        bot.sync_commands_on_start = True
    bot.run(token)
> See [references/details.md](references/details.md) for full code examples.
// BAD - never do this
const token = 'MTIzNDU2Nzg5MDEyMzQ1Njc4.ABCDEF.xyz...';

// GOOD - environment variables
require('dotenv').config();
client.login(process.env.DISCORD_TOKEN);
```

## Use .gitignore

```
# .gitignore
.env
.env.local
config.json
```

## If token is exposed

1. Go to Developer Portal immediately
2. Regenerate the token
3. Update all deployments
4. Review bot activity for unauthorized actions
5. Check git history and force push to remove if needed

## Use environment variables properly

```bash
# .env (never commit)
DISCORD_TOKEN=your_token_here
CLIENT_ID=your_client_id
```

```javascript
// Load with dotenv
require('dotenv').config();
const token = process.env.DISCORD_TOKEN;
> See [references/details.md](references/details.md) for full code examples.
https://discord.com/api/oauth2/authorize
  ?client_id=YOUR_CLIENT_ID
  &permissions=0
  &scope=bot%20applications.commands
```

## In Discord Developer Portal

1. Go to OAuth2 > URL Generator
2. Select BOTH:
   - `bot`
   - `applications.commands`
3. Select required bot permissions
4. Use generated URL

## Re-invite without kicking

Users can use the new invite URL even if bot is already in server.
This adds the new scope without removing the bot.

```javascript
// Generate invite URL in code
const inviteUrl = client.generateInvite({
  scopes: ['bot', 'applications.commands'],
  permissions: [
    'SendMessages',
    'EmbedLinks',
    // Add other needed permissions
  ]
});
> See [references/details.md](references/details.md) for full code examples.
// Instant updates for testing
await rest.put(
  Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
  { body: commands }
);
```

## Production: Deploy global commands during off-peak

```javascript
// Takes up to 1 hour to propagate
await rest.put(
  Routes.applicationCommands(CLIENT_ID),
  { body: commands }
);
> See [references/details.md](references/details.md) for full code examples.
// BAD - blocks event loop
const data = fs.readFileSync('file.json');

// GOOD - async
const data = await fs.promises.readFile('file.json');
```

## Handle reconnections gracefully

```javascript
client.on('shardResume', (id, replayedEvents) => {
  console.log(`Shard ${id} resumed, replayed ${replayedEvents} events`);
});

client.on('shardDisconnect', (event, id) => {
  console.log(`Shard ${id} disconnected`);
});

client.on('shardReconnecting', (id) => {
  console.log(`Shard ${id} reconnecting...`);
});
```

## Implement sharding at scale

```javascript
// Required at 2500+ guilds
const manager = new ShardingManager('./bot.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto'
});
manager.spawn();
> See [references/details.md](references/details.md) for full code examples.
// CORRECT - modal is first response
async execute(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('my-modal')
    .setTitle('Input Form');

  // Show immediately - no defer, no reply first
  await interaction.showModal(modal);
}
```

```javascript
// WRONG - deferred first
async execute(interaction) {
  await interaction.deferReply();  // CAN'T DO THIS
  await interaction.showModal(modal);  // Will fail
}
```

## If you need to check something first

```javascript
async execute(interaction) {
  // Quick sync check is OK (under 3 seconds)
  if (!hasPermission(interaction.user.id)) {
    return interaction.reply({
      content: 'No permission',
      ephemeral: true
    });
  }

  // Show modal (still first interaction response for this path)
  await interaction.showModal(modal);
}
> See [references/details.md](references/details.md) for full code examples.
