// Discord is the durable journal: replay it after each wake-up, without a local DB.
export const APPROVED_TITLE = 'Idées validées';
export const CANCELLED_TITLE = 'Validation annulée';
export const HELP = [
  '`:OK` — valider les nouvelles idées.',
  '`:annuler` — annuler la dernière validation.',
  '`:liste` — afficher toutes les idées et leur statut.',
  '`:modifier 3 Nouveau texte` — remplacer le texte de l’idée n° 3.',
  'Tu peux aussi utiliser son identifiant ou son lien, ou répondre au message original avec `:modifier Nouveau texte`.',
  '`:aide` — revoir ces commandes. Elles sont réservées à DoX.',
].join('\n');

export const compareIds = (a, b) => BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
export const referenceId = (m) => m.reference?.messageId || m.message_reference?.message_id;
export const authorName = (m) => m.author?.globalName || m.author?.global_name || m.author?.username || 'Membre Discord';
export const attachments = (m) => [...(m.attachments?.values?.() || m.attachments || [])]
  .map((a) => ({ nom: a.name || a.filename, url: a.url }));

export function summaryApprovalId(message, botId) {
  if (message.author?.id !== botId) return null;
  if (referenceId(message) && message.embeds?.some((e) => [APPROVED_TITLE, CANCELLED_TITLE].includes(e.title))) return referenceId(message);
  if (/^(📌 SYNTHÈSE DES IDÉES VALIDÉES|🚫 SYNTHÈSE ANNULÉE)/u.test(message.content || '')) {
    return message.content.match(/\|\|ENIGMAKHI_CURSOR:(\d{17,20})\|\|/)?.[1];
  }
  return null;
}

export function parseCommand(content) {
  const text = String(content || '').trim();
  if (!text.startsWith(':')) return null;
  const match = text.match(/^:([^\s]+)(?:\s+([\s\S]*))?$/u);
  return { name: match?.[1].toLowerCase() || '', args: match?.[2]?.trim() || '' };
}

export async function fetchHistory(fetchPage) {
  const messages = new Map();
  let before;
  while (true) {
    const page = [...(await fetchPage({ limit: 100, ...(before ? { before } : {}) })).values()];
    if (!page.length) break;
    for (const m of page) messages.set(m.id, m);
    const oldest = page.reduce((id, m) => compareIds(m.id, id) < 0 ? m.id : id, page[0].id);
    if (before && compareIds(oldest, before) >= 0) throw new Error('Pagination Discord sans progression.');
    if (page.length < 100) break;
    before = oldest;
  }
  return [...messages.values()].sort((a, b) => compareIds(a.id, b.id));
}

export function ideaStatus(idea) {
  return !idea.batch ? 'À valider' : idea.batch.cancelled ? 'Validation annulée' : 'Validée';
}

export function buildIdeaJournal(messages, { approverId, botId }) {
  const ordered = [...messages].sort((a, b) => compareIds(a.id, b.id));
  const summaries = new Map();
  const receipts = new Map();
  for (const m of ordered) {
    const approval = summaryApprovalId(m, botId);
    if (approval) summaries.set(approval, m);
    if (m.author?.id === botId && referenceId(m)) {
      const footer = m.embeds?.[0]?.footer?.text || '';
      if (footer.startsWith('EnigmAkhi · commande ') || m.embeds?.[0]?.title === 'Annulation confirmée') receipts.set(referenceId(m), m);
    }
  }
  const ideas = [];
  const batches = [];
  const commands = [];
  let pending = [];
  for (const message of ordered) {
    if (message.author?.bot || message.author?.id === botId) continue;
    const text = String(message.content || '').trim();
    let command = parseCommand(text);
    // Only migrate bare commands already acknowledged by the previous bot.
    if (/^ok$/i.test(text) && summaries.has(message.id)) command = { name: 'ok', args: '', legacy: true };
    if (/^annuler$/i.test(text) && receipts.has(message.id)) command = { name: 'annuler', args: '', legacy: true };
    if (!command) {
      if (/^(ok|annuler)$/i.test(text)) continue;
      if (!text && !attachments(message).length) continue;
      const idea = { id: message.id, number: ideas.length + 1, message, text, batch: null };
      ideas.push(idea);
      pending.push(idea);
      continue;
    }
    // Commands from all other accounts never execute or become proposals.
    if (!approverId || message.author?.id !== approverId) continue;
    const result = { ...command, message, receipt: receipts.get(message.id) };
    commands.push(result);
    if (command.name !== 'modifier' && command.args) {
      result.error = 'Cette commande ne prend pas de texte après son nom. Consulte `:aide`.';
    } else if (command.name === 'ok') {
      const old = summaries.get(message.id);
      const cancelled = command.legacy && (old?.embeds?.some((e) => e.title === CANCELLED_TITLE)
        || old?.content?.startsWith('🚫 SYNTHÈSE ANNULÉE'));
      const batch = { id: message.id, message, ideas: pending, cancelled: !!cancelled, summary: old };
      for (const idea of pending) idea.batch = batch;
      batches.push(batch);
      result.batch = batch;
      pending = [];
    } else if (command.name === 'annuler') {
      const batch = batches.at(-1);
      if (!batch) result.error = 'Aucune validation à annuler.';
      else if (batch.cancelled && !command.legacy) result.error = 'Ta dernière validation est déjà annulée.';
      else { batch.cancelled = true; result.batch = batch; }
    } else if (command.name === 'modifier') {
      let target;
      let replacement;
      if (referenceId(message)) {
        target = referenceId(message);
        replacement = command.args;
      } else {
        const match = command.args.match(/^(\S+)\s+([\s\S]+)$/u);
        target = match?.[1];
        replacement = match?.[2]?.trim();
      }
      const pinnedTarget = result.receipt?.embeds?.[0]?.footer?.text?.match(/ · cible (\d+)/)?.[1];
      const linkedId = target?.match(/^https:\/\/(?:www\.)?discord(?:app)?\.com\/channels\/\d+\/\d+\/(\d+)$/)?.[1];
      const key = pinnedTarget || linkedId || target?.replace(/^#/, '');
      const idea = ideas.find((i) => i.id === key)
        || (!pinnedTarget && /^\d{1,9}$/.test(key || '') ? ideas.find((i) => i.number === Number(key)) : null);
      if (!replacement) result.error = 'Utilise `:modifier <numéro, identifiant ou lien> <nouveau texte>`, ou réponds au message original avec `:modifier <nouveau texte>`.';
      else if (!idea) result.error = 'Idée introuvable. Consulte `:liste` ou réponds au message original de l’idée.';
      else {
        idea.text = replacement;
        idea.modifiedBy = message;
        result.idea = idea;
      }
    } else if (command.name === 'liste') {
      result.ideas = ideas.map((i) => ({ ...i, status: ideaStatus(i) }));
    } else if (command.name !== 'aide') result.error = 'Commande inconnue. Consulte `:aide`.';
  }
  return { ideas, batches, commands };
}

export function journalForRelay(journal, { guildId, channelId }) {
  const url = (id) => `https://discord.com/channels/${guildId}/${channelId}/${id}`;
  const proposal = (idea) => ({
    id: idea.id, numero: idea.number, auteur: authorName(idea.message), auteur_id: idea.message.author.id,
    date: idea.message.timestamp || idea.message.createdAt?.toISOString(), texte: idea.text,
    statut: ideaStatus(idea), validation_id: idea.batch?.id || null,
    pieces_jointes: attachments(idea.message), lien: url(idea.id),
    ...(idea.modifiedBy ? { modification: url(idea.modifiedBy.id) } : {}),
  });
  const propositions = journal.ideas.map(proposal);
  const syntheses = journal.batches.filter((b) => !b.cancelled).map((b) => ({
    id: b.summary?.id || b.id, validation_id: b.id,
    date: b.message.timestamp || b.message.createdAt?.toISOString(),
    texte: [APPROVED_TITLE, ...b.ideas.map((i) => `#${i.number} · ${authorName(i.message)}\n${i.text}\n${url(i.id)}`)].join('\n\n'),
    propositions: b.ideas.map(proposal), lien: url(b.summary?.id || b.id),
  }));
  return { nombre: propositions.length, propositions, nombre_syntheses: syntheses.length, syntheses };
}
