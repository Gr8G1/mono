#!/usr/bin/env node

const { log, execCommand, scanProjects, scanModules } = require('./utils')

async function main() {
  const { default: inquirer } = await import('inquirer')

  const projects = scanProjects()

  if (projects.length === 0) {
    log.error('❌ 서비스 프로젝트를 찾을 수 없습니다.')
    process.exit(1)
  }

  const { projectPath } = await inquirer.prompt({
    type: 'list',
    name: 'projectPath',
    message: '의존성을 주입할 프로젝트를 선택하세요:',
    choices: projects.map(proj => ({
      name: `${proj.name} (${proj.path})`,
      value: proj.path,
    })),
  })

  const packagesModules = scanModules('packages')
  const toolsModules = scanModules('tools')
  const allModules = [...packagesModules, ...toolsModules]

  if (allModules.length === 0) {
    log.warn(
      '⚠️ workspace 모듈을 찾을 수 없습니다. packages/ 또는 tools/를 확인하세요.'
    )
    process.exit(0)
  }

  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message:
        '주입할 모듈을 선택하세요:\n' +
        '(스페이스: 선택/해제, a: 전체 토글, i: 반전, ↑↓: 이동)\n',
      pageSize: 15,
      choices: allModules.map(m => ({
        name: `${m.name} (${m.dir})`,
        value: m,
      })),
      validate: arr =>
        arr.length > 0 ? true : '하나 이상의 모듈을 선택해야 합니다.',
    },
  ])

  for (const mod of selected) {
    log.info(`📦 ${projectPath} 에 ${mod.name} 의존성 추가 중...`)

    try {
      const cmd = `pnpm --filter ./${projectPath} add ${mod.name}@workspace:*`

      if (!execCommand(cmd)) {
        throw new Error(`실행 실패: ${cmd}`)
      }
    } catch (err) {
      log.error(`❌ ${mod.name} 추가 실패: ${err.message}`)
    }
  }

  log.success('✅ 선택된 모든 모듈이 의존성으로 추가되었습니다.')
}

main().catch(err => {
  if (err.name === 'ExitPromptError') {
    log.warn('\n🛑 의존성 주입이 취소되었습니다.')
    process.exit(0)
  }

  log.error(`❌ 스크립트 실행 중 오류 발생: ${err.message || err}`)

  process.exit(1)
})
