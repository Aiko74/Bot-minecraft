function progressPercent(current, total) {
  const safeTotal = Math.max(1, Number(total) || 1)
  return Math.max(0, Math.min(100, Math.floor((Number(current) || 0) / safeTotal * 100)))
}

function progressBar(current, total, size = 10) {
  const percent = progressPercent(current, total)
  const filled = Math.max(0, Math.min(size, Math.round(percent / 100 * size)))
  return `[${'█'.repeat(filled)}${'░'.repeat(size - filled)}]`
}

function progressBucket(current, total, bucketSize = 25) {
  return Math.floor(progressPercent(current, total) / bucketSize)
}

module.exports = {
  progressBar,
  progressBucket,
  progressPercent
}
