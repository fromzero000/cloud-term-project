# 🚖 Taxi Mate Frontend

실시간 위치 기반 택시 동승 매칭 서비스 프론트엔드 프로젝트

---

# 📌 프로젝트 소개

Taxi Mate는 같은 목적지로 이동하는 사용자를 연결하여 택시를 함께 이용할 수 있도록 돕는 실시간 위치 기반 택시 동승 서비스입니다.

사용자는 카카오 로그인을 통해 서비스를 이용할 수 있으며 출발지와 목적지를 기반으로 동승 방을 생성하거나 참여할 수 있습니다.

방 참여 후에는 WebSocket과 카카오맵을 활용하여 참여자들의 실시간 위치를 공유할 수 있습니다.

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* React Router DOM
* Kakao Map API
* Axios
* WebSocket

### Backend

* FastAPI
* SQLite
* Redis

---

## ✅ 구현 완료 기능

### 사용자 인증

* 카카오 소셜 로그인 연동
* 카카오 Access Token 발급
* 백엔드 인증 API 연동
* 서비스 전용 인증 토큰 저장(localStorage)

### 택시 방 기능

* 방 생성 기능
* 방 목록 조회 기능
* 방 참여 기능
* 현재 참여 인원 표시
* 남은 자리 수 표시

### 지도 기능

* Kakao Map API 연동
* 사용자 현재 위치 표시
* 위치 기반 지도 이동
* 마커 표시 기능

### 실시간 위치 공유

* WebSocket 연결
* GPS 위치 전송
* 실시간 위치 수신
* 사용자별 마커 생성
* 마커 위치 실시간 업데이트
* WebSocket 자동 재연결 기능

---

## 📂 페이지 구조

### `/`

* 카카오 로그인 페이지

### `/main`

* 메인 지도 페이지
* 현재 생성된 방 목록 조회
* 방 생성 페이지 이동

### `/create-room`

* 출발지 검색
* 목적지 검색
* 시간 입력
* 방 생성

### `/room/:id`

* 실시간 위치 공유 페이지
* 참여자 위치 확인
* 카카오맵 기반 위치 공유

---

## 📡 API 연동

### 인증

```http
POST /api/auth/kakao
```

### 방 조회

```http
GET /api/rooms
```

### 방 생성

```http
POST /api/rooms
```

### 방 참여

```http
POST /api/rooms/{room_id}/join
```

### 실시간 위치 공유

```http
ws://127.0.0.1:8000/ws/rooms/{room_id}?token={token}
```

---

## 📌 실행 방법

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
uvicorn main:app --reload
```

### Redis

```bash
docker run -d --name redis -p 6379:6379 redis
```

---

## 🔧 개발 과정 중 수정 사항

프로젝트 연동 과정에서 프론트엔드 개발을 위해 백엔드 일부 설정을 수정하여 테스트를 진행하였습니다.

### CORS 설정 추가

프론트엔드(localhost:5173)와 FastAPI 서버(127.0.0.1:8000) 간 통신을 위해 CORS 허용 설정을 추가하였습니다.

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Redis 환경 구성

실시간 위치 공유(WebSocket) 기능 테스트를 위해 Docker 기반 Redis 서버를 구성하였습니다.

```bash
docker run -d --name redis -p 6379:6379 redis
```

---

## 👨‍💻 담당 역할

### Frontend

* React UI 개발
* React Router 기반 페이지 구성
* Kakao Login 연동
* Kakao Map API 연동
* REST API 연동
* WebSocket 기반 실시간 위치 공유 구현
---

## 📌 개발 진행 상황

* [x] 프로젝트 초기 세팅
* [x] Router 기반 페이지 이동 구현
* [x] 카카오 로그인 연동
* [x] Kakao Map API 연동
* [x] 현재 위치 표시
* [x] 방 목록 조회
* [x] 방 생성
* [x] 방 참여
* [x] 인증 토큰 처리
* [x] WebSocket 연결
* [x] 실시간 위치 송수신
* [x] 실시간 마커 업데이트
* [ ] UI/UX 개선 #선택 사항
* [ ] AWS 배포
