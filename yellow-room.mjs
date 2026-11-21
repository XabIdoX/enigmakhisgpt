export function freshYellowState() {
  return { observed: [] };
}

const places = { plateau: 'le plateau au couchant', passage: 'le passage de pierre', chamber: 'la chambre intérieure' };

export function actYellow(state, data, actor, note) {
  if (data.action !== 'yellow-observe') return 'Cette action n’existe pas dans la Salle Jaune.';
  if (!Object.hasOwn(places, data.place)) return 'Ce lieu ne fait pas partie de l’exploration.';
  if (!state.observed.includes(data.place)) {
    state.observed.push(data.place);
    note(`${actor} observe ${places[data.place]} à Gizeh.`);
  }
}
