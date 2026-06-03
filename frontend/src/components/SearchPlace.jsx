import { useState } from "react";

export default function SearchPlace({ value, setValue }) {
    const [places, setPlaces] = useState([]);

    const searchPlaces = (keyword) => {
        setValue(keyword);

        if (!window.kakao || !keyword.trim()) {
            setPlaces([]);
            return;
        }

        const ps = new window.kakao.maps.services.Places();

        ps.keywordSearch(`부산 ${keyword}`, (data, status) => {
            if (status === window.kakao.maps.services.Status.OK) {
                setPlaces(data);
            } else {
                setPlaces([]);
            }
        });
    };

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
            }}
        >
            <input
                type="text"
                placeholder="장소를 입력하세요"
                value={value}
                onChange={(e) => searchPlaces(e.target.value)}
                style={{
                    width: "100%",
                    padding: "14px",
                    fontSize: "16px",
                    borderRadius: "12px",
                    border: "1px solid #ddd",
                    outline: "none",
                    boxSizing: "border-box",
                }}
            />

            {places.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        top: "60px",
                        left: 0,
                        width: "100%",
                        border: "1px solid #eee",
                        borderRadius: "12px",
                        backgroundColor: "white",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                        overflow: "hidden",
                        maxHeight: "250px",
                        overflowY: "auto",
                        zIndex: 1,
                    }}
                >
                    {places.map((place) => (
                        <div
                            key={place.id}
                            onClick={() => {
                                setValue(place.place_name);
                                setPlaces([]);
                            }}
                            style={{
                                padding: "14px",
                                borderBottom: "1px solid #f1f1f1",
                                cursor: "pointer",
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: "600",
                                    marginBottom: "4px",
                                }}
                            >
                                {place.place_name}
                            </div>

                            <div
                                style={{
                                    fontSize: "13px",
                                    color: "#666",
                                }}
                            >
                                {place.address_name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}