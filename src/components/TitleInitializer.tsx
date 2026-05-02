'use client';

import { useEffect, useState } from 'react';

export default function TitleInitializer() {
  const [systemName, setSystemName] = useState('生产管理系统');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchSystemName = async () => {
      try {
        const res = await fetch('/api/system/config?type=param');
        const data = await res.json();
        
        if (data.code === 200 && data.data) {
          const nameConfig = data.data.find((item: { paramKey: string }) => item.paramKey === 'system_name');
          if (nameConfig?.paramValue) {
            setSystemName(nameConfig.paramValue);
            document.title = nameConfig.paramValue;
          }
        }
      } catch (e) {
        console.error('Failed to fetch system name:', e);
      } finally {
        setLoaded(true);
      }
    };

    fetchSystemName();
  }, []);

  // 如果还没加载，显示默认 title
  if (!loaded) {
    return <title>生产管理系统</title>;
  }

  return null;
}
