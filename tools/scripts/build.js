#!/usr/bin/env node

const { log, execCommand, scanAllProjects } = require('./utils')

process.on('SIGINT', () => {
  log.warn('\n👋 사용자의 요청으로 빌드가 중단되었습니다.')
  process.exit(0)
})

function checkDependencies() {
  log.info('📦 의존성 설치 확인 중...')
  if (!execCommand('pnpm install --frozen-lockfile')) {
    process.exit(1)
  }
}

function cleanBuild(selected) {
  log.info('🧹 빌드 전 정리 작업 시작...')

  for (const proj of selected) {
    log.info(`🧹 ${proj.name} 정리 중...`)

    if (!execCommand(`rm -rf ${proj.path}/dist`)) {
      log.warn(`⚠️ ${proj.name} dist 폴더 정리 실패`)
    }

    if (!execCommand(`rm -f ${proj.path}/tsconfig.*.tsbuildinfo`)) {
      log.warn(`⚠️ ${proj.name} TypeScript 캐시 정리 실패`)
    }
  }

  if (!execCommand('pnpm turbo daemon clean')) {
    log.warn('⚠️ Turbo 캐시 정리 실패')
  }

  log.success('✅ 정리 작업 완료')
}

function runBuild(selected) {
  for (const proj of selected) {
    log.info(`🏗️ ${proj.name} 빌드 시작...`)
    if (!execCommand(`pnpm run build:turbo --filter=./${proj.path}`)) {
      log.error(`❌ ${proj.name} 빌드 실패`)
      continue
    }
    log.success(`✅ ${proj.name} 빌드 성공`)
  }
}

async function main() {
  const { default: inquirer } = await import('inquirer')

  const allProjects = scanAllProjects()
  const buildables = allProjects.filter(p => p.scripts.build)

  if (buildables.length === 0) {
    log.error('❌ 빌드 가능한 프로젝트가 없습니다.')
    process.exit(1)
  }

  const { selected } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selected',
    message: '빌드할 프로젝트/패키지를 선택하세요:',
    choices: buildables.map(proj => ({
      name: `[${proj.type}] ${proj.name} (${proj.path})`,
      value: proj,
    })),
    validate: arr => (arr.length > 0 ? true : '하나 이상 선택해야 합니다.'),
    pageSize: 15,
  })

  checkDependencies()
  cleanBuild(selected)
  runBuild(selected)

  log.success('\n🎉 선택한 모든 빌드가 완료되었습니다!')
}

main().catch(err => {
  if (err.name === 'ExitPromptError') {
    log.warn('\n🛑 스크립트 실행을 취소했습니다.')
    process.exit(0)
  }

  log.error(`❌ 빌드 프로세스 실패: ${err.message || err}`)
  process.exit(1)
})
