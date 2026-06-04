import { useEffect, useRef } from "react";

export default function KakaoMap({ locations = [] }) {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const markersRef = useRef({});

    // 지도 최초 생성
    useEffect(() => {
        if (!window.kakao) return;

        window.kakao.maps.load(() => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (!mapRef.current) return; 
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    const map = new window.kakao.maps.Map(
                        mapRef.current,
                        {
                            center: new window.kakao.maps.LatLng(
                                lat,
                                lng
                            ),
                            level: 3,
                        }
                    );

                    mapInstance.current = map;

                    const myMarker =
                        new window.kakao.maps.Marker({
                            position:
                                new window.kakao.maps.LatLng(
                                    lat,
                                    lng
                                ),
                        });

                    myMarker.setMap(map);
                },
                (error) => {
                    console.error(error);
                }
            );
        });
    }, []);

    // 위치 데이터 변경 시 마커 갱신
    useEffect(() => {
        if (!mapInstance.current) return;

        locations.forEach((user) => {
            const position =
                new window.kakao.maps.LatLng(
                    user.lat,
                    user.lng
                );

            if (
                markersRef.current[user.nickname]
            ) {
                markersRef.current[
                    user.nickname
                ].setPosition(position);
            } else {
                const marker =
                    new window.kakao.maps.Marker({
                        position,
                    });

                marker.setMap(
                    mapInstance.current
                );

                markersRef.current[
                    user.nickname
                ] = marker;
            }
        });
    }, [locations]);

    return (
        <div
            ref={mapRef}
            style={{
                width: "100%",
                height: "400px",
                borderRadius: "12px",
                overflow: "hidden",
            }}
        />
    );
}