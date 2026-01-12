import axios from 'axios';
export const storage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const httpClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
httpClient.interceptors.request.use((config) => {
  const token = storage.getItem('teacherToken') || storage.getItem('studentToken');
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
      const response = await httpClient.post('/auth/teacher/login', credentials);
      if (response.data.token) {
        storage.setItem('teacherToken', response.data.token);
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
      const response = await httpClient.post('/auth/teacher/register', data);
      return response;
    } catch (error: any) {
      console.error('Teacher registration error:', error);
      throw error;
    }
  },
};

export const studentAuthAPI = {
  login: async (credentials: any) => {
    try {
      const response = await httpClient.post('/auth/student/login', credentials);
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
      const studentData = JSON.parse(storage.getItem('studentData') || '{}');
      if (!studentData.email) throw new Error('Student email not found');
      return await httpClient.get(`/quizzes/student/shared?email=${encodeURIComponent(studentData.email)}`);
    } catch (error: any) {
      console.error('Error fetching student quizzes:', error);
      throw error;
    }
  },
  getQuizResults: async (quizId: string) => {
    try {
      const studentData = JSON.parse(storage.getItem('studentData') || '{}');
      if (!studentData.id && !studentData._id) throw new Error('Student identifier not found');
      const sId = studentData.id || studentData._id;
      return await httpClient.get(`/student/quiz/${quizId}/results/${sId}`);
    } catch (error: any) {
      console.error('Error fetching student quiz results:', error);
      throw error;
    }
  },
  submitQuiz: async (quizId: string, payload: any) => {
    try {
      const studentData = JSON.parse(storage.getItem('studentData') || '{}');
      const sId = studentData.id || studentData._id;
      return await httpClient.post('/student/quiz/submit', {
        ...payload,
        quizId,
        studentId: sId
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
      return await httpClient.post(`/student/quiz/submit-attempt`, {
        attemptId,
        answers,
        auto,
        reason
      });
    } catch (error: any) {
      console.error('Error submitting quiz attempt:', error);
      throw error;
    }
  },

  register: async (data: any) => {
    try {
      return await httpClient.post('/auth/student/register', data);
    } catch (error: any) {
      console.error('Student registration error:', error);
      throw error;
    }
  }
};

/* =========================
   QUIZ MANAGEMENT APIs
========================= */
export const quizAPI = {
  save: async (quizData: any) => {
    try {
      return await httpClient.post('/quizzes/save', quizData);
    } catch (error: any) {
      console.error('Error saving quiz:', error);
      throw error;
    }
  },

  getAll: async () => {
    try {
      return await httpClient.get('/quizzes/all');
    } catch (error: any) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      return await httpClient.get(`/quizzes/${id}`);
    } catch (error: any) {
      console.error('Error fetching quiz details:', error);
      throw error;
    }
  },

  update: async (id: string, data: any) => {
    try {
      return await httpClient.put(`/quizzes/${id}`, data);
    } catch (error: any) {
      console.error('Error updating quiz:', error);
      throw error;
    }
  },

  delete: async (id: string) => {
    try {
      return await httpClient.delete(`/quizzes/${id}`);
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  },

  deleteAttempt: async (attemptId: string) => {
    try {
      return await httpClient.delete(`/quizzes/attempts/${attemptId}`);
    } catch (error: any) {
      console.error('Error deleting attempt:', error);
      throw error;
    }
  },

  getAllWithStats: async () => {
    try {
      return await httpClient.get('/quizzes/results/all');
    } catch (error: any) {
      console.error('Error fetching quiz stats:', error);
      throw error;
    }
  },

  getResults: async (id: string) => {
    try {
      return await httpClient.get(`/quizzes/${id}/results`);
    } catch (error: any) {
      console.error('Error fetching quiz results:', error);
      throw error;
    }
  },

  share: async (data: any) => {
    try {
      const result = await httpClient.post('/quizzes/share', data);
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