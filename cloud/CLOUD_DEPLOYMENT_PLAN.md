# Taxi Mate Cloud Deployment Plan

This plan is written for the cloud part of the Taxi Mate project. It follows a simple 5-day flow: first remove local-only code settings, then deploy the backend, deploy the frontend, connect both through a Load Balancer, and finally prepare optional RDS/Redis/Auto Scaling plus report evidence.

## 1. Final Cloud Goal

Deploy the Taxi Mate service on AWS so users can open the React frontend from CloudFront, call the FastAPI backend through an Application Load Balancer, and use room matching plus real-time GPS sharing.

Target architecture:

```text
User Browser
  |
  | Frontend HTTPS
  v
CloudFront
  |
  v
S3 frontend bucket

User Browser
  |
  | REST API / WebSocket
  v
Application Load Balancer
  |
  v
EC2 FastAPI backend
  |
  | Final architecture
  v
RDS PostgreSQL + ElastiCache Redis
```

For the first demo, SQLite on EC2 is acceptable if the backend is not ready for PostgreSQL yet. In the report, clearly write:

```text
SQLite is used only for demo. Final architecture uses RDS PostgreSQL.
```

## 2. Current Repo Issues to Fix First

These are important because they can break AWS deployment even if the app works locally.

- Frontend still uses `localhost` and `127.0.0.1`.
- `CreateRoomPage.jsx` still uses `Authorization: Bearer test-token`.
- Backend still uses local SQLite: `sqlite:///./taxi_app.db`.
- Backend still uses local Redis: `redis://localhost:6379`.
- Backend needs a `/health` endpoint for ALB health checks.
- Backend needs CORS settings for the deployed frontend domain.
- Frontend has possible Linux case-sensitive build problems:
  - `frontend/src/pages/Mainpage.jsx` is imported as `MainPage`.
  - `frontend/src/components/kakaoMap.jsx` is imported as `KakaoMap`.

## 3. Day 1: Prepare Code for Cloud Deployment

Goal: remove local-only settings before creating AWS resources.

Ask frontend and backend teammates to finish this first.

### Frontend Checklist

The frontend should not use:

```text
localhost
127.0.0.1
```

Use environment variables instead:

```env
VITE_API_BASE_URL=http://your-alb-dns-name
VITE_WS_BASE_URL=ws://your-alb-dns-name
VITE_KAKAO_MAP_KEY=your_kakao_key
```

Later, when HTTPS is ready, change them to:

```env
VITE_API_BASE_URL=https://api-domain
VITE_WS_BASE_URL=wss://api-domain
```

Frontend code should use:

```js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL;
```

Build the frontend:

```bash
cd frontend
npm install
npm run build
```

Expected result:

```text
frontend/dist
```

Upload the files inside `frontend/dist` to S3 later. Do not upload the `dist` folder itself.

### Backend Checklist

Add a health check endpoint:

```python
@app.get("/health")
def health():
    return {"status": "ok"}
```

Backend should not hardcode:

```text
sqlite:///./taxi_app.db
redis://localhost:6379
```

Use environment variables:

```env
DATABASE_URL=...
REDIS_URL=...
ALLOWED_ORIGINS=...
```

For the first EC2 demo, this is acceptable:

```env
DATABASE_URL=sqlite:///./taxi_app.db
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=*
```

But for the final architecture, use:

```env
DATABASE_URL=postgresql+psycopg2://username:password@rds-endpoint:5432/taxi_mate
REDIS_URL=redis://elasticache-endpoint:6379
```

## 4. Day 2: Deploy Backend to EC2

Goal: run FastAPI on AWS.

### Step 1: Create EC2

Use:

- Ubuntu 22.04
- `t2.micro` or `t3.micro`
- Security group:
  - SSH port `22` from your IP only
  - Backend port `8000` from your IP first

Later, after ALB is added, port `8000` should be open only from the ALB security group.

### Step 2: Connect to EC2

```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Step 3: Install Packages

```bash
sudo apt update
sudo apt install python3-pip python3-venv git -y
```

If you use local Redis for the first demo, also install Redis:

```bash
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### Step 4: Clone Backend Code

```bash
git clone your-repository-url
cd your-project/backend
```

### Step 5: Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

If there is no requirements file:

```bash
pip install fastapi uvicorn sqlalchemy redis httpx python-dotenv psycopg2-binary
```

### Step 6: Run Backend Manually

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Test in browser:

```text
http://EC2_PUBLIC_IP:8000/health
```

Expected response:

```json
{"status":"ok"}
```

### Step 7: Run Backend Permanently with systemd

Create the service file:

```bash
sudo nano /etc/systemd/system/taxi-backend.service
```

Paste this for the first demo:

```ini
[Unit]
Description=Taxi Mate FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/your-project/backend
Environment="DATABASE_URL=sqlite:///./taxi_app.db"
Environment="REDIS_URL=redis://localhost:6379"
Environment="ALLOWED_ORIGINS=*"
ExecStart=/home/ubuntu/your-project/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Start and enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl start taxi-backend
sudo systemctl enable taxi-backend
sudo systemctl status taxi-backend
```

Useful log command:

```bash
journalctl -u taxi-backend -f
```

## 5. Day 3: Deploy Frontend to S3 and CloudFront

Goal: open the frontend from AWS.

### Step 1: Build Frontend

Build locally or on EC2:

```bash
cd frontend
npm install
npm run build
```

Expected output:

```text
frontend/dist
```

### Step 2: Create S3 Bucket

Example bucket name:

```text
taxi-mate-frontend-team9
```

Upload everything inside:

```text
frontend/dist
```

Important: upload the files inside `dist`, not the `dist` folder itself.

### Step 3: Create CloudFront Distribution

Use:

- Origin: S3 bucket
- Origin Access Control: enabled
- Default root object: `index.html`

### Step 4: Configure React SPA Fallback

React routes need this:

```text
/main
/create-room
/room/:id
```

Set CloudFront custom error responses:

```text
403 -> /index.html -> 200
404 -> /index.html -> 200
```

### Step 5: Test Frontend

Open the CloudFront domain and check:

- Frontend loads.
- Kakao Map loads.
- Browser console has no `localhost` API error.
- Refreshing `/main`, `/create-room`, and `/room/:id` still works.

## 6. Day 4: Add ALB and Connect Frontend to Backend

Goal: frontend calls backend through the Load Balancer.

### Step 1: Create Target Group

Use:

- Target type: Instances
- Protocol: HTTP
- Port: `8000`
- Health check path: `/health`

Add the EC2 backend instance to the target group.

### Step 2: Create Application Load Balancer

Use:

- Scheme: Internet-facing
- Listener: HTTP `80`
- Target group: `taxi-backend-target-group`

### Step 3: Set Security Groups

ALB security group inbound:

```text
HTTP 80 from anywhere
```

EC2 security group inbound:

```text
Port 8000 only from ALB security group
SSH 22 only from your IP
```

### Step 4: Test ALB

Open:

```text
http://ALB-DNS-NAME/health
```

Expected response:

```json
{"status":"ok"}
```

### Step 5: Update Frontend Environment

Use the ALB DNS:

```env
VITE_API_BASE_URL=http://ALB-DNS-NAME
VITE_WS_BASE_URL=ws://ALB-DNS-NAME
```

Rebuild frontend:

```bash
cd frontend
npm run build
```

Upload the new `dist` files to S3.

Then create a CloudFront invalidation:

```text
/*
```

Now the CloudFront frontend should call the backend through ALB.

## 7. Day 5: Optional RDS, Redis, Auto Scaling, and Final Screenshots

Goal: improve the project score and prepare report evidence.

### Priority 1: Take Screenshots

Take screenshots of:

1. EC2 instance running.
2. Backend `/health` response.
3. S3 bucket with frontend files.
4. CloudFront distribution.
5. ALB target group healthy.
6. Frontend page opened from CloudFront.
7. Room create/join working.
8. Kakao Map page.
9. Architecture diagram.

### Priority 2: RDS PostgreSQL

Use RDS only if backend is ready for PostgreSQL.

Create:

- RDS PostgreSQL
- Public access: No
- Security group: allow `5432` only from EC2 security group

Backend environment:

```env
DATABASE_URL=postgresql+psycopg2://username:password@rds-endpoint:5432/taxi_mate
```

Restart backend:

```bash
sudo systemctl restart taxi-backend
sudo systemctl status taxi-backend
```

### Priority 3: Redis / ElastiCache

Use this if WebSocket Pub/Sub is ready.

Create:

- ElastiCache Redis
- Private subnet
- Security group: allow `6379` only from EC2 security group

Backend environment:

```env
REDIS_URL=redis://elasticache-endpoint:6379
```

Restart backend:

```bash
sudo systemctl restart taxi-backend
sudo systemctl status taxi-backend
```

### Priority 4: Auto Scaling

For presentation, simple settings are enough:

- Min: `1`
- Desired: `1`
- Max: `2`
- Scale out when CPU > `70%`

Important report explanation:

```text
Auto Scaling is designed for traffic surge situations such as festivals, exams, and late-night taxi demand. Because WebSocket connections may disconnect during scale-in, the system uses Redis Pub/Sub and frontend reconnect logic to recover the connection.
```

This matches the middle report challenge about WebSocket disconnection during EC2 scale-in.

## 8. WebSocket Stability Plan

Problem:

- WebSocket connections stay attached to one backend EC2 instance.
- During Auto Scaling scale-in or deployment restart, users connected to a terminating instance can be disconnected.

Solution:

- Use Redis Pub/Sub so GPS messages are shared across backend instances.
- Use ALB deregistration delay so terminating instances stop receiving new users but can keep old connections briefly.
- Use frontend reconnect logic.
- Keep WebSocket messages stateless enough that one missed GPS message does not break the room.

Frontend reconnect idea:

```text
onclose:
  wait 3 seconds
  reconnect to VITE_WS_BASE_URL/ws/rooms/{room_id}?token={token}
```

Backend shutdown idea:

```text
receive SIGTERM:
  tell connected clients to reconnect
  wait short grace period
  close sockets
  exit cleanly
```

## 9. Security Group Summary

| Source | Destination | Port | Purpose |
| --- | --- | --- | --- |
| Internet | CloudFront | 443 | Frontend access |
| Internet | ALB | 80 first, 443 later | API and WebSocket access |
| ALB SG | EC2 backend SG | 8000 | Forward traffic to FastAPI |
| Your IP | EC2 backend SG | 22 | SSH access |
| EC2 backend SG | RDS SG | 5432 | PostgreSQL access |
| EC2 backend SG | Redis SG | 6379 | Redis access |

Avoid:

- Public RDS.
- Public Redis.
- Opening EC2 port `8000` to everyone after ALB is connected.
- Hardcoding secrets in source code.
- Calling `http://localhost` from the deployed frontend.

## 10. Final Presentation Points

- S3 stores the built React files.
- CloudFront delivers the frontend quickly and supports HTTPS later.
- EC2 runs the FastAPI backend.
- ALB forwards frontend API and WebSocket traffic to backend EC2.
- RDS PostgreSQL is the final database architecture.
- ElastiCache Redis supports sessions and WebSocket Pub/Sub.
- Auto Scaling prepares the service for traffic spikes.
- WebSocket disconnection during scale-in is handled by Redis Pub/Sub and frontend reconnect logic.

## 11. Final Verification Scenario

Before submitting, test this flow:

1. Open CloudFront frontend.
2. Confirm Kakao Map loads.
3. Open `http://ALB-DNS-NAME/health`.
4. Confirm backend returns `{"status":"ok"}`.
5. Create a taxi room.
6. Confirm the room appears in the list.
7. Join the room from another browser or device.
8. Test WebSocket GPS sharing if the frontend feature is ready.
9. Check ALB target group is healthy.
10. Take screenshots for the report.

