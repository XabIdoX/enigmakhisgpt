import { Client, GatewayIntentBits } from 'discord.js';

const SUMMARY_MARKER = '📌 SYNTHÈSE DES IDÉES VALIDÉES';
const CANCELLED_MARKER = '🚫 SYNTHÈSE ANNULÉE';
const APPROVED_TITLE = 'Idées validées';
const CANCELLED_TITLE = 'Validation annulée';
const CURSOR_PATTERN = /\|\|ENIGMAKHI_CURSOR:(\d{17,20})\|\|/;

function compareSnowflakes(a, b) {
  return BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
}

function approvalId(message, botId) {
  if (message.author?.id !== botId) return null;
  if (message.embeds.some((embed) => [APPROVED_TITLE, CANCELLED_TITLE].includes(embed.title))) {
    return message.reference?.messageId || null;
  }
  if (message.content.startsWith(SUMMARY_MARKER) || message.content.startsWith(CANCELLED_MARKER)) {
    return message.content.match(CURSOR_PATTERN)?.[1] || null;
  }
  return null;
}

async function latestSummary(channel, botId) {
  let before;
  while (true) {
    const page = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!page.size) return null;
    const ordered = [...page.values()].sort((a, b) => compareSnowflakes(b.id, a.id));
    const summary = ordered.find((message) => approvalId(message, botId));
    if (summary) return summary;
    if (page.size < 100) return null;
    before = ordered.at(-1).id;
  }
}

async function cancelSummary(summary) {
  const embed = summary.embeds.find((item) => item.title === APPROVED_TITLE);
  const allowedMentions = { parse: [], repliedUser: false };
  if (embed) {
    await summary.edit({ embeds: [{
      ...embed.toJSON(),
      title: CANCELLED_TITLE,
      color: 0x747f8d,
      description: 'Ce lot a été annulé par DoX.',
    }], allowedMentions });
  } else if (summary.content.startsWith(SUMMARY_MARKER)) {
    await summary.edit({
      content: summary.content.replace(SUMMARY_MARKER, CANCELLED_MARKER),
      allowedMentions,
    });
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
  return channel.send({
    embeds: [{
      title: APPROVED_TITLE,
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
    const botId = client.user.id;
    let summary = await latestSummary(channel, botId);
    const cursor = summary && approvalId(summary, botId);
    const messages = await messagesAfter(channel, cursor);
    let pending = [];

    for (const message of messages) {
      if (message.author.bot) continue;
      const command = message.content.trim().toLowerCase();
      if (message.author.id === approverId && command === 'ok') {
        summary = await publishBatch(channel, pending, message);
        pending = [];
      } else if (message.author.id === approverId && command === 'annuler') {
        if (summary) await cancelSummary(summary);
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
    if (message.channelId === channelId && message.author.id === approverId && /^(ok|annuler)$/i.test(message.content.trim())) {
      void scheduleProcessing();
    }
  });
  client.on('error', (error) => console.error('[discbot] Erreur Discord :', error));
  void client.login(token).catch((error) => console.error('[discbot] Connexion Discord impossible :', error));
  return client;
}
