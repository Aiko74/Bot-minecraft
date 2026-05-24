function createAuth(config) {
  function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase()
  }

  function authorizedOwners() {
    return Array.isArray(config.owners)
      ? config.owners.map(normalizeUsername).filter(Boolean)
      : []
  }

  function isAuthorizedUser(username) {
    const owners = authorizedOwners()
    if (owners.length === 0) return true
    return owners.includes(normalizeUsername(username))
  }

  return {
    isAuthorizedUser
  }
}

module.exports = {
  createAuth
}
