/**
 * [Revision Info]
 * Rev: 2.3 (Stable Array Fetch)
 * Author: AI Assistant
 * * [Critical Fix]
 * 1. fetchPins 결과 중 'data' 배열만 setPins에 담아 filter 에러 방지
 * 2. 초기값을 빈 배열 [] 로 강제하여 렌더링 안정성 확보
 */
import { useState, useCallback } from 'react';
import { propertyService } from '../../../services/propertyService';

export default function useMapData(session) {
  const [pins, setPins] = useState([]); // 초기값은 항상 배열이어야 함
  const [loading, setLoading] = useState(false);

  const fetchPins = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      console.log("🔄 [MapData] 핀 데이터 요청 중...");
      const { data, error } = await propertyService.getProperties(session.user.id);
      
      if (error) throw error;

      // ★ 핵심: data가 없으면 빈 배열 []을 넣어 filter 에러를 원천 차단
      const finalData = data || [];
      setPins(finalData); 
      console.log(`✅ [MapData] ${finalData.length}개 로드 완료`);
      
    } catch (err) {
      console.error("❌ [MapData] 로드 실패:", err.message);
      setPins([]); // 에러 시에도 빈 배열 유지
    } finally {
      setLoading(false);
    }
  }, [session]);

  const handleDeletePin = useCallback(async (pinId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await propertyService.deleteProperty(pinId);
      await fetchPins();
    } catch (err) {
      alert("삭제 실패");
    }
  }, [fetchPins]);

  return { pins, loading, fetchPins, handleDeletePin };
}