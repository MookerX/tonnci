"use client";

export default function DrawingManagementPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">图纸管理</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">批量上传</button>
          <button className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">打包下载</button>
        </div>
      </div>
      <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
        <p className="text-lg mb-2">图纸管理</p>
        <p className="text-sm">支持文件检索、在线预览、删除、批量导入、打包下载，MD5去重与版本管理</p>
      </div>
    </div>
  );
}
