#!/usr/bin/env sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
	printf "${GREEN}✅ %s${NC}\n" "$1"
}

warn() {
	printf "${YELLOW}⚠️  %s${NC}\n" "$1"
}

error() {
	printf "${RED}❌ %s${NC}\n" "$1"
}

info() {
	printf "${CYAN}🌿 %s${NC}\n" "$1"
}

line() {
	printf "${CYAN}────────────────────────────────────────────${NC}\n"
}

# 루트에서 스코프 추출
PKG_NAME_RAW=$(grep -o '"name": *"[^"]*"' package.json | head -1 | sed 's/.*"name": *"//;s/".*//')

if echo "$PKG_NAME_RAW" | grep -q '^@'; then
  SCOPE=$(echo "$PKG_NAME_RAW" | sed 's/\(@[^/]*\)\/.*/\1/')
else
  SCOPE="$PKG_NAME_RAW"
fi

if [ -z "$SCOPE" ]; then
  error "루트 package.json에서 name 추출 실패"
  exit 1
fi

# 패키지 경로 입력 받기
if [ $# -eq 0 ]; then
  printf "생성할 패키지 경로를 입력하세요. 폴더 깊이는 '/'로 구분됩니다 : "
  read PKG_PATH
else
  PKG_PATH="$1"
fi

# 각 폴더명 네이밍 규칙 검사
IFS='/' read -ra PARTS <<< "$PKG_PATH"
for part in "${PARTS[@]}"; do
  if ! echo "$part" | grep -qE '^[a-z0-9-]+$'; then
    error "각 폴더명은 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다: $part"
    exit 1
  fi
  if [ -z "$part" ]; then
    error "빈 폴더명은 허용되지 않습니다."
    exit 1
  fi
  # 폴더명 길이 제한(선택)
  if [ ${#part} -gt 30 ]; then
    error "폴더명은 30자 이하로 입력하세요: $part"
    exit 1
  fi
  # 예약어 제한 등 추가 가능
  # ...
done

PKG_DIR="packages/$PKG_PATH"
PKG_NAME=$(echo "$PKG_PATH" | tr '/' '-')

# 중복 검사
if [ -d "$PKG_DIR" ]; then
  error "이미 존재하는 패키지입니다: $PKG_DIR"
  exit 1
fi

# 디렉토리 생성 (최소 구조)
mkdir -p "$PKG_DIR/src"

# package.json
cat > "$PKG_DIR/package.json" <<EOF
{
  "name": "@$SCOPE/$PKG_NAME",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc --build",
    "lint": "eslint \"src/**/*.{ts,tsx}\""
  },
  "dependencies": {},
  "devDependencies": {}
}
EOF

DEPTH=$(awk -F'/' '{print NF}' <<< "$PKG_PATH")
EXTENDS_PATH=""
for i in $(seq 1 $((DEPTH + 1))); do
  EXTENDS_PATH="../$EXTENDS_PATH"
done
EXTENDS_PATH="${EXTENDS_PATH}tsconfig.lib.json"

cat > "$PKG_DIR/tsconfig.json" <<EOF
{
  "extends": "$EXTENDS_PATH",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "tsBuildInfoFile": "./tsconfig.${PKG_NAME}.tsbuildinfo"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

# src/index.ts
echo "// $PKG_NAME 패키지 엔트리" > "$PKG_DIR/src/index.ts"

log "패키지 생성 완료: $PKG_DIR"
