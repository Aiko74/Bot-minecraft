# Architecture

Le projet devient une application locale.

```text
app/
```

Interface visuelle locale. Elle affiche le statut du bot, les commandes rangees
par categories, les blueprints, la configuration et les logs.

```text
server/
```

Serveur local Node.js. Il sert l'interface et expose les routes `/api/...`.
Il peut demarrer et arreter le bot.

```text
bot-core/commands/
```

Catalogue central des commandes. C'est la base propre pour ranger les futures
commandes par categorie au lieu de tout empiler dans `bot.js`.

```text
src/
```

Modules deja separes: configuration, parsing des commandes, ressources,
constantes, memoire, protection navigation.

```text
blueprints/
```

Modeles de construction JSON utilisables par `build maison`, `build enclos`,
`build ferme canne`.

```text
bot.js
```

Ancien coeur Mineflayer. Il reste fonctionnel, mais il devra etre progressivement
decoupe en modules `bot-core/navigation`, `bot-core/inventory`, `bot-core/tasks`,
`bot-core/build`.

## Lancement

```bash
npm start
```

Ouvre l'application locale sur:

```text
http://localhost:3077
```

Pour lancer uniquement le bot sans interface:

```bash
npm run bot
```

Pour gerer/importer les blueprints:

```bash
npm run console
```
