#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const { log } = require('./utils')

function findTypeScriptProjects() {
  const projects = []
  function scan(dir, relativePath = '') {
    if (!fs.existsSync(dir)) {
      return
    }
    for (const item of fs.readdirSync(dir)) {
      const itemPath = path.join(dir, item)
      const stat = fs.statSync(itemPath)
      if (stat.isDirectory()) {
        const tsconfigPath = path.join(itemPath, 'tsconfig.json')
        const packageJsonPath = path.join(itemPath, 'package.json')
        const currentRelativePath = path.join(relativePath, item)
        if (fs.existsSync(tsconfigPath) && fs.existsSync(packageJsonPath)) {
          try {
            const packageJson = JSON.parse(
              fs.readFileSync(packageJsonPath, 'utf8')
            )
            const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
            const isComposite = tsconfig.compilerOptions?.composite !== false
            if (isComposite) {
              projects.push({
                name: packageJson.name || currentRelativePath,
                path: `./packages/${currentRelativePath}`,
                relativePath: currentRelativePath,
              })
            }
          } catch {
            log(`⚠️ ${currentRelativePath}: 설정 파일 파싱 오류`, 'yellow')
          }
        } else {
          scan(itemPath, currentRelativePath)
        }
      }
    }
  }
  scan(path.resolve('packages'))
  return projects
}

function updateRootTsConfig(selectedProjects) {
  const tsconfigPath = path.resolve('tsconfig.json')
  let tsconfig = {}
  if (fs.existsSync(tsconfigPath)) {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
  }
  tsconfig.files = []
  tsconfig.references = selectedProjects.map(p => ({ path: p.path }))
  tsconfig.references.sort((a, b) => a.path.localeCompare(b.path))
  fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n')
  log.success('✅ tsconfig.json이 성공적으로 업데이트되었습니다!')
}

async function main() {
  const { default: inquirer } = await import('inquirer')
  const args = process.argv.slice(2)

  log.info('🔍 TypeScript 프로젝트 스캔 중...')
  const projects = findTypeScriptProjects()

  if (projects.length === 0) {
    log.warn('⚠️ 발견된 프로젝트가 없습니다.')
    process.exit(0)
  }

  const { selected } = await inquirer.prompt({
    type: 'checkbox',
    name: 'selected',
    message: 'references에 추가할 TypeScript 프로젝트를 선택하세요:',
    choices: projects.map(p => ({
      name: `${p.name} (${p.path})`,
      value: p,
    })),
    validate: arr => (arr.length > 0 ? true : '하나 이상 선택해야 합니다.'),
    pageSize: 15,
  })

  const dryRun = args.includes('--dry-run')
  if (!dryRun) {
    const { confirm } = await inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: '선택한 프로젝트로 tsconfig.json을 업데이트할까요?',
      default: true,
    })
    if (!confirm) {
      log.warn('\n🛑 업데이트가 취소되었습니다.')
      process.exit(0)
    }
  }

  if (dryRun) {
    log.info('\n🔍 Dry run 모드 - 실제 업데이트하지 않았습니다.')
    log.info('\n추가될 references 목록:')
    selected.forEach((p, i) => {
      log.info(`  ${i + 1}. ${p.name} (${p.path})`)
    })
    process.exit(0)
  }

  updateRootTsConfig(selected)
}

main().catch(err => {
  log.error(`❌ 실행 실패: ${err.message || err}`)
  process.exit(1)
})
