#!/bin/sh

# ==========================================
# 커밋 메시지 전처리 스크립트
# ==========================================
# 역할: 브랜치 정보를 기반으로 커밋 메시지에 prefix를 자동 추가합니다.
# 브랜치 형식: scope/type/subject (동적 스코프 지원)
# 변환 예시:
#   브랜치: scope/type/feature/WORK-118
#   기존 메시지: "신규 기능 추가 및 검토"
#   변환 결과: "[scope/type/feature] WORK-118: 신규 기능 추가 및 검토"
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

# 동적 스코프 검색 함수 (다른 스크립트와 동일)
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

# 브랜치가 유효한 스코프를 사용하는지 검증
validate_scope() {
	branch_scope="$1"
	available_scopes=$(discover_project_scopes)

	if [ -n "$available_scopes" ]; then
		IFS='|'
		for valid_scope in $available_scopes; do
			if [ "$branch_scope" = "$valid_scope" ]; then
				unset IFS
				return 0
			fi
		done
		unset IFS
	fi

	return 1
}

# 커밋 메시지 파일 경로
commit_msg_file="$1"

if [ -z "$commit_msg_file" ]; then
	error "커밋 메시지 파일 경로가 제공되지 않았습니다."
	exit 1
fi

if [ ! -f "$commit_msg_file" ]; then
	error "커밋 메시지 파일을 찾을 수 없습니다: $commit_msg_file"
	exit 1
fi

# 현재 브랜치 이름 가져오기
current_branch=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [ -z "$current_branch" ]; then
	warn "현재 브랜치를 감지할 수 없습니다. 원본 커밋 메시지를 유지합니다."
	exit 0
fi

# main, master, develop 브랜치는 prefix 추가하지 않음
case "$current_branch" in
main | master | develop)
	info "메인 브랜치에서는 prefix를 추가하지 않습니다."
	exit 0
	;;
esac

# 브랜치 이름 파싱 (scope/type/subject 형식)
parse_branch_name() {
	echo "$current_branch" | awk -F'/' '
    {
        if (NF >= 3) {
            # scope/type/subject 형식
            scope = $1
            for (i = 2; i < NF; i++) {
                if (i == 2) {
                    type = $i
                } else {
                    type = type "/" $i
                }
            }
            subject = $NF

            # scope와 type이 유효한지 확인
            if (scope != "" && type != "" && subject != "") {
                print scope "/" type "|" subject
                exit 0
            }
        }

        # 파싱 실패
        print "error"
    }'
}

branch_info=$(parse_branch_name)

if [ "$branch_info" = "error" ]; then
	warn "브랜치 네이밍 컨벤션을 따르지 않습니다: $current_branch"
	warn "예상 형식: scope/type/subject (예: web/boil-react/feature/WORK-118)"
	warn "원본 커밋 메시지를 유지합니다."
	exit 0
fi

# scope/type과 subject 분리
scope_type=$(echo "$branch_info" | cut -d'|' -f1)
subject=$(echo "$branch_info" | cut -d'|' -f2)

# 스코프 부분만 추출하여 검증
scope_only=$(echo "$scope_type" | awk -F'/' '{
    for (i = 1; i < NF; i++) {
        if (i == 1) {
            scope = $i
        } else {
            scope = scope "/" $i
        }
    }
    print scope
}')

# 동적 스코프 검증
if ! validate_scope "$scope_only"; then
	warn "알 수 없는 스코프입니다: $scope_only"
	available_scopes=$(discover_project_scopes)
	warn "현재 사용 가능한 스코프: $(echo "$available_scopes" | sed 's/|/, /g')"
	warn "하지만 커밋 메시지 변환을 계속 진행합니다."
fi

# 원본 커밋 메시지 읽기
original_msg=$(cat "$commit_msg_file")

# 빈 커밋 메시지 체크
if [ -z "$original_msg" ] || [ "$original_msg" = "" ]; then
	warn "빈 커밋 메시지입니다. prefix를 추가하지 않습니다."
	exit 0
fi

# 이미 prefix가 있는지 확인 (중복 방지)
if echo "$original_msg" | grep -qE '^\[.*\]'; then
	info "이미 prefix가 있는 커밋 메시지입니다. 중복 추가하지 않습니다."
	exit 0
fi

# 새로운 커밋 메시지 생성
new_msg="[${scope_type}] ${subject}: ${original_msg}"

# 커밋 메시지 길이 체크 (Git의 권장사항: 첫 줄 50자 이내)
first_line=$(echo "$new_msg" | head -n1)
if [ ${#first_line} -gt 72 ]; then
	warn "커밋 메시지가 너무 깁니다 (${#first_line}자). 권장: 72자 이내"
	warn "긴 설명은 빈 줄 후 본문에 작성하는 것을 권장합니다."
fi

# 새로운 커밋 메시지를 파일에 쓰기
echo "$new_msg" >"$commit_msg_file"

log "커밋 메시지 변환 완료:"
info "브랜치: $current_branch"
info "스코프/타입: $scope_type"
info "Subject: $subject"
info "변환 결과: $new_msg"

# 성공 로그
log "커밋 메시지에 브랜치 정보가 자동으로 추가되었습니다! ✨"

exit 0
