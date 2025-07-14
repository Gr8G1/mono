# mono

## **브랜치 관리**

### **1. 브랜치 생성 CLI**

- **경로**: `tools/shells/cli/create-branch.sh`
- **역할**: 일관된 네이밍 컨벤션으로 브랜치 생성
- **네이밍**: `scope/type/subject`
- **스코프**: 실제 프로젝트 구조를 동적으로 스캔하여 생성 🔍
- **제한**: 🌱 develop 브랜치에서만 새 브랜치 생성 가능

**사용법:**

```bash
# 직접 실행
sh tools/shells/cli/create-branch.sh

# Package 스크립트로 실행 (권장)
pnpm branch
npm run branch
```

**🌱 브랜치 생성 제한:**

- **develop 브랜치에서만** 새 브랜치 생성 가능
- develop 브랜치가 아닌 경우 자동 이동 옵션 제공:
  1. **develop 브랜치로 이동** - 변경사항 스태시 또는 커밋 후 이동
  2. **취소** - 브랜치 생성 취소
- develop 브랜치가 없는 경우 생성 가이드 제공

**브랜치 네이밍 컨벤션:**

**🔍 동적 스코프 생성:**
시스템이 자동으로 프로젝트 구조를 스캔하여 실시간으로 스코프를 생성합니다:

- **📁 apps/** 하위 프로젝트 (동적):
  - `apps/scope/type/` → `scope/type`

- **📌 고정 스코프** (항상 사용 가능):
  - `packages`: 공통 패키지 및 라이브러리 (apis/core, apis/services, ui 등)
  - `tools`: 개발 도구 및 설정
  - `docs`: 문서 및 가이드

**지원하는 브랜치 타입:**

- `feature`: 새로운 기능 개발
- `fix`: 버그 수정 (일반)
- `bugfix`: 버그 수정 (명시적)
- `hotfix`: 긴급 수정 (프로덕션)
- `release`: 릴리즈 준비
- `chore`: 빌드, 설정 등 기타 작업
- `docs`: 문서 작업
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드 작성

### **2. 커밋 메시지 자동 변환**

- **경로**: `tools/shells/husky/commit-msg-prefix.sh`
- **역할**: 브랜치 정보를 기반으로 커밋 메시지에 자동 prefix 추가
- **검증**: 동적 스코프 검증 지원

**변환 예시:**

```bash
# 브랜치: scope/type/feature/WORK-118
# 입력: git commit -m "신규 기능 추가 및 검토"
# 결과: [scope/type/feature] WORK-118: 신규 기능 추가 및 검토
```

### **3. TypeScript References 자동 관리**

- **경로**: `tools/scripts/update-refs.js`
- **역할**: packages 폴더를 스캔하여 TypeScript references를 자동으로 업데이트
- **자동화**: pre-push 훅에서 자동 실행

**사용법:**

```bash
# 수동 실행
pnpm update-refs

# 미리보기 (실제 업데이트 안함)
pnpm update-refs:dry
```

## **코드 품질 관리**

### **3. Pre-push 훅**

- **경로**: `tools/shells/husky/pre-push.sh`
- **역할**: 푸시 전 자동 품질 검사
- **검증**: 동적 스코프 검증 지원

**검사 항목:**

1. **동적 브랜치 네이밍 컨벤션**: 실제 프로젝트 구조 기반 `scope/type/${subject}` 형식 검증
2. **메인 브랜치 보호**: main/master 직접 푸시 차단
3. **코드 린트**: ESLint로 변경된 파일 검사
4. **타입 체크**: TypeScript 타입 검증
5. **테스트 실행**: 관련 테스트 자동 실행
6. **커밋 메시지 품질**: 기본적인 커밋 메시지 규칙 검사

## 🔍 **트러블슈팅**

### **권한 오류**

```bash
# Shell 스크립트 실행 권한 부여
chmod +x tools/shells/cli/*.sh
chmod +x tools/shells/husky/*.sh
```

### **Husky 훅 활성화**

```bash
# Husky 재설치
npx husky install
```

### **경로 문제**

모든 스크립트는 프로젝트 루트에서 실행되도록 설계되었습니다.

### **새 프로젝트 추가 시**

새로운 프로젝트를 `apps/` 또는 `packages/` 하위에 추가하면 자동으로 스코프 목록에 반영됩니다.
브랜치 생성 도구를 다시 실행하면 새로운 스코프를 확인할 수 있습니다.
