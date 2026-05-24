import { useState } from "react";

export default function CreateRoomPage() {
    const [departure, setDeparture] = useState("");
    const [destination, setDestination] = useState("");
    const [time, setTime] = useState("");

    const handleCreateRoom = () => {
        console.log({
            departure,
            destination,
            time,
        });

        alert("방 생성 요청!");
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