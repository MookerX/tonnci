'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

// =============================================================================
// 类型定义
// =============================================================================
interface Drawing {
  id: number;
  materialId: number | null;
  drawingType: string;
  version: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  md5: string;
  isLatest: boolean;
  status: string;
  isDelete: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  material?: { id: number; materialName: string; internalCode: string; drawingCode: string } | null;
  creator?: { id: number; realName: string; username: string } | null;
}

interface Version {
  id: number;
  version: string;
  fileName: string;
  fileSize: number;
  md5: string;
  isLatest: boolean;
  createdAt: string;
  creator?: { id: number; realName: string; username: string } | null;
}

// =============================================================================
// 工具函数
// =============================================================================
const formatFileSize = (bytes: number | string) => {
  const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (!num || isNaN(num)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = num;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// =============================================================================
// 图纸管理主页面
// =============================================================================
export default function DrawingPage() {
  // 状态
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // 上传
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  // 单文件上传 - 物料关联
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [matchedMaterials, setMatchedMaterials] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [materialSearchKeyword, setMaterialSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // 预览
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<Drawing | null>(null);

  // 版本历史
  const [versionDraw, setVersionDraw] = useState<Drawing | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);

  // 物料详情弹窗
  const [materialDetail, setMaterialDetail] = useState<any>(null);
  const [showMaterialDetail, setShowMaterialDetail] = useState(false);
  const [materialDetailLoading, setMaterialDetailLoading] = useState(false);

  // ===========================================================================
  // API 请求封装（自动携带认证token）
  // ===========================================================================
  const fetchApi = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { code: 500, message: '响应解析失败: ' + text.substring(0, 200) };
    }
  };

  // ===========================================================================
  // 数据加载
  // ===========================================================================
  const fetchDrawings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      if (searchText) params.set('search', searchText);

      const data = await fetchApi(`/api/drawing?${params}`);
      if (data.code === 200) {
        setDrawings(data.data.list);
        setTotal(data.data.total);
      } else {
        toast.error(data.message || '加载失败');
      }
    } catch (err: any) {
      toast.error('加载失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchText]);

  useEffect(() => {
    fetchDrawings();
  }, [fetchDrawings]);

  // ===========================================================================
  // 物料详情
  // ===========================================================================
  const fetchMaterialDetail = useCallback(async (materialId: number) => {
    console.log('[Drawing] fetchMaterialDetail called with materialId:', materialId);
    setMaterialDetailLoading(true);
    try {
      const data = await fetchApi(`/api/bom/material/${materialId}`);
      console.log('[Drawing] fetchMaterialDetail response:', data);
      if (data.code === 200) {
        setMaterialDetail(data.data);
        setShowMaterialDetail(true);
      } else {
        toast.error(data.message || '获取物料详情失败');
      }
    } catch (err: any) {
      console.error('[Drawing] fetchMaterialDetail error:', err);
      toast.error('获取物料详情失败: ' + err.message);
    } finally {
      setMaterialDetailLoading(false);
    }
  }, []);

  // ===========================================================================
  // 文件上传
  // ===========================================================================
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(`正在上传 ${files.length} 个文件...`);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const data = await fetchApi('/api/drawing/batch', {
        method: 'POST',
        body: formData,
      });
      if (data.code === 200) {
        const { results, successCount, failCount } = data.data;
        toast.success(`上传成功: ${successCount} 个，失败: ${failCount} 个`);
        if (results && results.length > 0) {
          results.forEach((r: any) => {
            if (!r.success) toast.error(`${r.fileName}: ${r.message}`);
          });
        }
        fetchDrawings();
      } else {
        toast.error(data.message || '上传失败');
      }
    } catch (err: any) {
      toast.error('上传失败: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // ===========================================================================
  // 删除
  // ===========================================================================
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此图纸吗？')) return;

    try {
      const data = await fetchApi(`/api/drawing/${id}`, { method: 'DELETE' });
      if (data.code === 200) {
        toast.success('删除成功');
        fetchDrawings();
      } else {
        toast.error(data.message || '删除失败');
      }
    } catch (err: any) {
      toast.error('删除失败: ' + err.message);
    }
  };

  // ===========================================================================
  // 单文件上传 - 物料匹配
  // ===========================================================================
  const handleSingleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.dwg,.dxf,.jpg,.png,.tif,.zip,.rar,.7z';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadFile(file);
      setUploading(true);
      setUploadProgress(`正在分析文件 "${file.name}" 匹配物料...`);
      try {
        const data = await fetchApi('/api/drawing/match-material', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name }),
        });
        if (data.code === 200) {
          const materials = data.data;
          setMatchedMaterials(materials);
          if (materials.length === 0) {
            // 无匹配，打开物料搜索对话框
            setShowMaterialDialog(true);
            setUploading(false);
          } else if (materials.length === 1) {
            // 唯一匹配，直接上传
            setSelectedMaterial(materials[0]);
            await doUpload(file, materials[0].id);
          } else {
            // 多匹配，让用户选择
            setShowMaterialDialog(true);
            setUploading(false);
          }
        } else {
          toast.error(data.message || '物料匹配失败');
          setUploading(false);
        }
      } catch (err: any) {
        toast.error('分析失败: ' + err.message);
        setUploading(false);
      }
    };
    input.click();
  };

  const doUpload = async (file: File, materialId: number | null) => {
    setUploading(true);
    setUploadProgress('正在上传...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (materialId) {
        formData.append('materialId', materialId.toString());
      }
      const data = await fetchApi('/api/drawing/upload', {
        method: 'POST',
        body: formData,
      });
      if (data.code === 200) {
        toast.success('上传成功' + (data.data.materialName ? `，已关联物料: ${data.data.materialName}` : ''));
        fetchDrawings();
      } else {
        toast.error(data.message || '上传失败');
      }
    } catch (err: any) {
      toast.error('上传失败: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
      setUploadFile(null);
      setSelectedMaterial(null);
      setMatchedMaterials([]);
      setShowMaterialDialog(false);
    }
  };

  const handleSearchMaterial = async () => {
    if (!materialSearchKeyword.trim()) return;
    setSearching(true);
    try {
      const data = await fetchApi(`/api/drawing/materials?keyword=${encodeURIComponent(materialSearchKeyword)}`);
      if (data.code === 200) {
        setSearchResults(data.data);
      }
    } catch (err: any) {
      toast.error('搜索失败');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectMaterial = (material: any) => {
    setSelectedMaterial(material);
    setShowMaterialDialog(false);
    if (uploadFile) {
      doUpload(uploadFile, material.id);
    }
  };

  // ===========================================================================
  // 批量下载
  // ===========================================================================
  const handleBatchDownload = async () => {
    if (selectedIds.length === 0) {
      toast.error('请先选择要下载的图纸');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/drawing/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.headers.get('Content-Type')?.includes('application/zip')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `drawings_${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('下载成功');
      } else {
        const data = await res.json();
        toast.error(data.message || '下载失败');
      }
    } catch (err: any) {
      toast.error('下载失败: ' + err.message);
    }
  };

  // ===========================================================================
  // 版本历史
  // ===========================================================================
  const handleShowVersions = async (drawing: Drawing) => {
    setVersionDraw(drawing);
    setShowVersionModal(true);

    try {
      const data = await fetchApi(`/api/drawing/${drawing.id}/version`);
      if (data.code === 200) {
        setVersions(data.data);
      } else {
        setVersions([]);
      }
    } catch {
      setVersions([]);
    }
  };

  // ===========================================================================
  // 预览
  // ===========================================================================
  const handlePreview = (drawing: Drawing) => {
    setPreviewFile(drawing);
    setPreviewUrl(`/api/drawing/preview/${drawing.id}`);
  };

  // ===========================================================================
  // 选择
  // ===========================================================================
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  useEffect(() => {
    if (selectAll && drawings.length > 0) {
      setSelectedIds(drawings.filter(d => d.status === 'active').map(d => d.id));
    } else if (!selectAll) {
      setSelectedIds([]);
    }
  }, [selectAll, drawings]);

  // ===========================================================================
  // 搜索
  // ===========================================================================
  const handleSearch = () => {
    setPage(1);
    fetchDrawings();
  };

  // ===========================================================================
  // 渲染
  // ===========================================================================
  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">图纸管理</h1>
        <p className="text-sm text-gray-500 mt-1">支持文件检索、在线预览、删除、批量导入、打包下载，MD5去重与版本管理</p>
      </div>

      {/* 操作栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索 */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="搜索文件名..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
            <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap">搜索</button>
          </div>

          {/* 上传按钮 */}
          <label className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors cursor-pointer whitespace-nowrap">
            {uploading ? '上传中...' : '批量导入'}
            <input
              type="file"
              multiple
              accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.zip,.rar"
              className="hidden"
              onChange={e => handleUpload(e.target.files)}
              disabled={uploading}
            />
          </label>

          {/* 单文件上传 */}
          <button onClick={handleSingleUpload} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors" disabled={uploading}>
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            上传图纸
          </button>

          {/* 批量下载 */}
          <button
            onClick={handleBatchDownload}
            disabled={selectedIds.length === 0}
            className={`px-4 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
              selectedIds.length > 0
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            打包下载 ({selectedIds.length})
          </button>
        </div>

        {uploadProgress && (
          <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
            <span className="animate-spin">⏳</span> {uploadProgress}
          </div>
        )}
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={e => setSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-3 py-3 text-left text-gray-600 font-medium">文件名</th>
                <th className="px-3 py-3 text-left text-gray-600 font-medium w-20">文件大小</th>
                <th className="px-3 py-3 text-left text-gray-600 font-medium w-20">类型</th>
                <th className="px-3 py-3 text-left text-gray-600 font-medium w-20">版本</th>
                <th className="px-3 py-3 text-left text-gray-600 font-medium w-28">MD5</th>
                <th className="px-3 py-3 text-left text-gray-600 font-medium w-28">所属物料</th>
                <th className="px-3 py-3 text-left text-gray-600 font-medium w-16">状态</th>
                <th className="px-3 py-3 text-left text-gray-600 font-medium w-36">上传时间</th>
                <th className="px-3 py-3 text-left text-gray-600 font-medium w-10">上传人</th>
                <th className="px-3 py-3 text-center text-gray-600 font-medium w-44">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-gray-400">加载中...</td>
                </tr>
              ) : drawings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-gray-400">暂无数据</td>
                </tr>
              ) : (
                drawings.map((drawing) => (
                  <tr
                    key={drawing.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedIds.includes(drawing.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(drawing.id)}
                        onChange={() => toggleSelect(drawing.id)}
                        disabled={drawing.status !== 'active'}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">📄</span>
                        <span className="text-gray-800 truncate max-w-[200px]" title={drawing.fileName}>
                          {drawing.fileName}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">{formatFileSize(drawing.fileSize)}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        {drawing.drawingType === 'production' ? '生产' : drawing.drawingType === 'design' ? '设计' : drawing.drawingType}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs">{drawing.version}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs text-gray-400" title={drawing.md5}>
                        {drawing.md5 ? drawing.md5.slice(0, 8) + '...' : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {drawing.material?.materialName ? (
                        <button
                          onClick={() => fetchMaterialDetail(drawing.materialId!)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm text-left"
                        >
                          {drawing.material.materialName}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        drawing.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {drawing.status === 'active' ? '正常' : '停用'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{formatDate(drawing.createdAt)}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{drawing.creator?.realName || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handlePreview(drawing)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors" title="预览">预览</button>
                        <button onClick={() => handleShowVersions(drawing)} className="px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="版本历史">版本</button>
                        <button onClick={() => handleDelete(drawing.id)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">删除</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {total > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-500">共 {total} 条</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600">{page} / {Math.ceil(total / pageSize)}</span>
              <button
                disabled={page >= Math.ceil(total / pageSize)}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 预览弹窗 */}
      {/* ========================================================================= */}
      {previewUrl && previewFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setPreviewUrl(null); setPreviewFile(null); }}>
          <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">图纸预览 - {previewFile.fileName}</h3>
              <button onClick={() => { setPreviewUrl(null); setPreviewFile(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-gray-100 flex items-center justify-center">
              {previewFile.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewUrl} className="w-full h-full rounded" title="PDF预览" />
              ) : (
                <img src={previewUrl} alt={previewFile.fileName} className="max-w-full max-h-full object-contain" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 版本历史弹窗 */}
      {/* ========================================================================= */}
      {showVersionModal && versionDraw && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowVersionModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">版本历史 - {versionDraw.fileName}</h3>
              <button onClick={() => setShowVersionModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {versions.length === 0 ? (
                <p className="text-center text-gray-400 py-8">暂无版本记录</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-gray-600">版本</th>
                      <th className="px-3 py-2 text-left text-gray-600">文件名</th>
                      <th className="px-3 py-2 text-left text-gray-600">文件大小</th>
                      <th className="px-3 py-2 text-left text-gray-600">MD5</th>
                      <th className="px-3 py-2 text-left text-gray-600">时间</th>
                      <th className="px-3 py-2 text-left text-gray-600">上传人</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v) => (
                      <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs">{v.version}</span>
                          {v.isLatest && <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">最新</span>}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{v.fileName}</td>
                        <td className="px-3 py-2 text-gray-500">{formatFileSize(v.fileSize)}</td>
                        <td className="px-3 py-2 text-gray-400 font-mono text-xs">{v.md5 ? v.md5.slice(0, 8) + '...' : '-'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{formatDate(v.createdAt)}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{v.creator?.realName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 物料关联对话框 */}
      {/* ========================================================================= */}
      {showMaterialDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowMaterialDialog(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[600px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {matchedMaterials.length > 0 ? '选择关联物料' : '搜索关联物料'}
              </h3>
              <button onClick={() => setShowMaterialDialog(false)} className="text-gray-400 hover:text-gray-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <div className="p-4">
              {matchedMaterials.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-500 mb-3">文件名与以下物料匹配，请选择要关联的物料：</p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {matchedMaterials.map((m: any) => (
                      <div key={m.id} className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => handleSelectMaterial(m)}>
                        <div className="font-medium text-sm">{m.materialName}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          内部编码: {m.internalCode || '-'} | 图纸编码: {m.drawingCode || '-'} | 图号: {m.drawingNo || '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-400 mb-2">以上都不匹配？搜索其他物料：</p>
                    <div className="flex gap-2">
                      <input type="text" value={materialSearchKeyword} onChange={e => setMaterialSearchKeyword(e.target.value)} placeholder="输入物料名称/编码搜索..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onKeyDown={e => e.key === 'Enter' && handleSearchMaterial()} />
                      <button onClick={handleSearchMaterial} disabled={searching} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50">
                        {searching ? '搜索中...' : '搜索'}
                      </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                        {searchResults.map((m: any) => (
                          <div key={m.id} className="p-2 border rounded-lg hover:bg-blue-50 cursor-pointer text-sm" onClick={() => handleSelectMaterial(m)}>
                            {m.materialName} ({m.internalCode || m.drawingCode || '-'})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-3">未找到匹配的物料，请搜索并选择要关联的物料：</p>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={materialSearchKeyword} onChange={e => setMaterialSearchKeyword(e.target.value)} placeholder="输入物料名称/编码搜索..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onKeyDown={e => e.key === 'Enter' && handleSearchMaterial()} />
                    <button onClick={handleSearchMaterial} disabled={searching} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50">
                      {searching ? '搜索中...' : '搜索'}
                    </button>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {searchResults.map((m: any) => (
                        <div key={m.id} className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => handleSelectMaterial(m)}>
                          <div className="font-medium text-sm">{m.materialName}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            内部编码: {m.internalCode || '-'} | 图纸编码: {m.drawingCode || '-'} | 图号: {m.drawingNo || '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">输入关键词搜索物料，也可以 <button onClick={() => { setShowMaterialDialog(false); if (uploadFile) doUpload(uploadFile, null); }} className="text-blue-600 hover:underline">不关联物料直接上传</button></p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 物料详情弹窗 */}
      {/* ========================================================================= */}
      {showMaterialDetail && materialDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowMaterialDetail(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[500px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">物料详情 - {materialDetail.materialName}</h3>
              <button onClick={() => setShowMaterialDetail(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {materialDetailLoading ? (
                <p className="text-center text-gray-400 py-8">加载中...</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">物料名称</label>
                      <p className="text-sm font-medium text-gray-800">{materialDetail.materialName}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">物料类型</label>
                      <p className="text-sm text-gray-700">
                        {materialDetail.materialType === 'part' ? '零件' :
                         materialDetail.materialType === 'component' ? '组件' :
                         materialDetail.materialType === 'material' ? '材料' :
                         materialDetail.materialType === 'purchased' ? '外购件' :
                         materialDetail.materialType === 'standard' ? '标准件' :
                         materialDetail.materialType === 'auxiliary' ? '辅料' : materialDetail.materialType || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">内部编码</label>
                      <p className="text-sm text-gray-700">{materialDetail.internalCode || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">图纸编码</label>
                      <p className="text-sm text-gray-700">{materialDetail.drawingCode || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">图号</label>
                      <p className="text-sm text-gray-700">{materialDetail.drawingNo || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">规格</label>
                      <p className="text-sm text-gray-700">{materialDetail.spec || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">单位</label>
                      <p className="text-sm text-gray-700">{materialDetail.unit || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">重量</label>
                      <p className="text-sm text-gray-700">{materialDetail.weight != null ? materialDetail.weight + ' kg' : '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">客户</label>
                      <p className="text-sm text-gray-700">{materialDetail.customer?.customerName || '-'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">备注</label>
                      <p className="text-sm text-gray-700">{materialDetail.remark || '-'}</p>
                    </div>
                  </div>
                  {materialDetail.drawings && materialDetail.drawings.length > 0 && (
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <label className="text-xs text-gray-500 mb-2 block">关联图纸</label>
                      <div className="space-y-1">
                        {materialDetail.drawings.map((d: any) => (
                          <div key={d.id} className="text-sm text-blue-600">
                            {d.fileName} <span className="text-gray-400">(v{d.version})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}