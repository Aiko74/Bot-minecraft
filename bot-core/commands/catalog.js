const commandCategories = [
  {
    id: 'setup',
    title: 'Configuration',
    tone: 'Base, farms, memoire',
    commands: [
      { name: 'setbase', summary: 'Enregistre la base et le coffre proche.', risk: 'safe' },
      { name: 'base', summary: 'Affiche la base enregistree.', risk: 'safe' },
      { name: 'setfarm animaux', summary: 'Enregistre la zone animaux et son coffre.', risk: 'safe' },
      { name: 'setfarm canne', summary: 'Enregistre la zone canne a sucre et son coffre.', risk: 'safe' },
      { name: 'farms', summary: 'Affiche les farms enregistrees.', risk: 'safe' },
      { name: 'setbuild', summary: 'Enregistre le chantier actuel.', risk: 'safe' }
    ]
  },
  {
    id: 'mission',
    title: 'Missions',
    tone: 'Controle et etat',
    commands: [
      { name: 'status', summary: 'Affiche vie, faim, inventaire, base, farms et mission.', risk: 'safe' },
      { name: 'mission', summary: 'Affiche la mission en cours ou sauvegardee.', risk: 'safe' },
      { name: 'pause', summary: 'Met la mission en pause.', risk: 'safe' },
      { name: 'reprendre', summary: 'Reprend la mission en pause.', risk: 'medium' },
      { name: 'stop', summary: 'Annule la mission courante.', risk: 'safe' },
      { name: 'annule', summary: 'Alias de stop.', risk: 'safe' }
    ]
  },
  {
    id: 'survival',
    title: 'Survie',
    tone: 'Deplacement, inventaire, defense',
    commands: [
      { name: 'retour base', summary: 'Retourne a la base et depose si possible.', risk: 'medium' },
      { name: 'depot', summary: 'Force un depot dans les coffres de base.', risk: 'medium' },
      { name: 'range', summary: 'Range tout dans les coffres de base.', risk: 'medium' },
      { name: 'prepare', summary: 'Prend nourriture, outils et armure.', risk: 'medium' },
      { name: 'mange', summary: 'Mange si possible.', risk: 'safe' },
      { name: 'sleep', summary: 'Dort dans un lit proche si possible.', risk: 'medium' },
      { name: 'defend on', summary: 'Active la defense automatique.', risk: 'medium' },
      { name: 'defend off', summary: 'Desactive la defense automatique.', risk: 'safe' }
    ]
  },
  {
    id: 'movement',
    title: 'Joueur',
    tone: 'Suivre et rejoindre',
    commands: [
      { name: 'viens', summary: 'Vient vers le joueur qui parle.', risk: 'medium' },
      { name: 'viens ici', summary: 'Alias naturel de viens.', risk: 'medium' },
      { name: 'suis moi', summary: 'Suit le joueur.', risk: 'medium' },
      { name: 'stop follow', summary: 'Arrete de suivre.', risk: 'safe' },
      { name: 'coords', summary: 'Affiche les coordonnees du bot.', risk: 'safe' },
      { name: 'inventaire', summary: 'Affiche l inventaire utile.', risk: 'safe' }
    ]
  },
  {
    id: 'resources',
    title: 'Ressources',
    tone: 'Minage, chasse, exploration',
    commands: [
      { name: 'mine 64 fer', summary: 'Mine du fer, loin de la base si possible.', risk: 'high' },
      { name: 'mine 32 charbon', summary: 'Mine du charbon.', risk: 'high' },
      { name: 'mine 10 diamant', summary: 'Mine du diamant.', risk: 'high' },
      { name: 'mine 128 pierre', summary: 'Mine de la pierre/cobblestone.', risk: 'high' },
      { name: 'mine 20 bois', summary: 'Coupe des arbres loin de la base puis depose.', risk: 'high' },
      { name: 'coupe des arbres', summary: 'Phrase naturelle pour ramener du bois.', risk: 'high' },
      { name: 'chasse 5', summary: 'Chasse des animaux proches.', risk: 'high' },
      { name: 'explore', summary: 'Explore autour de la base puis revient.', risk: 'high' }
    ]
  },
  {
    id: 'farms',
    title: 'Farming',
    tone: 'Animaux et canne',
    commands: [
      { name: 'ferme animaux', summary: 'Nourrit, recolte le surplus et depose.', risk: 'high' },
      { name: 'ferme canne', summary: 'Recolte la canne mature.', risk: 'high' },
      { name: 'ferme', summary: 'Fait animaux puis canne.', risk: 'high' },
      { name: 'occupe toi des animaux', summary: 'Phrase naturelle pour ferme animaux.', risk: 'high' },
      { name: 'recolte la canne', summary: 'Phrase naturelle pour ferme canne.', risk: 'high' }
    ]
  },
  {
    id: 'build',
    title: 'Construction',
    tone: 'Blueprints et chantiers',
    commands: [
      { name: 'blueprints', summary: 'Liste les modeles disponibles.', risk: 'safe' },
      { name: 'maison', summary: 'Affiche les materiaux du blueprint maison.', risk: 'safe' },
      { name: 'scan maison', summary: 'Cherche un terrain plat pour la maison.', risk: 'medium' },
      { name: 'preparebuild maison', summary: 'Prepare les ressources maison.', risk: 'high' },
      { name: 'preparebuild enclos', summary: 'Prepare les ressources enclos.', risk: 'high' },
      { name: 'preparebuild ferme canne', summary: 'Prepare les ressources ferme a canne.', risk: 'high' },
      { name: 'build maison', summary: 'Prepare puis tente de construire la maison.', risk: 'high' },
      { name: 'build enclos', summary: 'Prepare puis tente de construire l enclos.', risk: 'high' },
      { name: 'build ferme canne', summary: 'Prepare puis tente de construire la ferme canne.', risk: 'high' }
    ]
  },
  {
    id: 'search',
    title: 'Recherche',
    tone: 'Blocs utiles proches',
    commands: [
      { name: 'trouve coffre', summary: 'Cherche un coffre ou baril proche.', risk: 'safe' },
      { name: 'trouve lit', summary: 'Cherche un lit proche.', risk: 'safe' },
      { name: 'trouve village', summary: 'Cherche des signes de village proche.', risk: 'safe' }
    ]
  }
]

function flattenCommands() {
  return commandCategories.flatMap(category =>
    category.commands.map(command => ({
      ...command,
      categoryId: category.id,
      categoryTitle: category.title
    }))
  )
}

module.exports = {
  commandCategories,
  flattenCommands
}
