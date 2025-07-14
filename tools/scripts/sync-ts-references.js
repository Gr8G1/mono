#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { log, scanModules, getScope } = require('./utils')

function findAllAppProjects(baseDir) {
  const result = []

  if (!fs.existsSync(baseDir)) {
    return result
  }

  for (const item of fs.readdirSync(baseDir)) {
    const itemPath = path.join(baseDir, item)

    // ios, android 경로 무시
    if (item === 'ios' || item === 'android') {
      continue
    }

    if (fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory()) {
      const tsconfigPath = path.join(itemPath, 'tsconfig.json')

      if (fs.existsSync(tsconfigPath)) {
        result.push(itemPath)
      } else {
        result.push(...findAllAppProjects(itemPath))
      }
    }
  }
  return result
}

function updateProjectReferences(projectDir, monoModules) {
  const pkgJsonPath = path.join(projectDir, 'package.json')
  const tsconfigPath = path.join(projectDir, 'tsconfig.json')
  if (!fs.existsSync(pkgJsonPath) || !fs.existsSync(tsconfigPath)) {
    return false
  }

  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
    ...pkgJson.peerDependencies,
  }

  const usedMonoDeps = monoModules.filter(m => {
    if (!allDeps[m.name]) {
      return false
    }
    const depTsconfig = path.join(process.cwd(), m.dir, 'tsconfig.json')
    return fs.existsSync(depTsconfig)
  })
  if (usedMonoDeps.length === 0) {
    return false
  }

  const references = usedMonoDeps.map(m => ({
    path: path.relative(projectDir, path.join(process.cwd(), m.dir)),
  }))

  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
  tsconfig.references = references

  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n')
  const relTsconfigPath = path.relative(process.cwd(), tsconfigPath)
  log.success(`✨ ${relTsconfigPath} references 갱신 완료`)
  return true
}

function main() {
  const appsDir = path.resolve('apps')
  const projects = findAllAppProjects(appsDir)

  if (projects.length === 0) {
    log.warn('📁 apps/ 하위에 tsconfig.json이 있는 프로젝트가 없습니다.')
    return
  }

  const scope = getScope()
  log.info(`🔍 모노레포 스코프: ${scope}`)

  const monoModules = scanModules('packages').filter(m =>
    m.name.startsWith(scope + '/')
  )

  let updated = 0

  for (const projectDir of projects) {
    if (updateProjectReferences(projectDir, monoModules)) {
      updated++
    }
  }

  log.info(`\n🚀 총 ${updated}개 프로젝트의 references를 갱신했습니다. 🎉`)
}

main()
