# Aiko Minecraft Survival Assistant

Application locale pour piloter un bot Minecraft survival assistant avec une interface desktop.

Statut: V1 test, projet en developpement.

## Installer

```powershell
npm install
```

## Lancer l'application desktop

```powershell
npm run desktop
```

L'application ouvre une fenetre native Electron. Au premier lancement, elle guide la configuration:

- IP ou adresse du serveur
- port
- pseudo du bot
- version Minecraft
- owner autorise
- preferences
- theme

## Lancer seulement le bot

```powershell
npm start
```

ou:

```powershell
npm run bot
```

## Verifier la syntaxe

```powershell
npm run check
```

## Creer un zip V1 de test

```powershell
npm run v1:package
```

Le fichier partageable sera cree ici:

```text
release/aiko-v1-test.zip
```

Le zip exclut les donnees locales sensibles comme `config.json`, `bot-memory.json`, `node_modules`, les logs et les reglages desktop locaux.

## Creer un installateur Windows

```powershell
npm run v1:exe
```

Les fichiers sortent dans:

```text
release/electron/
```

Fichiers importants:

- `Aiko-Assistant-2077-1.0.0-x64.exe`: installateur Windows.
- `Aiko-Assistant-2077-1.0.0-x64.zip`: version portable.
- `win-unpacked/`: app non installee, utile pour tester vite.

Cette V1 n'est pas signee avec un certificat officiel. Windows peut donc afficher un avertissement SmartScreen au premier lancement.

## Console blueprints

```powershell
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

## Fichiers utiles

- `V1_TEST.md`: guide pour faire tester la V1 a un ami.
- `COMMANDES.md`: liste des commandes chat.
- `ARCHITECTURE.md`: organisation du projet.
- `config.example.json`: exemple de configuration partageable.

## Architecture

```text
desktop/              application Electron/React
bot-core/commands/    catalogue des commandes affichees dans l'app
src/                  modules deja extraits
blueprints/           modeles de construction
server/               ancien serveur local conserve pour compatibilite
bot.js                coeur Mineflayer encore a decouper progressivement
```
