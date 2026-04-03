import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '@/services/api';

interface StudentData {
  id?: string;
  _id?: string;
  name: string;
  usn: string;
  email: string;
  branch?: string;
  year?: string;
  semester?: string;
}

interface StudentAuthContextType {
  studentData: StudentData | null;
  studentToken: string | null;
  logout: () => void;
  updateStudentData: (data: StudentData, token: string) => void;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [studentData, setStudentData] = useState<StudentData | null>(() => {
    try {
      const saved = storage.getItem('studentData');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [studentToken, setStudentToken] = useState<string | null>(() => storage.getItem('studentToken'));
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Already initialized from storage, but we can verify here if needed
    setIsInitializing(false);
  }, []);

  const updateStudentData = (data: StudentData, token: string) => {
    setStudentData(data);
    setStudentToken(token);
    storage.setItem('studentToken', token);
    storage.setItem('studentData', JSON.stringify(data));
  };

  const logout = () => {
    setStudentData(null);
    setStudentToken(null);
    storage.removeItem('studentToken');
    storage.removeItem('studentData');
    storage.removeItem('teacherToken');
    storage.removeItem('userData');
    storage.removeItem('token');
  };

  return (
    <StudentAuthContext.Provider value={{ 
      studentData, 
      studentToken, 
      logout, 
      updateStudentData, 
      isAuthenticated: !!studentToken,
      isInitializing
    }}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};
