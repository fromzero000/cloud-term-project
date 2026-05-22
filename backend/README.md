# 🚖 택시 동승 매칭 서비스 (Backend API 스펙)
## 🛠 기술 스택
- **Framework:** FastAPI
- **DB:** SQLite (로컬 개발용) ➡️ PostgreSQL (AWS 배포 예정)
- **Cache & Pub/Sub:** Redis (세션 관리 및 웹소켓 브로드캐스팅)
- **Infra:** AWS EC2, RDS, ElastiCache (예정)
이 문서는 프론트엔드와 백엔드 간의 통신 규약을 정의합니다. 
모든 API는 백엔드 서버가 실행 중인 `http://로컬IP주소:8000` (나중에는 AWS 도메인)을 기준으로 호출합니다.

---

## 🔑 1. 인증 및 로그인 API
우리 서비스는 카카오 소셜 로그인을 기반으로 합니다. 프론트엔드에서 카카오 로그인 창을 띄워 받은 `access_token`을 백엔드로 보내주면, 백엔드가 우리 서비스 전용 **세션 토큰**을 발급해 줍니다. 

> **🚨 중요:** 이후 호출하는 모든 API(방 생성, 참여 등)에는 헤더에 이 발급받은 토큰을 반드시 넣어야 합니다!  
> 👉 `Authorization: Bearer <여기에토큰값>`

### 1-1. 카카오 로그인 처리
- **Method:** `POST`
- **URL:** `/api/auth/kakao`
- **설명:** 프론트에서 카카오 토큰을 주면, 서버가 유저 정보를 DB에 저장하고 전용 토큰을 반환합니다. *(관련 코드: `main.py`의 `kakao_login` 함수)*
- **요청 데이터 (Request Body):** JSON
  ```json
  {
    "access_token": "프론트가_카카오에서_받아온_토큰"
  }
  ```
- **응답 데이터 (Response):** 
  ```json
  {
    "token": "45f8a... (서버가 발급한 우리 전용 토큰. 프론트 저장 필수!)",
    "is_univ_verified": false,
    "message": "로그인 성공"
  }
  ```

### 1-2. [테스트용] 가짜 로그인
- **Method:** `GET`
- **URL:** `/test-login/{nickname}`
- **설명:** 프론트에서 카카오 연동이 완료되기 전, 웹소켓 등 다른 기능을 테스트할 때 임시로 사용할 수 있는 가짜 로그인 API입니다. 브라우저 주소창에 치기만 해도 토큰이 나옵니다.
- **응답 데이터 (Response):**
  ```json
  {
    "token": "c82b1... (이 토큰을 복사해서 웹소켓 테스트에 사용하세요)",
    "nickname": "입력한닉네임",
    "message": "가짜 로그인 성공"
  }
  ```

---

## 🚕 2. 택시 매칭 게시판 API (REST)

### 2-1. 방 목록 전체 조회
- **Method:** `GET`
- **URL:** `/api/rooms`
- **설명:** 현재 만들어져 있는 모든 택시 동승 방의 목록을 가져옵니다. 로그인 안 해도 볼 수 있습니다. *(관련 코드: `main.py`의 `get_rooms` 함수)*
- **응답 데이터 (Response):**
  ```json
  {
    "rooms": [
      {
        "room_id": "ab12-cd34...",
        "departure": "부산대 정문",
        "destination": "서면역",
        "time": "14:30",
        "gender_limit": "male",
        "member_count": 2
      }
    ]
  }
  ```

### 2-2. 새로운 택시 팟(방) 생성
- **Method:** `POST`
- **URL:** `/api/rooms`
- **헤더 필수:** `Authorization: Bearer <토큰>`
- **설명:** 출발지, 목적지, 시간을 정해 새로운 방을 만듭니다. 방을 만든 사람(방장)의 성별로 자동 성별 제한이 걸립니다. *(관련 코드: `main.py`의 `create_room` 함수)*
- **요청 데이터 (Request Body):** JSON
  ```json
  {
    "departure": "부산대 북문",
    "destination": "부산역",
    "time": "15:00"
  }
  ```
- **응답 데이터 (Response):**
  ```json
  {
    "message": "방 생성 완료",
    "room_id": "ef56-gh78..."
  }
  ```

### 2-3. 방 참여하기
- **Method:** `POST`
- **URL:** `/api/rooms/{room_id}/join`
- **헤더 필수:** `Authorization: Bearer <토큰>`
- **설명:** 만들어진 방(`room_id`)에 참여합니다. 인원이 4명이거나, 성별이 다르면 백엔드에서 에러(400, 403)를 튕겨냅니다. *(관련 코드: `main.py`의 `join_room` 함수)*
- **응답 데이터 (Response):** 성공 시 HTTP 상태 코드 200 반환
  ```json
  {
    "message": "방 참여 성공!"
  }
  ```

---

## 📡 3. 실시간 위치 공유 API (WebSocket)
방 인원이 다 모여서 매칭이 확정되면, 이 주소로 웹소켓을 연결해 서로의 카카오맵 마커를 움직입니다.

- **연결 URL:** `ws://[서버IP]:8000/ws/rooms/{room_id}?token={로그인때받은토큰}`
  - *(주의: 웹소켓은 HTTP 헤더 설정이 안 되므로, URL 파라미터(`?token=`)로 토큰을 넘겨주어야 합니다!)*

### 3-1. 내 위치 보내기 (프론트 ➡️ 백엔드)
- **설명:** 프론트엔드는 `1초`마다 내 폰의 GPS 좌표를 백엔드로 보냅니다. `send()` 함수를 사용하세요. *(관련 코드: `main.py` 웹소켓 함수의 `websocket.receive_text()` 부분)*
- **데이터 양식 (JSON 형태의 문자열):**
  ```json
  {
    "lat": 35.2312,
    "lng": 129.0823
  }
  ```

### 3-2. 남의 위치 받기 (백엔드 ➡️ 프론트)
- **설명:** 같은 방에 있는 누군가가 위치를 보내면, 서버는 방에 있는 모든 사람에게 그 위치와 닉네임을 쏴줍니다. 프론트는 `onmessage` 이벤트로 이 데이터를 받아서 카카오맵 마커를 이동시키면 됩니다. *(관련 코드: `main.py` 웹소켓 함수의 `websocket.send_text()` 부분)*
- **데이터 양식 (JSON 형태의 문자열):**
  ```json
  {
    "nickname": "홍길동",
    "lat": 35.2315,
    "lng": 129.0811
  }
  ```

> ⚠️ **프론트엔드 주의사항:** 모바일 웹 환경에서는 웹소켓이 자주 끊길 수 있습니다. 연결이 끊어지면(`onclose`), 3초 뒤에 자동으로 다시 연결(`new WebSocket(...)`)을 시도하는 코드를 반드시 작성해 주세요!