import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import KakaoMap from "../components/KakaoMap";
import { getRooms } from "../api/room";

export default function MainPage() {
    const navigate = useNavigate();

    const [rooms, setRooms] = useState([]);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        const data = await getRooms();

        if (data) {
            setRooms(data.rooms);
        }
    };

    return (
        <div>
            <div
                style={{
                    padding: "15px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#ffffff",
                    borderBottom: "1px solid #ddd",
                }}
            >
                <h2>🚖 Taxi_Mate</h2>

                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                    }}
                >
                    <button onClick={() => navigate("/create-room")}>
                        방 만들기
                    </button>
                </div>
            </div>

            <KakaoMap />

            <div
                style={{
                    padding: "20px",
                }}
            >
                <h2>현재 방 목록</h2>

                {rooms.map((room) => (
                    <div
                        key={room.room_id}
                        style={{
                            border: "1px solid #ccc",
                            padding: "10px",
                            marginBottom: "10px",
                            borderRadius: "10px",
                        }}
                    >
                        <p>출발지: {room.departure}</p>
                        <p>목적지: {room.destination}</p>
                        <p>시간: {room.time}</p>
                        <p>인원: {room.member_count}</p>

                        <button
                            onClick={() => navigate(`/room/${room.room_id}`)}
                        >
                            참여하기
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}