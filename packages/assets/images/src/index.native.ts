// Native
export type SampleKeys = '1'

export const sample: Record<SampleKeys, any> = {
  '1': require('./resources/images/sample/1.jpg'),
}

import { SvgProps } from 'react-native-svg'

import IcoArrowLeft from './resources/svg/ico/ico-arrow-left.svg'
import IcoArrowRight from './resources/svg/ico/ico-arrow-right.svg'

export type IcoKeys = 'ico-arrow-left' | 'ico-arrow-right'

export const ico: Record<IcoKeys, React.FC<SvgProps>> = {
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
