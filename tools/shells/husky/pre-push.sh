#!/usr/bin/env sh

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

# 동적 스코프 검색 함수 (브랜치 생성 도구와 동일)
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

# 브랜치 네이밍 컨벤션 검증 함수
validate_branch_naming() {
	branch_name="$1"

	# 메인 브랜치들은 검사 제외
	case "$branch_name" in
	main | master | develop | version)
		return 0
		;;
	esac

	# scope/type/subject 형식 검증
	# type: feature|fix|bugfix|hotfix|release|chore|docs|refactor|test
	# subject: 영문, 숫자, 하이픈 허용 (예: WORK-118, user-auth)

	if echo "$branch_name" | grep -qE '^[a-zA-Z0-9/-]+/(feature|fix|bugfix|hotfix|release|chore|docs|refactor|test)/[A-Za-z0-9-]+$'; then
		# 추가 검증: 최소 3개 부분으로 구성되어야 함
		parts=$(echo "$branch_name" | awk -F'/' '{print NF}')
		if [ "$parts" -lt 3 ]; then
			return 1
		fi

		# scope 부분 추출
		scope_part=$(echo "$branch_name" | awk -F'/' '{
            for (i = 1; i < NF-1; i++) {
                if (i == 1) {
                    scope = $i
                } else {
                    scope = scope "/" $i
                }
            }
            print scope
        }')

		# 동적으로 생성된 스코프 목록과 비교
		available_scopes=$(discover_project_scopes)
		if [ -n "$available_scopes" ]; then
			IFS='|'
			for valid_scope in $available_scopes; do
				if [ "$scope_part" = "$valid_scope" ]; then
					unset IFS
					return 0
				fi
			done
			unset IFS

			# 알려진 스코프가 아닌 경우 경고만 표시
			warn "알 수 없는 스코프입니다: $scope_part"
			warn "현재 감지된 스코프: $(echo "$available_scopes" | sed 's/|/, /g')"
			return 0 # 경고만 하고 허용
		fi

		return 0
	else
		return 1
	fi
}

# 사용 가능한 스코프 목록 표시
show_available_scopes() {
	available_scopes=$(discover_project_scopes)

	error "현재 사용 가능한 스코프:"
	error ""
	error "🔍 동적 스코프 (프로젝트 구조 기반):"

	dynamic_found=false
	if [ -n "$available_scopes" ]; then
		IFS='|'
		for scope in $available_scopes; do
			if [ -n "$scope" ] && [ "$scope" != "tools" ] && [ "$scope" != "docs" ]; then
				case "$scope" in
				web/*)
					project_name=$(echo "$scope" | cut -d'/' -f2)
					error "  - $scope (웹 애플리케이션: $project_name)"
					;;
				app/*)
					project_name=$(echo "$scope" | cut -d'/' -f2)
					error "  - $scope (모바일 앱: $project_name)"
					;;

				*)
					error "  - $scope (동적 프로젝트)"
					;;
				esac
				dynamic_found=true
			fi
		done
		unset IFS
	fi

	if [ "$dynamic_found" = false ]; then
		error "  (감지된 프로젝트가 없습니다)"
	fi

	error ""
	error "📌 고정 스코프 (항상 사용 가능):"
	error "  - packages (공통 패키지 및 라이브러리)"
	error "  - tools (개발 도구 및 설정)"
	error "  - docs (문서 및 가이드)"
}

# 원격 저장소 정보 읽기
remote="$1"
url="$2"

# 표준 입력에서 푸시할 브랜치 정보 읽기
while read -r local_ref local_sha remote_ref remote_sha; do
	if [ "$local_sha" = "0000000000000000000000000000000000000000" ]; then
		# 브랜치 삭제는 검사하지 않음
		continue
	fi

	# 브랜치 이름 추출
	branch_name=$(echo "$remote_ref" | sed 's/refs\/heads\///')

	log "브랜치 '${branch_name}' 푸시 전 검사를 시작합니다..."

	# 1. main/master 브랜치 직접 푸시 방지
	if [ "$branch_name" = "main" ] || [ "$branch_name" = "master" ]; then
		error "main/master 브랜치에 직접 푸시할 수 없습니다!"
		error "Pull Request를 통해 변경사항을 제출하세요."
		exit 1
	fi

	# 2. 동적 브랜치 네이밍 컨벤션 검사
	if ! validate_branch_naming "$branch_name"; then
		error "브랜치 네이밍 컨벤션을 따르지 않습니다: $branch_name"
		error ""
		error "올바른 형식: scope/type/subject"
		error ""
		show_available_scopes
		error ""
		error "타입 예시:"
		error "  - feature, fix, bugfix, hotfix, release"
		error "  - chore, docs, refactor, test"
		error ""
		error "Subject 예시:"
		error "  - WORK-118, TASK-001, user-auth, login-fix"
		error ""
		error "올바른 브랜치 예시:"
		error "  - scope/type/feature/WORK-118"
		error "  - packages/feature/ui-components"
		error "  - tools/bugfix/AUTH-042"
		error ""
		error "브랜치 생성 도구를 사용하세요: pnpm branch"

		printf "그래도 계속 푸시하시겠습니까? (y/N): "
		read -r reply
		if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
			log "푸시가 취소되었습니다."
			exit 1
		fi
	fi

	# 커밋 메시지 품질 검사 (최근 커밋들)
	if [ "$remote_sha" != "0000000000000000000000000000000000000000" ]; then
		recent_commits=$(git log --oneline "$remote_sha".."$local_sha" 2>/dev/null || echo "")
	else
		recent_commits=$(git log --oneline "$local_sha" -n 5 2>/dev/null || echo "")
	fi

	if [ -n "$recent_commits" ] && [ "$recent_commits" != "" ]; then
		echo "$recent_commits" | while IFS= read -r commit; do
			if [ -n "$commit" ]; then
				msg=$(echo "$commit" | cut -d' ' -f2- 2>/dev/null || echo "")

				# 기본적인 커밋 메시지 규칙 검사
				if [ -n "$msg" ] && [ ${#msg} -lt 10 ]; then
					warn "짧은 커밋 메시지: '$msg'"
				fi

				if echo "$msg" | grep -qE '^(WIP|wip|temp|test)'; then
					warn "임시 커밋 메시지가 포함되어 있습니다: '$msg'"
				fi

				# 자동 prefix가 적용되었는지 확인
				if echo "$msg" | grep -qE '^\[.*\].*:'; then
					info "올바른 커밋 메시지 형식: '$msg'"
				fi
			fi
		done
	fi

	log "브랜치 '${branch_name}' 푸시 전 검사가 완료되었습니다! ✨"
done

log "모든 브랜치 검사가 완료되었습니다. 푸시를 진행합니다! 🚀"
exit 0
