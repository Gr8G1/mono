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
  const appPackageName = app.name
  const appPath = path.resolve(app.path)

  // iOS 실행 전 pod install 여부 확인
  if (script.startsWith('ios')) {
    const iosDir = path.join(appPath, 'ios')
    if (fs.existsSync(path.join(iosDir, 'Podfile'))) {
      const { default: inquirer } = await import('inquirer')
      const { runPodInstall } = await inquirer.prompt({
        type: 'confirm',
        name: 'runPodInstall',
        message: 'ios 실행 전 pod install을 실행할까요?',
        default: false,
        pageSize: 5, // confirm은 항목이 적으니 5개로 제한
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

  log.info(`🚀 turbo run ${appPackageName} '${script}' 스크립트 실행 중...`)

  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        'turbo',
        'run',
        script,
        '--parallel',
        '--filter',
        `${appPackageName}...`,
      ],
      {
        stdio: ['inherit', 'inherit', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '1', FORCE_LOGS: '1' },
      }
    )

    child.stderr.on('data', data => {
      const str = data.toString()

      const filteredMessages = [
        'ERROR  run failed: command exited (1)',
        'Command failed with exit code 1',
      ]

      const shouldFilter = filteredMessages.some(msg => str.includes(msg))

      if (!shouldFilter) {
        process.stderr.write(data)
      }
    })
  })
}

async function main() {
  const { default: inquirer } = await import('inquirer')

  const projects = scanProjects()

  const appProjects = projects.filter(p => p.type === 'app')
  const webProjects = projects.filter(p => p.type === 'web')

  if (projects.length === 0) {
    log.error('❌ 실행할 수 있는 프로젝트가 없습니다.')
    process.exit(1)
  }

  // 서비스 타입 선택
  const serviceTypes = []

  if (appProjects.length > 0) {
    serviceTypes.push({
      name: '📱 App Services',
      value: 'app',
      count: appProjects.length,
    })
  }

  if (webProjects.length > 0) {
    serviceTypes.push({
      name: '🌏 Web Services',
      value: 'web',
      count: webProjects.length,
    })
  }

  const { serviceType } = await inquirer.prompt({
    type: 'list',
    name: 'serviceType',
    message: '서비스 타입을 선택하세요:',
    choices: serviceTypes.map(type => ({
      name: `${type.name} (${type.count}개)`,
      value: type.value,
    })),
    pageSize: 10,
  })

  // 선택된 타입의 프로젝트들
  const targetProjects = serviceType === 'app' ? appProjects : webProjects

  const { projectPath } = await inquirer.prompt({
    type: 'list',
    name: 'projectPath',
    message: '실행할 서비스를 선택하세요:',
    choices: targetProjects.map(proj => ({
      name: `${proj.name} (${proj.path})`,
      value: proj.path,
    })),
    pageSize: 10,
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
    pageSize: Math.max(scriptKeys.length, 20),
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
