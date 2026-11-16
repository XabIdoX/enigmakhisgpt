import { Client, GatewayIntentBits } from 'discord.js';

const SUMMARY_MARKER = '📌 SYNTHÈSE DES IDÉES VALIDÉES';
const CURSOR_PATTERN = /\|\|ENIGMAKHI_CURSOR:(\d{17,20})\|\|/;

function compareSnowflakes(a, b) {
  return BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
}

function isApprovalSummary(message, botId) {
  return message.author?.id === botId && (message.content?.startsWith(SUMMARY_MARKER)
    || (message.reference?.messageId && message.embeds.some((embed) => embed.title === 'Idées validées')));
}

async function latestCursor(channel, botId) {
  let before;
  while (true) {
    const page = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!page.size) return null;
    const ordered = [...page.values()].sort((a, b) => compareSnowflakes(b.id, a.id));
    const summary = ordered.find((message) => isApprovalSummary(message, botId));
    if (summary) return summary.reference?.messageId || summary.content.match(CURSOR_PATTERN)?.[1] || null;
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
  const body = String(message.content || '').trim().replace(/\s+/g, ' ');
  const excerpt = body.length > 300 ? body.slice(0, 299) + '…' : body;
  return {
    name: (index + 1) + ' · ' + author,
    value: (excerpt || 'Message sans texte') + '\n[Voir le message original](' + message.url + ')',
  };
}

async function publishBatch(channel, messages, approvalMessage) {
  const fields = messages.slice(0, 6).map(formatIdea);
  if (messages.length > fields.length) {
    fields.push({ name: 'Suite du lot', value: (messages.length - fields.length)
      + ' autres messages à consulter dans le salon, avant cet OK.' });
  }
  const count = messages.length;
  const label = count === 1 ? 'proposition' : 'propositions';
  await channel.send({
    embeds: [{
      title: 'Idées validées',
      color: 0xb9874e,
      description: count ? '✅ **' + count + ' ' + label + '** dans ce lot.'
        : 'Aucune nouvelle idée depuis le dernier OK.',
      fields,
      footer: { text: 'EnigmAkhi · Validation par ' + (approvalMessage.author.globalName || approvalMessage.author.username) },
      timestamp: approvalMessage.createdAt.toISOString(),
    }],
    reply: { messageReference: approvalMessage.id },
    allowedMentions: { parse: [], repliedUser: false },
    nonce: approvalMessage.id,
    enforceNonce: true,
  });
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
