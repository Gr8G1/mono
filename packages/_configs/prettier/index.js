module.exports = {
  semi: false, // 세미콜론 사용 안함 (ESLint 설정에 맞춤)
  trailingComma: 'es5', // ES5 호환 trailing comma
  singleQuote: true, // 단일 따옴표 사용
  doubleQuote: false, // 이중 따옴표 사용 안함
  tabWidth: 2, // 탭 크기
  useTabs: false, // 스페이스 사용 (탭 안함)
  printWidth: 120, // 한 줄 최대 길이

  // 괄호 및 공백 설정
  bracketSpacing: true, // 객체 괄호 내 공백
  bracketSameLine: false, // JSX 괄호 새줄
  arrowParens: 'avoid', // 화살표 함수 괄호 최소화

  // 줄바꿈 설정
  endOfLine: 'lf', // Unix 스타일 줄바꿈
  insertPragma: false, // @format 주석 자동 삽입 안함
  requirePragma: false, // @format 주석 필수 안함

  // 언어별 설정
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
        tabWidth: 2,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'preserve', // 마크다운 줄바꿈 유지
        tabWidth: 2,
      },
    },
    {
      files: '*.{yml,yaml}',
      options: {
        tabWidth: 2,
        singleQuote: false, // YAML에서는 이중 따옴표
      },
    },
    {
      files: '*.{css,scss,sass,less}',
      options: {
        printWidth: 100,
        singleQuote: false, // CSS에서는 이중 따옴표
      },
    },
    {
      files: '*.{ts,tsx}',
      options: {
        parser: 'typescript',
        printWidth: 80,
        semi: false, // ESLint 설정에 맞춤
        singleQuote: true,
        trailingComma: 'es5',
      },
    },
    {
      files: '*.{js,jsx}',
      options: {
        parser: 'babel',
        printWidth: 80,
        semi: false, // ESLint 설정에 맞춤
        singleQuote: true,
        trailingComma: 'es5',
      },
    },
  ],
}
