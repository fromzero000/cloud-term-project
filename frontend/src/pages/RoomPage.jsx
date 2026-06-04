import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";


import KakaoMap from "../components/KakaoMap";

export default function RoomPage() {
    const { id } = useParams();
    const [locations, setLocations] = useState([]);
    const location = useLocation();
    const room = location.state?.room;

    useEffect(() => {
        const token = localStorage.getItem("token");

        let socket;
        let locationInterval;

        const connectWebSocket = () => {
            socket = new WebSocket(
                `wss://silver-guests-push.loca.lt/ws/rooms/${id}?token=${token}`
            );

            socket.onopen = () => {
                console.log("웹소켓 연결 성공");

                locationInterval = setInterval(() => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            socket.send(
                                JSON.stringify({
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude,
                                })
                            );
                        },
                        (error) => {
                            console.error(error);
                        }
                    );
                }, 1000);
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);

                setLocations((prev) => {
                    const filtered = prev.filter(
                        (user) =>
                            user.nickname !== data.nickname
                    );

                    return [...filtered, data];
                });
            };

            socket.onerror = (error) => {
                console.error("웹소켓 에러:", error);
            };

            socket.onclose = () => {
                console.log("웹소켓 연결 종료");

                if (locationInterval) {
                    clearInterval(locationInterval);
                }

                setTimeout(() => {
                    console.log("재연결 시도...");
                    connectWebSocket();
                }, 3000);
            };
        };

        connectWebSocket();

        return () => {
            if (locationInterval) {
                clearInterval(locationInterval);
            }

            if (socket) {
                socket.close();
            }
        };
    }, [id]);

    return (
        <div
            style={{
                padding: "20px",
            }}
        >
            <h1>🚖 참여 방</h1>

            <p>방 번호: #{id.slice(0, 8)}</p>

            <div
                style={{
                    marginTop: "20px",
                    marginBottom: "20px",
                    backgroundColor: "#fff",
                    padding: "15px",
                    borderRadius: "12px",
                    border: "1px solid #ddd",
                }}
            >
                <p>📍 출발지: {room?.departure}</p>
                <p>🎯 목적지: {room?.destination}</p>
                <p>🕒 출발시간: {room?.time}</p>
                <p>👥 {room?.member_count}/4명</p>
            </div>

            <KakaoMap locations={locations} />
        </div>
    );
}