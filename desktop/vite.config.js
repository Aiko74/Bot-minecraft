const { defineConfig } = require('vite')
const react = require('@vitejs/plugin-react')
const path = require('path')

module.exports = defineConfig({
  root: path.join(__dirname, 'renderer-src'),
  plugins: [react()],
  base: './',
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true
  }
})
