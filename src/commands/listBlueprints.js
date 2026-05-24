module.exports = {
  name: 'blueprints',
  aliases: ['blueprints', 'modeles', 'liste maisons'],
  intentTypes: ['listBlueprints'],
  run: async ctx => {
    ctx.helpers.sendBlueprintList()
  }
}
