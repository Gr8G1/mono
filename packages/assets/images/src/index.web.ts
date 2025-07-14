// Web
const sampleFiles = (import.meta as any).glob(
  './resources/images/sample/*.jpg',
  { eager: true, import: 'default' }
) as Record<string, string>

export type SampleKeys = '1'

export const sample: Record<SampleKeys, string> = {
  '1': sampleFiles['./resources/images/sample/1.jpg'],
}

import IcoArrowLeft from './resources/svg/ico/ico-arrow-left.svg?react'
import IcoArrowRight from './resources/svg/ico/ico-arrow-right.svg?react'

export type IcoKeys = 'ico-arrow-left' | 'ico-arrow-right'

export const ico: Record<IcoKeys, React.FC<React.SVGProps<SVGSVGElement>>> = {
  'ico-arrow-left': IcoArrowLeft,
  'ico-arrow-right': IcoArrowRight,
}

export const images = {
  sample,
}

export const svg = {
  ico,
}

export default { images, svg }
