import { useState } from "react";
import axios from "axios";

export default function CreateRoomPage() {
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
                        Authorization: "Bearer test-token",
                    },
                }
            );

            console.log(response.data);

            alert("방 생성 성공!");
        } catch (error) {
            console.error(error);

            alert("방 생성 실패!");
        }
    };

    return (
        <div
            style={{
                padding: "20px",
            }}
        >
            <h1>🚕 방 생성 🚕</h1>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "15px",
                    marginTop: "20px",
                }}
            >
                <input
                    type="text"
                    placeholder="출발지 입력"
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                />

                <input
                    type="text"
                    placeholder="목적지 입력"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                />

                <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                />

                <button onClick={handleCreateRoom}>
                    방 생성하기
                </button>
            </div>
        </div>
    );
}