// =============================================================================
// 腾曦生产管理系统 - 工作台首页
// =============================================================================

"use client";

import { useState, useEffect } from "react";

export default function DashboardHome() {
  const [stats, setStats] = useState({
    pendingOrders: 0,
    inProduction: 0,
    pendingQc: 0,
    pendingDelivery: 0,
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">工作台</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待生产订单</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pendingOrders}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">生产中</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inProduction}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待质检</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.pendingQc}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待发货</p>
              <p className="text-3xl font-bold text-cyan-600 mt-1">{stats.pendingDelivery}</p>
            </div>
            <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 快捷入口 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-base font-semibold text-gray-800 mb-4">快捷入口</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "订单管理", href: "/dashboard/order", color: "blue" },
            { label: "生产管理", href: "/dashboard/production/task", color: "amber" },
            { label: "质量管理", href: "/dashboard/quality", color: "purple" },
            { label: "发货管理", href: "/dashboard/delivery/plan", color: "cyan" },
            { label: "采购管理", href: "/dashboard/purchase/supplier", color: "green" },
            { label: "库存管理", href: "/dashboard/inventory", color: "red" },
            { label: "BOM管理", href: "/dashboard/tech/bom", color: "indigo" },
            { label: "技术任务池", href: "/dashboard/tech-task", color: "pink" },
            { label: "对账开票", href: "/dashboard/accounting/reconciliation", color: "emerald" },
            { label: "工资结算", href: "/dashboard/wages/calc", color: "orange" },
            { label: "客户进度", href: "/dashboard/customer-portal", color: "teal" },
            { label: "系统管理", href: "/dashboard/system/user", color: "slate" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center justify-center h-12 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition-colors border border-gray-100"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>

      {/* 最近动态 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">最近动态</h3>
        <div className="text-center py-8 text-gray-400">
          <p>暂无动态</p>
        </div>
      </div>
    </div>
  );
}
