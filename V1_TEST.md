# Aiko Assistant V1 test

Cette version est faite pour tester le bot avec des amis.

Statut: projet en developpement.

## Installer

1. Installer Node.js LTS.
2. Extraire le zip du projet.
3. Ouvrir un terminal dans le dossier extrait.
4. Installer les dependances:

```powershell
npm install
```

## Lancer l'application

```powershell
npm run desktop
```

L'application ouvre une interface locale. Au premier lancement, elle demande:

- adresse du serveur Minecraft
- port
- pseudo du bot
- version Minecraft
- owner
- preferences
- theme

Owner = le pseudo Minecraft autorise a commander le bot dans le chat. Les autres joueurs sont ignores.

## Lancer seulement le bot

```powershell
npm start
```

ou:

```powershell
npm run bot
```

## Generer un zip V1

Depuis ton projet principal:

```powershell
npm run v1:package
```

Le zip est cree ici:

```text
release/aiko-v1-test.zip
```

Le zip ne doit pas contenir tes fichiers locaux sensibles:

- config.json personnel
- bot-memory.json
- logs
- node_modules
- reglages desktop locaux

## Generer une vraie application Windows

Depuis ton projet principal:

```powershell
npm run v1:exe
```

Les fichiers sortent ici:

```text
release/electron/
```

Donne plutot ce fichier a ton ami:

```text
Aiko-Assistant-2077-1.0.0-x64.exe
```

Il pourra installer l'application sans ouvrir le code source.

Note V1: l'application n'est pas encore signee avec un certificat officiel. Windows peut afficher un avertissement au premier lancement.

## Commandes recommandees pour tester

```text
status
setbase
base
prepare
mine 16 charbon
mine 16 fer
mine 16 bois
retour base
depot
range
coords
inventaire
viens
suis moi
stop follow
chasse 3
explore 100
```

## Commandes marquees Feature incoming

Ces commandes sont visibles dans l'application mais ne sont pas encore garanties pour la V1:

```text
ferme animaux
ferme canne
ferme
occupe toi des animaux
recolte la canne
blueprints
maison
scan maison
preparebuild maison
preparebuild enclos
preparebuild ferme canne
build maison
build enclos
build ferme canne
trouve coffre
trouve lit
trouve village
```

Elles restent dans le bot pour ne rien supprimer, mais l'interface indique clairement qu'elles sont encore en developpement.
