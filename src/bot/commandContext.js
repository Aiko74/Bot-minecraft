function createCommandContextFactory(deps) {
  return function commandContext() {
    return {
      bot: deps.bot,
      config: deps.config,
      constants: deps.constants,
      getMcData: deps.getMcData,
      getState: deps.getState,
      memory: deps.getMemory(),
      state: deps.state,
      missionManager: deps.missionManager,
      say: deps.say,
      safeChat: deps.safeChat,
      helpers: deps.helpers
    }
  }
}

module.exports = {
  createCommandContextFactory
}
