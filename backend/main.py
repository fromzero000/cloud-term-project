import asyncio
import json
import uuid
import httpx
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import redis.asyncio as redis

# --- [DB 세팅] SQLAlchemy 라이브러리 임포트 ---
from sqlalchemy import create_engine, Column, String, Integer, Boolean, ForeignKey, Table
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session

# ==========================================
# 1. 데이터베이스(DB) 연결 설정 
# ==========================================
# 개발 중에는 로컬DB(SQLite) 사용, AWS에 올려서 변경
# 나중에 AWS RDS(PostgreSQL)를 만들면 아래 주소를 "postgresql://아이디:비번@aws주소:5432/db이름" 으로 변경
DATABASE_URL = "sqlite:///./taxi_app.db"

# DB 엔진 및 세션 생성 (SQLite 특성상 check_same_thread=False 필요)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# 2. 데이터베이스 테이블(Model) 설계
# ==========================================
# 다대다(N:M) 관계를 위한 중간 테이블: 어떤 유저가 어떤 방에 들어갔는지 기록
room_members_table = Table(
    'room_members', Base.metadata,
    Column('user_id', String, ForeignKey('users.id')),
    Column('room_id', String, ForeignKey('rooms.id'))
)

class User(Base):
    """사용자 테이블"""
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True) # 카카오 고유 ID
    nickname = Column(String, nullable=False)         # 닉네임
    email = Column(String, nullable=True)             # 대학교 이메일
    is_univ_verified = Column(Boolean, default=False) # 대학교 인증 여부

class Room(Base):
    """택시 동승 방 테이블"""
    __tablename__ = "rooms"
    id = Column(String, primary_key=True, index=True) # 방 고유 ID (UUID)
    departure = Column(String, nullable=False)        # 출발지
    destination = Column(String, nullable=False)      # 도착지
    time = Column(String, nullable=False)             # 출발 시간
    
    # 방에 들어온 유저들을 리스트 형태로 가져오기 위한 설정
    members = relationship("User", secondary=room_members_table)

# 작성한 테이블 구조를 바탕으로 실제 DB(taxi_app.db 파일) 생성
Base.metadata.create_all(bind=engine)


# ==========================================
# 3. FastAPI 앱 및 기본 설정
# ==========================================
app = FastAPI(title="택시 동승 매칭 서버")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://strong-bikes-repeat.loca.lt", "https://stale-emu-15.loca.lt"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis 연결 (세션 및 웹소켓용)
redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)

# API가 호출될 때마다 DB 세션을 열고 닫아주는 의존성 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# 4. 프론트엔드와 통신할 데이터 양식(Pydantic)
# ==========================================
class KakaoToken(BaseModel):
    access_token: str

class RoomCreate(BaseModel):
    departure: str
    destination: str
    time: str


# ==========================================
# 5. 인증 API (카카오 로그인)
# ==========================================
@app.post("/api/auth/kakao")
async def kakao_login(data: KakaoToken, db: Session = Depends(get_db)):
    """카카오 토큰을 받아 회원가입/로그인 처리"""
    headers = {"Authorization": f"Bearer {data.access_token}"}
    
    # 1. 카카오 서버에 유저 정보 요청
    async with httpx.AsyncClient() as client:
        response = await client.get("https://kapi.kakao.com/v2/user/me", headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="카카오 토큰이 유효하지 않습니다.")
        kakao_data = response.json()
        
    kakao_id = str(kakao_data["id"])
    nickname = kakao_data.get("kakao_account", {}).get("profile", {}).get("nickname", "익명")
    # 2. DB에서 유저 조회, 없으면 새로 가입(Insert)
    user = db.query(User).filter(User.id == kakao_id).first()
    if not user:
        user = User(id=kakao_id, nickname=nickname, is_univ_verified=False)
        db.add(user)
        db.commit() # DB에 저장
    
    # 3. 우리 서비스 전용 세션 토큰 발급 후 Redis 저장 (12시간)
    session_token = str(uuid.uuid4())
    await redis_client.setex(f"session:{session_token}", 43200, kakao_id)
    
    return {"token": session_token, "is_univ_verified": user.is_univ_verified, "message": "로그인 성공"}

# (인증 미들웨어) 클라이언트가 보낸 토큰이 유효한지 검사하고 DB에서 유저를 찾아 반환
async def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="토큰이 필요합니다.")
    
    token = authorization.split(" ")[1]
    user_id = await redis_client.get(f"session:{token}")
    if not user_id:
        raise HTTPException(status_code=401, detail="만료되었거나 잘못된 토큰입니다.")
        
    user = db.query(User).filter(User.id == user_id).first()
    return user


# ==========================================
# 6. 택시 방 생성 및 참여 API
# ==========================================
@app.get("/api/rooms")
def get_rooms(db: Session = Depends(get_db)):
    """현재 개설된 모든 방 목록을 조회합니다."""
    rooms = db.query(Room).all()
    # 프론트에 보내기 좋게 데이터를 가공해서 반환
    result = []
    for room in rooms:
        result.append({
            "room_id": room.id,
            "departure": room.departure,
            "destination": room.destination,
            "time": room.time,
            "member_count": len(room.members)
        })
    return {"rooms": result}

@app.post("/api/rooms")
def create_room(room_data: RoomCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """새로운 택시 팟을 만듭니다."""
    room_id = str(uuid.uuid4())
    
    new_room = Room(
        id=room_id,
        departure=room_data.departure,
        destination=room_data.destination,
        time=room_data.time
    )
    new_room.members.append(user) # 방장을 멤버에 추가
    
    db.add(new_room)
    db.commit()
    return {"message": "방 생성 완료", "room_id": room_id}

@app.post("/api/rooms/{room_id}/join")
def join_room(room_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """만들어진 방에 참여합니다 (성별, 인원수 체크)."""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="방을 찾을 수 없습니다.")
        
    # 인원수 검사 (택시 최대 4명)
    if len(room.members) >= 4:
        raise HTTPException(status_code=400, detail="이미 4명이 모여 마감된 방입니다.")
        
    # 이미 참여중인지 검사
    if user in room.members:
        raise HTTPException(status_code=400, detail="이미 이 방에 참여 중입니다.")
        
    room.members.append(user)
    db.commit()
    return {"message": "방 참여 성공!"}


# ==========================================
# 7. 실시간 위치 공유 (WebSocket)
# ==========================================
async def get_ws_user(token: str, db: Session):
    """웹소켓 전용 토큰 검사기 (URL Query 파라미터에서 토큰을 추출)"""
    user_id = await redis_client.get(f"session:{token}")
    if not user_id:
        raise WebSocketDisconnect(code=4001, reason="Invalid Token")
    return db.query(User).filter(User.id == user_id).first()

@app.websocket("/ws/rooms/{room_id}")
async def gps_websocket(websocket: WebSocket, room_id: str, token: str = Query(...), db: Session = Depends(get_db)):
    """
    [웹소켓 통신 흐름]
    1. 프론트엔드가 ws://서버주소/ws/rooms/방번호?token=토큰 으로 연결 요청
    2. Redis가 연결 승인하고 사용자 데이터 수신 대기
    3. 프론트에서 GPS를 보내면 -> Redis 주파수에 방송(publish)
    """
    user = await get_ws_user(token, db)
    await websocket.accept() # 연결 승인
    
    channel_name = f"room_gps_{room_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel_name)

    # 남들의 GPS 정보를 듣고 내 폰으로 쏴주는 백그라운드 작업
    async def listen_to_redis_and_send_to_client():
        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    await websocket.send_text(message["data"])
        except Exception:
            pass

    listener_task = asyncio.create_task(listen_to_redis_and_send_to_client())

    try:
        # 내 폰에서 올라오는 GPS 정보를 받아 Redis 채널에 뿌리는 작업 (무한 반복)
        while True:
            # 프론트에서 데이터 수신 {"lat": 35.123, "lng": 129.123}
            data_str = await websocket.receive_text() 
            client_data = json.loads(data_str)
            
            # 발송자 이름 추가하여 다시 조립
            broadcast_msg = {
                "nickname": user.nickname,
                "lat": client_data.get("lat"),
                "lng": client_data.get("lng")
            }
            
            # Redis에 방송 (이 방에 접속한 모든 서버의 사람들에게 데이터가 전달됨)
            # 데이터 형식 json.dump(broadcast_msg):
            # {
            #     "type": "message",             # 👈 질문하신 부분! (택배 종류)
            #     "pattern": None,
            #     "channel": "room_gps_1",       # 👈 어느 방에서 왔는지
            #     "data": '{"nickname": "강무진", "lat": 35.123, "lng": 129.123}' # 👈 우리가 보낸 알맹이!
            # }
            await redis_client.publish(channel_name, json.dumps(broadcast_msg))
            
    except WebSocketDisconnect:
        print(f"[{user.nickname}] 님이 위치 공유를 종료했습니다.")
    finally:
        listener_task.cancel()
        await pubsub.unsubscribe(channel_name)

@app.get("/health")
def health():
    return {"status": "ok"}

# ==========================================
# 8. 프론트엔드 정적 파일 서빙 및 라우팅 설정
# ==========================================
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(os.path.join(frontend_dist, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join(frontend_dist, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Not Found")