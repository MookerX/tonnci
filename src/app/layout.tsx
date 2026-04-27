import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { ToastProvider } from '@/components/ToastProvider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '腾曦生产管理系统',
    template: '%s | 腾曦生产管理系统',
  },
  description: '腾曦生产管理系统 - 企业级生产管理平台',
  keywords: ['生产管理', 'ERP', '制造业', '管理系统'],
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
