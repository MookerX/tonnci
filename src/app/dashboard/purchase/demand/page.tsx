"use client";

export default function Page() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">采购需求管理</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
        </div>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
        <p className="text-lg mb-2">采购需求管理</p>
        <p className="text-sm">原材料/外购件库存锁定不足时自动生成采购需求单，支持需求合并拆分</p>
        
      </div>
    </div>
  );
}
