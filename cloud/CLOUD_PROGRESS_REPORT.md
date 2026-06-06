# Taxi Team9 AWS Deployment Progress Report

This report records the current AWS deployment progress for the Taxi Mate cloud part.

---

## Korean Summary

현재 AWS 배포는 주요 데모 흐름 기준으로 동작하고 있습니다.
프론트엔드는 CloudFront HTTPS 주소에서 제공되고, `/api/*` 요청은 CloudFront를 통해 ALB로 전달된 뒤 EC2 FastAPI backend로 연결됩니다.
WebSocket 요청도 `/ws/*` CloudFront behavior를 통해 ALB와 EC2 backend까지 도달하는 것이 확인되었습니다.
Redis는 현재 EC2 내부에서 local service로 실행 중이며, Redis 미실행으로 발생했던 Kakao login 실패 문제는 해결되었습니다.
Auto Scaling Group도 생성되어 ALB target group과 연결되었습니다.

현재 확인된 주소:

```text
Frontend: https://d197d07kgig7vi.cloudfront.net
API test: https://d197d07kgig7vi.cloudfront.net/api/rooms
ALB: http://taxi-team9-alb-2054411194.ap-northeast-2.elb.amazonaws.com
```

주요 AWS 리소스:

```text
EC2 instance: taxi-team9-ec2
Public IP: 13.124.236.48
S3 bucket: taxi-team9-frontend-s3
Target group: taxi-team9-tg
Auto Scaling Group: taxi-team9-asg
Launch template: taxi-team9-launch-template1
```

완료된 작업:

* EC2에서 FastAPI backend 실행
* `taxi-backend.service` systemd service 설정
* Redis 설치 및 실행
* `/health` endpoint와 ALB health check 확인
* S3에 frontend build 파일 업로드
* CloudFront로 frontend HTTPS 접속 확인
* CloudFront `/api/*` behavior를 ALB로 연결
* CloudFront `/ws/*` behavior를 ALB로 연결
* HTTPS frontend에서 HTTP ALB를 직접 호출하던 mixed content 문제 해결
* backend WebSocket library 문제 해결
* WebSocket 연결이 backend에서 accepted 되는 것 확인
* Auto Scaling용 AMI, Launch Template, Auto Scaling Group 생성

중요한 남은 이슈:

* Auto Scaling은 동작하지만 local Redis 때문에 multi-instance session 문제가 발생할 수 있음
* 안정적인 확장 구조를 위해 ElastiCache Redis가 필요함
* Room search, settlement, map marker, participant count 기능은 추가 확인 필요
* Kakao gender 기능은 consent review 때문에 demo에서는 optional 처리 권장

---

## 1. Current Architecture

The current deployed architecture is:

```text
User Browser
-> CloudFront HTTPS
-> S3 React frontend

User Browser
-> CloudFront HTTPS / WSS
-> CloudFront behavior /api/* and /ws/*
-> Application Load Balancer
-> EC2 FastAPI backend
-> local Redis on EC2
```

Main AWS resources:

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

## 2. Problems Fixed

### 2.1 SSH Access Problem

At first, SSH to EC2 failed with timeout:

```text
ssh: connect to host 13.124.236.48 port 22: Connection timed out
```

The reason was the EC2 security group only allowed SSH from an old IP address.
It was fixed by updating the inbound SSH rule to allow the current administrator IP.

Current EC2 security group important rules:

```text
SSH 22 from user IP
TCP 8000 from ALB security group
```

### 2.2 Backend Health Check Problem

ALB health check needed `/health`.

Backend route:

```python
@app.get("/health")
def health():
    return {"status": "ok"}
```

Verification:

```bash
curl http://127.0.0.1:8000/health
curl http://taxi-team9-alb-2054411194.ap-northeast-2.elb.amazonaws.com/health
```

Expected result:

```json
{"status":"ok"}
```

After this, the ALB target group became healthy.

### 2.3 Kakao Login Failure

Kakao login initially failed with "server login failure".

Backend log:

```text
redis.exceptions.ConnectionError: Error 111 connecting to localhost:6379
```

Reason:

The backend stores login session tokens in Redis, but Redis was not running.

```python
await redis_client.setex(f"session:{session_token}", 43200, kakao_id)
```

Fix:

```bash
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping
```

Expected:

```text
PONG
```

After starting Redis, Kakao login worked successfully.

### 2.4 Mixed Content Problem

When frontend was opened from CloudFront HTTPS, it tried to call HTTP ALB:

```text
https://d197d07kgig7vi.cloudfront.net
-> http://taxi-team9-alb-2054411194.ap-northeast-2.elb.amazonaws.com/api/rooms
```

The browser blocked it with Mixed Content error.

Fix:

CloudFront was configured with an ALB origin and behavior:

```text
/api/* -> taxi-team9-alb-origin
```

Frontend production environment was changed to:

```env
VITE_API_BASE_URL=https://d197d07kgig7vi.cloudfront.net
VITE_WS_BASE_URL=wss://d197d07kgig7vi.cloudfront.net
VITE_KAKAO_MAP_KEY=c4648d358cb7259b86ffaae9a0b8e7b3
```

After rebuilding and uploading `dist/` to S3, API requests went through HTTPS CloudFront and Mixed Content was fixed.

### 2.5 Frontend Build Environment Problem

There were two env files:

```text
.env
.env.production
```

`.env` was correct, but `.env.production` still had the old HTTP ALB URL:

```env
VITE_API_BASE_URL=http://taxi-team9-alb-2054411194.ap-northeast-2.elb.amazonaws.com
```

Vite used `.env.production` during `npm run build`, so the old HTTP ALB URL was embedded in the compiled JavaScript.

Fix:

```env
VITE_API_BASE_URL=https://d197d07kgig7vi.cloudfront.net
VITE_WS_BASE_URL=wss://d197d07kgig7vi.cloudfront.net
```

Verification command:

```bash
grep -R "http://taxi-team9-alb" -n dist || echo "old ALB removed"
```

### 2.6 Create Room API Problem

`CreateRoomPage.jsx` originally called:

```js
axios.post("/api/rooms", ...)
```

This sometimes returned React `index.html` instead of JSON.

It was changed to use the environment variable:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const response = await axios.post(
  `${API_BASE_URL}/api/rooms`,
  {
    departure,
    destination,
    time,
  },
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }
);
```

After this, room creation worked.

### 2.7 Room List `.map()` Error

Frontend had:

```js
rooms.map(...)
```

but sometimes `rooms` was undefined.

Fix:

```js
setRooms(data.rooms || []);
```

or:

```jsx
{(rooms || []).map((room) => (...))}
```

After this, the main page stopped crashing.

---

## 3. WebSocket / WSS / ALB Progress

### 3.1 Original WebSocket Error

Browser showed repeated errors:

```text
WebSocket connection to 'wss://d197d07kgig7vi.cloudfront.net/ws/rooms/...' failed
웹소켓 에러
웹소켓 연결 종료
재연결 시도...
```

### 3.2 CloudFront WebSocket Routing Fix

The app uses:

```text
/ws/rooms/{room_id}?token={token}
```

At first, only `/api/*` was routed to ALB.
A separate CloudFront behavior was needed:

```text
/ws/* -> taxi-team9-alb-origin
```

CloudFront behavior configuration:

```text
Path pattern: /ws/*
Origin: taxi-team9-alb-origin
Viewer protocol policy: Redirect HTTP to HTTPS
Allowed methods: GET, HEAD, OPTIONS
Cache policy: CachingDisabled
Origin request policy: AllViewer
```

After this, WebSocket requests reached the backend through CloudFront -> ALB -> EC2.

### 3.3 Backend WebSocket Library Problem

After routing `/ws/*`, backend log showed:

```text
WARNING: Unsupported upgrade request.
WARNING: No supported WebSocket library detected.
Please use "pip install 'uvicorn[standard]'", or install 'websockets' or 'wsproto' manually.
```

Fix:

```bash
cd ~/cloud-term-project/backend
source venv/bin/activate
pip install "uvicorn[standard]" websockets wsproto
sudo systemctl restart taxi-backend
```

After fixing, backend log showed:

```text
"WebSocket /ws/rooms/... " [accepted]
connection open
```

Browser console showed:

```text
웹소켓 연결 성공
```

So the basic WebSocket/WSS path is now working:

```text
Browser WSS
-> CloudFront /ws/*
-> ALB
-> EC2 FastAPI WebSocket
```

### 3.4 Remaining WebSocket Behavior

Sometimes the console still shows:

```text
웹소켓 연결 종료
재연결 시도...
웹소켓 연결 성공
```

Backend log showed:

```text
[익명] 님이 위치 공유를 종료했습니다.
```

This does not look like an infrastructure failure anymore.
It appears to be frontend/client location-sharing or reconnect logic.
The WebSocket infrastructure itself is confirmed working because the backend accepts the connection.

---

## 4. Auto Scaling Progress

### 4.1 AMI Created

An AMI was created from the working backend EC2:

```text
AMI name: taxi-team9-backend-working-ami
AMI ID: ami-0e73c39d8a0136494
Status: Available
```

Important note:

WebSocket packages were installed after the first AMI was created, so the best practice is to create a new AMI version after the WebSocket fix.

Recommended new AMI name:

```text
taxi-team9-backend-working-ami-v2
```

### 4.2 Launch Template Created

Launch template:

```text
taxi-team9-launch-template1
```

Important launch template configuration:

```text
AMI: taxi-team9-backend-working-ami
Instance type: t3.micro
Key pair: taxi-team9-key
Security group: taxi-team9-ec2-sg
User data:
#!/bin/bash
systemctl start redis-server
systemctl start taxi-backend
```

There was one mistake during setup:

A launch template version was created without AMI ID.
This was fixed by creating a new launch template version with the correct AMI.

### 4.3 Auto Scaling Group Created

Auto Scaling Group:

```text
Name: taxi-team9-asg
Launch template: taxi-team9-launch-template1
Desired capacity: 1
Minimum capacity: 1
Maximum capacity: 2
Availability Zones: 2
Scaling policy: Average CPU utilization 70%
Health checks: EC2 + ELB
Health check grace period: 300 seconds
Target group: taxi-team9-tg
```

ASG status:

```text
At desired capacity
1/1 Healthy
```

Target group showed two healthy instances:

```text
i-0067c55cdb9c4d961  Healthy  <- ASG-created instance
i-0e0ebc671848ed722  Healthy  <- original EC2 instance
```

This confirms Auto Scaling was created and integrated with ALB.

---

## 5. Important Auto Scaling Issue Found

After Auto Scaling added a second backend instance, API sometimes returned:

```text
401 Unauthorized
```

Reason:

Current backend uses local Redis on each EC2 instance.

With two backend instances:

```text
Original EC2 -> local Redis A
ASG EC2      -> local Redis B
```

Login session token may be saved in Redis A, but the next API request may go to Redis B through ALB.
Redis B does not know the token, so backend returns `401 Unauthorized`.

This means Auto Scaling works at infrastructure level, but stable multi-instance login requires shared Redis.

Correct final architecture:

```text
Both EC2 instances -> same ElastiCache Redis
```

Temporary demo fix:

```text
Set ASG desired capacity to 0 or remove ASG instance from serving traffic during live demo.
Keep screenshots of Auto Scaling for report.
Use original EC2 for stable demo.
```

Report explanation:

```text
Auto Scaling was configured and connected to ALB successfully. During multi-instance testing, session inconsistency occurred because Redis was still local to each EC2 instance. This confirms the need to move session storage to ElastiCache Redis in the final scalable architecture.
```

---

## 6. Current Working Status

Confirmed working:

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

Known remaining issues:

```text
Room search feature missing or incomplete
Settlement feature missing or incomplete
Map markers not displaying properly
Participant count does not always update after joining
Gender feature unreliable because Kakao gender consent requires review
Multi-instance session issue because Redis is local, not shared ElastiCache
```

---

## 7. Kakao Gender/API Key Notes

Current Kakao JavaScript key used:

```text
c4648d358cb7259b86ffaae9a0b8e7b3
```

No separate AWS Kakao API key was created.
The existing Kakao JavaScript key was used, and AWS domains were added in Kakao Developers.

Gender issue:

Kakao gender requires consent item/review.
The review can take 3-5 business days, so for deadline/demo it is better to exclude gender restriction or treat gender as optional.

Recommended backend temporary fix:

```python
if room.gender_limit != "unknown" and user.gender != "unknown" and room.gender_limit != user.gender:
    raise HTTPException(status_code=403, detail="동성만 참여 가능한 방입니다.")
```

Or temporarily disable gender check for demo.

---

## 8. Commands Used for Verification

```bash
systemctl status taxi-backend
systemctl status redis-server
curl http://127.0.0.1:8000/health
curl http://taxi-team9-alb-2054411194.ap-northeast-2.elb.amazonaws.com/health
curl https://d197d07kgig7vi.cloudfront.net/api/rooms
redis-cli ping
```

Frontend build verification:

```bash
grep -R "http://taxi-team9-alb" -n dist || echo "old ALB removed"
```

---

## 9. Final Architecture Explanation

For the current demo, Redis is running locally on the EC2 instance.
This is acceptable for a single-instance demo because it verifies login session handling and WebSocket backend flow.

Auto Scaling has been created and connected to the ALB.
However, stable multi-instance operation requires shared Redis because session data must be available to every backend instance.

For a production architecture:

* Replace local Redis with ElastiCache Redis
* Replace local/SQLite database usage with RDS PostgreSQL
* Keep CloudFront in front of S3 frontend hosting
* Keep ALB in front of EC2 backend instances
* Use Auto Scaling with a shared session store
* Create a new backend AMI after installing WebSocket packages

---

## 10. Short Summary

The AWS deployment reached a working state with CloudFront HTTPS frontend, S3 static hosting, ALB, EC2 FastAPI backend, Redis on EC2, WebSocket routing, and Auto Scaling Group.
Major fixes included adding `/health`, starting Redis, changing frontend API env from HTTP ALB to HTTPS CloudFront, adding CloudFront behaviors for `/api/*` and `/ws/*`, installing WebSocket packages in the backend venv, and creating an ASG with desired 1, minimum 1, maximum 2, CPU target 70%.
WebSocket now reaches FastAPI and shows `[accepted] connection open`.
Auto Scaling works, but multi-instance session stability requires shared ElastiCache Redis because local Redis causes `401 Unauthorized` when requests are routed to different instances.
