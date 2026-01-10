/**
 * [Revision Info]
 * Rev: 8.0 (Added Update Function)
 * Author: Gemini AI
 * [Critical Fix]
 * 1. updateProperty 함수 추가: PinForm.jsx에서 수정 기능 호출 시 발생하는 에러 해결
 */
import { supabase } from '../0005_Lib/supabaseClient';

const TABLE_NAME = 'pins'; 

export const propertyService = {
  // 1. 매물 목록 가져오기 (공용)
  async getProperties(userId) {
    if (!userId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from(TABLE_NAME) 
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // 2. 리스트용 별칭 (useProperty.js 에서 호출함)
  async getMyProperties(userId) {
    return this.getProperties(userId);
  },

  // 3. 매물 등록하기 (PinForm.jsx 및 PropertyForm.jsx 공용)
  async createProperty(propertyData) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([propertyData])
      .select();

    return { data, error };
  },

  // 4. ★ 매물 수정하기 (추가된 부분)
  async updateProperty(pinId, propertyData) {
    if (!pinId) throw new Error("매물 ID가 없습니다.");
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(propertyData)
      .eq('id', pinId)
      .select();

    return { data, error };
  },

  // 5. 매물 삭제하기
  async deleteProperty(pinId) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', pinId)
      .select();
    return { data, error };
  }
};