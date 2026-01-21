import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// Custom plugin to serve files from ../notas
const notasServerPlugin = () => {
  return {
    name: 'notas-server',
    configureServer(server) {
      // API to list files
      server.middlewares.use('/api/list', (req, res, next) => {
        const notasDir = path.resolve(__dirname, '../notas')

        try {
          if (!fs.existsSync(notasDir)) {
            fs.mkdirSync(notasDir, { recursive: true })
          }

          const files = fs.readdirSync(notasDir)
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .map(file => ({
              name: file,
              path: '/api/file?name=' + encodeURIComponent(file)
            }))

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(files))
        } catch (e) {
          console.error(e)
          res.statusCode = 500
          res.end(JSON.stringify({ error: e.message }))
        }
      })

      // API to serve a file
      server.middlewares.use('/api/file', (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const fileName = url.searchParams.get('name')

        if (!fileName) {
          return next()
        }

        // Security: Prevent directory traversal
        const safeName = path.basename(fileName)
        const filePath = path.resolve(__dirname, '../notas', safeName)

        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath)
          res.writeHead(200, {
            'Content-Type': 'application/pdf',
            'Content-Length': stat.size
          })
          const readStream = fs.createReadStream(filePath)
          readStream.pipe(res)
        } else {
          res.statusCode = 404
          res.end('Not found')
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    notasServerPlugin()
  ],
})
