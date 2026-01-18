// src/services/seumterService.js
import axios from 'axios';

// 로컬 백엔드 주소 (Vercel 배포 시에는 '/api' 등으로 변경 필요할 수 있음)
const API_URL = 'https://seumter-backend.onrender.com/api/scrape';

export const seumterService = {
  /**
   * 백엔드 API에 ID, PW, 주소를 보내 소유자 정보를 긁어옵니다.
   */
  getOwnerInfo: async (address, id, pw) => {
    try {
      const response = await axios.post(API_URL, {
        id: id,
        pw: pw,
        address: address
      });

      if (response.data.success) {
        return response.data.data; // 소유자 리스트 반환
      } else {
        throw new Error(response.data.message || "데이터 수집 실패");
      }
    } catch (error) {
      console.error("Seumter API Error:", error);
      // 에러 발생 시 빈 배열 대신 에러 객체를 던지거나 처리
      throw error;
    }
  },

  // 기존 코드 호환용 (사용 안함, 더미 처리)
  loginAndPrepare: async (id, pw) => {
    return { success: true, data: { sessionRep: { sessionUserNm: '인증됨' } } };
  }
};