/**
 * [Revision Info]
 * Rev: 1.5 (Path & Logic Fix)
 * Author: AI Assistant
 * * [Fix]
 * 1. import 경로 수정: ../../../services/propertyService (정확한 위치)
 * 2. fetchProperties 로직 안정화
 */
import { useState, useCallback } from 'react';
import { propertyService } from '../../../services/propertyService';

export const useProperty = (session) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. 매물 불러오기
  const fetchProperties = useCallback(async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    // 서비스 호출 (수정된 getMyProperties 사용)
    const { data, error } = await propertyService.getMyProperties(session.user.id);

    if (error) {
      console.error('❌ 매물 로드 실패:', error.message);
    } else {
      setProperties(data || []);
      console.log(`✅ 매물 ${data?.length || 0}건 로드 성공`);
    }
    setLoading(false);
  }, [session]);

  // 2. 매물 등록하기
  const addProperty = async (newPropertyData) => {
    setLoading(true);
    const { data, error } = await propertyService.createProperty(newPropertyData);

    if (error) {
      alert("등록 실패: " + error.message);
      setLoading(false);
      return { success: false };
    } else {
      setProperties((prev) => [data[0], ...prev]);
      setLoading(false);
      return { success: true };
    }
  };

  // 3. 매물 삭제하기
  const deleteProperty = async (pinId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const { error } = await propertyService.deleteProperty(pinId);
    if (error) alert("삭제 실패");
    else fetchProperties();
  };

  return { properties, loading, fetchProperties, addProperty, deleteProperty };
};