import axios from "axios";

const BASE_URL = "https://silver-guests-push.loca.lt";

export const getRooms = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/rooms`);

        return response.data;
    } catch (error) {
        console.error("방 목록 조회 실패", error);
    }
};