/**
 * [Revision Info]
 * Rev: 1.0
 * Date: 2026-01-08
 * Author: AI Assistant
 * * [Improvements]
 * 1. Supabase Auth 로직 중앙화
 * 2. 에러 핸들링 표준화 가능
 */
import { supabase } from '../0005_Lib/supabaseClient';

export const authService = {
  // 회원가입
  signUp: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  // 로그인
  signIn: async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // 로그아웃
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // 현재 세션 가져오기
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  }
};