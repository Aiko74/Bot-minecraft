const commandCategories = [
  {
    id: 'setup',
    title: 'Configuration',
    tone: 'Base, farms, memoire',
    commands: [
      { name: 'chat sans slash', summary: 'Commande correcte: stop. Incorrect: /stop.', risk: 'safe' },
      { name: 'setbase', summary: 'Enregistre la base et le coffre proche.', risk: 'safe' },
      { name: 'base', summary: 'Affiche la base enregistree.', risk: 'safe' },
      { name: 'setfarm animaux', summary: 'Enregistre la zone animaux et son coffre.', risk: 'safe' },
      { name: 'occupe toi des animaux', summary: 'Lance la suite logique apres setfarm animaux.', risk: 'high', status: 'incoming' },
      { name: 'setfarm canne', summary: 'Enregistre la zone canne a sucre et son coffre.', risk: 'safe' },
      { name: 'recolte la canne', summary: 'Lance la suite logique apres setfarm canne.', risk: 'high', status: 'incoming' },
      { name: 'farms', summary: 'Affiche les farms enregistrees.', risk: 'safe' },
      { name: 'setbuild', summary: 'Enregistre le chantier actuel.', risk: 'safe' }
    ]
  },
  {
    id: 'mission',
    title: 'Missions',
    tone: 'Controle et etat',
    commands: [
      { name: 'status', summary: 'Affiche vie, faim, inventaire et mission.', risk: 'safe' },
      { name: 'mission', summary: 'Affiche la mission en cours ou sauvegardee.', risk: 'safe' },
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
      { name: 'depot', summary: 'Depose l inventaire dans le coffre officiel de base.', risk: 'medium' },
      { name: 'range', summary: 'Range le surplus en gardant nourriture, outils et armure.', risk: 'medium' },
      { name: 'depot forcer', summary: 'Depose aussi l equipement porte.', risk: 'medium' },
      { name: 'prepare', summary: 'Prend nourriture, outils et armure.', risk: 'medium' },
      { name: 'sleep', summary: 'Dort dans un lit proche si possible.', risk: 'medium' }
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
      { name: 'mine 32 cuivre', summary: 'Mine du cuivre.', risk: 'high' },
      { name: 'mine 8 emeraude', summary: 'Mine de l emeraude.', risk: 'high' },
      { name: 'mine 64 quartz', summary: 'Mine du quartz dans le Nether.', risk: 'high', status: 'beta' },
      { name: 'mine 64 nether gold', summary: 'Mine de l or du Nether.', risk: 'high', status: 'beta' },
      { name: 'mine 8 ancient debris', summary: 'Mine ancient debris dans le Nether.', risk: 'high', status: 'beta' },
      { name: 'collect 64 netherrack', summary: 'Collecte de la netherrack.', risk: 'high', status: 'beta' },
      { name: 'collect 128 pierre', summary: 'Collecte de la pierre/cobblestone.', risk: 'high' },
      { name: 'collect 20 bois', summary: 'Collecte du bois loin de la base puis depose.', risk: 'high' },
      { name: 'collect 64 sable', summary: 'Collecte du sable.', risk: 'high' },
      { name: 'collect 64 terre', summary: 'Collecte de la terre.', risk: 'high' },
      { name: 'coupe des arbres', summary: 'Collecte du bois, 64 par defaut.', risk: 'high' },
      { name: 'chasse 5', summary: 'Chasse des animaux proches.', risk: 'high' },
      { name: 'explore', summary: 'Explore autour de la base puis revient.', risk: 'high' }
    ]
  },
  {
    id: 'farms',
    title: 'Farming',
    tone: 'Animaux et canne',
    commands: [
      { name: 'ferme animaux', summary: 'Automatisation en test, a stabiliser avant V1 finale.', risk: 'high', status: 'incoming' },
      { name: 'ferme canne', summary: 'Recolte la canne mature. Validation en attente.', risk: 'high', status: 'incoming' },
      { name: 'ferme', summary: 'Fait animaux puis canne. Validation en attente.', risk: 'high', status: 'incoming' },
      { name: 'occupe toi des animaux', summary: 'Phrase naturelle pour ferme animaux. Validation en attente.', risk: 'high', status: 'incoming' },
      { name: 'recolte la canne', summary: 'Phrase naturelle pour ferme canne. Validation en attente.', risk: 'high', status: 'incoming' }
    ]
  },
  {
    id: 'build',
    title: 'Construction',
    tone: 'Blueprints et chantiers',
    commands: [
      { name: 'blueprints', summary: 'Liste les modeles disponibles. Atelier encore en developpement.', risk: 'safe', status: 'incoming' },
      { name: 'maison', summary: 'Affiche les materiaux du blueprint maison. Validation en attente.', risk: 'safe', status: 'incoming' },
      { name: 'scan maison', summary: 'Cherche un terrain plat pour la maison. Validation en attente.', risk: 'medium', status: 'incoming' },
      { name: 'preparebuild maison', summary: 'Prepare les ressources maison. Validation en attente.', risk: 'high', status: 'incoming' },
      { name: 'preparebuild enclos', summary: 'Prepare les ressources enclos. Validation en attente.', risk: 'high', status: 'incoming' },
      { name: 'preparebuild ferme canne', summary: 'Prepare les ressources ferme a canne. Validation en attente.', risk: 'high', status: 'incoming' },
      { name: 'build maison', summary: 'Prepare puis tente de construire la maison. Feature incoming.', risk: 'high', status: 'incoming' },
      { name: 'build enclos', summary: 'Prepare puis tente de construire l enclos. Feature incoming.', risk: 'high', status: 'incoming' },
      { name: 'build ferme canne', summary: 'Prepare puis tente de construire la ferme canne. Feature incoming.', risk: 'high', status: 'incoming' }
    ]
  },
  {
    id: 'search',
    title: 'Recherche',
    tone: 'Blocs utiles proches',
    commands: [
      { name: 'trouve coffre', summary: 'Cherche un coffre ou baril proche. Validation en attente.', risk: 'safe', status: 'incoming' },
      { name: 'trouve lit', summary: 'Cherche un lit proche. Validation en attente.', risk: 'safe', status: 'incoming' },
      { name: 'trouve village', summary: 'Cherche des signes de village proche. Validation en attente.', risk: 'safe', status: 'incoming' }
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
