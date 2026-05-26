# 🚖 Taxi Mate Frontend

실시간 위치 기반 택시 동승 매칭 서비스 프론트엔드 프로젝트

---

# 📌 프로젝트 소개

React와 Kakao Map API를 활용하여 사용자의 위치 기반 택시 동승 서비스를 구현합니다.
사용자는 출발지와 목적지를 기반으로 택시 동승 방을 생성하거나 참여할 수 있으며 WebSocket을 통해 실시간 위치를 공유할 수 있습니다.

---

## 🛠️ Tech Stack

* React
* Vite
* React Router DOM
* Kakao Map API
* Axios
* WebSocket

---

## ✅ 현재 구현 기능

* React + Vite 프로젝트 초기 세팅
* GitHub 연동 및 프로젝트 구조 구성
* React Router 기반 페이지 이동 구현
* 로그인 페이지 구성
* 메인 페이지 구성
* 방 생성 페이지 UI 구현
* RoomPage 라우팅 및 페이지 이동 흐름 구현
* Kakao Map API 연동
* 부산대학교 IT관 기준 지도 및 마커 출력 구현
* FastAPI 백엔드 서버 연결 확인
* `GET /api/rooms` API 연동 및 방 목록 조회 기능 구현
* `POST /api/rooms` API 연결 테스트 완료

---

## 📂 페이지 구조

### `/`

* 로그인 페이지

### `/main`

* 메인 지도 페이지
* 방 목록 조회 기능

### `/create-room`

* 방 생성 페이지

### `/room/:id`

* 실시간 위치 공유 방 페이지

---

## 🔥 다음 구현 예정 기능

### REST API 연동

* 방 생성 API 실제 연동 (`POST /api/rooms`)
* 방 참여 API 연동 (`POST /api/rooms/{room_id}/join`)
* 카카오 소셜 로그인 연동
* 사용자 인증 토큰(localStorage) 처리

### 실시간 위치 공유 기능

* WebSocket 연결
* 사용자 위치 송수신
* 지도 마커 실시간 업데이트
* 연결 종료 시 자동 재연결 기능 구현

### UI 개선

* 모바일 반응형 UI
* 방 목록 카드 디자인 개선
* 사용자 위치 기반 지도 이동 기능 추가

---

## 📌 실행 방법

```bash
npm install
npm run dev
```

---

## 👨‍💻 Frontend 담당

* React 기반 UI 구현
* Kakao Map API 연동
* REST API 연동
* WebSocket 기반 실시간 위치 공유 기능 구현 예정
* 카카오 소셜 로그인 기능 구현 예정

---

## 📌 개발 진행 상황

* [x] 프로젝트 초기 세팅
* [x] Router 기반 페이지 이동 구현
* [x] Kakao Map API 연동
* [x] 메인 지도 UI 구현
* [x] 방 생성 페이지 UI 구현
* [x] RoomPage 페이지 이동 흐름 구현
* [x] 방 목록 조회 API 연동
* [x] 방 생성 API 연결 테스트
* [ ] 실제 방 생성 기능 구현
* [ ] 방 참여 API 연동
* [ ] 카카오 소셜 로그인 연동
* [ ] WebSocket 실시간 위치 공유 기능 구현

---

## 🔄 현재 진행 중 기능

* 백엔드 인증 토큰 연동
* 방 생성 API 실제 동작 구현
* RoomPage 기반 실시간 위치 공유 구조 설계

---
