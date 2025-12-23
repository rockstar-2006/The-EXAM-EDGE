import * as XLSX from 'xlsx';
import { Student } from '@/types';

export interface ExcelValidationResult {
  isValid: boolean;
  errors: string[];
  students: Student[];
}

// Define flexible header mappings
const HEADER_MAPPINGS: Record<string, string[]> = {
  'name': ['name', 'student name', 'full name', 'student'],
  'usn': ['usn', 'university seat number', 'registration number', 'reg no'],
  'email': ['email', 'email address', 'email id', 'mail'],
  'branch': ['branch', 'department', 'dept', 'stream'],
  'year': ['year', 'study year', 'academic year', 'class year'],
  'semester': ['semester', 'sem', 'semester number', 'sem no']
};

export async function parseExcelFile(file: File): Promise<ExcelValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (jsonData.length === 0) {
          resolve({
            isValid: false,
            errors: ['Excel file is empty'],
            students: [],
          });
          return;
        }

        const headers = jsonData[0];
        const errors: string[] = [];

        // Normalize headers (trim, lowercase, remove special chars)
        const normalizedHeaders = headers.map(header =>
          header ? header.toString().trim().toLowerCase().replace(/[^a-z0-9\s]/gi, '') : ''
        );

        // Map normalized headers to our required fields
        const headerMap: Record<string, number> = {};
        let missingRequiredFields: string[] = [];

        Object.entries(HEADER_MAPPINGS).forEach(([requiredField, possibleNames]) => {
          const index = normalizedHeaders.findIndex(header =>
            possibleNames.some(name => header.includes(name))
          );

          if (index !== -1) {
            headerMap[requiredField] = index;
          } else {
            missingRequiredFields.push(requiredField);
          }
        });

        // Check if we found all required fields
        if (missingRequiredFields.length > 0) {
          errors.push(`Missing or could not identify required columns: ${missingRequiredFields.join(', ')}. Found columns: ${headers.join(', ')}`);
        }

        // Parse students
        const students: Student[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.every((cell) => !cell || cell.toString().trim() === '')) continue;

          const student: Student = {
            id: `student-${i}`,
            name: row[headerMap['name']]?.toString().trim() || '',
            usn: row[headerMap['usn']]?.toString().trim() || '',
            email: row[headerMap['email']]?.toString().trim() || '',
            branch: row[headerMap['branch']]?.toString().trim() || '',
            year: row[headerMap['year']]?.toString().trim() || '',
            semester: row[headerMap['semester']]?.toString().trim() || '',
          };

          // Validate email format if present
          if (student.email && !isValidEmail(student.email)) {
            errors.push(`Row ${i + 1}: Invalid email format - ${student.email}`);
          }

          // Loosen validation: Only Name and either USN or Email are strictly required
          const isMissingCore = !student.name || (!student.usn && !student.email);
          const emptyFields = Object.entries(student)
            .filter(([key, value]) => key !== 'id' && !value)
            .map(([key]) => key);

          if (isMissingCore) {
            errors.push(`Row ${i + 1}: Missing critical fields - ${emptyFields.join(', ')}. Name and USN/Email are mandatory.`);
          } else if (emptyFields.length > 0) {
            // Just a warning for other fields, but still push the student
            console.warn(`Row ${i + 1}: Some fields are missing (${emptyFields.join(', ')}), but record will be created.`);
          }

          // Validate USN format (if you have specific format requirements)
          if (student.usn && !isValidUSN(student.usn)) {
            // Optional: Add USN validation if needed
            // errors.push(`Row ${i + 1}: Invalid USN format - ${student.usn}`);
          }

          students.push(student);
        }

        // If no students were parsed but we have rows
        if (students.length === 0 && jsonData.length > 1) {
          errors.push('No valid student data found in the file. Please check the format.');
        }

        resolve({
          isValid: errors.length === 0,
          errors,
          students,
        });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUSN(usn: string): boolean {
  // Add your USN validation logic here if needed
  return usn.trim().length > 0;
}

export function generateSampleExcel(): void {
  // Updated sample with different column order and additional column
  const sampleData = [
    ['Sr.No', 'Name', 'Year', 'Branch', 'USN', 'Sem', 'Email'],
    ['1', 'John Doe', '3', 'Computer Science', '1CR21CS001', '5', 'john.doe@example.com'],
    ['2', 'Jane Smith', '3', 'Computer Science', '1CR21CS002', '5', 'jane.smith@example.com'],
    ['3', 'Alice Johnson', '2', 'Electronics', '1CR21EC001', '4', 'alice.j@example.com'],
    ['4', 'Bob Wilson', '4', 'Mechanical', '1CR21ME001', '7', 'bob.w@example.com'],
    ['5', 'Charlie Brown', '3', 'Computer Science', '1CR21CS003', '5', 'charlie.b@example.com'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');

  // Generate and download the file
  XLSX.writeFile(wb, 'sample_students.xlsx');
}