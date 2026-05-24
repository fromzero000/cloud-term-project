import { useNavigate } from "react-router-dom";

export default function LoginPage() {
    const navigate = useNavigate();

    return (
        <div>
            <h1>로그인 페이지</h1>

            <button onClick={() => navigate("/main")}>
                메인으로 이동
            </button>
        </div>
    );
}