# Taxi Mate Cloud

택시 동승 매칭 서비스의 AWS 클라우드 배포 및 인프라 설계 파트입니다.

Detailed plan: [CLOUD_DEPLOYMENT_PLAN.md](./CLOUD_DEPLOYMENT_PLAN.md)

Frontend deployment status: [FRONTEND_DEPLOYMENT_STATUS.md](./FRONTEND_DEPLOYMENT_STATUS.md)

---

# Korean

## 프로젝트 소개

Taxi Mate는 React 프론트엔드와 FastAPI 백엔드를 기반으로 한 실시간 위치 기반 택시 동승 매칭 서비스입니다.
클라우드 파트는 이 서비스를 로컬 환경이 아닌 AWS 환경에서 안정적으로 실행할 수 있도록 배포 구조를 설계하고 구성하는 역할을 담당합니다.

주요 목표는 프론트엔드 정적 파일 배포, 백엔드 서버 운영, 데이터베이스 연결, Redis 기반 세션 및 WebSocket Pub/Sub 처리, 트래픽 증가 상황을 고려한 확장 구조 설계입니다.

---

## 기술 스택

* AWS EC2
* AWS S3
* AWS CloudFront
* AWS Application Load Balancer
* AWS RDS PostgreSQL
* AWS ElastiCache for Redis
* AWS Auto Scaling Group
* FastAPI
* React + Vite
* WebSocket

---

## 클라우드 아키텍처

```text
사용자 브라우저
  |
  | Frontend
  v
CloudFront
  |
  v
S3

사용자 브라우저
  |
  | REST API / WebSocket
  v
Application Load Balancer
  |
  v
EC2 FastAPI Backend
  |
  v
RDS PostgreSQL + ElastiCache Redis
```

---

## 현재 준비 내용

* AWS 기반 배포 구조 설계
* S3 + CloudFront 기반 프론트엔드 정적 호스팅 계획
* EC2 기반 FastAPI 백엔드 배포 계획
* Application Load Balancer를 통한 백엔드 트래픽 분산 계획
* RDS PostgreSQL을 이용한 최종 데이터베이스 구조 계획
* ElastiCache Redis를 이용한 세션 관리 및 WebSocket Pub/Sub 구조 계획
* Auto Scaling 상황에서 WebSocket 연결이 끊길 수 있는 문제와 재연결 대응 방안 정리
* 최신 프론트엔드 구현 상태 확인: Kakao 로그인, token 저장, 방 생성/참여 API, WebSocket 재연결 로직 구현 확인

---

## 배포 전 확인 사항

### Frontend

프론트엔드는 배포 환경에서 `localhost`, `127.0.0.1`을 사용하면 안 됩니다.
현재 프론트엔드에는 아직 `http://localhost:8000`, `http://127.0.0.1:8000`, `ws://127.0.0.1:8000` 주소가 남아 있으므로 AWS 배포 전 환경 변수 방식으로 변경되어야 합니다.

대신 환경 변수를 사용합니다.

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

프론트엔드 빌드 결과물은 다음 경로에 생성됩니다.

```text
frontend/dist
```

S3에는 `dist` 폴더 자체가 아니라 `dist` 안의 파일들을 업로드합니다.

### Backend

백엔드는 ALB Health Check를 위해 `/health` API가 필요합니다.

```python
@app.get("/health")
def health():
    return {"status": "ok"}
```

백엔드는 로컬 주소를 코드에 직접 작성하지 않고 환경 변수를 사용해야 합니다.

```env
DATABASE_URL=...
REDIS_URL=...
ALLOWED_ORIGINS=...
```

첫 데모에서는 EC2에서 SQLite를 임시로 사용할 수 있습니다. 단, 보고서에는 아래 내용을 명확히 작성합니다.

```text
SQLite is used only for demo. Final architecture uses RDS PostgreSQL.
```

---

## 배포 구조

### Frontend Deployment

* `npm run build` 실행
* `frontend/dist` 내부 파일을 S3에 업로드
* CloudFront 배포 생성
* Default root object를 `index.html`로 설정
* React Router를 위해 403, 404 응답을 `/index.html`로 연결

### Backend Deployment

* Ubuntu EC2 인스턴스 생성
* Python 가상환경 구성
* FastAPI 의존성 설치
* Uvicorn으로 백엔드 실행
* `systemd`를 이용해 백엔드 서버 상시 실행
* `/health` 응답 확인

### Load Balancer

* Target Group 생성
* Health check path를 `/health`로 설정
* ALB를 EC2 백엔드와 연결
* EC2 8000번 포트는 ALB Security Group에서만 접근 가능하도록 제한

### Database and Cache

* 최종 DB는 RDS PostgreSQL 사용
* Redis는 ElastiCache 사용
* RDS와 Redis는 Public Access를 비활성화
* EC2 Security Group에서만 RDS, Redis에 접근 가능하도록 설정

---

## 주요 문제 및 해결 계획

### WebSocket 연결 문제

Auto Scaling으로 EC2 인스턴스가 종료될 때 기존 WebSocket 연결이 끊길 수 있습니다.

해결 계획:

* Redis Pub/Sub을 사용해 여러 백엔드 인스턴스 간 위치 데이터를 공유
* 프론트엔드에서 WebSocket 자동 재연결 로직 구현
* ALB Deregistration Delay를 사용해 종료 대상 인스턴스의 기존 연결을 잠시 유지
* 클라이언트가 연결 해제 후 같은 방으로 다시 연결할 수 있도록 room id와 token 관리

### 보안 문제

해결 계획:

* EC2 22번 포트는 내 IP에서만 접근 허용
* EC2 8000번 포트는 ALB에서만 접근 허용
* RDS와 Redis는 Private Subnet에서 운영
* 소스코드에 비밀번호, DB 주소, API Key를 직접 작성하지 않음

---

## 제출 및 발표 자료

보고서와 발표를 위해 준비할 화면:

* EC2 인스턴스 실행 화면
* Backend `/health` 응답 화면
* S3 버킷 업로드 화면
* CloudFront 배포 화면
* ALB Target Group Healthy 상태 화면
* CloudFront 주소로 접속한 프론트엔드 화면
* Kakao Map 화면
* 방 생성 및 참여 테스트 화면
* AWS 아키텍처 다이어그램

---

## Cloud 담당

* AWS 배포 아키텍처 설계
* S3 + CloudFront 프론트엔드 배포 계획
* EC2 + ALB 백엔드 배포 계획
* RDS PostgreSQL 데이터베이스 구성 계획
* ElastiCache Redis 세션 및 Pub/Sub 구성 계획
* Auto Scaling 및 WebSocket 재연결 대응 계획
* 최종 보고서용 클라우드 구성 자료 정리

---

## 진행 상황

* [x] AWS 전체 아키텍처 설계
* [x] S3 + CloudFront 프론트엔드 배포 계획 정리
* [x] EC2 백엔드 배포 계획 정리
* [x] ALB 연결 및 Security Group 계획 정리
* [x] RDS PostgreSQL 전환 계획 정리
* [x] Redis / ElastiCache WebSocket Pub/Sub 구조 정리
* [x] 최신 프론트엔드 배포 상태 확인
* [ ] 실제 EC2 백엔드 배포
* [ ] 실제 S3 + CloudFront 프론트엔드 배포
* [ ] ALB 연결 테스트
* [ ] RDS 및 ElastiCache 적용
* [ ] 최종 스크린샷 및 보고서 정리

---

# English

## Project Introduction

Taxi Mate is a real-time location-based taxi sharing service built with a React frontend and a FastAPI backend.
The cloud part focuses on designing and preparing the AWS infrastructure so the service can run outside the local development environment.

The main goals are frontend static hosting, backend server deployment, database connection, Redis-based session and WebSocket Pub/Sub handling, and scalable infrastructure design for traffic growth.

---

## Tech Stack

* AWS EC2
* AWS S3
* AWS CloudFront
* AWS Application Load Balancer
* AWS RDS PostgreSQL
* AWS ElastiCache for Redis
* AWS Auto Scaling Group
* FastAPI
* React + Vite
* WebSocket

---

## Cloud Architecture

```text
User Browser
  |
  | Frontend
  v
CloudFront
  |
  v
S3

User Browser
  |
  | REST API / WebSocket
  v
Application Load Balancer
  |
  v
EC2 FastAPI Backend
  |
  v
RDS PostgreSQL + ElastiCache Redis
```

---

## Current Preparation

* Designed the AWS deployment architecture
* Planned S3 + CloudFront static hosting for the frontend
* Planned EC2 deployment for the FastAPI backend
* Planned backend traffic routing through Application Load Balancer
* Planned final database architecture with RDS PostgreSQL
* Planned session management and WebSocket Pub/Sub with ElastiCache Redis
* Documented the WebSocket disconnection risk during Auto Scaling and the reconnect strategy
* Checked latest frontend implementation: Kakao login, token storage, room create/join APIs, and WebSocket reconnect logic are now present

---

## Pre-Deployment Checklist

### Frontend

The deployed frontend must not use `localhost` or `127.0.0.1`.
The current frontend still contains `http://localhost:8000`, `http://127.0.0.1:8000`, and `ws://127.0.0.1:8000`, so these must be replaced with environment variables before AWS deployment.

Use environment variables instead.

```env
VITE_API_BASE_URL=http://ALB-DNS-NAME
VITE_WS_BASE_URL=ws://ALB-DNS-NAME
VITE_KAKAO_MAP_KEY=your_kakao_key
```

After HTTPS is ready, change them to:

```env
VITE_API_BASE_URL=https://api-domain
VITE_WS_BASE_URL=wss://api-domain
```

The frontend build output is:

```text
frontend/dist
```

Upload the files inside `dist` to S3, not the `dist` folder itself.

### Backend

The backend needs a `/health` endpoint for ALB health checks.

```python
@app.get("/health")
def health():
    return {"status": "ok"}
```

The backend should use environment variables instead of hardcoded local addresses.

```env
DATABASE_URL=...
REDIS_URL=...
ALLOWED_ORIGINS=...
```

For the first demo, SQLite can be used temporarily on EC2. The report should clearly state:

```text
SQLite is used only for demo. Final architecture uses RDS PostgreSQL.
```

---

## Deployment Structure

### Frontend Deployment

* Run `npm run build`
* Upload files inside `frontend/dist` to S3
* Create a CloudFront distribution
* Set default root object to `index.html`
* Route 403 and 404 responses to `/index.html` for React Router

### Backend Deployment

* Create an Ubuntu EC2 instance
* Set up a Python virtual environment
* Install FastAPI dependencies
* Run the backend with Uvicorn
* Keep the backend running with `systemd`
* Verify the `/health` response

### Load Balancer

* Create a Target Group
* Set health check path to `/health`
* Connect ALB to the EC2 backend
* Restrict EC2 port `8000` access to the ALB Security Group only

### Database and Cache

* Use RDS PostgreSQL as the final database
* Use ElastiCache for Redis
* Disable public access for RDS and Redis
* Allow RDS and Redis access only from the EC2 Security Group

---

## Main Problems and Solution Plan

### WebSocket Connection Problem

When an EC2 instance is terminated by Auto Scaling, existing WebSocket connections may be disconnected.

Solution plan:

* Use Redis Pub/Sub to share location data across backend instances
* Add WebSocket auto-reconnect logic on the frontend
* Use ALB Deregistration Delay to keep existing connections briefly during scale-in
* Manage room id and token so clients can reconnect to the same room

### Security Problem

Solution plan:

* Allow EC2 SSH port `22` only from my IP
* Allow EC2 backend port `8000` only from the ALB
* Run RDS and Redis in private network areas
* Do not hardcode passwords, DB URLs, or API keys in source code

---

## Report and Presentation Evidence

Prepare screenshots of:

* EC2 instance running
* Backend `/health` response
* S3 bucket with frontend files
* CloudFront distribution
* ALB Target Group healthy status
* Frontend opened from CloudFront
* Kakao Map page
* Room create/join test
* AWS architecture diagram

---

## Cloud Responsibility

* AWS deployment architecture design
* S3 + CloudFront frontend deployment plan
* EC2 + ALB backend deployment plan
* RDS PostgreSQL database plan
* ElastiCache Redis session and Pub/Sub plan
* Auto Scaling and WebSocket reconnect strategy
* Cloud materials for the final report

---

## Progress

* [x] AWS architecture design
* [x] S3 + CloudFront frontend deployment plan
* [x] EC2 backend deployment plan
* [x] ALB and Security Group plan
* [x] RDS PostgreSQL migration plan
* [x] Redis / ElastiCache WebSocket Pub/Sub plan
* [x] Latest frontend deployment status checked
* [ ] Actual EC2 backend deployment
* [ ] Actual S3 + CloudFront frontend deployment
* [ ] ALB connection test
* [ ] RDS and ElastiCache integration
* [ ] Final screenshots and report preparation

