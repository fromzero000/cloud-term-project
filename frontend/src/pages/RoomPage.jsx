import KakaoMap from "../components/KakaoMap";
import { useParams } from "react-router-dom";

export default function RoomPage() {
    const { id } = useParams();

    return (
        <div
            style={{
                padding: "20px",
            }}
        >
            <h1>🚖 Room {id}</h1>

            <div
                style={{
                    marginTop: "20px",
                }}
            >
                <KakaoMap />
            </div>
        </div>
    );
}