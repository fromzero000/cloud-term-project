import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";

import KakaoMap from "../components/KakaoMap";
import { WS_BASE_URL } from "../api/config";

export default function RoomPage() {
    const { id } = useParams();

    const location = useLocation();
    const room = location.state?.room;
    const navigate = useNavigate();

    const [locations, setLocations] = useState([]);

    const [rideStatus, setRideStatus] =
        useState("대기중");

    const [fare, setFare] = useState("");

    useEffect(() => {
        const token =
            localStorage.getItem("token");

        let socket;
        let locationInterval;

        const connectWebSocket = () => {
            socket = new WebSocket(
                `${WS_BASE_URL}/ws/rooms/${id}?token=${token}`
            );

            socket.onopen = () => {
                console.log(
                    "웹소켓 연결 성공"
                );

                locationInterval =
                    setInterval(() => {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                socket.send(
                                    JSON.stringify({
                                        lat: position
                                            .coords
                                            .latitude,
                                        lng: position
                                            .coords
                                            .longitude,
                                    })
                                );
                            },
                            (error) => {
                                console.error(
                                    error
                                );
                            }
                        );
                    }, 1000);
            };

            socket.onmessage = (
                event
            ) => {
                const data =
                    JSON.parse(
                        event.data
                    );

                setLocations(
                    (prev) => {
                        const filtered =
                            prev.filter(
                                (
                                    user
                                ) =>
                                    user.nickname !==
                                    data.nickname
                            );

                        return [
                            ...filtered,
                            data,
                        ];
                    }
                );
            };

            socket.onerror = (
                error
            ) => {
                console.error(
                    "웹소켓 에러:",
                    error
                );
            };

            socket.onclose = () => {
                console.log(
                    "웹소켓 연결 종료"
                );

                if (
                    locationInterval
                ) {
                    clearInterval(
                        locationInterval
                    );
                }

                setTimeout(() => {
                    console.log(
                        "재연결 시도..."
                    );

                    connectWebSocket();
                }, 3000);
            };
        };

        connectWebSocket();

        return () => {
            if (locationInterval) {
                clearInterval(
                    locationInterval
                );
            }

            if (socket) {
                socket.close();
            }
        };
    }, [id]);

    const handleSettlement = () => {
        const totalFare =
            Number(fare);

        if (!totalFare) {
            alert(
                "총 요금을 입력하세요."
            );
            return;
        }

        const memberCount =
            room?.member_count || 1;

        const perPerson =
            Math.ceil(
                totalFare /
                memberCount
            );

        alert(
            `🚖 정산 결과

총 요금: ${totalFare.toLocaleString()}원

참여 인원: ${memberCount}명

1인당 ${perPerson.toLocaleString()}원`
        );
        alert("운행이 종료되었습니다.");
        navigate("/main");
    };

    return (
        <div
            style={{
                padding: "20px",
            }}
        >
            <h1>🚖 참여 방</h1>

            <p>
                방 번호: #
                {id.slice(0, 8)}
            </p>

            <div
                style={{
                    marginTop:
                        "20px",
                    marginBottom:
                        "20px",
                    backgroundColor:
                        "#fff",
                    padding:
                        "15px",
                    borderRadius:
                        "12px",
                    border:
                        "1px solid #ddd",
                }}
            >
                <p>
                    📍 출발지:{" "}
                    {
                        room?.departure
                    }
                </p>

                <p>
                    🎯 목적지:{" "}
                    {
                        room?.destination
                    }
                </p>

                <p>
                    🕒 출발시간:{" "}
                    {room?.time}
                </p>

                <p>
                    👥{" "}
                    {
                        room?.member_count
                    }
                    /4명
                </p>

                <p>
                    🚕 현재 상태:{" "}
                    {
                        rideStatus
                    }
                </p>
            </div>

            <div
                style={{
                    display:
                        "flex",
                    gap: "10px",
                    marginBottom:
                        "20px",
                }}
            >
                <button
                    onClick={() =>
                        setRideStatus(
                            "운행중"
                        )
                    }
                >
                    운행 시작
                </button>

                <button
                    onClick={() =>
                        setRideStatus(
                            "운행 종료"
                        )
                    }
                >
                    운행 종료
                </button>
            </div>

            <KakaoMap
                locations={
                    locations
                }
            />

            {rideStatus ===
                "운행 종료" && (
                    <div
                        style={{
                            marginTop:
                                "20px",
                            padding:
                                "15px",
                            border:
                                "1px solid #ddd",
                            borderRadius:
                                "12px",
                            backgroundColor:
                                "#fff",
                        }}
                    >
                        <h3>
                            💰 정산
                        </h3>

                        <input
                            type="number"
                            placeholder="총 택시 요금 입력"
                            value={
                                fare
                            }
                            onChange={(
                                e
                            ) =>
                                setFare(
                                    e
                                        .target
                                        .value
                                )
                            }
                            style={{
                                padding:
                                    "8px",
                                marginRight:
                                    "10px",
                            }}
                        />

                        <button
                            onClick={
                                handleSettlement
                            }
                        >
                            정산하기
                        </button>
                    </div>
                )}
        </div>
    );
}
