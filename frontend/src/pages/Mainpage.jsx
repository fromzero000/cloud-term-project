import { useNavigate } from "react-router-dom";
import KakaoMap from "../components/KakaoMap";

export default function MainPage() {
    const navigate = useNavigate();

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
                <h2>🚖 PNU_TAXI_MATE 🚖</h2>

                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                    }}
                >
                    <button onClick={() => navigate("/create-room")}>
                        방 만들기
                    </button>

                    <button onClick={() => navigate("/room/1")}>
                        방 입장
                    </button>
                </div>
            </div>

            <KakaoMap />
        </div>
    );
}