"use client";

export default function Page() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">工艺路线管理</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
        </div>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
        <p className="text-lg mb-2">工艺路线管理</p>
        <p className="text-sm">按顺序组合工艺，绑定对应物料，支持单条录入和Excel批量导入</p>
        
      </div>
    </div>
  );
}
