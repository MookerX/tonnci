"use client";

export default function Page() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">工资核算</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
        </div>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
        <p className="text-lg mb-2">工资核算</p>
        <p className="text-sm">自定义核算公式、社保个税扣除、自动核算应发实发工资</p>
        
      </div>
    </div>
  );
}
