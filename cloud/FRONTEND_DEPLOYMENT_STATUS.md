# Frontend Deployment Status

This file records the current frontend state from the cloud deployment point of view.
It does not change frontend code. It only explains what the cloud part must prepare for.

---

## Korean

## 현재 프론트엔드 구현 상태

현재 프론트엔드는 이전보다 배포에 가까운 상태입니다.

구현된 내용:

* Kakao JavaScript SDK 초기화
* Kakao 로그인 버튼 및 로그인 처리
* Kakao access token을 백엔드 `/api/auth/kakao`로 전달
* 백엔드가 반환한 서비스 token을 `localStorage`에 저장
* 방 생성 API 호출 시 `Authorization: Bearer <token>` 사용
* 방 참여 API 호출 시 `Authorization: Bearer <token>` 사용
* RoomPage에서 WebSocket 연결 구현
* WebSocket 종료 시 3초 후 자동 재연결 시도
* GPS 위치를 WebSocket으로 주기적으로 전송
* Kakao Map services library 사용
* 출발지/도착지 검색 및 현재 위치 주소 변환 기능 사용

## 클라우드 배포 전 남은 프론트엔드 이슈

아직 프론트엔드 코드에는 로컬 주소가 직접 들어가 있습니다.

현재 확인된 주소:

```text
http://localhost:8000
http://127.0.0.1:8000
ws://127.0.0.1:8000
```

AWS 배포 시에는 위 주소를 그대로 사용할 수 없습니다.
CloudFront로 열린 프론트엔드는 사용자 브라우저에서 실행되기 때문에 `localhost`는 사용자의 컴퓨터를 의미하게 됩니다.

프론트엔드 담당자가 아래 환경 변수 기반 구조로 바꿔야 합니다.

```env
VITE_API_BASE_URL=http://ALB-DNS-NAME
VITE_WS_BASE_URL=ws://ALB-DNS-NAME
VITE_KAKAO_MAP_KEY=your_kakao_key
```

HTTPS 적용 후에는 다음과 같이 변경합니다.

```env
VITE_API_BASE_URL=https://api-domain
VITE_WS_BASE_URL=wss://api-domain
```

## 클라우드 파트에서 준비할 수 있는 것

프론트엔드 코드를 직접 수정하지 않고도 클라우드 파트에서 준비할 수 있는 일:

* ALB DNS 이름 준비
* CloudFront 배포 도메인 준비
* Kakao Developer Console에 추가할 배포 도메인 정리
* S3 업로드 대상과 CloudFront SPA fallback 설정 준비
* API/WebSocket용 ALB Security Group 준비
* 프론트엔드 담당자에게 전달할 환경 변수 값 정리

## 프론트엔드 담당자에게 전달할 값

첫 HTTP 데모:

```env
VITE_API_BASE_URL=http://ALB-DNS-NAME
VITE_WS_BASE_URL=ws://ALB-DNS-NAME
```

최종 HTTPS 데모:

```env
VITE_API_BASE_URL=https://api-domain
VITE_WS_BASE_URL=wss://api-domain
```

Kakao Map 배포 도메인:

```text
https://CLOUDFRONT-DOMAIN
https://custom-frontend-domain
```

---

## English

## Current Frontend Implementation Status

The frontend is now closer to deployment than before.

Implemented:

* Kakao JavaScript SDK initialization
* Kakao login button and login handling
* Kakao access token sent to backend `/api/auth/kakao`
* Backend service token saved in `localStorage`
* Room creation API uses `Authorization: Bearer <token>`
* Room join API uses `Authorization: Bearer <token>`
* RoomPage has WebSocket connection logic
* WebSocket reconnects after 3 seconds on close
* GPS location is sent through WebSocket periodically
* Kakao Map services library is used
* Place search and current-location address conversion are used

## Remaining Frontend Issues Before Cloud Deployment

The frontend still has local URLs directly in source code.

Detected URLs:

```text
http://localhost:8000
http://127.0.0.1:8000
ws://127.0.0.1:8000
```

These cannot be used after AWS deployment.
When the frontend runs from CloudFront, `localhost` means the user's own device, not the backend EC2 server.

The frontend should switch to environment variables:

```env
VITE_API_BASE_URL=http://ALB-DNS-NAME
VITE_WS_BASE_URL=ws://ALB-DNS-NAME
VITE_KAKAO_MAP_KEY=your_kakao_key
```

After HTTPS is ready:

```env
VITE_API_BASE_URL=https://api-domain
VITE_WS_BASE_URL=wss://api-domain
```

## What Cloud Part Can Prepare

The cloud part can prepare these without changing frontend code:

* ALB DNS name
* CloudFront distribution domain
* Deployed domains for Kakao Developer Console
* S3 upload target and CloudFront SPA fallback settings
* ALB Security Group for API/WebSocket traffic
* Environment variable values to send to the frontend teammate

## Values to Give Frontend Teammate

First HTTP demo:

```env
VITE_API_BASE_URL=http://ALB-DNS-NAME
VITE_WS_BASE_URL=ws://ALB-DNS-NAME
```

Final HTTPS demo:

```env
VITE_API_BASE_URL=https://api-domain
VITE_WS_BASE_URL=wss://api-domain
```

Kakao Map deployment domains:

```text
https://CLOUDFRONT-DOMAIN
https://custom-frontend-domain
```

