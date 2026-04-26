"use client";

export default function DeptManagementPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">部门管理</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ 新增部门</button>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
        <p className="text-lg mb-2">部门管理</p>
        <p className="text-sm">多级部门树形结构管理，支持新增、编辑、禁用、排序，按部门批量分配角色与数据权限</p>
      </div>
    </div>
  );
}
