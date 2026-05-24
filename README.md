# Minecraft Survival Assistant

Application locale pour piloter un bot Minecraft survival assistant.

## Installer

```bash
npm install
```

## Lancer l'application

```bash
npm start
```

Puis ouvre:

```text
http://localhost:3077
```

L'application affiche:

- statut du bot
- configuration serveur
- memoire base/farms/chantier
- commandes rangees par categories
- blueprints disponibles
- logs du bot
- boutons demarrer/arret bot

## Lancer seulement le bot

```bash
npm run bot
```

## Console blueprints

```bash
npm run console
```

Commandes console:

```text
list
show starter-house
validate chemin/vers/modele.json
import chemin/vers/modele.json mon-modele
create-sample test-house
exit
```

## Configuration Minecraft

Modifie `config.json`:

```json
{
  "server": {
    "host": "127.0.0.1",
    "port": 51527,
    "username": "BotAssistant"
  }
}
```

## Architecture

Lis `ARCHITECTURE.md`.

La nouvelle base est:

```text
app/                  interface locale
server/               API locale + lancement bot
bot-core/commands/    catalogue des commandes par categorie
src/                  modules deja extraits
blueprints/           modeles de construction
bot.js                coeur Mineflayer encore a decouper progressivement
```
