import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import KakaoMap from "../components/KakaoMap";
import { getRooms } from "../api/room";
import axios from "axios";

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

    const handleJoinRoom = async (roomId) => {
        try {
            const response = await axios.post(
                `/api/rooms/${roomId}/join`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                }
            );

            console.log(response.data);

            alert("방 참여 성공!");
            const joinedRoom = rooms.find(
                (room) => room.room_id === roomId
            );


            navigate(`/room/${roomId}`, {
                state: {
                    room: joinedRoom,
                },
            });
        } catch (error) {
            if (error.response?.status === 400) {
                alert("방 인원이 가득 찼습니다.");
            } else if (error.response?.status === 403) {
                alert("성별이 맞지 않습니다.");
            } else {
                alert("방 참여 실패!");
            }
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
                        <p>
                            👥 {room.member_count}/4명
                            (남은 자리 {4 - room.member_count}개)
                        </p>
                        <button
                            onClick={() => handleJoinRoom(room.room_id)}
                        >
                            참여하기
                        </button>
                        <button
                            onClick={() =>
                                navigate(`/room/${room.room_id}`, {
                                    state: {
                                        room,
                                    },
                                })
                            }
                        >
                            방 입장
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}