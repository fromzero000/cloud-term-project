# AWS Connection Start Plan

This plan is only for the cloud folder. It does not require editing frontend or backend code.

Current frontend test URL:

```text
https://strong-bikes-repeat.loca.lt/main
```

The page shows that the current app can load the room list and display create/join room UI. It is not fully polished yet, but it was enough to begin cloud-side AWS connection preparation.

Current AWS progress:

* EC2 backend test environment created
* Test FastAPI backend running on EC2
* `/health` verified on EC2
* systemd service configured for the test backend
* S3 frontend bucket created
* Frontend build files uploaded to S3
* CloudFront distribution created and connected to S3

---

## Korean

## 결론

AWS 연결 준비를 시작해도 됩니다.

단, 현재 단계에서는 프론트엔드/백엔드 코드를 직접 수정하지 않고, 클라우드 파트에서 할 수 있는 준비만 진행합니다.
가장 안전한 시작 범위는 EC2, Security Group, Target Group, ALB 준비입니다.
CloudFront 최종 연결은 프론트엔드의 local URL이 ALB 기반 환경 변수로 바뀐 뒤 진행하는 것이 안전합니다.

완료된 작업:

* EC2 테스트 backend 환경 구성
* 테스트 FastAPI `/health` 확인
* systemd로 테스트 backend 상시 실행 설정
* S3 bucket 생성
* frontend build 파일 S3 업로드
* CloudFront distribution 생성

다음 가능한 작업:

* 실제 프로젝트 backend 코드를 EC2에 배포
* Target Group / ALB health check 정상화
* EC2 8000번 포트 접근을 ALB Security Group 기준으로 변경
* 프론트엔드 담당자에게 전달할 환경 변수 정리
* frontend local URL 제거 후 새 build 파일 S3 재업로드
* CloudFront invalidation 실행
* 최종 보고서용 스크린샷 목록 준비

아직 직접 하면 안 되는 작업:

* `frontend/` 코드 수정
* `backend/` 코드 수정
* 로컬 URL을 직접 코드에서 변경
* API 구조 변경
* 실제 Kakao key, DB password, SSH key 같은 민감한 값을 문서에 커밋

---

## 현재 상태 기준 판단

현재 웹사이트에서 확인된 상태:

* `/main` 페이지 접근 가능
* 방 목록 표시 가능
* 출발지, 목적지, 시간, 인원 정보 표시 가능
* 참여하기 / 방 입장 버튼 표시 가능
* UI는 완전하지 않지만 AWS 배포 연습을 시작할 수준은 됨

클라우드 관점에서 아직 주의할 점:

* 프론트엔드가 아직 local backend URL에 의존할 수 있음
* CloudFront에서 실행하면 `localhost`는 사용자의 컴퓨터를 의미하므로 작동하지 않음
* API와 WebSocket은 ALB 주소로 연결되어야 함
* HTTPS CloudFront에서 HTTP ALB를 호출하면 mixed content 문제가 생길 수 있음

---

## 1단계: AWS 리소스 이름 확정

| Resource | Name |
| --- | --- |
| S3 Bucket | `taxi-mate-team9-frontend` |
| CloudFront | `taxi-mate-team9-cdn` |
| EC2 | `taxi-mate-team9-backend` |
| ALB | `taxi-mate-team9-alb` |
| Target Group | `taxi-mate-team9-tg` |
| EC2 Security Group | `taxi-mate-team9-ec2-sg` |
| ALB Security Group | `taxi-mate-team9-alb-sg` |
| RDS | `taxi-mate-team9-db` |
| Redis | `taxi-mate-team9-redis` |

S3 bucket 이름이 이미 사용 중이면 아래처럼 변경:

```text
taxi-mate-team9-frontend-202155502
```

---

## 2단계: Security Group 계획

| From | To | Port | Why |
| --- | --- | --- | --- |
| User | CloudFront | 443 | 프론트엔드 접속 |
| User | ALB | 80/443 | API 및 WebSocket 요청 |
| ALB SG | EC2 SG | 8000 | FastAPI 백엔드로 요청 전달 |
| Your IP | EC2 SG | 22 | SSH 접속 |
| EC2 SG | RDS SG | 5432 | PostgreSQL 데이터베이스 |
| EC2 SG | Redis SG | 6379 | 세션 및 GPS Pub/Sub |

초기 테스트:

* EC2 8000번 포트는 내 IP에서만 임시 허용 가능

ALB 연결 후:

* EC2 8000번 포트는 ALB Security Group에서만 허용
* RDS와 Redis는 public access 금지

---

## 3단계: Backend AWS 연결 준비

백엔드를 EC2에 올릴 준비를 합니다.

클라우드 파트에서 준비할 것:

* Ubuntu 22.04 EC2 생성
* Python, pip, venv, git 설치
* backend 코드 clone 준비
* `uvicorn main:app --host 0.0.0.0 --port 8000` 실행 준비
* `systemd` 서비스 파일 준비

Health check 주의:

* 최종 권장: `/health`
* 현재 백엔드에 `/health`가 없다면 임시로 ALB health check path를 `/api/rooms`로 둘 수 있음
* 단, 보고서와 최종 구조에서는 `/health`를 추가하는 것이 더 좋다고 작성

---

## 4단계: ALB 연결 준비

Target Group:

```text
Protocol: HTTP
Port: 8000
Target type: Instance
Health check path: /health
Temporary health check path: /api/rooms
```

ALB:

```text
Scheme: Internet-facing
Listener: HTTP 80 first
Later: HTTPS 443
```

WebSocket:

* ALB는 WebSocket 트래픽을 지원함
* 첫 테스트는 `ws://ALB-DNS-NAME/ws/rooms/{room_id}?token=...`
* HTTPS 적용 후에는 `wss://api-domain/ws/rooms/{room_id}?token=...`

---

## 5단계: Frontend AWS 연결 준비

프론트엔드 담당자에게 전달할 값:

```env
VITE_API_BASE_URL=http://ALB-DNS-NAME
VITE_WS_BASE_URL=ws://ALB-DNS-NAME
```

HTTPS 적용 후:

```env
VITE_API_BASE_URL=https://api-domain
VITE_WS_BASE_URL=wss://api-domain
```

프론트엔드 빌드 후:

```text
frontend/dist
```

S3에는 `dist` 폴더 내부 파일만 업로드합니다.

CloudFront SPA fallback:

```text
403 -> /index.html -> 200
404 -> /index.html -> 200
```

---

## 6단계: 현재 기준 AWS 연결 순서

완료:

1. EC2 생성
2. EC2 Security Group 생성
3. 테스트 backend 실행 확인
4. S3 bucket 생성
5. frontend build 파일 업로드
6. CloudFront 생성

다음:

1. 실제 프로젝트 backend를 EC2에 배포
2. 실제 backend `/health` 확인
3. Target Group health check 확인
4. ALB에서 EC2 backend로 요청 전달 확인
5. EC2 8000번 inbound source를 ALB Security Group으로 제한
6. 프론트엔드 담당자에게 ALB DNS 전달
7. frontend local URL 제거 후 새 build 파일 받기
8. 새 build 파일을 S3에 재업로드
9. CloudFront invalidation 실행
10. CloudFront 도메인에서 최종 테스트

권장 순서:

* 먼저 실제 backend를 EC2에 배포하고 ALB health check를 정상화합니다.
* 그 다음 프론트엔드 담당자에게 ALB DNS와 환경 변수 값을 전달합니다.
* 프론트엔드가 local URL을 제거한 뒤 S3 재업로드와 CloudFront invalidation을 진행합니다.

---

## 7단계: 현재 상태에서 가능한 테스트

AWS 연결 후 확인할 것:

* `http://ALB-DNS-NAME/api/rooms`
* `http://ALB-DNS-NAME/health` 또는 임시 `/api/rooms`
* CloudFront에서 `/main` 접근
* 방 목록 표시
* 방 생성
* 방 참여
* 방 입장
* WebSocket 연결
* Kakao Map 표시

---

## English

## Decision

Yes, AWS connection preparation can start now.

However, at this stage, the cloud part should prepare infrastructure only and should not edit frontend or backend source code.
The safest starting scope is EC2, Security Groups, Target Group, and ALB preparation.
Final CloudFront integration should wait until frontend local URLs are replaced with ALB-based environment variables.

Completed cloud tasks:

* Created EC2 test backend environment
* Verified test FastAPI `/health`
* Configured systemd for test backend
* Created S3 bucket
* Uploaded frontend build files to S3
* Created CloudFront distribution

Next allowed cloud tasks:

* Deploy actual project backend code to EC2
* Fix Target Group / ALB health check
* Restrict EC2 port `8000` to ALB Security Group
* Prepare frontend environment values to hand over
* Re-upload new frontend build after local URLs are removed
* Run CloudFront invalidation
* Prepare screenshot checklist for the final report

Do not do:

* Edit `frontend/`
* Edit `backend/`
* Replace local URLs directly in source code
* Change API structure
* Commit real Kakao keys, DB passwords, SSH keys, or other sensitive values in documentation

---

## Current Status Check

Observed from the current website:

* `/main` page is reachable
* Room list is displayed
* Departure, destination, time, and member count are displayed
* Join room and enter room buttons are visible
* UI is not fully polished, but it is enough to begin AWS deployment preparation

Cloud concerns:

* Frontend may still depend on local backend URLs
* In CloudFront, `localhost` means the user's own computer
* API and WebSocket must point to ALB
* HTTPS CloudFront calling HTTP ALB can cause mixed content issues

---

## Current AWS Connection Order

Completed:

1. Create EC2
2. Create EC2 Security Group
3. Test backend on EC2
4. Create S3 bucket
5. Upload frontend build files
6. Create CloudFront distribution

Next:

1. Deploy actual project backend to EC2
2. Verify actual backend `/health`
3. Check Target Group health
4. Verify ALB routes requests to EC2 backend
5. Restrict EC2 port `8000` inbound source to ALB Security Group
6. Give ALB DNS to frontend teammate
7. Receive new frontend build after local URLs are removed
8. Re-upload new build to S3
9. Run CloudFront invalidation
10. Test final CloudFront domain

Recommended order:

* First deploy the actual backend and make ALB health check healthy.
* Then give the ALB DNS and environment variable values to the frontend teammate.
* Continue S3 re-upload and CloudFront invalidation after frontend local URLs are removed.

---

## Temporary Demo Notes

For the first demo:

* HTTP ALB is acceptable
* EC2 SQLite is acceptable if RDS is not ready
* Local Redis on EC2 is acceptable if ElastiCache is not ready

For the final report:

```text
SQLite and local Redis are used only for demo. Final architecture uses RDS PostgreSQL and ElastiCache Redis.
```

