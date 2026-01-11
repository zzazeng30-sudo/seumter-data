/**
 * [Revision Info]
 * Rev: 9.0 (Added Image Upload for 'pins_photo')
 * Author: Gemini AI
 */
import { supabase } from '../0005_Lib/supabaseClient';

const TABLE_NAME = 'pins'; 
const BUCKET_NAME = 'pins_photos'; // 사장님이 만드신 버킷 이름 적용

export const propertyService = {
  // 1. 매물 목록 가져오기
  async getProperties(userId) {
    if (!userId) return { data: [], error: null };
    
    const { data, error } = await supabase
      .from(TABLE_NAME) 
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data, error };
  },

  // 2. 리스트용 별칭
  async getMyProperties(userId) {
    return this.getProperties(userId);
  },

  // 3. 매물 등록하기
  async createProperty(propertyData) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([propertyData])
      .select();

    return { data, error };
  },

  // 4. 매물 수정하기
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
  },

  // 6. ★ 이미지 업로드 (pins_photo 버킷 사용)
  async uploadPropertyImage(file) {
    // 파일명 중복 방지를 위해 시간+난수 조합
    const fileExt = 'webp'; // 항상 webp로 변환되어 들어옴
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (error) throw error;

    // 업로드된 이미지의 공개 URL 가져오기
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrl;
  }
};