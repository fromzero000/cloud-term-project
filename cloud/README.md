# Taxi Team9 Cloud

택시 동승 매칭 서비스의 AWS 클라우드 배포 및 인프라 설계 파트입니다.

Detailed progress report: [CLOUD_PROGRESS_REPORT.md](./CLOUD_PROGRESS_REPORT.md)

---

## Korean

## 프로젝트 소개

Taxi Mate는 React 프론트엔드와 FastAPI 백엔드를 기반으로 한 실시간 위치 기반 택시 동승 매칭 서비스입니다.
클라우드 파트는 AWS에서 프론트엔드 정적 호스팅, 백엔드 서버 운영, API 라우팅, WebSocket 연결, Redis 세션 처리, Auto Scaling 구조를 준비합니다.

현재 데모 기준으로는 CloudFront, S3, ALB, EC2, local Redis on EC2, Auto Scaling Group 구성이 준비되었습니다.

---

## 현재 AWS 구조

```text
User Browser
  |
  | HTTPS
  v
CloudFront
  | \
  |  \-- /api/* -> Application Load Balancer
  |  \-- /ws/*  -> Application Load Balancer
  |
  v
S3 frontend bucket

CloudFront /api/* and /ws/*
  |
  v
Application Load Balancer
  |
  v
EC2 FastAPI Backend
  |
  v
Local Redis on EC2

Auto Scaling Group
  |
  v
Launch Template -> EC2 backend instances
```

### 현재 리소스

```text
EC2 instance: taxi-team9-ec2
Public IP: 13.124.236.48
ALB: taxi-team9-alb-2054411194.ap-northeast-2.elb.amazonaws.com
CloudFront: https://d197d07kgig7vi.cloudfront.net
S3 bucket: taxi-team9-frontend-s3
Target group: taxi-team9-tg
Auto Scaling Group: taxi-team9-asg
Launch template: taxi-team9-launch-template1
```

---

## 완료된 작업

* EC2 instance 생성 및 SSH 접속 문제 해결
* FastAPI backend를 EC2에서 실행
* backend를 `taxi-backend.service` systemd service로 상시 실행
* Redis 설치 및 실행
* Redis 미실행으로 발생한 Kakao login failure 해결
* `/health` endpoint 정상 응답 확인
* ALB target group health check 성공
* S3 bucket에 frontend build 파일 업로드
* CloudFront distribution 생성
* CloudFront에서 frontend HTTPS 접속 확인
* CloudFront `/api/*` behavior를 ALB로 연결
* CloudFront `/ws/*` behavior를 ALB로 연결
* HTTPS frontend가 HTTP ALB를 직접 호출하던 mixed content 문제 해결
* frontend production env를 CloudFront HTTPS/WSS 주소로 변경
* backend WebSocket package 문제 해결
* WebSocket이 CloudFront -> ALB -> EC2 FastAPI로 도달하는 것 확인
* Auto Scaling용 AMI, Launch Template, Auto Scaling Group 생성
* Auto Scaling Group을 ALB target group과 연결

---

## 현재 확인된 동작

```bash
curl https://d197d07kgig7vi.cloudfront.net/api/rooms
```

위 요청이 정상적으로 room list JSON을 반환합니다.

현재 확인된 상태:

```text
Kakao login: working
Redis session on single EC2: working
CloudFront frontend: working
ALB /health: working
Room creation: working
Room join API: working
WebSocket connection: accepted by backend
Auto Scaling Group: created
Target Group: healthy targets
```

---

## 중요한 Auto Scaling 이슈

Auto Scaling은 인프라 레벨에서 생성 및 ALB 연결까지 완료되었습니다.
하지만 현재 Redis가 각 EC2 instance 내부에서 local Redis로 동작하기 때문에 여러 backend instance가 동시에 traffic을 받으면 session 문제가 발생할 수 있습니다.

문제 구조:

```text
Original EC2 -> local Redis A
ASG EC2      -> local Redis B
```

로그인 session token이 Redis A에 저장된 뒤 다음 API 요청이 Redis B가 있는 instance로 전달되면 token을 찾지 못해 `401 Unauthorized`가 발생할 수 있습니다.

따라서 최종 scalable architecture에서는 두 EC2 instance가 같은 ElastiCache Redis를 사용해야 합니다.

```text
Both EC2 instances -> same ElastiCache Redis
```

데모 안정성을 위해 live demo에서는 original EC2 중심으로 테스트하고, Auto Scaling은 구성 완료 screenshot과 architecture 설명으로 사용하는 것이 안전합니다.

---

## 남은 이슈

* Room search feature가 아직 미완성일 수 있음
* Settlement feature가 아직 미완성일 수 있음
* Map marker 표시가 불안정할 수 있음
* Join 이후 participant count가 항상 바로 갱신되지 않을 수 있음
* Kakao gender consent/review 문제로 gender 제한 기능은 demo에서 optional 처리 권장
* Multi-instance 안정성을 위해 local Redis를 ElastiCache Redis로 교체해야 함

---

## 다음 TODO

* Auto Scaling screenshot 정리
* ALB target group healthy screenshot 정리
* WebSocket accepted log screenshot 정리
* CloudFront `/api/*`, `/ws/*` behavior screenshot 정리
* 데모에서는 local Redis on EC2 사용, 최종 구조에서는 ElastiCache Redis로 확장 필요하다고 설명
* 최종 구조에서 RDS PostgreSQL 적용 가능성 설명

---

## English

## Project Introduction

Taxi Mate is a real-time taxi ride-sharing service built with a React frontend and FastAPI backend.
The cloud part prepares AWS frontend hosting, backend operation, API routing, WebSocket routing, Redis session handling, and Auto Scaling.

For the current demo, CloudFront, S3, ALB, EC2, local Redis on EC2, and Auto Scaling Group have been prepared.

---

## Current AWS Architecture

```text
User Browser
  |
  | HTTPS
  v
CloudFront
  | \
  |  \-- /api/* -> Application Load Balancer
  |  \-- /ws/*  -> Application Load Balancer
  |
  v
S3 frontend bucket

CloudFront /api/* and /ws/*
  |
  v
Application Load Balancer
  |
  v
EC2 FastAPI Backend
  |
  v
Local Redis on EC2

Auto Scaling Group
  |
  v
Launch Template -> EC2 backend instances
```

### Current Resources

```text
EC2 instance: taxi-team9-ec2
Public IP: 13.124.236.48
ALB: taxi-team9-alb-2054411194.ap-northeast-2.elb.amazonaws.com
CloudFront: https://d197d07kgig7vi.cloudfront.net
S3 bucket: taxi-team9-frontend-s3
Target group: taxi-team9-tg
Auto Scaling Group: taxi-team9-asg
Launch template: taxi-team9-launch-template1
```

---

## Completed Work

* Fixed EC2 SSH access
* Ran FastAPI backend on EC2
* Configured backend as `taxi-backend.service`
* Installed and started Redis
* Fixed Kakao login failure caused by Redis not running
* Verified `/health` endpoint
* Confirmed ALB target group health check
* Uploaded frontend build files to S3
* Created CloudFront distribution
* Verified frontend HTTPS access through CloudFront
* Configured CloudFront `/api/*` behavior to forward requests to ALB
* Configured CloudFront `/ws/*` behavior to forward WebSocket requests to ALB
* Fixed mixed content issue from HTTPS frontend calling HTTP ALB directly
* Updated frontend production env to use CloudFront HTTPS/WSS
* Fixed backend WebSocket package issue
* Confirmed WebSocket reaches FastAPI through CloudFront -> ALB -> EC2
* Created AMI, Launch Template, and Auto Scaling Group
* Connected Auto Scaling Group to the ALB target group

---

## Current Working Status

```bash
curl https://d197d07kgig7vi.cloudfront.net/api/rooms
```

This returns room list JSON successfully.

Confirmed status:

```text
Kakao login: working
Redis session on single EC2: working
CloudFront frontend: working
ALB /health: working
Room creation: working
Room join API: working
WebSocket connection: accepted by backend
Auto Scaling Group: created
Target Group: healthy targets
```

---

## Important Auto Scaling Issue

Auto Scaling is created and connected to ALB successfully.
However, Redis is currently local to each EC2 instance, so multiple backend instances can cause session inconsistency.

Problem:

```text
Original EC2 -> local Redis A
ASG EC2      -> local Redis B
```

If the login session token is saved in Redis A and the next API request is routed to Redis B, the backend may return `401 Unauthorized`.

The correct final scalable architecture is:

```text
Both EC2 instances -> same ElastiCache Redis
```

For a stable live demo, use the original EC2 path and keep Auto Scaling screenshots for the report and presentation.

---

## Remaining Issues

* Room search feature may be incomplete
* Settlement feature may be incomplete
* Map markers may not display reliably
* Participant count may not always update immediately after joining
* Gender restriction should be optional for demo because Kakao gender consent requires review
* Multi-instance stability requires replacing local Redis with ElastiCache Redis

---

## Next TODO

* Prepare Auto Scaling screenshots
* Prepare ALB target group healthy screenshot
* Prepare WebSocket accepted log screenshot
* Prepare CloudFront `/api/*` and `/ws/*` behavior screenshots
* Explain that the current demo uses local Redis on EC2
* Explain future production migration to ElastiCache Redis and RDS PostgreSQL
