#!/usr/bin/env node

const { log, execCommand, scanAllProjects } = require('./utils')
const fs = require('fs')
const path = require('path')

function getExistingDependencies(projectPath) {
  const packageJsonPath = path.join(projectPath, 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    return { dependencies: [], devDependencies: [], peerDependencies: [] }
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    return {
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {}),
      peerDependencies: Object.keys(packageJson.peerDependencies || {}),
    }
  } catch {
    return { dependencies: [], devDependencies: [], peerDependencies: [] }
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
    message: '모듈을 설치할 프로젝트를 선택하세요:',
    choices: targetProjects.map(proj => ({
      name: `${proj.name} (${proj.path})`,
      value: proj.path,
    })),
    pageSize: Math.max(targetProjects.length, 20),
  })

  const { dependencyType } = await inquirer.prompt({
    type: 'list',
    name: 'dependencyType',
    message: '의존성 타입을 선택하세요:',
    choices: [
      { name: '📦 dependencies (런타임 의존성)', value: 'dependencies' },
      { name: '🔧 devDependencies (개발 의존성)', value: 'devDependencies' },
      { name: '🔗 peerDependencies (피어 의존성)', value: 'peerDependencies' },
    ],
  })

  const { packages } = await inquirer.prompt({
    type: 'input',
    name: 'packages',
    message: '설치할 패키지명을 입력하세요 (공백으로 구분):',
    validate: input => {
      if (!input.trim()) {
        return '패키지명을 입력해주세요.'
      }
      return true
    },
  })

  const packageList = packages
    .trim()
    .split(/\s+/)
    .filter(pkg => pkg.trim())

  if (packageList.length === 0) {
    log.error('❌ 설치할 패키지가 없습니다.')
    process.exit(1)
  }

  const existingDeps = getExistingDependencies(projectPath)
  const existingPackages = existingDeps[dependencyType] || []

  const newPackages = packageList.filter(pkg => !existingPackages.includes(pkg))
  const alreadyInstalled = packageList.filter(pkg =>
    existingPackages.includes(pkg)
  )

  if (alreadyInstalled.length > 0) {
    log.warn(`⚠️ 이미 설치된 패키지: ${alreadyInstalled.join(', ')}`)
  }

  if (newPackages.length === 0) {
    log.warn('⚠️ 설치할 새로운 패키지가 없습니다.')
    process.exit(0)
  }

  log.info(`📦 ${projectPath}에 ${newPackages.join(', ')} 설치 중...`)

  try {
    const flag =
      dependencyType === 'devDependencies'
        ? '--save-dev'
        : dependencyType === 'peerDependencies'
          ? '--save-peer'
          : '--save'

    const cmd = `pnpm --filter ./${projectPath} add ${flag} ${newPackages.join(' ')}`

    if (!execCommand(cmd)) {
      throw new Error(`실행 실패: ${cmd}`)
    }

    log.success(
      `✅ ${newPackages.join(', ')}가 ${dependencyType}에 추가되었습니다.`
    )
  } catch (err) {
    log.error(`❌ 패키지 설치 실패: ${err.message}`)
    process.exit(1)
  }
}

main().catch(err => {
  if (err.name === 'ExitPromptError') {
    log.warn('\n🛑 패키지 설치가 취소되었습니다.')
    process.exit(0)
  }

  log.error(`❌ 스크립트 실행 중 오류 발생: ${err.message || err}`)
  process.exit(1)
})
