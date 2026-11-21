// A curated demonstration, deliberately separate from the final puzzle.
export function freshGreenState() {
  return { inspected: [], battle: false, finished: false };
}

export function actGreen(green, data, actor, note) {
  if (data.action === 'green-inspect') {
    const names = { ivory: 'le serment du roi d’Ivoire', basalt: 'le serment du roi de Basalte', stele: 'la stèle de la dernière bataille' };
    if (!Object.hasOwn(names, data.clueId)) return 'Cette inscription est introuvable.';
    if (!green.inspected.includes(data.clueId)) {
      green.inspected.push(data.clueId);
      note(`${actor} déchiffre ${names[data.clueId]} à Gunung Padang.`);
    }
    return null;
  }
  if (data.action === 'green-battle') {
    if (green.inspected.length < 3) return 'Examinez les deux serments et la stèle avant de réveiller la bataille.';
    if (!green.battle) {
      green.battle = true;
      note(`${actor} réveille la bataille des deux rois. Le dernier mouvement reste à trouver.`);
    }
    return null;
  }
  if (data.action === 'green-move') {
    if (!green.battle) return 'La bataille n’est pas encore réveillée.';
    if (green.finished) return 'Le dernier coup a déjà été trouvé par l’équipe.';
    if (data.from !== 'f7' || !/^[a-h][1-8]$/.test(data.to || '')) return 'Choisissez la dame en f7, puis sa destination.';
    // Fixed position: white Kf6/Qf7, black Kh8. Only Qg7 is mate in one.
    if (data.to !== 'g7') return 'Ce coup ne termine pas la bataille. Cherchez une case où la dame ferme toutes les issues, protégée par son roi.';
    green.finished = true;
    note(`${actor} joue Dg7 : échec et mat. Le sceau vert s’illumine. Fin du prototype de Gunung Padang.`);
    return null;
  }
  return 'Action inconnue dans la Salle Verte.';
}
