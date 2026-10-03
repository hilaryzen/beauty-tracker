import { useState } from 'react';
import initialData from '@/assets/data/usage.json';

export const useImportData = () => {
  const [usage, setUsage] = useState(initialData);

  return { usage, setUsage };
};
