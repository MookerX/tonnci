"use client";

export default function SystemMenuPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">菜单管理</h2>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
        菜单权限配置功能开发中，可通过API接口 /api/system/menu 进行管理
      </div>
    </div>
  );
}
