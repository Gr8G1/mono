#!/usr/bin/env node

const { log, execCommand, scanAllProjects, scanModules } = require('./utils')
const fs = require('fs')
const path = require('path')

function getExistingDependencies(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    return { dependencies: [], devDependencies: [] }
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    return {
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
    }
  } catch {
    return { dependencies: [], devDependencies: [] }
  }
}

async function main() {
  const { default: inquirer } = await import('inquirer')

  const projects = scanAllProjects()

  if (projects.length === 0) {
    log.error('❌ 서비스 프로젝트 또는 패키지를 찾을 수 없습니다.')
    process.exit(1)
  }

  const appProjects = projects.filter(p => p.type === 'app')
  const webProjects = projects.filter(p => p.type === 'web')
  const packagesProjects = projects.filter(p => p.type === 'package')

  // 프로젝트 타입 선택
  const projectTypes = []

  if (appProjects.length > 0) {
    projectTypes.push({
      name: '📱 App Services',
      value: 'app',
      count: appProjects.length,
    })
  }

  if (webProjects.length > 0) {
    projectTypes.push({
      name: '🌏 Web Services',
      value: 'web',
      count: webProjects.length,
    })
  }

  if (packagesProjects.length > 0) {
    projectTypes.push({
      name: '📦 Packages',
      value: 'package',
      count: packagesProjects.length,
    })
  }

  const { projectType } = await inquirer.prompt({
    type: 'list',
    name: 'projectType',
    message: '프로젝트 타입을 선택하세요:',
    choices: projectTypes.map(type => ({
      name: `${type.name} (${type.count}개)`,
      value: type.value,
    })),
  })

  // 선택된 타입의 프로젝트들
  let targetProjects = []
  switch (projectType) {
    case 'app':
      targetProjects = appProjects
      break
    case 'web':
      targetProjects = webProjects
      break
    case 'package':
      targetProjects = packagesProjects
      break
  }

  const { projectPath } = await inquirer.prompt({
    type: 'list',
    name: 'projectPath',
    message: '의존성을 주입할 프로젝트를 선택하세요:',
    choices: targetProjects.map(proj => ({
      name: `${proj.name} (${proj.path})`,
      value: proj.path,
    })),
    pageSize: Math.max(targetProjects.length, 20),
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

  // 기존 의존성 확인
  const existingDeps = getExistingDependencies(projectPath)
  const allExistingDeps = [
    ...existingDeps.dependencies,
    ...existingDeps.devDependencies,
  ]

  const { selected } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selected',
      message:
        '주입할 모듈을 선택하세요:\n' +
        '(스페이스: 선택/해제, a: 전체 토글, i: 반전, ↑↓: 이동)\n',
      pageSize: 15,
      choices: allModules.map(m => {
        const isExisting = allExistingDeps.includes(m.name)
        return {
          name: isExisting
            ? `✓ ${m.name} (${m.dir}) - 이미 설치됨`
            : `${m.name} (${m.dir})`,
          value: m,
          disabled: isExisting, // 이미 설치된 것은 선택 불가
        }
      }),
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
