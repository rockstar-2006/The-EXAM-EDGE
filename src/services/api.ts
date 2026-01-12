import axios from 'axios';

export const storage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const httpClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default httpClient;

// Add a request interceptor to include the auth token
httpClient.interceptors.request.use((config) => {
  const token = storage.getItem('teacherToken') || storage.getItem('studentToken') || storage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

/* =========================
   AUTH APIs
========================= */
export const teacherAuthAPI = {
  login: async (credentials: any) => {
    try {
      const response = await httpClient.post('/auth/login', credentials);
      if (response.data.token) {
        storage.setItem('teacherToken', response.data.token);
        storage.setItem('token', response.data.token);
        storage.setItem('userData', JSON.stringify(response.data.user));
      }
      return response;
    } catch (error: any) {
      console.error('Teacher login error:', error);
      throw error;
    }
  },
  register: async (data: any) => {
    try {
      const response = await httpClient.post('/auth/register', data);
      return response;
    } catch (error: any) {
      console.error('Teacher registration error:', error);
      throw error;
    }
  },
  forgotPassword: async (email: string) => {
    return await httpClient.post('/auth/forgot-password', { email });
  },
  resetPassword: async (token: string, data: any) => {
    return await httpClient.put(`/auth/reset-password/${token}`, data);
  },
  updatePassword: async (data: any) => {
    return await httpClient.put('/auth/update-password', data);
  },
};

export const studentAuthAPI = {
  login: async (credentials: any) => {
    try {
      const response = await httpClient.post('/student/login', credentials);
      if (response.data.token) {
        storage.setItem('studentToken', response.data.token);
        storage.setItem('studentData', JSON.stringify(response.data.student));
      }
      return response;
    } catch (error: any) {
      console.error('Student login error:', error);
      throw error;
    }
  },
  getAvailableQuizzes: async () => {
    try {
      return await httpClient.get('/student/quizzes');
    } catch (error: any) {
      console.error('Error fetching student quizzes:', error);
      throw error;
    }
  },
  getQuizResults: async (quizId: string) => {
    try {
      return await httpClient.get(`/student/quiz/${quizId}/results`);
    } catch (error: any) {
      console.error('Error fetching student quiz results:', error);
      throw error;
    }
  },
  submitQuiz: async (quizId: string, payload: any) => {
    try {
      return await httpClient.post('/student/quiz/submit', {
        ...payload,
        quizId
      });
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      throw error;
    }
  },

  getQuizDetails: async (quizId: string) => {
    try {
      return await httpClient.get(`/student/quiz/${quizId}`);
    } catch (error: any) {
      console.error('Error fetching quiz details:', error);
      throw error;
    }
  },

  startQuizAttempt: async (quizId: string) => {
    try {
      return await httpClient.post(`/student/quiz/start`, { quizId });
    } catch (error: any) {
      console.error('Error starting quiz attempt:', error);
      throw error;
    }
  },

  submitQuizAttempt: async (attemptId: string, answers: any[], auto = false, reason = '') => {
    try {
      return await httpClient.post(`/student/quiz/submit`, {
        attemptId,
        answers,
        isAutoSubmit: auto,
        reason
      });
    } catch (error: any) {
      console.error('Error submitting quiz attempt:', error);
      throw error;
    }
  },

  register: async (data: any) => {
    try {
      return await httpClient.post('/student/register', data);
    } catch (error: any) {
      console.error('Student registration error:', error);
      throw error;
    }
  },
  forgotPassword: async (email: string) => {
    return await httpClient.post('/student/forgot-password', { email });
  },
  resetPassword: async (token: string, data: any) => {
    return await httpClient.put(`/student/reset-password/${token}`, data);
  },
  updatePassword: async (data: any) => {
    return await httpClient.put('/student/update-password', data);
  },
};

/* =========================
   QUIZ MANAGEMENT APIs
========================= */
export const quizAPI = {
  save: async (quizData: any) => {
    try {
      return await httpClient.post('/quiz/save', quizData);
    } catch (error: any) {
      console.error('Error saving quiz:', error);
      throw error;
    }
  },

  getAll: async () => {
    try {
      return await httpClient.get('/quiz/all');
    } catch (error: any) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      return await httpClient.get(`/quiz/${id}`);
    } catch (error: any) {
      console.error('Error fetching quiz details:', error);
      throw error;
    }
  },

  update: async (id: string, data: any) => {
    try {
      return await httpClient.put(`/quiz/${id}`, data);
    } catch (error: any) {
      console.error('Error updating quiz:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      return await httpClient.delete(`/quiz/${id}`);
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  },

  deleteAttempt: async (attemptId: string) => {
    try {
      return await httpClient.delete(`/quiz/attempts/${attemptId}`);
    } catch (error: any) {
      console.error('Error deleting attempt:', error);
      throw error;
    }
  },

  getAllWithStats: async () => {
    try {
      return await httpClient.get('/quiz/results/all');
    } catch (error: any) {
      console.error('Error fetching quiz stats:', error);
      throw error;
    }
  },

  getResults: async (id: string) => {
    try {
      return await httpClient.get(`/quiz/${id}/results`);
    } catch (error: any) {
      console.error('Error fetching quiz results:', error);
      throw error;
    }
  },

  share: async (data: any) => {
    try {
      const result = await httpClient.post('/quiz/share', data);
      return result;
    } catch (error: any) {
      console.error('Error sharing quiz:', error);
      throw error;
    }
  },
};

/* =========================
   STUDENT MANAGEMENT APIs
========================= */
export const studentsAPI = {
  upload: async (students: any[]) => {
    try {
      return await httpClient.post('/students/upload', { students });
    } catch (error: any) {
      console.error('Error uploading students:', error);
      throw error;
    }
  },

  getAll: async () => {
    try {
      const result = await httpClient.get('/students/all');
      if (result.data && Array.isArray(result.data)) {
        result.data = result.data.map(student => ({
          id: student._id || student.id,
          name: student.name,
          usn: student.usn,
          email: student.email,
          branch: student.branch,
          year: student.year,
          semester: student.semester,
          userId: student.userId,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt
        }));
      }
      return result;
    } catch (error: any) {
      console.error('Error fetching students:', error);
      throw error;
    }
  },

  add: async (student: any) => {
    try {
      const result = await httpClient.post('/students/add', student);
      if (result.data && result.data.student) {
        result.data.student = {
          id: result.data.student._id,
          ...result.data.student
        };
        delete result.data.student._id;
      }
      return result;
    } catch (error: any) {
      console.error('Error adding student:', error);
      throw error;
    }
  },

  update: async (id: string, student: any) => {
    try {
      return await httpClient.put(`/students/${id}`, student);
    } catch (error: any) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      return await httpClient.delete(`/students/${id}`);
    } catch (error: any) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  deleteMultiple: async (studentIds: string[]) => {
    try {
      return await httpClient.post('/students/delete-multiple', { studentIds });
    } catch (error: any) {
      console.error('Error deleting multiple students:', error);
      throw error;
    }
  },

  deleteAll: async () => {
    try {
      return await httpClient.delete('/students/delete-all');
    } catch (error: any) {
      console.error('Error deleting all students:', error);
      throw error;
    }
  },
};

/* =========================
   BOOKMARKS APIs
========================= */
export const bookmarksAPI = {
  create: async (data: any) => {
    try {
      return await httpClient.post('/bookmarks', data);
    } catch (error: any) {
      console.error('Error creating bookmark:', error);
      throw error;
    }
  },
  getAll: async () => {
    try {
      return await httpClient.get('/bookmarks');
    } catch (error: any) {
      console.error('Error fetching bookmarks:', error);
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
      return await httpClient.delete(`/bookmarks/${id}`);
    } catch (error: any) {
      console.error('Error deleting bookmark:', error);
      throw error;
    }
  },
};

/* =========================
   FOLDERS APIs
========================= */
export const foldersAPI = {
  create: async (data: any) => {
    try {
      return await httpClient.post('/folders', data);
    } catch (error: any) {
      console.error('Error creating folder:', error);
      throw error;
    }
  },
  getAll: async () => {
    try {
      return await httpClient.get('/folders');
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      throw error;
    }
  },
  update: async (id: string, data: any) => {
    try {
      return await httpClient.put(`/folders/${id}`, data);
    } catch (error: any) {
      console.error('Error updating folder:', error);
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
      return await httpClient.delete(`/folders/${id}`);
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      throw error;
    }
  },
};