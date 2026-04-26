"use client";

export default function Page() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">技术任务工作池</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">+ 新增</button>
        </div>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
        <p className="text-lg mb-2">技术任务工作池</p>
        <p className="text-sm">任务流转、自动匹配、进度可视化，含BOM处理池、图纸关联池、工艺池、工艺附图池</p>
        
      </div>
    </div>
  );
}
