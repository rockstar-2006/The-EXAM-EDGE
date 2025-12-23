import { Capacitor, CapacitorHttp } from '@capacitor/core';

/* =========================
   CONFIGURATION - USE YOUR CORRECT IP: 192.168.1.100
========================= */
const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

let API_BASE_URL = '';

// Get API URL from environment variable or construct from parts
const getApiUrl = () => {
  // If VITE_API_URL is set, use it (works for both web and mobile in production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Development fallback: use local IP for native apps, localhost for web
  const API_PORT = '3001';
  if (isNative) {
    // For development, you need to set your computer's IP here
    // In production, this won't be used as VITE_API_URL will be set
    const DEV_COMPUTER_IP = '192.168.1.105'; // Change this to your IP during development
    return `http://${DEV_COMPUTER_IP}:${API_PORT}/api`;
  }

  return `http://localhost:${API_PORT}/api`;
};

API_BASE_URL = getApiUrl();

if (import.meta.env.DEV) {
  console.log('[API] Platform:', isNative ? 'Native' : 'Web');
  console.log('[API] Base URL:', API_BASE_URL);
}

/* =========================
   NETWORK UTILITY FUNCTIONS
========================= */
// Extract server info from API_BASE_URL
const getServerInfo = () => {
  const url = API_BASE_URL.replace('/api', '');
  const match = url.match(/^https?:\/\/([^:/]+)(?::(\d+))?/);
  const isHttps = url.startsWith('https');

  return {
    host: match?.[1] || 'localhost',
    port: match?.[2] || (isHttps ? '443' : '80'),
    fullUrl: url
  };
};

const networkUtils = {
  // Check if server is reachable before making requests
  checkServerReachable: async (): Promise<boolean> => {
    if (!isNative) return true; // Skip for web

    const testUrl = `${API_BASE_URL.replace('/api', '')}/api/health`;

    try {
      if (isNative && (platform === 'android' || platform === 'ios')) {
        // Use CapacitorHttp which is more robust for native HTTPS
        const response = await CapacitorHttp.request({
          url: testUrl,
          method: 'GET',
          connectTimeout: 5000,
          readTimeout: 5000
        });
        return response.status >= 200 && response.status < 300;
      }

      // Fallback for non-native or dev environments
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('⚠️ Server connectivity check failed:', error);
      return false;
    }
  },

  // Get helpful network error message
  getNetworkErrorMessage: (error: any): string => {
    const serverInfo = getServerInfo();
    if (error.message?.includes('unreachable') || error.message?.includes('ERR_ADDRESS_UNREACHABLE')) {
      return `Cannot connect to server at ${serverInfo.host}:${serverInfo.port}. 
Please check:
1. Server is running at ${serverInfo.host}:${serverInfo.port}
2. Both devices are on same WiFi network
3. Firewall allows port ${serverInfo.port}
4. Try opening ${serverInfo.fullUrl}/api/health in phone browser`;
    }
    return error.message || 'Network error occurred';
  }
};

/* =========================
   HTTP CLIENT (WITH IMPROVED NETWORK HANDLING)
========================= */
const httpClient = {
  request: async (method: string, endpoint: string, data: any = null, headers: any = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`🌐 ${method} to: ${url}`);

    // Get authentication header
    const studentToken = localStorage.getItem('studentToken');
    const teacherToken = localStorage.getItem('token');

    let authHeader = {};
    if (studentToken) {
      authHeader = { Authorization: `Bearer ${studentToken}` };
    } else if (teacherToken) {
      authHeader = { Authorization: `Bearer ${teacherToken}` };
    }

    const mergedHeaders = {
      'Content-Type': 'application/json',
      ...authHeader,
      ...headers
    };

    // Native platform (Android/iOS)
    if (isNative && (platform === 'android' || platform === 'ios')) {
      try {
        const options: any = {
          url,
          method,
          headers: mergedHeaders,
        };

        if (data) {
          options.data = JSON.stringify(data);
        }

        console.log(`📱 Native ${method} to:`, url);
        const response = await CapacitorHttp.request(options);

        console.log(`📱 Native response [${response.status}]:`, response.data);

        if (response.status >= 400) {
          throw {
            response: {
              data: response.data,
              status: response.status,
              statusText: `HTTP ${response.status}`
            }
          };
        }

        return { data: response.data, status: response.status };
      } catch (error: any) {
        console.error(`❌ Native ${method} failed:`, error);

        // Format error for consistent handling
        const errorMessage = networkUtils.getNetworkErrorMessage(error);

        // Preserve the error structure for consistent error handling
        if (error.response) {
          throw error;
        } else {
          const serverInfo = getServerInfo();
          throw {
            response: {
              data: {
                message: errorMessage,
                debug: {
                  attemptedUrl: url,
                  serverIP: serverInfo.host,
                  serverPort: serverInfo.port,
                  suggestion: `Test connection: ${serverInfo.fullUrl}/api/health`
                }
              },
              status: 0,
              statusText: 'Network Error'
            }
          };
        }
      }
    }

    // Web Platform (Fetch)
    try {
      console.log(`🖥️ Web ${method} to:`, url);
      const response = await fetch(url, {
        method,
        headers: mergedHeaders,
        body: data ? JSON.stringify(data) : null,
        mode: 'cors',
        credentials: 'include',
      });

      const result = await response.json().catch(() => ({}));
      console.log(`🖥️ Web response [${response.status}]:`, result);

      if (!response.ok) {
        throw {
          response: {
            data: result,
            status: response.status,
            statusText: response.statusText
          }
        };
      }

      return { data: result, status: response.status };
    } catch (error: any) {
      console.error(`❌ Web ${method} failed:`, error);

      // Ensure consistent error structure
      if (error.response) {
        throw error;
      } else {
        const errorMessage = networkUtils.getNetworkErrorMessage(error);
        const serverInfo = getServerInfo();
        throw {
          response: {
            data: {
              message: errorMessage,
              debug: {
                attemptedUrl: url,
                serverIP: serverInfo.host,
                error: error.message
              }
            },
            status: 0,
            statusText: 'Network Error'
          }
        };
      }
    }
  },

  get: (endpoint: string, headers = {}) => httpClient.request('GET', endpoint, null, headers),
  post: (endpoint: string, data: any, headers = {}) => httpClient.request('POST', endpoint, data, headers),
  put: (endpoint: string, data: any, headers = {}) => httpClient.request('PUT', endpoint, data, headers),
  delete: (endpoint: string, headers = {}) => httpClient.request('DELETE', endpoint, null, headers),

  // Test server connection
  testConnection: async () => {
    const serverInfo = getServerInfo();
    try {
      const result = await httpClient.get('/health');
      return {
        success: true,
        message: 'Server is reachable',
        data: result.data,
        serverIP: serverInfo.host,
        serverPort: serverInfo.port
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Server is not reachable',
        error: error.response?.data?.message || error.message,
        serverIP: serverInfo.host,
        serverPort: serverInfo.port,
        help: `Test in browser: ${serverInfo.fullUrl}/api/health`
      };
    }
  }
};

/* =========================
   AUTH HEADER HELPER
========================= */
const getAuthHeader = () => {
  const token = localStorage.getItem('studentToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* =========================
   TEACHER / ADMIN APIs (COOKIE-BASED)
========================= */
export const teacherAuthAPI = {
  login: async (email: string, password: string) => {
    try {
      const result = await httpClient.post('/auth/login', { email, password });
      return result;
    } catch (error: any) {
      console.error('Teacher login API error:', error);
      throw error;
    }
  },

  register: async (payload: any) => {
    try {
      const result = await httpClient.post('/auth/register', payload);
      return result;
    } catch (error: any) {
      console.error('Teacher register API error:', error);
      throw error;
    }
  },

  verify: async () => {
    try {
      const result = await httpClient.get('/auth/me');
      return result;
    } catch (error: any) {
      console.error('Teacher verify API error:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      const result = await httpClient.post('/auth/logout', {});
      return result;
    } catch (error: any) {
      console.error('Teacher logout API error:', error);
      throw error;
    }
  },
};

/* =========================
   STUDENT AUTH APIs (TOKEN-BASED)
========================= */
export const studentAuthAPI = {
  // Auth endpoints (use /student/)
  login: async (email: string, password: string) => {
    try {
      const result = await httpClient.post('/student/login', { email, password });
      if (result.data?.token) {
        localStorage.setItem('studentToken', result.data.token);
        if (result.data?.student) {
          localStorage.setItem('studentData', JSON.stringify(result.data.student));
        }
      }
      return result;
    } catch (error: any) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  register: async (payload: any) => {
    try {
      const result = await httpClient.post('/student/register', payload);
      if (result.data?.token) {
        localStorage.setItem('studentToken', result.data.token);
        if (result.data?.student) {
          localStorage.setItem('studentData', JSON.stringify(result.data.student));
        }
      }
      return result;
    } catch (error: any) {
      console.error('Register API error:', error);
      throw error;
    }
  },

  verify: async () => {
    const token = localStorage.getItem('studentToken');
    if (!token) {
      return { data: { valid: false }, status: 401 };
    }
    try {
      const result = await httpClient.get('/student/me', getAuthHeader());
      if (result.data?.student) {
        localStorage.setItem('studentData', JSON.stringify(result.data.student));
      }
      return result;
    } catch (error: any) {
      localStorage.removeItem('studentToken');
      localStorage.removeItem('studentData');
      return { data: { valid: false }, status: 401 };
    }
  },

  // Quiz listing (use /student/)
  getAvailableQuizzes: async () => {
    try {
      const response = await httpClient.get('/student/quizzes', getAuthHeader());
      // The backend returns { success: true, count: X, quizzes: [...] }
      // The dashboard expects response.data to be the array of quizzes
      return {
        ...response,
        data: response.data.quizzes || []
      };
    } catch (error: any) {
      console.error('Get available quizzes API error:', error);
      throw error;
    }
  },

  // Quiz operations (use /student/)
  getQuizDetails: async (quizId: string) => {
    try {
      return await httpClient.get(`/student/quiz/${quizId}`, getAuthHeader());
    } catch (error: any) {
      console.error('Get quiz details API error:', error);
      throw error;
    }
  },

  startQuizAttempt: async (quizId: string) => {
    try {
      return await httpClient.post('/student/quiz/start', { quizId }, getAuthHeader());
    } catch (error: any) {
      console.error('Start quiz attempt API error:', error);
      throw error;
    }
  },

  submitQuizAttempt: async (attemptId: string, answers: any[], isAutoSubmit = false, reason = '') => {
    try {
      return await httpClient.post('/student/quiz/submit', { attemptId, answers, isAutoSubmit, reason }, getAuthHeader());
    } catch (error: any) {
      console.error('Submit quiz attempt API error:', error);
      throw error;
    }
  },

  saveProgress: async (attemptId: string, answers: any[]) => {
    try {
      return await httpClient.post('/student/quiz/save-progress', { attemptId, answers }, getAuthHeader());
    } catch (error: any) {
      console.error('Save progress API error:', error);
      throw error;
    }
  },

  getQuizResults: async (quizId: string) => {
    try {
      return await httpClient.get(`/student/quiz/${quizId}/results`, getAuthHeader());
    } catch (error: any) {
      console.error('Get quiz results API error:', error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('studentToken');
    localStorage.removeItem('studentData');
  },

  // ... other helper methods
};

/* =========================
   QUIZ APIs
========================= */
export const quizAPI = {
  save: async (quiz: any) => {
    try {
      const result = await httpClient.post('/quiz/save', quiz);
      console.log('Quiz save response:', result);
      return result;
    } catch (error: any) {
      console.error('Error saving quiz:', error);
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

  getAll: async () => {
    try {
      return await httpClient.get('/quiz/all');
    } catch (error: any) {
      console.error('Error fetching quizzes:', error);
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

  // Get quiz by ID
  getById: async (id: string) => {
    try {
      return await httpClient.get(`/quiz/${id}`);
    } catch (error: any) {
      console.error('Error fetching quiz details:', error);
      throw error;
    }
  },

  // Update quiz
  update: async (id: string, data: any) => {
    try {
      return await httpClient.put(`/quiz/${id}`, data);
    } catch (error: any) {
      console.error('Error updating quiz:', error);
      throw error;
    }
  },
};

/* =========================
   STUDENT MANAGEMENT APIs
========================= */
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
      // Transform _id to id for frontend consistency
      if (result.data && Array.isArray(result.data)) {
        result.data = result.data.map(student => ({
          id: student._id || student.id, // Use _id if id doesn't exist
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
      console.log('Adding student:', student);
      const result = await httpClient.post('/students/add', student);
      // Transform response
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
      if (!id) {
        throw new Error('Student ID is required for update');
      }
      console.log('Updating student with ID:', id, 'Data:', student);
      return await httpClient.put(`/students/${id}`, student);
    } catch (error: any) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    try {
      const result = await httpClient.get(`/students/${id}`);
      // Transform response
      if (result.data) {
        result.data = {
          id: result.data._id || result.data.id,
          ...result.data
        };
        delete result.data._id;
      }
      return result;
    } catch (error: any) {
      console.error('Error fetching student:', error);
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
};
/* =========================
   BOOKMARKS APIs
========================= */
export const bookmarksAPI = {
  getAll: async () => {
    try {
      return await httpClient.get('/bookmarks');
    } catch (error: any) {
      console.error('Error fetching bookmarks:', error);
      throw error;
    }
  },

  create: async (data: any) => {
    try {
      return await httpClient.post('/bookmarks', data);
    } catch (error: any) {
      console.error('Error creating bookmark:', error);
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
  getAll: async () => {
    try {
      return await httpClient.get('/folders');
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      throw error;
    }
  },

  create: async (data: any) => {
    try {
      return await httpClient.post('/folders', data);
    } catch (error: any) {
      console.error('Error creating folder:', error);
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

/* =========================
   UTILITY FUNCTIONS
========================= */
export const isAuthenticated = () => {
  const studentToken = localStorage.getItem('studentToken');
  const teacherToken = localStorage.getItem('token');
  return !!(studentToken || teacherToken);
};

export const clearAuth = () => {
  localStorage.removeItem('studentToken');
  localStorage.removeItem('token');
};

// Network diagnostics helper
export const networkDiagnostics = {
  getServerInfo: () => {
    const info = getServerInfo();
    return {
      ip: info.host,
      port: info.port,
      apiBase: API_BASE_URL,
      isNative,
      platform
    };
  },

  testFromBrowser: () => {
    const serverInfo = getServerInfo();
    const testUrl = `${serverInfo.fullUrl}/api/health`;
    if (import.meta.env.DEV) {
      console.log(`🌐 Test URL: ${testUrl}`);
      console.log(`📱 Open this in your phone's browser to test connection`);
    }
    return testUrl;
  }
};
if (import.meta.env.DEV) {
  const serverInfo = getServerInfo();
  console.log('[DEBUG] Frontend configuration:', {
    serverHost: serverInfo.host,
    serverPort: serverInfo.port,
    API_BASE_URL,
    isNative,
    platform
  });
}

export default httpClient;