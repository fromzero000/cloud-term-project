# Cloud Progress Report

This report records the current AWS deployment progress for the Taxi Mate cloud part.
It is documentation only and does not modify frontend or backend source code.

---

## Korean

## 1. 현재 목표

Taxi Mate 서비스를 AWS 환경에서 실행하기 위한 기본 클라우드 인프라를 구축하고 있습니다.
현재 목표는 프론트엔드 정적 파일을 S3와 CloudFront로 제공하고, FastAPI 백엔드를 EC2에서 실행할 수 있음을 확인하는 것입니다.

최종 목표 구조:

```text
User
  |
  v
CloudFront
  |
  v
S3 Frontend

User
  |
  v
Application Load Balancer
  |
  v
EC2 FastAPI Backend
  |
  +--> RDS PostgreSQL
  |
  +--> ElastiCache Redis
```

현재는 S3, CloudFront, EC2, systemd 기반 백엔드 실행 테스트까지 진행되었습니다.

---

## 2. 생성된 AWS 리소스

### EC2

| Item | Value |
| --- | --- |
| Instance name | `taxi-team9-ec2` |
| Instance ID | `i-0e0ebc671848ed722` |
| Instance type | `t3.micro` |
| Public IPv4 | `13.124.236.48` |
| Private IPv4 | `172.31.37.46` |
| VPC ID | `vpc-05e7399d59665175f` |
| Key pair | `taxi-team9-key` |
| State | Running |
| Status check | 3/3 checks passed |

EC2는 백엔드 서버 실행 환경으로 사용됩니다.
현재는 실제 프로젝트 백엔드 대신 테스트 FastAPI 서버를 배포하여 AWS 실행 환경을 검증했습니다.

### EC2 Security Group

Security group:

```text
taxi-team9-ec2-sg
```

현재 inbound rules:

| Type | Port | Source | Purpose |
| --- | ---: | --- | --- |
| SSH | 22 | Administrator IP only | SSH access |
| Custom TCP | 8000 | Administrator IP only | FastAPI test access |

다음 단계에서 ALB 연결 후에는 EC2 `8000` 포트를 ALB Security Group에서만 접근 가능하도록 변경해야 합니다.

### S3

S3 bucket:

```text
taxi-team9-frontend-s3
```

Origin domain:

```text
taxi-team9-frontend-s3.s3.ap-northeast-2.amazonaws.com
```

업로드된 frontend build 파일:

| Object | Purpose |
| --- | --- |
| `assets/` | Vite build assets |
| `favicon.svg` | Website favicon |
| `index.html` | Main frontend entry file |
| `kakao_login_large_wide.png` | Kakao login button image |

### CloudFront

| Item | Value |
| --- | --- |
| Distribution ID | `E30M5IKS0HR8TT` |
| Status | Enabled |
| Domain name | `d197d07kgig7vi.cloudfront.net` |
| Origin | `taxi-team9-frontend-s3.s3.ap-northeast-2.amazonaws.com` |
| Type | Standard |

CloudFront는 S3에 업로드된 frontend build 파일을 사용자에게 제공하는 public frontend endpoint입니다.

---

## 3. EC2 백엔드 테스트 결과

EC2에 SSH로 접속했습니다.

```bash
ssh -i taxi-team9-key.pem ubuntu@13.124.236.48
```

설치한 기본 패키지:

```bash
sudo apt update
sudo apt install python3-pip python3-venv git -y
```

테스트 backend 폴더:

```bash
mkdir taxi-test-backend
cd taxi-test-backend
```

테스트 FastAPI 서버 실행:

```bash
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000
```

테스트 endpoint:

```text
http://13.124.236.48:8000/health
```

응답:

```json
{"status":"ok"}
```

Root endpoint:

```text
http://13.124.236.48:8000/
```

응답:

```json
{"message":"Taxi Mate backend is running on EC2"}
```

이 테스트로 EC2에서 FastAPI 서버가 정상 실행되고 외부 브라우저에서 접근 가능함을 확인했습니다.

---

## 4. systemd 설정

백엔드 테스트 서버를 터미널 종료 후에도 계속 실행하기 위해 systemd 서비스를 설정했습니다.

Service file:

```text
/etc/systemd/system/taxi-backend.service
```

현재 테스트 서비스 구조:

```ini
[Unit]
Description=Taxi Mate FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/taxi-test-backend
ExecStart=/home/ubuntu/taxi-test-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

실행 명령:

```bash
sudo systemctl daemon-reload
sudo systemctl start taxi-backend
sudo systemctl enable taxi-backend
sudo systemctl status taxi-backend
```

상태:

```text
active (running)
```

현재는 테스트 backend 기준이며, 이후 실제 프로젝트 backend 코드로 `WorkingDirectory`와 `ExecStart`를 교체해야 합니다.

---

## 5. 현재 완료된 작업

* EC2 instance 생성
* Key pair 설정
* EC2 Security Group 설정
* SSH 접속 확인
* Python, pip, venv, git 설치
* FastAPI 테스트 backend 배포
* `/health` endpoint 외부 접근 확인
* systemd로 테스트 backend 상시 실행 설정
* S3 frontend bucket 생성
* frontend build 파일 S3 업로드
* CloudFront distribution 생성
* CloudFront와 S3 연결
* 기본 frontend/backend AWS 환경 준비 확인

---

## 6. 다음 작업

우선순위 1:

* 실제 프로젝트 backend 코드를 EC2에 배포
* 실제 backend에도 `/health` endpoint가 있는지 확인
* backend 실행 경로를 systemd 서비스에 반영

우선순위 2:

* Target Group health check 확인
* ALB를 EC2 backend와 연결
* EC2 `8000` inbound source를 내 IP에서 ALB Security Group으로 변경

우선순위 3:

* frontend 담당자가 local URL을 환경 변수 기반으로 변경
* 새 `frontend/dist` build 파일을 받아 S3에 다시 업로드
* CloudFront invalidation 실행

우선순위 4:

* RDS PostgreSQL 적용 여부 결정
* ElastiCache Redis 적용 여부 결정
* 최종 보고서용 스크린샷 정리

---

## English

## 1. Current Goal

The cloud part is building the basic AWS infrastructure for Taxi Mate.
The current goal is to serve frontend static files through S3 and CloudFront and verify that a FastAPI backend can run on EC2.

Current completed scope:

* S3 frontend bucket
* CloudFront frontend distribution
* EC2 backend environment
* Test FastAPI backend
* systemd service for continuous backend execution

---

## 2. AWS Resources Created

### EC2

| Item | Value |
| --- | --- |
| Instance name | `taxi-team9-ec2` |
| Instance ID | `i-0e0ebc671848ed722` |
| Instance type | `t3.micro` |
| Public IPv4 | `13.124.236.48` |
| Private IPv4 | `172.31.37.46` |
| VPC ID | `vpc-05e7399d59665175f` |
| Key pair | `taxi-team9-key` |
| State | Running |
| Status check | 3/3 checks passed |

### S3

Bucket:

```text
taxi-team9-frontend-s3
```

Uploaded files:

* `assets/`
* `favicon.svg`
* `index.html`
* `kakao_login_large_wide.png`

### CloudFront

| Item | Value |
| --- | --- |
| Distribution ID | `E30M5IKS0HR8TT` |
| Status | Enabled |
| Domain name | `d197d07kgig7vi.cloudfront.net` |
| Origin | `taxi-team9-frontend-s3.s3.ap-northeast-2.amazonaws.com` |

---

## 3. Backend Test Result

Test endpoint:

```text
http://13.124.236.48:8000/health
```

Response:

```json
{"status":"ok"}
```

Root endpoint:

```text
http://13.124.236.48:8000/
```

Response:

```json
{"message":"Taxi Mate backend is running on EC2"}
```

This confirms that a FastAPI backend can run on EC2 and can be accessed externally.

---

## 4. Next TODO

Priority 1:

* Deploy actual project backend code to EC2
* Confirm actual backend has `/health`
* Update systemd `WorkingDirectory` and `ExecStart`

Priority 2:

* Connect ALB to EC2 backend
* Check Target Group health status
* Change EC2 port `8000` source from administrator IP to ALB Security Group

Priority 3:

* Wait for frontend local URLs to be changed to environment variables
* Upload new frontend build to S3
* Run CloudFront invalidation

Priority 4:

* Decide whether to apply RDS PostgreSQL
* Decide whether to apply ElastiCache Redis
* Prepare final report screenshots

