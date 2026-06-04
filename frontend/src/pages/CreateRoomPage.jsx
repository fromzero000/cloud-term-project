import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SearchPlace from "../components/SearchPlace";

export default function CreateRoomPage() {
    const navigate = useNavigate();
    const [departure, setDeparture] = useState("");
    const [destination, setDestination] = useState("");
    const [time, setTime] = useState("");

    const handleCreateRoom = async () => {
        try {
            const response = await axios.post(
                "http://127.0.0.1:8000/api/rooms",
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

            console.log(response.data);

            alert("방 생성 성공!");
            navigate("/main");
        } catch (error) {
            console.error(error);

            alert("방 생성 실패!");
        }
    };

    return (
        <div
            style={{
                padding: "20px",
                maxWidth: "500px",
                margin: "0 auto",
            }}
        >
            <h1
                style={{
                    marginBottom: "30px",
                    textAlign: "center",
                }}
            >
                🚕 방 생성
            </h1>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                }}
            >
                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "10px",
                        }}
                    >
                        <h3
                            style={{
                                margin: 0,
                            }}
                        >
                            출발지
                        </h3>

                        <button
                            onClick={() => {
                                navigator.geolocation.getCurrentPosition(
                                    (position) => {
                                        const lat = position.coords.latitude;
                                        const lng = position.coords.longitude;

                                        if (
                                            !window.kakao ||
                                            !window.kakao.maps.services
                                        ) {
                                            alert("로딩 중...");
                                            return;
                                        }

                                        const geocoder =
                                            new window.kakao.maps.services.Geocoder();

                                        geocoder.coord2Address(
                                            lng,
                                            lat,
                                            (result, status) => {
                                                if (
                                                    status ===
                                                    window.kakao.maps.services.Status.OK
                                                ) {
                                                    const address =
                                                        result[0].address.address_name;

                                                    setDeparture(address);
                                                }
                                            }
                                        );
                                    },
                                    (error) => {
                                        console.error(error);

                                        alert("위치 정보를 가져올 수 없습니다.");
                                    }
                                );
                            }}
                            style={{
                                padding: "10px 14px",
                                borderRadius: "10px",
                                border: "none",
                                backgroundColor: "#FEE500",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "14px",
                            }}
                        >
                            📍 현재 위치 사용
                        </button>
                    </div>

                    <SearchPlace
                        value={departure}
                        setValue={setDeparture}
                    />
                </div>

                <div>
                    <h3>도착지</h3>

                    <SearchPlace
                        value={destination}
                        setValue={setDestination}
                    />
                </div>

                <div>
                    <h3>출발 시간</h3>

                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "14px",
                            fontSize: "16px",
                            borderRadius: "12px",
                            border: "1px solid #ddd",
                            marginTop: "10px",
                            boxSizing: "border-box",
                        }}
                    />
                </div>

                <button
                    onClick={handleCreateRoom}
                    style={{
                        padding: "16px",
                        border: "none",
                        borderRadius: "12px",
                        backgroundColor: "#FEE500",
                        fontSize: "16px",
                        fontWeight: "600",
                        cursor: "pointer",
                    }}
                >
                    방 생성하기
                </button>
            </div>
        </div>
    );
}