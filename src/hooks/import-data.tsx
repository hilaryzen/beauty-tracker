import { useState } from 'react';
import initialData from '@/assets/data.json';

export const useImportData = () => {
  const [usage, setUsage] = useState(initialData);

  return { usage, setUsage };
};
