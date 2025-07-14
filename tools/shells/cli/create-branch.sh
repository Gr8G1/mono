#!/bin/sh

# ==========================================
# 브랜치 생성 CLI 도구
# ==========================================
# 역할: 일관된 네이밍 컨벤션으로 브랜치를 생성합니다.
# 네이밍: scope/type/subject (예: web/boil-react/feature/WORK-118)
# 스코프: 실제 프로젝트 구조를 동적으로 스캔하여 생성
# 사용법: sh tools/shells/cli/create-branch.sh
# ==========================================

set -e

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

# 동적 스코프 검색 함수
discover_project_scopes() {
	scopes=""

	# apps/ 하위 프로젝트 스캔
	if [ -d "apps" ]; then
		for category in apps/*/; do
			if [ -d "$category" ]; then
				category_name=$(basename "$category")
				for project in "$category"*/; do
					if [ -d "$project" ]; then
						project_name=$(basename "$project")
						scope="${category_name}/${project_name}"
						scopes="$scopes|$scope"
					fi
				done
			fi
		done
	fi

	# 고정 스코프 추가 (프로젝트와 무관하게 항상 제공)
	scopes="$scopes|tools|docs|packages"

	# 앞의 | 제거
	echo "$scopes" | sed 's/^|//'
}

# 스코프 설명 생성 함수
get_scope_description() {
	scope="$1"

	case "$scope" in
	web/*)
		project_name=$(echo "$scope" | cut -d'/' -f2)
		echo "웹 애플리케이션: $project_name"
		;;
	app/*)
		project_name=$(echo "$scope" | cut -d'/' -f2)
		echo "모바일 앱: $project_name"
		;;
	tools)
		echo "개발 도구 및 설정 (고정 스코프)"
		;;
	docs)
		echo "문서 및 가이드 (고정 스코프)"
		;;
	packages)
		echo "공통 패키지 및 라이브러리 (고정 스코프)"
		;;
	*)
		echo "프로젝트: $scope (동적 스코프)"
		;;
	esac
}

# 브랜치 타입 매핑 함수
get_branch_type() {
	case "$1" in
	1) echo "feature" ;;
	2) echo "fix" ;;
	3) echo "bugfix" ;;
	4) echo "hotfix" ;;
	5) echo "release" ;;
	6) echo "chore" ;;
	7) echo "docs" ;;
	8) echo "refactor" ;;
	9) echo "test" ;;
	*) echo "" ;;
	esac
}

# 브랜치 타입 설명 함수
get_branch_description() {
	case "$1" in
	feature) echo "새로운 기능 개발" ;;
	fix) echo "버그 수정 (일반)" ;;
	bugfix) echo "버그 수정 (명시적)" ;;
	hotfix) echo "긴급 수정 (프로덕션)" ;;
	release) echo "릴리즈 준비" ;;
	chore) echo "빌드, 설정 등 기타 작업" ;;
	docs) echo "문서 작업" ;;
	refactor) echo "코드 리팩토링" ;;
	test) echo "테스트 코드 작성" ;;
	*) echo "알 수 없는 타입" ;;
	esac
}

# Git 상태 확인
check_git_status() {
	if ! git rev-parse --git-dir >/dev/null 2>&1; then
		error "Git 저장소가 아닙니다!"
		exit 1
	fi

	# 변경사항 확인
	if ! git diff-index --quiet HEAD -- 2>/dev/null; then
		warn "커밋되지 않은 변경사항이 있습니다."
		printf "계속하시겠습니까? (y/N): "
		read -r reply
		if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
			log "브랜치 생성이 취소되었습니다."
			exit 0
		fi
	fi
}

# develop 브랜치 확인 및 전환
check_develop_branch() {
	current_branch=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD)

	if [ "$current_branch" = "develop" ]; then
		log "develop 브랜치에서 진행합니다."
		return 0
	fi

	line
	warn "새 브랜치는 반드시 develop 브랜치에서만 생성할 수 있습니다!"
	warn "현재 브랜치: $current_branch"
	line
	echo
	error "develop 브랜치가 존재하지 않습니다!"
	echo
	warn "아래 명령어로 develop 브랜치를 먼저 생성하세요:"
	echo "  $ git checkout -b develop"
	echo "  $ git push -u origin develop"
	line
	exit 1
}

# 현재 브랜치 정보 표시
show_current_branch() {
	current_branch=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD)
	log "현재 브랜치: ${CYAN}${current_branch}${NC}"

	# 원격 브랜치와 동기화 상태 확인
	if git rev-parse --verify "origin/${current_branch}" >/dev/null 2>&1; then
		ahead=$(git rev-list --count "origin/${current_branch}..HEAD" 2>/dev/null || echo "0")
		behind=$(git rev-list --count "HEAD..origin/${current_branch}" 2>/dev/null || echo "0")

		if [ "$ahead" -gt 0 ] || [ "$behind" -gt 0 ]; then
			warn "원격 브랜치와 동기화되지 않음 (ahead: $ahead, behind: $behind)"
		fi
	fi
}

# 스코프 선택
select_scope() {
	echo
	info "프로젝트 스코프를 선택하세요:"
	echo

	# 동적으로 스코프 목록 생성
	available_scopes=$(discover_project_scopes)

	if [ -z "$available_scopes" ]; then
		error "사용 가능한 프로젝트 스코프를 찾을 수 없습니다!"
		exit 1
	fi

	# 스코프 목록을 배열처럼 처리
	scope_count=0
	IFS='|'
	for scope in $available_scopes; do
		if [ -n "$scope" ]; then
			scope_count=$((scope_count + 1))
			description=$(get_scope_description "$scope")
			printf "  ${PURPLE}%d${NC}) ${CYAN}%-20s${NC} - %s\n" "$scope_count" "$scope" "$description"
		fi
	done
	unset IFS

	echo
	while true; do
		printf "선택 (1-${scope_count}): "
		read -r scope_choice

		if [ "$scope_choice" -ge 1 ] && [ "$scope_choice" -le "$scope_count" ] 2>/dev/null; then
			# 선택된 스코프 찾기
			current_count=0
			IFS='|'
			for scope in $available_scopes; do
				if [ -n "$scope" ]; then
					current_count=$((current_count + 1))
					if [ "$current_count" -eq "$scope_choice" ]; then
						selected_scope="$scope"
						break
					fi
				fi
			done
			unset IFS
			break
		else
			error "올바른 번호를 선택하세요 (1-${scope_count})"
		fi
	done

	log "선택된 스코프: ${CYAN}${selected_scope}${NC}"
}

# 브랜치 타입 선택
select_branch_type() {
	echo
	info "브랜치 타입을 선택하세요:"
	echo

	printf "  ${PURPLE}1${NC}) ${CYAN}%-12s${NC} - %s\n" "feature" "$(get_branch_description "feature")"
	printf "  ${PURPLE}2${NC}) ${CYAN}%-12s${NC} - %s\n" "fix" "$(get_branch_description "fix")"
	printf "  ${PURPLE}3${NC}) ${CYAN}%-12s${NC} - %s\n" "bugfix" "$(get_branch_description "bugfix")"
	printf "  ${PURPLE}4${NC}) ${CYAN}%-12s${NC} - %s\n" "hotfix" "$(get_branch_description "hotfix")"
	printf "  ${PURPLE}5${NC}) ${CYAN}%-12s${NC} - %s\n" "release" "$(get_branch_description "release")"
	printf "  ${PURPLE}6${NC}) ${CYAN}%-12s${NC} - %s\n" "chore" "$(get_branch_description "chore")"
	printf "  ${PURPLE}7${NC}) ${CYAN}%-12s${NC} - %s\n" "docs" "$(get_branch_description "docs")"
	printf "  ${PURPLE}8${NC}) ${CYAN}%-12s${NC} - %s\n" "refactor" "$(get_branch_description "refactor")"
	printf "  ${PURPLE}9${NC}) ${CYAN}%-12s${NC} - %s\n" "test" "$(get_branch_description "test")"

	echo
	while true; do
		printf "선택 (1-9): "
		read -r type_choice

		selected_type=$(get_branch_type "$type_choice")
		if [ -n "$selected_type" ]; then
			break
		else
			error "올바른 번호를 선택하세요 (1-9)"
		fi
	done

	log "선택된 타입: ${CYAN}${selected_type}${NC}"
}

# 작업 Subject 입력
input_subject() {
	echo
	info "작업 Subject를 입력하세요:"
	echo "  - 작업 ID: WORK-118, TASK-001, FIX-042 등"
	echo "  - 또는 간략한 설명: user-auth, login-fix 등"
	echo "  - 영문, 숫자, 하이픈(-) 사용 가능"
	echo

	while true; do
		printf "Subject: "
		read -r subject

		# 입력 검증
		if [ -z "$subject" ]; then
			error "Subject를 입력하세요."
			continue
		fi

		# 네이밍 규칙 검증 (영문, 숫자, 하이픈만 허용)
		if ! echo "$subject" | grep -qE '^[A-Za-z0-9-]+$'; then
			error "영문, 숫자, 하이픈(-)만 사용 가능합니다."
			continue
		fi

		# 길이 제한
		if [ ${#subject} -gt 50 ]; then
			error "Subject는 50자 이하로 입력하세요."
			continue
		fi

		break
	done

	# 최종 브랜치 이름 생성
	final_branch_name="${selected_scope}/${selected_type}/${subject}"
	log "생성될 브랜치: ${CYAN}${final_branch_name}${NC}"
}

# 브랜치 존재 여부 확인
check_branch_exists() {
	if git show-ref --verify --quiet "refs/heads/${final_branch_name}"; then
		error "브랜치 '${final_branch_name}'가 이미 존재합니다!"
		exit 1
	fi

	if git show-ref --verify --quiet "refs/remotes/origin/${final_branch_name}"; then
		error "원격에 브랜치 '${final_branch_name}'가 이미 존재합니다!"
		exit 1
	fi
}

# 최종 확인
confirm_creation() {
	echo
	info "브랜치 생성 정보:"
	echo "  스코프: ${CYAN}${selected_scope}${NC}"
	echo "  타입: ${CYAN}${selected_type}${NC}"
	echo "  Subject: ${CYAN}${subject}${NC}"
	echo "  전체: ${CYAN}${final_branch_name}${NC}"
	echo "  베이스: ${CYAN}$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD)${NC}"
	echo

	printf "브랜치를 생성하시겠습니까? (y/N): "
	read -r reply

	if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
		log "브랜치 생성이 취소되었습니다."
		exit 0
	fi
}

# 브랜치 생성
create_branch() {
	log "브랜치를 생성하는 중..."

	if git checkout -b "${final_branch_name}"; then
		log "브랜치 '${final_branch_name}'가 성공적으로 생성되었습니다! ✨"

		# 원격에 푸시할지 물어보기
		echo
		printf "원격 저장소에 푸시하시겠습니까? (y/N): "
		read -r reply

		if [ "$reply" = "y" ] || [ "$reply" = "Y" ]; then
			log "원격 저장소에 푸시하는 중..."
			if git push -u origin "${final_branch_name}"; then
				log "원격 저장소에 푸시되었습니다! 🚀"
			else
				error "원격 저장소 푸시에 실패했습니다."
			fi
		fi

	else
		error "브랜치 생성에 실패했습니다."
		exit 1
	fi
}

# 사용법 표시
show_usage() {
	echo
	info "브랜치 생성 CLI 도구"
	echo
	echo "사용법:"
	echo "  sh tools/shells/cli/create-branch.sh"
	echo "  pnpm branch"
	echo "  npm run branch"
	echo
	echo "브랜치 네이밍 컨벤션: scope/type/subject"
	echo
	warn "⚠️  새 브랜치는 develop 브랜치에서만 생성할 수 있습니다!"
	echo "   develop 브랜치가 아닌 경우 자동으로 이동 옵션을 제공합니다."
	echo
	echo "📋 현재 사용 가능한 스코프:"
	echo ""
	echo "🔍 동적 스코프 (프로젝트 구조 기반):"

	available_scopes=$(discover_project_scopes)
	dynamic_found=false
	if [ -n "$available_scopes" ]; then
		IFS='|'
		for scope in $available_scopes; do
			if [ -n "$scope" ] && [ "$scope" != "tools" ] && [ "$scope" != "docs" ] && [ "$scope" != "packages" ]; then
				description=$(get_scope_description "$scope")
				printf "  - %-20s: %s\n" "$scope" "$description"
				dynamic_found=true
			fi
		done
		unset IFS
	fi

	if [ "$dynamic_found" = false ]; then
		echo "  (감지된 프로젝트가 없습니다)"
	fi

	echo ""
	echo "📌 고정 스코프 (항상 사용 가능):"
	printf "  - %-20s: %s\n" "tools" "$(get_scope_description "tools")"
	printf "  - %-20s: %s\n" "docs" "$(get_scope_description "docs")"
	printf "  - %-20s: %s\n" "packages" "$(get_scope_description "packages")"

	echo
	echo "지원하는 브랜치 타입:"
	printf "  - %-12s: %s\n" "feature" "$(get_branch_description "feature")"
	printf "  - %-12s: %s\n" "fix" "$(get_branch_description "fix")"
	printf "  - %-12s: %s\n" "bugfix" "$(get_branch_description "bugfix")"
	printf "  - %-12s: %s\n" "hotfix" "$(get_branch_description "hotfix")"
	printf "  - %-12s: %s\n" "release" "$(get_branch_description "release")"
	printf "  - %-12s: %s\n" "chore" "$(get_branch_description "chore")"
	printf "  - %-12s: %s\n" "docs" "$(get_branch_description "docs")"
	printf "  - %-12s: %s\n" "refactor" "$(get_branch_description "refactor")"
	printf "  - %-12s: %s\n" "test" "$(get_branch_description "test")"
	echo
	echo "예시: web/boil-react/feature/WORK-118"
	echo "     packages/bugfix/AUTH-042"
	echo "     packages/feature/ui-components"
}

# 메인 함수
main() {
	# 도움말 확인
	if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
		show_usage
		exit 0
	fi

	info "Git 브랜치 생성 도구를 시작합니다..."
	echo "   네이밍 컨벤션: scope/type/subject"
	echo "   📁 실제 프로젝트 구조를 기반으로 스코프를 생성합니다"
	echo "   🌱 develop 브랜치에서만 새 브랜치를 생성할 수 있습니다"
	line

	check_git_status
	check_develop_branch
	show_current_branch
	select_scope
	select_branch_type
	input_subject
	check_branch_exists
	confirm_creation
	create_branch

	echo
	log "브랜치 생성이 완료되었습니다! 즐거운 개발 되세요! 🎉"
}

# 스크립트 실행
main "$@"
