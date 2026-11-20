import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const { limits } = JSON.parse(readFileSync(new URL('./eslint-baseline.json', import.meta.url), 'utf8'))
const counts = new Map()
let failed = false

for (const app of ['web', 'admin']) {
  const cwd = path.join(projectRoot, 'apps', app)
  let files
  try {
    const requireFromApp = createRequire(path.join(cwd, 'package.json'))
    const { ESLint } = requireFromApp('eslint')
    files = await new ESLint({ cwd }).lintFiles(['.'])
  } catch (error) {
    console.error(`${app}: ESLint no pudo ejecutarse.`, error)
    failed = true
    continue
  }
  for (const file of files) {
    for (const message of file.messages) {
      const relative = path.relative(cwd, file.filePath).split(path.sep).join('/')
      const key = `${app}/${relative}:${message.ruleId}:${message.severity}`
      const count = (counts.get(key) ?? 0) + 1
      counts.set(key, count)
      if (!message.ruleId || count > (limits[key] ?? 0)) {
        failed = true
        console.error(`${app}/${relative}:${message.line}:${message.column} ${message.ruleId ?? 'parse'} ${message.message}`)
      }
    }
  }
  console.log(`${app}: deuda restante ${files.reduce((sum, file) => sum + file.errorCount, 0)} errores y ${files.reduce((sum, file) => sum + file.warningCount, 0)} advertencias; no se permiten diagnósticos adicionales por archivo/regla.`)
}

if (failed) {
  console.error('Hay nuevos problemas de lint. Corregirlos; no ampliar la línea base para aceptarlos.')
  process.exitCode = 1
} else {
  console.log('Sin regresiones de lint. Ejecuta pnpm lint:strict para revisar toda la deuda heredada.')
}
