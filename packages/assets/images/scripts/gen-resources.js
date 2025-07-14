const fs = require('fs')
const path = require('path')

function generateImageResource(resourcePath, isNative = true) {
  const files = fs
    .readdirSync(resourcePath)
    .filter(file => /\.(png|jpg|jpeg|gif|svg)$/i.test(file))
    .sort((a, b) => {
      const aNum = parseInt(a.match(/\d+/)?.[0] || '0')
      const bNum = parseInt(b.match(/\d+/)?.[0] || '0')
      return aNum - bNum
    })

  if (files.length === 0) {
    return ''
  }

  const resourceName = path.basename(resourcePath)
  const relativePath = path.relative(
    path.join(__dirname, '../src'),
    resourcePath
  )

  const fileNames = files.map(file => path.parse(file).name)
  const typeDefinition = `export type ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}Keys = ${fileNames.map(name => `'${name}'`).join(' | ')}`

  if (isNative) {
    // 네이티브용: require 사용
    const requires = files
      .map(
        file =>
          `  '${path.parse(file).name}': require('./${relativePath}/${file}'),`
      )
      .join('\n')

    return `${typeDefinition}

export const ${resourceName}: Record<${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}Keys, any> = {\n${requires}\n}`
  } else {
    // 웹용: Vite import.meta.glob 사용 (타입 단언으로 처리)
    const fileExtension = path.extname(files[0])
    const globPattern = `./${relativePath}/*${fileExtension}`
    const globVarName = `${resourceName}Files`

    const globImport = `const ${globVarName} = (import.meta as any).glob('${globPattern}', { eager: true, import: 'default' }) as Record<string, string>`

    const exports = files
      .map(
        file =>
          `  '${path.parse(file).name}': ${globVarName}['./${relativePath}/${file}']`
      )
      .join(',\n')

    return `${globImport}

${typeDefinition}

export const ${resourceName}: Record<${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}Keys, string> = {\n${exports}\n}`
  }
}

function generateSvgResource(resourcePath, isNative = true) {
  const files = fs
    .readdirSync(resourcePath)
    .filter(file => /\.svg$/i.test(file))
    .sort((a, b) => {
      const aNum = parseInt(a.match(/\d+/)?.[0] || '0')
      const bNum = parseInt(b.match(/\d+/)?.[0] || '0')
      return aNum - bNum
    })

  if (files.length === 0) {
    return ''
  }

  const resourceName = path.basename(resourcePath)
  const relativePath = path.relative(
    path.join(__dirname, '../src'),
    resourcePath
  )

  const fileNames = files.map(file => path.parse(file).name)
  const typeDefinition = `export type ${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}Keys = ${fileNames.map(name => `'${name}'`).join(' | ')}`

  if (isNative) {
    // 네이티브용: ?native 쿼리 파라미터를 사용한 import
    const imports = files
      .map(file => {
        const cleanFileName = path
          .parse(file)
          .name.split(/[-_]/)
          .map(
            word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join('')
        return `import ${cleanFileName} from './${relativePath}/${file}'`
      })
      .join('\n')

    const exports = files
      .map(file => {
        const cleanFileName = path
          .parse(file)
          .name.split(/[-_]/)
          .map(
            word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join('')
        return `  '${path.parse(file).name}': ${cleanFileName}`
      })
      .join(',\n')

    return `import { SvgProps } from 'react-native-svg'

${imports}

${typeDefinition}

export const ${resourceName}: Record<${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}Keys, React.FC<SvgProps>> = {\n${exports}\n}`
  } else {
    // 웹용: 직접 import 사용 (?react 쿼리 파라미터 추가)
    const imports = files
      .map(file => {
        const cleanFileName = path
          .parse(file)
          .name.split(/[-_]/)
          .map(
            word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join('')
        return `import ${cleanFileName} from './${relativePath}/${file}?react'`
      })
      .join('\n')

    const exports = files
      .map(file => {
        const cleanFileName = path
          .parse(file)
          .name.split(/[-_]/)
          .map(
            word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join('')
        return `  '${path.parse(file).name}': ${cleanFileName}`
      })
      .join(',\n')

    return `${imports}

${typeDefinition}

export const ${resourceName}: Record<${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}Keys, React.FC<React.SVGProps<SVGSVGElement>>> = {\n${exports}\n}`
  }
}

function generateImagesIndex(isNative = true) {
  const resourcesPath = path.join(__dirname, '../src/resources')

  // images 폴더 처리
  const imagesPath = path.join(resourcesPath, 'images')
  const imageResources = fs
    .readdirSync(imagesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .map(resource =>
      generateImageResource(path.join(imagesPath, resource), isNative)
    )
    .filter(Boolean)
    .join('\n\n')

  // svg 폴더 처리
  const svgPath = path.join(resourcesPath, 'svg')
  let svgResources = ''
  if (fs.existsSync(svgPath)) {
    const svgFolders = fs
      .readdirSync(svgPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .map(resource =>
        generateSvgResource(path.join(svgPath, resource), isNative)
      )
      .filter(Boolean)
      .join('\n\n')

    if (svgFolders) {
      svgResources = `\n\n${svgFolders}`
    }
  }

  const platformComment = isNative ? '// Native' : '// Web'

  // images export 생성
  const imageExports = fs
    .readdirSync(imagesPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .join(',\n  ')

  // svg export 생성
  let svgExports = ''
  if (fs.existsSync(svgPath)) {
    const svgFolders = fs
      .readdirSync(svgPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    if (svgFolders.length > 0) {
      svgExports = svgFolders.join(',\n  ')
    }
  }

  return `${platformComment}
${imageResources}${svgResources}

export const images = {
  ${imageExports}
}

export const svg = {
  ${svgExports}
}

export default { images, svg }
`
}

// 네이티브용 index.native.ts 생성
const nativeIndexPath = path.join(__dirname, '../src/index.native.ts')
fs.writeFileSync(nativeIndexPath, generateImagesIndex(true))

// 웹용 index.web.ts 생성
const webIndexPath = path.join(__dirname, '../src/index.web.ts')
fs.writeFileSync(webIndexPath, generateImagesIndex(false))

console.log(
  '✅ 네이티브용 index.native.ts와 웹용 index.web.ts 파일이 생성되었습니다.'
)
