'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';

/**
 * 全局 alert 拦截器
 * 将 window.alert() 调用自动转为 Toast 提示，避免使用原生 alert 阻塞页面
 */
export default function AlertInterceptor() {
  const toast = useToast();

  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = function (message?: any): void {
      const msg = typeof message === 'string' ? message : String(message ?? '');

      // 根据消息内容判断提示类型
      if (msg.includes('成功')) {
        toast.success(msg);
      } else if (msg.includes('失败') || msg.includes('错误')) {
        toast.error(msg);
      } else if (msg.includes('确认') || msg.includes('确定') || msg.includes('无法')) {
        toast.warning(msg);
      } else {
        toast.info(msg);
      }
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [toast]);

  return null;
}
