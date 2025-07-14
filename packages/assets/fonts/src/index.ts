export const FONT_FAMILY = {
  SYSTEM:
    // eslint-disable-next-line quotes
    "'-apple-system', 'BlinkMacSystemFont', system-ui, 'Roboto', 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif",
  // Default
  PRETENDARD: 'Pretendard',
} as const

export type FontFamily = (typeof FONT_FAMILY)[keyof typeof FONT_FAMILY]
