#!/usr/bin/env node

/* eslint-disable */

const fs = require('fs')
const path = require('path')

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

const log = Object.assign(
  (message, color = 'reset') => {
    const prefix = COLORS[color] || COLORS.reset
    console.log(`${prefix}${message}${COLORS.reset}`)
  },
  {
    error: message => log(message, 'red'),
    warn: message => log(message, 'yellow'),
    success: message => log(message, 'green'),
    info: message => log(message, 'cyan'),
    debug: message => log(message, 'magenta'),
  }
)

function getScope() {
  const rootPkgPath = path.resolve('package.json')

  if (!fs.existsSync(rootPkgPath)) return null
  try {
    const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'))

    if (typeof pkg.name === 'string') {
      if (pkg.name.startsWith('@')) {
        // @scope/name 형태면 그대로 추출
        return pkg.name.split('/')[0]
      } else {
        // 그냥 name이면 앞에 @ 붙여서 반환
        return '@' + pkg.name
      }
    }
  } catch {}
  return null
}

const execCommand = (command, options = {}) => {
  const { execSync } = require('child_process')

  // options가 string이면 cwd로 처리 (하위 호환성)
  if (typeof options === 'string') {
    options = { cwd: options }
  }
  // options가 boolean이면 silent로 처리 (하위 호환성)
  else if (typeof options === 'boolean') {
    options = { silent: options }
  }

  const {
    cwd = process.cwd(),
    silent = false,
    stdio = silent ? ['pipe', 'pipe', 'pipe'] : 'inherit',
  } = options

  try {
    if (!silent) {
      log(`🚀 실행 중: ${command}`, 'cyan')
    }

    execSync(command, {
      cwd,
      stdio,
      env: { ...process.env, FORCE_COLOR: '1' },
    })
    return true
  } catch (error) {
    if (!silent) {
      log(`❌ 명령어 실행 실패: ${command}`, 'red')
      log(`오류: ${error.message}`, 'red')
    }
    return false
  }
}

function scanAllProjects() {
  const result = []

  const appsDir = path.resolve('apps')
  if (fs.existsSync(appsDir)) {
    function scan(dir, relativePath = '', parentType = '') {
      const items = fs.readdirSync(dir)

      for (const item of items) {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
          const packageJsonPath = path.join(itemPath, 'package.json')
          const currentRelativePath = path.join(relativePath, item)

          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageJson = JSON.parse(
                fs.readFileSync(packageJsonPath, 'utf8')
              )
              result.push({
                name: packageJson.name || currentRelativePath,
                path: path.join('apps', currentRelativePath),
                scripts: packageJson.scripts || {},
                type: parentType || item,
                packageJson,
              })
            } catch {}
          } else {
            const newParentType = relativePath
              ? path.basename(relativePath)
              : item
            scan(itemPath, currentRelativePath, newParentType)
          }
        }
      }
    }

    scan(appsDir)
  }

  const packagesDir = path.resolve('packages')
  if (fs.existsSync(packagesDir)) {
    function scan(dir, relativePath = '') {
      const items = fs.readdirSync(dir)

      for (const item of items) {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
          const packageJsonPath = path.join(itemPath, 'package.json')
          const currentRelativePath = path.join(relativePath, item)

          if (fs.existsSync(packageJsonPath)) {
            try {
              const packageJson = JSON.parse(
                fs.readFileSync(packageJsonPath, 'utf8')
              )
              result.push({
                name: packageJson.name || currentRelativePath,
                path: path.join('packages', currentRelativePath),
                scripts: packageJson.scripts || {},
                type: 'package',
                packageJson,
              })
            } catch {}
          } else {
            scan(itemPath, currentRelativePath)
          }
        }
      }
    }

    scan(packagesDir)
  }

  return result
}

function scanProjects() {
  const appsDir = path.resolve('apps')
  const projects = []

  if (!fs.existsSync(appsDir)) return projects

  function scan(dir, relativePath = '', parentType = '') {
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const itemPath = path.join(dir, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory()) {
        const packageJsonPath = path.join(itemPath, 'package.json')
        const currentRelativePath = path.join(relativePath, item)

        if (fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(
              fs.readFileSync(packageJsonPath, 'utf8')
            )

            projects.push({
              name: packageJson.name || currentRelativePath,
              path: path.join('apps', currentRelativePath),
              scripts: packageJson.scripts || {},
              type: parentType || item,
              packageJson,
            })
          } catch {}
        } else {
          const newParentType = relativePath
            ? path.basename(relativePath)
            : item
          scan(itemPath, currentRelativePath, newParentType)
        }
      }
    }
  }

  scan(appsDir)
  return projects
}

function scanModules(baseDirName, cwd = process.cwd()) {
  const baseDir = path.join(cwd, baseDirName)
  const modules = []

  function scan(dir, relativePath = '') {
    if (!fs.existsSync(dir)) return

    for (const item of fs.readdirSync(dir)) {
      const itemPath = path.join(dir, item)
      const currRel = path.join(relativePath, item)

      if (fs.statSync(itemPath).isDirectory()) {
        const pkgJsonPath = path.join(itemPath, 'package.json')

        if (fs.existsSync(pkgJsonPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))

            modules.push({
              name: pkg.name || currRel,
              dir: path.join(baseDirName, currRel),
            })
          } catch {
            // JSON 파싱 실패 무시
          }
        } else {
          scan(itemPath, currRel)
        }
      }
    }
  }

  scan(baseDir)

  return modules
}

function getCurrentGitBranch() {
  try {
    const { execSync } = require('child_process')
    const branch = execSync('git branch --show-current', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    return branch
  } catch (error) {
    log.warn('⚠️ 현재 git 브랜치를 가져올 수 없습니다.')
    return null
  }
}

module.exports = {
  COLORS,
  log,
  getScope,
  execCommand,
  scanAllProjects,
  scanProjects,
  scanModules,
  getCurrentGitBranch,
}
