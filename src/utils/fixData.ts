import { replaceHashemName } from './textUtils';

// Utility to fix data issues in text content
export const fixText = (text: string): string => {
  if (!text) return text;
  
  // Replace "אבן עזרה" with "אבן עזרא"
  let fixed = text.replace(/אבן עזרה/g, 'אבן עזרא');
  
  // Replace "יקוק" with "יהוה" (handles with nikkud too)
  fixed = replaceHashemName(fixed);
  
  return fixed;
};

// Legacy function for backward compatibility - deprecated
export const fixJsonContent = (content: string): string => {
  return fixText(content);
};
