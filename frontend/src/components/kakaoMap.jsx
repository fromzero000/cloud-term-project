import { useEffect, useRef } from "react";

export default function KakaoMap() {
    const mapRef = useRef(null);

    useEffect(() => {
        if (!window.kakao) return;

        window.kakao.maps.load(() => {
            const container = mapRef.current;

            const options = {
                center: new window.kakao.maps.LatLng(35.2311, 129.0825),
                level: 3,
            };

            const map = new window.kakao.maps.Map(container, options);

            // 마커 추가
            const markerPosition = new window.kakao.maps.LatLng(
                35.2306,
                129.0831
            );

            const marker = new window.kakao.maps.Marker({
                position: markerPosition,
            });

            marker.setMap(map);
        });
    }, []);

    return (
        <div
            ref={mapRef}
            style={{
                width: "100%",
                height: "500px",
            }}
        />
    );
}