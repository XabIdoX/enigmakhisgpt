import { Client, GatewayIntentBits } from 'discord.js';

const SUMMARY_MARKER = '📌 SYNTHÈSE DES IDÉES VALIDÉES';
const CURSOR_PATTERN = /\\|\\|ENIGMAKHI_CURSOR:(\\d{17,20})\\|\\|/;

function compareSnowflakes(a, b) {
  return BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
}

function isApprovalSummary(message, botId) {
  return message.author?.id === botId && message.content?.startsWith(SUMMARY_MARKER);
}

async function latestCursor(channel, botId) {
  let before;
  while (true) {
    const page = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!page.size) return null;
    const ordered = [...page.values()].sort((a, b) => compareSnowflakes(b.id, a.id));
    const summary = ordered.find((message) => isApprovalSummary(message, botId));
    if (summary) return summary.content.match(CURSOR_PATTERN)?.[1] || null;
    if (page.size < 100) return null;
    before = ordered.at(-1).id;
  }
}

async function messagesAfter(channel, cursor) {
  const collected = [];
  let after = cursor || '0';
  while (true) {
    const page = await channel.messages.fetch({ limit: 100, after });
    if (!page.size) break;
    const ordered = [...page.values()].sort((a, b) => compareSnowflakes(a.id, b.id));
    collected.push(...ordered);
    const newest = ordered.at(-1).id;
    if (page.size < 100 || newest === after) break;
    after = newest;
  }
  return collected;
}

function formatIdea(message, index) {
  const author = message.author?.globalName || message.author?.username || 'Membre Discord';
  const body = String(message.content || '').trim().replace(/\\s+/g, ' ');
  const attachments = [...(message.attachments?.values?.() || [])]
    .map((attachment) => attachment.url)
    .join(' ');
  const excerpt = (body || (attachments ? 'Pièce jointe' : 'Message sans texte')).slice(0, 190);
  return `• **${index + 1}. ${author}** : ${excerpt}${attachments ? ` — ${attachments}` : ''}\n  <${message.url}>`;
}

async function publishBatch(channel, messages, approvalMessage) {
  const items = messages.slice(0, 6).map(formatIdea);
  if (messages.length > 6) items.push(`• … et ${messages.length - 6} autre(s) message(s) de cette période.`);
  const summary = [
    SUMMARY_MARKER,
    `Validée par <@${approvalMessage.author.id}> — ${new Date(approvalMessage.createdTimestamp).toLocaleString('fr-FR')}`,
    messages.length ? items.join('\\n') : 'Aucune nouvelle idée entre les deux OK.',
    `||ENIGMAKHI_CURSOR:${approvalMessage.id}||`,
  ].join('\\n\\n').slice(0, 1990);
  await channel.send({ content: summary, allowedMentions: { users: [approvalMessage.author.id] } });
}

export function startApprovalBot({ token, channelId, approverId }) {
  if (!token || !channelId || !approverId) {
    console.warn('[discbot] Écoute des approbations désactivée : configurez DISCORD_BOT_TOKEN, DISCORD_IDEAS_CHANNEL_ID et DISCORD_APPROVER_USER_ID.');
    return null;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });
  let queue = Promise.resolve();

  async function processApprovals() {
    const channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased() || !channel.messages) throw new Error('Le salon idées est inaccessible.');
    const cursor = await latestCursor(channel, client.user.id);
    const messages = await messagesAfter(channel, cursor);
    let pending = [];

    for (const message of messages) {
      if (message.author.bot || isApprovalSummary(message, client.user.id)) continue;
      if (message.author.id === approverId && /^ok$/i.test(message.content.trim())) {
        await publishBatch(channel, pending, message);
        pending = [];
      } else {
        pending.push(message);
      }
    }
  }

  function scheduleProcessing() {
    queue = queue.then(processApprovals).catch((error) => {
      console.error('[discbot] Impossible de traiter les OK Discord :', error);
    });
    return queue;
  }

  client.once('ready', () => {
    console.log(`[discbot] ${client.user.tag} connecté ; traitement du backlog des OK.`);
    void scheduleProcessing();
  });
  client.on('messageCreate', (message) => {
    if (message.channelId === channelId && message.author.id === approverId && /^ok$/i.test(message.content.trim())) {
      void scheduleProcessing();
    }
  });
  client.on('error', (error) => console.error('[discbot] Erreur Discord :', error));
  void client.login(token).catch((error) => console.error('[discbot] Connexion Discord impossible :', error));
  return client;
}
