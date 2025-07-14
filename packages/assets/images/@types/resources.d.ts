declare module '*.svg' {
  import * as React from 'react'
  import { SvgProps } from 'react-native-svg'

  const content: React.FC<SvgProps>
  export default content
}

declare module '*.svg?react' {
  import * as React from 'react'
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>
  export default ReactComponent
}

declare module '*.jpg'
declare module '*.png'
declare module '*.jpeg'
declare module '*.gif'
declare module '*.webp'
