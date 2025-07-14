#!/usr/bin/env node

const { log, getScope, execCommand, scanProjects } = require('./utils')
const { spawn } = require('child_process')

const fs = require('fs')
const path = require('path')

process.on('SIGINT', () => {
  log.warn('\n👋 개발 서버가 종료되었습니다.')
  process.exit(0)
})

function checkDependencies() {
  log.info('📦 의존성 설치 확인 중...')

  if (!execCommand('pnpm --version')) {
    log.error('❌ pnpm이 설치되지 않았습니다. 먼저 pnpm을 설치해주세요.')
    process.exit(1)
  }

  if (!fs.existsSync('node_modules')) {
    log.info('📦 의존성 설치 중...')
    execCommand('pnpm install')
  }
}

function buildPackages() {
  log.info('🏗️ 패키지 빌드 중...')

  const scope = getScope()

  if (!execCommand(`pnpm --filter "${scope}/*" build`)) {
    log.error('❌ 패키지 빌드 실패')
    process.exit(1)
  }

  log.success('✅ 패키지 빌드 완료')
}

async function runScript(app, script) {
  const appPath = path.resolve(app.path)

  if (!fs.existsSync(appPath)) {
    log.error(`❌ 앱 디렉토리를 찾을 수 없습니다: ${app.path}`)
    process.exit(1)
  }

  // iOS 실행 전 pod install 여부 확인
  if (script === 'ios') {
    const iosDir = path.join(appPath, 'ios')
    if (fs.existsSync(path.join(iosDir, 'Podfile'))) {
      const { default: inquirer } = await import('inquirer')
      const { runPodInstall } = await inquirer.prompt({
        type: 'confirm',
        name: 'runPodInstall',
        message: 'ios 실행 전 pod install을 실행할까요?',
        default: false,
      })
      if (runPodInstall) {
        log.info('🛠️  pod install 실행 중...')
        execCommand('pod install', iosDir)
        log.success('✅ pod install 완료')
      } else {
        log.info('⏩ pod install을 건너뜁니다.')
      }
    }
  }

  log.info(`🚀 ${app.name}에서 '${script}' 스크립트 실행 중...`)

  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['run', script], {
      cwd: appPath,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    })

    child.on('close', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Script exited with code ${code}`))
      }
    })

    child.on('error', reject)

    process.on('SIGINT', () => {
      log.warn('\n🛑 사용자에 의해 중단되었습니다.')
      child.kill('SIGINT')
      process.exit(0)
    })
  })
}

async function main() {
  const { default: inquirer } = await import('inquirer')

  const projects = scanProjects()
  if (projects.length === 0) {
    log.error('❌ 실행할 수 있는 프로젝트가 없습니다.')
    process.exit(1)
  }

  const { projectPath } = await inquirer.prompt({
    type: 'list',
    name: 'projectPath',
    message: '실행할 프로젝트를 선택하세요:',
    choices: projects.map(proj => ({
      name: `${proj.name} (${proj.path})`,
      value: proj.path,
    })),
  })

  const selectedProject = projects.find(p => p.path === projectPath)
  const scriptKeys = Object.keys(selectedProject.scripts)

  if (scriptKeys.length === 0) {
    log.error('❌ 실행 가능한 스크립트가 없습니다.')
    process.exit(1)
  }

  const { script } = await inquirer.prompt({
    type: 'list',
    name: 'script',
    message: '실행할 스크립트를 선택하세요:',
    choices: scriptKeys.map(key => ({
      name: `${key} (${selectedProject.scripts[key]})`,
      value: key,
    })),
  })

  checkDependencies()

  if (!process.argv.includes('--no-build')) {
    buildPackages()
  }

  await runScript(selectedProject, script)
}

main().catch(err => {
  if (err.name === 'ExitPromptError') {
    log.warn('\n🛑 스크립트 실행을 취소했습니다.')
    process.exit(0)
  }

  log.error(`❌ 실행 실패: ${err.message || err}`)
  process.exit(1)
})
