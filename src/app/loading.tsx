'use client';

import { useEffect, useState } from 'react';

export default function Loading() {
  const [systemName, setSystemName] = useState('生产管理系统');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchSystemName = async () => {
      try {
        const res = await fetch('/api/system/config?type=param');
        const data = await res.json();
        
        if (data.code === 200 && data.data) {
          const nameConfig = data.data.find(
            (item: { paramKey: string }) => item.paramKey === 'system_name'
          );
          if (nameConfig?.paramValue) {
            setSystemName(nameConfig.paramValue);
            document.title = nameConfig.paramValue;
          }
        }
      } catch (e) {
        console.error('Failed to fetch system name:', e);
      }
    };

    fetchSystemName();
  }, []);

  // 仅在客户端渲染时显示
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">加载 {systemName}...</p>
      </div>
    </div>
  );
}
