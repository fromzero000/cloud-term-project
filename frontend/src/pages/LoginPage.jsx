import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function LoginPage() {
    const navigate = useNavigate();

    useEffect(() => {
        if (
            window.Kakao &&
            !window.Kakao.isInitialized()
        ) {
            window.Kakao.init(
                import.meta.env.VITE_KAKAO_MAP_KEY
            );
        }

        console.log(
            "초기화 여부:",
            window.Kakao.isInitialized()
        );
    }, []);

    const handleKakaoLogin = () => {
        window.Kakao.Auth.login({
            success: async function (authObj) {
                try {
                    console.log("카카오 로그인 성공");
                    console.log(authObj);

                    const response = await axios.post(
                        "http://127.0.0.1:8000/api/auth/kakao",
                        {
                            access_token:
                                authObj.access_token,
                        }
                    );

                    console.log(response.data);

                    localStorage.setItem(
                        "token",
                        response.data.token
                    );

                    alert("로그인 성공!");

                    navigate("/main");
                } catch (error) {
                    console.error(error);

                    alert("서버 로그인 실패");
                }
            },

            fail: function (err) {
                console.error(err);

                alert("카카오 로그인 실패");
            },
        });
    };

    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#f8f8f8",
            }}
        >
            <h1
                style={{
                    marginBottom: "30px",
                    fontSize: "40px",
                }}
            >
                🚖 Taxi Mate
            </h1>

            <img
                src="/kakao_login_large_wide.png"
                alt="카카오 로그인"
                onClick={handleKakaoLogin}
                style={{
                    cursor: "pointer",
                    width: "250px",
                }}
            />
        </div>
    );
}