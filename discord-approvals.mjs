import { Client, GatewayIntentBits } from 'discord.js';
import {
  APPROVED_TITLE, CANCELLED_TITLE, HELP, authorName, attachments,
  buildIdeaJournal, fetchHistory, parseCommand, referenceId,
} from './discord-ideas.mjs';

const allowedMentions = { parse: [], repliedUser: false };
const excerpt = (text, max) => text.length > max ? text.slice(0, max - 1) + '…' : text;
const plain = (text) => String(text).replace(/([\\`*_~|<>\[\]])/g, '\\$1');

function ideaField(idea, status) {
  const files = attachments(idea.message).length;
  return {
    name: excerpt(`#${idea.number} · ${status || authorName(idea.message)}`, 256),
    value: excerpt(plain(idea.text || 'Message sans texte'), 500)
      + (files ? `\n📎 ${files} pièce(s) jointe(s)` : '')
      + `\n[Message original](${idea.message.url}) · ID : ${idea.id}`
      + (idea.modifiedBy ? `\n[Dernière correction](${idea.modifiedBy.url})` : ''),
  };
}

function summaryEmbed(batch) {
  const fields = batch.ideas.slice(0, 6).map((i) => ideaField(i));
  if (batch.ideas.length > 6) fields.push({ name: 'Suite du lot', value: `${batch.ideas.length - 6} autres idées : utilise \`:liste\`. Le relais Codex reçoit le lot complet.` });
  return {
    title: batch.cancelled ? CANCELLED_TITLE : APPROVED_TITLE,
    color: batch.cancelled ? 0x747f8d : 0xb9874e,
    description: batch.cancelled ? 'Ce lot a été annulé par DoX.'
      : batch.ideas.length ? `✅ **${batch.ideas.length} proposition(s)** dans ce lot.` : 'Ce lot ne contient aucune idée.',
    fields,
    footer: { text: 'EnigmAkhi · Validation par ' + authorName(batch.message) },
    timestamp: batch.message.createdAt.toISOString(),
  };
}

function responseEmbeds(command) {
  if (command.error) return [{ title: 'Commande non appliquée', description: command.error }];
  if (command.name === 'aide') return [{ title: 'Commandes du bot', description: HELP }];
  if (command.name === 'supprimer') return [{
    title: 'Idée retirée', description: `L’idée #${command.idea.number} a été retirée de la liste et de son lot. Le message original reste dans Discord.`,
  }];
  if (command.name === 'modifier') return [{
    title: 'Idée modifiée', description: `L’idée #${command.idea.number} est corrigée, y compris dans son lot si elle était validée. Son statut est conservé.\n[Voir l’original](${command.idea.message.url})\nUn travail déjà engagé ou livré n’est pas modifié automatiquement.`,
  }];
  if (command.name === 'annuler') return [{ title: 'Annulation confirmée', description: 'Ta dernière validation est annulée. Les idées restent visibles dans `:liste`. Un travail déjà engagé ou livré n’est pas annulé.' }];
  const ideas = command.ideas || [];
  if (!ideas.length) return [{ title: 'Liste des idées', description: 'Aucune idée enregistrée.' }];
  const pages = [];
  for (let index = 0; index < ideas.length; index += 6) pages.push({
    title: 'Liste des idées', description: `${ideas.length} idée(s) · page ${pages.length + 1}/${Math.ceil(ideas.length / 6)}\n\`:modifier <numéro> <nouveau texte>\` ou réponse au message original.`,
    fields: ideas.slice(index, index + 6).map((i) => ideaField(i, i.status)),
  });
  return pages;
}

export async function processIdeaCommands(channel, { botId, approverId }) {
  const messages = await fetchHistory((options) => channel.messages.fetch(options));
  const journal = buildIdeaJournal(messages, { botId, approverId });
  // Reconcile final state before acknowledging edits; retries repair partial failures.
  for (const batch of journal.batches) {
    const embed = summaryEmbed(batch);
    if (batch.summary) {
      const content = referenceId(batch.summary) ? '' : `${batch.cancelled ? '🚫 SYNTHÈSE ANNULÉE' : '📌 SYNTHÈSE DES IDÉES VALIDÉES'}\n||ENIGMAKHI_CURSOR:${batch.id}||`;
      const previous = batch.summary.embeds[0]?.toJSON?.() || batch.summary.embeds[0];
      const same = Object.keys(embed).every((key) => JSON.stringify(previous?.[key]) === JSON.stringify(embed[key]));
      if (!same || batch.summary.content !== content) await batch.summary.edit({ content, embeds: [embed], allowedMentions });
    } else {
      await channel.send({ embeds: [embed], reply: { messageReference: batch.id }, allowedMentions, nonce: batch.id, enforceNonce: true });
    }
  }
  for (const command of journal.commands) {
    if (command.legacy || (command.name === 'valider' && !command.error)) continue;
    const embeds = responseEmbeds(command);
    for (const [page, embed] of embeds.entries()) {
      const marker = `EnigmAkhi · commande ${command.message.id} · page ${page + 1}`;
      if (messages.some((m) => m.author?.id === botId && m.embeds?.some((e) => e.footer?.text?.startsWith(marker + ' ·') || e.footer?.text === marker))) continue;
      embed.color = 0xb9874e;
      embed.footer = { text: marker + (command.idea ? ` · cible ${command.idea.id}` : '') };
      await channel.send({
        embeds: [embed], reply: { messageReference: command.message.id }, allowedMentions,
        nonce: `${command.message.id}-${page}`, enforceNonce: true,
      });
    }
  }
  return journal;
}

export function startApprovalBot({ token, channelId, approverId }) {
  if (!token || !channelId || !approverId) {
    console.warn('[discbot] Écoute désactivée : configurez DISCORD_BOT_TOKEN, DISCORD_IDEAS_CHANNEL_ID et DISCORD_APPROVER_USER_ID.');
    return null;
  }
  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
  let queue = Promise.resolve();
  function scheduleProcessing() {
    queue = queue.then(async () => {
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased() || !channel.messages) throw new Error('Le salon idées est inaccessible.');
      await processIdeaCommands(channel, { botId: client.user.id, approverId });
    }).catch((error) => console.error('[discbot] Impossible de traiter les commandes Discord :', error));
    return queue;
  }
  client.once('ready', () => {
    console.log(`[discbot] ${client.user.tag} connecté ; commandes chargées ; :valider et :annuler réservées à DoX.`);
    void scheduleProcessing();
  });
  client.on('messageCreate', (message) => {
    if (message.channelId === channelId && !message.author.bot && parseCommand(message.content)) void scheduleProcessing();
  });
  client.on('error', (error) => console.error('[discbot] Erreur Discord :', error));
  void client.login(token).catch((error) => console.error('[discbot] Connexion Discord impossible :', error));
  return client;
}
