import axios from "axios";
import { API_BASE_URL } from "./config";

export const getRooms = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/rooms`);

        return response.data;
    } catch (error) {
        console.error("방 목록 조회 실패", error);
    }
};
