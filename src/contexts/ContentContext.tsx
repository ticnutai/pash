import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface UserAnswer {
  id: number;
  questionId: number;
  mefaresh: string;
  text: string;
  createdAt: string;
  isShared: boolean;
  userId: string;
}

export interface UserQuestion {
  id: number;
  titleId: number;
  text: string;
  createdAt: string;
  isShared: boolean;
  userId: string;
}

export interface UserTitle {
  id: number;
  pasukId: string;
  title: string;
  createdAt: string;
  isShared: boolean;
  userId: string;
}

interface ContentContextType {
  titles: UserTitle[];
  questions: UserQuestion[];
  answers: UserAnswer[];
  addTitle: (pasukId: string, title: string, isShared?: boolean) => Promise<number>;
  addQuestion: (titleId: number, question: string, isShared?: boolean) => Promise<number>;
  addAnswer: (questionId: number, mefaresh: string, text: string, isShared?: boolean) => Promise<number>;
  updateTitle: (id: number, title: string) => Promise<void>;
  updateQuestion: (id: number, text: string) => Promise<void>;
  updateAnswer: (id: number, text: string, mefaresh: string) => Promise<void>;
  deleteTitle: (id: number) => Promise<void>;
  deleteQuestion: (id: number) => Promise<void>;
  deleteAnswer: (id: number) => Promise<void>;
  updateTitleSharing: (id: number, isShared: boolean) => Promise<void>;
  updateQuestionSharing: (id: number, isShared: boolean) => Promise<void>;
  updateAnswerSharing: (id: number, isShared: boolean) => Promise<void>;
  loading: boolean;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [titles, setTitles] = useState<UserTitle[]>([]);
  const [questions, setQuestions] = useState<UserQuestion[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from Supabase when user changes
  useEffect(() => {
    if (user) {
      loadContent();
    } else {
      setTitles([]);
      setQuestions([]);
      setAnswers([]);
      setLoading(false);
    }
  }, [user]);

  const loadContent = async () => {
    try {
      setLoading(true);
      if (!user) {
        setLoading(false);
        return;
      }

      // Load all data in parallel
      const [titlesRes, questionsRes, answersRes] = await Promise.all([
        supabase.from('user_titles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_questions').select('*').order('created_at', { ascending: false }),
        supabase.from('user_answers').select('*').order('created_at', { ascending: false }),
      ]);

      if (titlesRes.error) throw titlesRes.error;
      if (questionsRes.error) throw questionsRes.error;
      if (answersRes.error) throw answersRes.error;

      setTitles(titlesRes.data?.map(t => ({
        id: t.id,
        pasukId: t.pasuk_id,
        title: t.title,
        createdAt: t.created_at,
        isShared: t.is_shared || false,
        userId: t.user_id,
      })) || []);

      setQuestions(questionsRes.data?.map(q => ({
        id: q.id,
        titleId: q.title_id,
        text: q.text,
        createdAt: q.created_at,
        isShared: q.is_shared || false,
        userId: q.user_id,
      })) || []);

      setAnswers(answersRes.data?.map(a => ({
        id: a.id,
        questionId: a.question_id,
        mefaresh: a.mefaresh,
        text: a.text,
        createdAt: a.created_at,
        isShared: a.is_shared || false,
        userId: a.user_id,
      })) || []);
    } catch (error) {
      console.error("Error loading content:", error);
      toast.error("שגיאה בטעינת תכנים");
    } finally {
      setLoading(false);
    }
  };

  const addTitle = async (pasukId: string, title: string, isShared: boolean = false): Promise<number> => {
    try {
      console.log('🔍 ContentContext - Adding title with pasukId:', pasukId, 'title:', title);
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('user_titles')
        .insert({
          pasuk_id: pasukId,
          title,
          user_id: user.id,
          is_shared: isShared,
        })
        .select()
        .single();

      if (error) throw error;
      console.log('🔍 ContentContext - Title added successfully:', data);

      const newTitle: UserTitle = {
        id: data.id,
        pasukId: data.pasuk_id,
        title: data.title,
        createdAt: data.created_at,
        isShared: data.is_shared || false,
        userId: data.user_id,
      };

      setTitles((prev) => [newTitle, ...prev]);
      return data.id;
    } catch (error) {
      console.error("Error adding title:", error);
      toast.error("שגיאה בהוספת כותרת");
      throw error;
    }
  };

  const addQuestion = async (titleId: number, question: string, isShared: boolean = false): Promise<number> => {
    try {
      console.log('🔍 ContentContext - Adding question with titleId:', titleId, 'question:', question);
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('user_questions')
        .insert({
          title_id: titleId,
          text: question,
          user_id: user.id,
          is_shared: isShared,
        })
        .select()
        .single();

      if (error) throw error;
      console.log('🔍 ContentContext - Question added successfully:', data);

      const newQuestion: UserQuestion = {
        id: data.id,
        titleId: data.title_id,
        text: data.text,
        createdAt: data.created_at,
        isShared: data.is_shared || false,
        userId: data.user_id,
      };

      setQuestions((prev) => [newQuestion, ...prev]);
      return data.id;
    } catch (error) {
      console.error("Error adding question:", error);
      toast.error("שגיאה בהוספת שאלה");
      throw error;
    }
  };

  const addAnswer = async (questionId: number, mefaresh: string, text: string, isShared: boolean = false): Promise<number> => {
    try {
      console.log('🔍 ContentContext - Adding answer with questionId:', questionId, 'mefaresh:', mefaresh);
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('user_answers')
        .insert({
          question_id: questionId,
          mefaresh,
          text,
          user_id: user.id,
          is_shared: isShared,
        })
        .select()
        .single();

      if (error) throw error;
      console.log('🔍 ContentContext - Answer added successfully:', data);

      const newAnswer: UserAnswer = {
        id: data.id,
        questionId: data.question_id,
        mefaresh: data.mefaresh,
        text: data.text,
        createdAt: data.created_at,
        isShared: data.is_shared || false,
        userId: data.user_id,
      };

      setAnswers((prev) => [newAnswer, ...prev]);
      return data.id;
    } catch (error) {
      console.error("Error adding answer:", error);
      toast.error("שגיאה בהוספת תשובה");
      throw error;
    }
  };

  const updateTitle = async (id: number, title: string) => {
    try {
      const { error } = await supabase
        .from('user_titles')
        .update({ title })
        .eq('id', id);

      if (error) throw error;

      setTitles((prev) => prev.map((t) => t.id === id ? { ...t, title } : t));
      toast.success("הכותרת עודכנה בהצלחה");
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("שגיאה בעדכון כותרת");
      throw error;
    }
  };

  const updateQuestion = async (id: number, text: string) => {
    try {
      const { error } = await supabase
        .from('user_questions')
        .update({ text })
        .eq('id', id);

      if (error) throw error;

      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, text } : q));
      toast.success("השאלה עודכנה בהצלחה");
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("שגיאה בעדכון שאלה");
      throw error;
    }
  };

  const updateAnswer = async (id: number, text: string, mefaresh: string) => {
    try {
      const { error } = await supabase
        .from('user_answers')
        .update({ text, mefaresh })
        .eq('id', id);

      if (error) throw error;

      setAnswers((prev) => prev.map((a) => a.id === id ? { ...a, text, mefaresh } : a));
      toast.success("התשובה עודכנה בהצלחה");
    } catch (error) {
      console.error("Error updating answer:", error);
      toast.error("שגיאה בעדכון תשובה");
      throw error;
    }
  };

  const deleteTitle = async (id: number) => {
    try {
      const { error } = await supabase
        .from('user_titles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTitles((prev) => prev.filter((t) => t.id !== id));
      toast.success("הכותרת נמחקה בהצלחה");
    } catch (error) {
      console.error("Error deleting title:", error);
      toast.error("שגיאה במחיקת כותרת");
      throw error;
    }
  };

  const deleteQuestion = async (id: number) => {
    try {
      const { error } = await supabase
        .from('user_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("השאלה נמחקה בהצלחה");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("שגיאה במחיקת שאלה");
      throw error;
    }
  };

  const deleteAnswer = async (id: number) => {
    try {
      const { error } = await supabase
        .from('user_answers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAnswers((prev) => prev.filter((a) => a.id !== id));
      toast.success("התשובה נמחקה בהצלחה");
    } catch (error) {
      console.error("Error deleting answer:", error);
      toast.error("שגיאה במחיקת תשובה");
      throw error;
    }
  };

  const updateTitleSharing = async (id: number, isShared: boolean) => {
    try {
      const { error } = await supabase
        .from('user_titles')
        .update({ is_shared: isShared })
        .eq('id', id);

      if (error) throw error;

      setTitles((prev) => prev.map((t) => t.id === id ? { ...t, isShared } : t));
      toast.success(isShared ? "הכותרת שותפה" : "השיתוף בוטל");
    } catch (error) {
      console.error("Error updating title sharing:", error);
      toast.error("שגיאה בעדכון שיתוף");
      throw error;
    }
  };

  const updateQuestionSharing = async (id: number, isShared: boolean) => {
    try {
      const { error } = await supabase
        .from('user_questions')
        .update({ is_shared: isShared })
        .eq('id', id);

      if (error) throw error;

      setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, isShared } : q));
      toast.success(isShared ? "השאלה שותפה" : "השיתוף בוטל");
    } catch (error) {
      console.error("Error updating question sharing:", error);
      toast.error("שגיאה בעדכון שיתוף");
      throw error;
    }
  };

  const updateAnswerSharing = async (id: number, isShared: boolean) => {
    try {
      const { error } = await supabase
        .from('user_answers')
        .update({ is_shared: isShared })
        .eq('id', id);

      if (error) throw error;

      setAnswers((prev) => prev.map((a) => a.id === id ? { ...a, isShared } : a));
      toast.success(isShared ? "התשובה שותפה" : "השיתוף בוטל");
    } catch (error) {
      console.error("Error updating answer sharing:", error);
      toast.error("שגיאה בעדכון שיתוף");
      throw error;
    }
  };

  return (
    <ContentContext.Provider
      value={{
        titles,
        questions,
        answers,
        addTitle,
        addQuestion,
        addAnswer,
        updateTitle,
        updateQuestion,
        updateAnswer,
        deleteTitle,
        deleteQuestion,
        deleteAnswer,
        updateTitleSharing,
        updateQuestionSharing,
        updateAnswerSharing,
        loading,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error("useContent must be used within ContentProvider");
  }
  return context;
};
