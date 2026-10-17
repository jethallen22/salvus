export const YEAR_LEVELS = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "1st Year College",
  "2nd Year College",
  "3rd Year College",
  "4th Year College",
  "5th Year College",
  "Graduate School",
] as const;

export type YearLevel = (typeof YEAR_LEVELS)[number];
