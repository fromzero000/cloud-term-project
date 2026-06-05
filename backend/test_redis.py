import asyncio
import redis.asyncio as redis

async def main():
    try:
        print("레디스 접속 시도 중...")
        r = redis.from_url("redis://localhost:6379", decode_responses=True)
        
        # 1. 연결(PING) 테스트
        is_connected = await r.ping()
        print(f"✅ 1. 레디스 연결 성공! (응답: {is_connected})")
        
        # 2. 데이터 쓰기/읽기 테스트
        await r.setex("test_session_123", 60, "test_user_id") # 60초짜리 데이터 저장
        value = await r.get("test_session_123")
        print(f"✅ 2. 데이터 쓰기/읽기 성공! (읽어온 유저 ID: {value})")
        
    except Exception as e:
        print(f"❌ 레디스 연결 실패: {e}")
        print("경고: 레디스 서버가 꺼져 있거나 설치되지 않았습니다!")

asyncio.run(main())