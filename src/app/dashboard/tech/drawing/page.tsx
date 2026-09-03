'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Search, Upload, Download, ChevronDown, ChevronRight, FileText, Trash2,
  X, Settings, Eye, FolderTree, Plus
} from 'lucide-react';

// 物料类型标签映射
const typeLabelMap: Record<string, string> = {
  part: '零件', component: '组件', material: '材料',
  purchased: '外购件', standard: '标准件', auxiliary: '辅料',
};

// =============================================================================
// 列配置
// =============================================================================
interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  visible: boolean;
  order: number;
  canHide?: boolean;
  canResize?: boolean;
  canReorder?: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'checkbox', label: '', width: 32, visible: true, order: 0, canHide: false, canResize: false, canReorder: false },
  { key: 'fileName', label: '文件名', width: 200, visible: true, order: 1, canHide: true, canResize: true, canReorder: true },
  { key: 'fileSize', label: '文件大小', width: 80, visible: true, order: 2, canHide: true, canResize: true, canReorder: true },
  { key: 'drawingType', label: '类型', width: 70, visible: true, order: 3, canHide: true, canResize: true, canReorder: true },
  { key: 'version', label: '版本', width: 60, visible: true, order: 4, canHide: true, canResize: true, canReorder: true },
  { key: 'md5', label: 'MD5', width: 100, visible: true, order: 5, canHide: true, canResize: true, canReorder: true },
  { key: 'materialName', label: '所属物料', width: 120, visible: true, order: 6, canHide: true, canResize: true, canReorder: true },
  { key: 'status', label: '状态', width: 60, visible: true, order: 7, canHide: true, canResize: true, canReorder: true },
  { key: 'createdAt', label: '上传时间', width: 130, visible: true, order: 8, canHide: true, canResize: true, canReorder: true },
  { key: 'creator', label: '上传人', width: 70, visible: true, order: 9, canHide: true, canResize: true, canReorder: true },
  { key: 'actions', label: '操作', width: 130, visible: true, order: 10, canHide: false, canResize: false, canReorder: false },
];

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
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
};

// =============================================================================
// 图纸管理主页面
// =============================================================================
export default function DrawingPage() {
  // 数据状态
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // 搜索筛选
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFields, setSearchFields] = useState({ fileName: true, materialName: true });
  const [filterType, setFilterType] = useState('');

  // 列配置
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // 上传
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [matchedMaterials, setMatchedMaterials] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [materialSearchKeyword, setMaterialSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // MD5重复检测
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ existingFile: any; material: any; duplicateFile: File } | null>(null);
  const [pendingDrawingId, setPendingDrawingId] = useState<number | null>(null);

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
  const [isDetailModalMaximized, setIsDetailModalMaximized] = useState(false);

  // BOM子件结构
  const [materialBomTree, setMaterialBomTree] = useState<any[]>([]);
  const [loadingBomTree, setLoadingBomTree] = useState(false);
  const [detailExpandedKeys, setDetailExpandedKeys] = useState<Set<string>>(new Set());
  const [detailColumnWidths, setDetailColumnWidths] = useState({
    materialName: 200, internalCode: 100, drawingCode: 100, drawingNo: 60,
    materialType: 60, quantity: 60, bomRemark: 100, operation: 80,
  });
  const [detailResizingColumn, setDetailResizingColumn] = useState<string | null>(null);
  const [detailResizeStartX, setDetailResizeStartX] = useState(0);
  const [detailResizeStartWidth, setDetailResizeStartWidth] = useState(0);

  // ===========================================================================
  // API 请求封装
  // ===========================================================================
  const fetchApi = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const res = await fetch(url, { ...options, headers: { ...options.headers, Authorization: `Bearer ${token}` } });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return { code: 500, message: '响应解析失败' }; }
  };

  // 存储配置（从存储管理读取允许的文件类型）
  const [allowedFileTypes, setAllowedFileTypes] = useState<string>('.pdf,.dwg,.dxf,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.tif,.zip,.rar,.7z');

  // 从存储管理获取允许的文件类型（优先使用"图纸存储"配置）
  useEffect(() => {
    fetchApi('/api/system/storage-config')
      .then((res: any) => {
        if (res?.code === 200 && Array.isArray(res.data) && res.data.length > 0) {
          // 优先查找"图纸存储"配置
          const drawingStorage = res.data.find((c: any) => c.storageName === '图纸存储');
          const target = drawingStorage || res.data.find((c: any) => c.isDefault) || res.data[0];
          if (target?.fileTypes) {
            const types = target.fileTypes
              .split(',')
              .map((t: string) => '.' + t.trim().toLowerCase().replace(/^\./, ''))
              .filter((t: string) => t.length > 1);
            if (types.length > 0) {
              setAllowedFileTypes(types.join(','));
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  // ===========================================================================
  // 列配置管理
  // ===========================================================================
  const visibleColumns = useMemo(() => {
    return [...columns].filter(col => col.visible && col.key !== 'checkbox' && col.key !== 'actions').sort((a, b) => a.order - b.order);
  }, [columns]);

  const moveColumn = (fromKey: string, toKey: string) => {
    const fromCol = columns.find(c => c.key === fromKey);
    const toCol = columns.find(c => c.key === toKey);
    if (fromCol?.canReorder === false || toCol?.canReorder === false) return;
    const newColumns = [...columns];
    const fromIndex = newColumns.findIndex(c => c.key === fromKey);
    const toIndex = newColumns.findIndex(c => c.key === toKey);
    if (fromIndex === -1 || toIndex === -1) return;
    const [removed] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, removed);
    newColumns.forEach((col, index) => col.order = index);
    setColumns(newColumns);
    saveColumnConfig(newColumns);
  };

  const handleColumnResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    resizingColumn.current = columnKey;
    const column = columns.find(c => c.key === columnKey);
    if (column) { startX.current = e.clientX; startWidth.current = column.width; }
    document.addEventListener('mousemove', handleColumnResizeMove);
    document.addEventListener('mouseup', handleColumnResizeEnd);
  };
  const handleColumnResizeMove = (e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff);
    setColumns(prev => prev.map(col => col.key === resizingColumn.current ? { ...col, width: newWidth } : col));
  };
  const handleColumnResizeEnd = () => {
    if (resizingColumn.current) saveColumnConfig(columns);
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', handleColumnResizeEnd);
  };

  const saveColumnConfig = (newColumns: ColumnConfig[]) => {
    try { localStorage.setItem('drawing_columns', JSON.stringify(newColumns)); } catch {}
  };
  const loadColumnConfig = () => {
    try {
      const saved = localStorage.getItem('drawing_columns');
      if (saved) {
        const parsed = JSON.parse(saved) as ColumnConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = parsed.filter(c => DEFAULT_COLUMNS.find(d => d.key === c.key)).map(c => {
            const def = DEFAULT_COLUMNS.find(d => d.key === c.key)!;
            return { ...def, ...c };
          });
          DEFAULT_COLUMNS.forEach(def => { if (!merged.find(c => c.key === def.key)) merged.push({ ...def }); });
          merged.sort((a, b) => (a.order || 0) - (b.order || 0));
          setColumns(merged);
        }
      }
    } catch {}
  };
  const resetColumnConfig = () => { setColumns(DEFAULT_COLUMNS); setColumnsConfig(DEFAULT_COLUMNS); };
  const openColumnSettings = () => { setColumnsConfig([...columns]); setShowColumnSettings(true); };
  const saveColumnConfigFromModal = () => {
    const ordered = columnsConfig.map((col, index) => ({ ...col, order: index }));
    const merged = ordered.filter(c => DEFAULT_COLUMNS.find(d => d.key === c.key)).map(c => {
      const def = DEFAULT_COLUMNS.find(d => d.key === c.key)!;
      return { ...def, ...c };
    });
    DEFAULT_COLUMNS.forEach(def => { if (!merged.find(c => c.key === def.key)) merged.push({ ...def }); });
    setColumns(merged);
    saveColumnConfig(merged);
    setShowColumnSettings(false);
  };

  useEffect(() => { loadColumnConfig(); }, []);

  // ===========================================================================
  // 数据加载
  // ===========================================================================
  const fetchDrawings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());
      if (globalSearch) params.set('search', globalSearch);
      if (filterType) params.set('type', filterType);
      const data = await fetchApi(`/api/drawing?${params}`);
      if (data.code === 200) { setDrawings(data.data.list); setTotal(data.data.total); }
      else { toast.error(data.message || '加载失败'); }
    } catch (err: any) { toast.error('加载失败: ' + err.message); }
    finally { setLoading(false); }
  }, [page, pageSize, globalSearch, filterType]);

  useEffect(() => { fetchDrawings(); }, [fetchDrawings]);

  // ===========================================================================
  // 物料详情
  // ===========================================================================
  const fetchMaterialDetail = useCallback(async (materialId: number) => {
    setMaterialDetailLoading(true);
    setMaterialBomTree([]);
    setDetailExpandedKeys(new Set());
    try {
      const data = await fetchApi(`/api/bom/material/${materialId}`);
      if (data.code === 200) {
        setMaterialDetail(data.data);
        setShowMaterialDetail(true);
        setLoadingBomTree(true);
        try {
          const treeData = await fetchApi(`/api/bom/${materialId}/bom-tree`);
          if (treeData.code === 200 && treeData.data) {
            const bomTree = treeData.data.bomTree || [];
            setMaterialBomTree(bomTree);
            const allKeys = collectAllNodeKeys(bomTree);
            setDetailExpandedKeys(new Set(allKeys));
          }
        } catch (e) { console.error('加载BOM子树失败', e); }
        finally { setLoadingBomTree(false); }
      } else { toast.error(data.message || '获取物料详情失败'); }
    } catch (err: any) { toast.error('获取物料详情失败: ' + err.message); }
    finally { setMaterialDetailLoading(false); }
  }, []);

  // BOM子件辅助函数
  const collectAllNodeKeys = (items: any[], parentKey: string = ''): string[] => {
    const keys: string[] = [];
    items.forEach((item: any) => {
      const nodeKey = `detail_node_${item.materialId || item.id}`;
      const fullKey = parentKey ? `${parentKey}_${nodeKey}` : nodeKey;
      keys.push(fullKey);
      if (item.children && item.children.length > 0) keys.push(...collectAllNodeKeys(item.children, fullKey));
    });
    return keys;
  };
  const toggleDetailExpand = (key: string) => {
    setDetailExpandedKeys(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };
  const handleDetailColumnResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault(); e.stopPropagation();
    setDetailResizingColumn(columnKey); setDetailResizeStartX(e.clientX);
    setDetailResizeStartWidth(detailColumnWidths[columnKey as keyof typeof detailColumnWidths] || 100);
  };
  useEffect(() => {
    if (!detailResizingColumn) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(40, Math.min(400, detailResizeStartWidth + (e.clientX - detailResizeStartX)));
      setDetailColumnWidths(prev => ({ ...prev, [detailResizingColumn]: newWidth }));
    };
    const handleMouseUp = () => { setDetailResizingColumn(null); };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, [detailResizingColumn, detailResizeStartX, detailResizeStartWidth]);

  const detailLevelColors = ['bg-white', 'bg-blue-50', 'bg-green-50', 'bg-yellow-50', 'bg-purple-50', 'bg-pink-50'];
  const detailLevelFontSizes = ['text-sm', 'text-sm', 'text-xs', 'text-xs', 'text-xs', 'text-xs'];
  const detailLevelPadding = ['py-2.5', 'py-2', 'py-1.5', 'py-1.5', 'py-1', 'py-1'];

  const renderBomTreeRows = (items: any[], level: number = 0, parentKey: string = '') => {
    const levelIndex = Math.min(level, detailLevelColors.length - 1);
    return items.map((item: any) => {
      const nodeKey = `detail_node_${item.materialId || item.id}`;
      const fullKey = parentKey ? `${parentKey}_${nodeKey}` : nodeKey;
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = detailExpandedKeys.has(fullKey);
      const bgColor = detailLevelColors[levelIndex];
      const fontSize = detailLevelFontSizes[levelIndex];
      const paddingY = detailLevelPadding[levelIndex];
      return (
        <div key={fullKey}>
          <div className={`flex items-center border-b border-gray-200 hover:brightness-95 transition-all ${bgColor}`} style={{ paddingLeft: `${level * 20 + 8}px` }}>
            <div className="w-8 flex-shrink-0 flex items-center justify-center">
              {hasChildren ? (
                <button onClick={() => toggleDetailExpand(fullKey)} className="p-1 hover:bg-black/5 rounded transition-colors cursor-pointer">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                </button>
              ) : <span className="w-4 h-4" />}
            </div>
            <div className={`flex-1 flex items-center ${paddingY} ${fontSize} min-w-0`}>
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.materialName}px` }}><span className="font-medium text-gray-800 truncate">{item.materialName || '-'}</span></div>
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.internalCode}px` }}><span className="text-gray-600 font-mono truncate">{item.internalCode || '-'}</span></div>
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.drawingCode}px` }}><span className="text-gray-600 truncate">{item.drawingCode || '-'}</span></div>
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.drawingNo}px` }}><span className="text-gray-600 truncate">{item.drawingNo || '-'}</span></div>
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.materialType}px` }}><span className="text-gray-600 truncate">{typeLabelMap[item.materialType] || item.materialType || '-'}</span></div>
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.quantity}px` }}><span className="text-gray-800 font-medium truncate">{item.quantity || '-'}</span></div>
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.bomRemark}px` }}><span className="text-gray-500 truncate">{item.bomRemark || '-'}</span></div>
              <div className="flex-shrink-0 flex items-center justify-center px-1" style={{ width: `${detailColumnWidths.operation}px` }}>
                <button className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer" title="查看图纸"><FileText className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
          {hasChildren && isExpanded && renderBomTreeRows(item.children, level + 1, fullKey)}
        </div>
      );
    });
  };

  const handleExportBomCsv = () => {
    if (!materialDetail || materialBomTree.length === 0) return;
    const fileName = `${materialDetail.drawingCode || ''}_${materialDetail.internalCode || ''}_${materialDetail.materialName || ''}.csv`;
    const headers = ['层级', '物料名称', '内部编码', '图纸编码', '图号', '类型', '用量', 'BOM备注'];
    const rows: string[][] = [];
    const collectRows = (nodes: any[], prefix: string) => {
      nodes.forEach((node, index) => {
        const num = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
        rows.push([num, node.materialName || '', node.internalCode || '', node.drawingCode || '', node.drawingNumber || '', typeLabelMap[node.materialType] || node.materialType || '', String(node.quantity || ''), node.bomRemark || '']);
        if (node.children?.length > 0) collectRows(node.children, num);
      });
    };
    collectRows(materialBomTree, '');
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => cell.includes(',') || cell.includes('"') || cell.includes('\n') ? `"${cell.replace(/"/g, '""')}"` : cell).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = fileName; link.click();
    window.URL.revokeObjectURL(url);
  };

  // ===========================================================================
  // 文件上传
  // ===========================================================================
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadProgress(`正在上传 ${files.length} 个文件...`);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
      const data = await fetchApi('/api/drawing/batch', { method: 'POST', body: formData });
      if (data.code === 200) {
        const { results, successCount, failCount } = data.data;
        toast.success(`上传成功: ${successCount} 个，失败: ${failCount} 个`);
        if (results) results.forEach((r: any) => { if (!r.success) toast.error(`${r.fileName}: ${r.message}`); });
        fetchDrawings();
      } else { toast.error(data.message || '上传失败'); }
    } catch (err: any) { toast.error('上传失败: ' + err.message); }
    finally { setUploading(false); setUploadProgress(''); }
  };

  const handleSingleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = allowedFileTypes;
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadFile(file);
      setUploading(true);
      setUploadProgress(`正在上传 "${file.name}"...`);
      try {
        // Step 1: 先上传文件（检查MD5）
        const formData = new FormData();
        formData.append('file', file);
        const data = await fetchApi('/api/drawing/upload', { method: 'POST', body: formData });
        if (data.code === 200) {
          // 文件上传成功（新文件）
          const drawingId = data.data.id;
          setPendingDrawingId(drawingId);
          toast.success('上传成功');
          fetchDrawings();
          // Step 2: 再匹配物料
          setUploadProgress(`正在匹配物料...`);
          const matchData = await fetchApi('/api/drawing/match-material', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name }) });
          if (matchData.code === 200) {
            const materials = matchData.data;
            setMatchedMaterials(materials);
            if (materials.length === 0) {
              // 无匹配，弹出物料选择对话框
              setShowMaterialDialog(true);
              setUploading(false);
            } else if (materials.length === 1) {
              // 唯一匹配，自动关联
              const updateData = await fetchApi(`/api/drawing/${drawingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ materialId: materials[0].id }) });
              if (updateData.code === 200) {
                toast.success(`已自动关联物料: ${materials[0].materialName}`);
                fetchDrawings();
              }
            } else {
              // 多个匹配，弹出选择对话框
              setShowMaterialDialog(true);
              setUploading(false);
            }
          }
        } else if (data.code === 409) {
          // MD5重复，显示重复信息弹窗（不弹出物料选择）
          setDuplicateInfo({ existingFile: data.data.existingFile, material: data.data.material, duplicateFile: file });
          setShowDuplicateDialog(true);
          setUploading(false);
        } else {
          toast.error(data.message || '上传失败');
          setUploading(false);
        }
      } catch (err: any) { toast.error('上传失败: ' + err.message); setUploading(false); }
    };
    input.click();
  };

  const doUpload = async (file: File, materialId: number | null) => {
    setUploading(true); setUploadProgress('正在上传...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (materialId) formData.append('materialId', materialId.toString());
      const data = await fetchApi('/api/drawing/upload', { method: 'POST', body: formData });
      if (data.code === 200) { toast.success('上传成功' + (data.data.materialName ? `，已关联物料: ${data.data.materialName}` : '')); fetchDrawings(); }
      else if (data.code === 409) {
        // MD5重复，显示对话框
        setDuplicateInfo({ existingFile: data.data.existingFile, material: data.data.material, duplicateFile: file });
        setShowDuplicateDialog(true);
      }
      else { toast.error(data.message || '上传失败'); }
    } catch (err: any) { toast.error('上传失败: ' + err.message); }
    finally { setUploading(false); setUploadProgress(''); setUploadFile(null); setSelectedMaterial(null); setMatchedMaterials([]); setShowMaterialDialog(false); }
  };

  const handleSearchMaterial = async () => {
    if (!materialSearchKeyword.trim()) return;
    setSearching(true);
    try { const data = await fetchApi(`/api/drawing/materials?keyword=${encodeURIComponent(materialSearchKeyword)}`); if (data.code === 200) setSearchResults(data.data); }
    catch { toast.error('搜索失败'); }
    finally { setSearching(false); }
  };

  const handleSelectMaterial = async (material: any) => {
    setSelectedMaterial(material); setShowMaterialDialog(false);
    if (pendingDrawingId) {
      setUploadProgress('正在关联物料...');
      try {
        const data = await fetchApi(`/api/drawing/${pendingDrawingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ materialId: material.id }) });
        if (data.code === 200) {
          toast.success(`已关联物料: ${material.materialName}`);
          fetchDrawings();
        } else {
          toast.error(data.message || '关联物料失败');
        }
      } catch (err: any) {
        toast.error('关联物料失败: ' + err.message);
      } finally {
        setPendingDrawingId(null);
        setUploadProgress('');
      }
    }
  };

  // ===========================================================================
  // 删除 / 批量下载 / 版本 / 预览
  // ===========================================================================
  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此图纸吗？')) return;
    try { const data = await fetchApi(`/api/drawing/${id}`, { method: 'DELETE' }); if (data.code === 200) { toast.success('删除成功'); fetchDrawings(); } else toast.error(data.message || '删除失败'); }
    catch (err: any) { toast.error('删除失败: ' + err.message); }
  };

  const handleDownloadSingle = async (drawing: Drawing) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/drawing/download/${drawing.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = drawing.fileName; a.click();
        window.URL.revokeObjectURL(url);
        toast.success('下载成功');
      } else {
        const text = await res.text();
        try { const err = JSON.parse(text); toast.error(err.message || '下载失败'); } catch { toast.error('下载失败'); }
      }
    } catch (err: any) { toast.error('下载失败: ' + err.message); }
  };

  const handleBatchDownload = async () => {
    if (selectedIds.length === 0) { toast.error('请先选择要下载的图纸'); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/drawing/download', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ids: selectedIds }) });
      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('application/zip')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `图纸_${new Date().toISOString().slice(0, 10)}.zip`; a.click();
        window.URL.revokeObjectURL(url);
        toast.success('下载成功');
      } else {
        const text = await res.text();
        try { const err = JSON.parse(text); toast.error(err.message || '下载失败'); } catch { toast.error('下载失败'); }
      }
    } catch (err: any) { toast.error('下载失败: ' + err.message); }
  };

  const handleShowVersions = async (drawing: Drawing) => {
    setVersionDraw(drawing); setShowVersionModal(true);
    try { const data = await fetchApi(`/api/drawing/${drawing.id}/version`); if (data.code === 200) setVersions(data.data); else setVersions([]); }
    catch { setVersions([]); }
  };

  const handlePreview = (drawing: Drawing) => { setPreviewFile(drawing); setPreviewUrl(`/api/drawing/preview/${drawing.id}`); };

  // ===========================================================================
  // 选择 / 搜索
  // ===========================================================================
  const toggleSelect = (id: number) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  useEffect(() => {
    if (selectAll && drawings.length > 0) setSelectedIds(drawings.filter(d => d.status === 'active').map(d => d.id));
    else if (!selectAll) setSelectedIds([]);
  }, [selectAll, drawings]);

  const toggleSearchField = (field: string) => { setSearchFields(prev => ({ ...prev, [field]: !prev[field as keyof typeof prev] })); };
  const clearFilters = () => { setGlobalSearch(''); setFilterType(''); setPage(1); };

  // ===========================================================================
  // 渲染单元格内容
  // ===========================================================================
  const renderCellContent = (key: string, drawing: Drawing) => {
    switch (key) {
      case 'fileName':
        return (
          <div className="flex items-center gap-1.5 truncate cursor-pointer group" onClick={() => handleDownloadSingle(drawing)} title="点击下载文件">
            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-blue-600 group-hover:text-blue-800 truncate underline decoration-transparent group-hover:decoration-blue-600 transition-all" title={drawing.fileName}>{drawing.fileName}</span>
          </div>
        );
      case 'fileSize':
        return <span className="text-gray-600 truncate">{formatFileSize(drawing.fileSize)}</span>;
      case 'drawingType':
        return (
          <span className={`px-1.5 py-0.5 rounded text-xs ${
            drawing.drawingType === '设计图' ? 'bg-blue-100 text-blue-700' :
            drawing.drawingType === '生产图' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>{drawing.drawingType || '-'}</span>
        );
      case 'version':
        return <span className="font-mono text-xs text-gray-600 truncate">{drawing.version}</span>;
      case 'md5':
        return <span className="font-mono text-xs text-gray-400 truncate max-w-[120px]" title={drawing.md5}>{drawing.md5 || '-'}</span>;
      case 'materialName':
        return drawing.material?.materialName ? (
          <button onClick={() => fetchMaterialDetail(drawing.materialId!)} className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate text-left">
            {drawing.material.materialName}
          </button>
        ) : <span className="text-gray-400 text-xs">-</span>;
      case 'status':
        return (
          <span className={`px-1.5 py-0.5 rounded text-xs ${drawing.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {drawing.status === 'active' ? '正常' : '停用'}
          </span>
        );
      case 'createdAt':
        return <span className="text-gray-600 truncate text-xs">{formatDate(drawing.createdAt)}</span>;
      case 'creator':
        return <span className="text-gray-600 truncate">{drawing.creator?.realName || '-'}</span>;
      default:
        return '-';
    }
  };

  // ===========================================================================
  // 渲染
  // ===========================================================================
  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">图纸管理</h2>
          </div>
          <div className="flex items-center gap-2">
            {uploadProgress && <span className="text-sm text-blue-600 mr-2">{uploadProgress}</span>}
            <label className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Upload className="w-4 h-4" />
              批量导入
              <input type="file" multiple accept={allowedFileTypes} className="hidden" onChange={e => handleUpload(e.target.files)} disabled={uploading} />
            </label>
            <button onClick={handleSingleUpload} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer" disabled={uploading}>
              <Plus className="w-4 h-4" />
              上传图纸
            </button>
            <button onClick={handleBatchDownload} disabled={selectedIds.length === 0} className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg cursor-pointer ${selectedIds.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              <Download className="w-4 h-4" />
              打包下载 ({selectedIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* 搜索和筛选栏 */}
      <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">全局搜索：</span>
            <input type="text" placeholder="输入关键词搜索..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchDrawings()} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-44" />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input type="checkbox" checked={searchFields.fileName} onChange={() => toggleSearchField('fileName')} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
              文件名
            </label>
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input type="checkbox" checked={searchFields.materialName} onChange={() => toggleSearchField('materialName')} className="w-4 h-4 text-blue-600 rounded border-gray-300" />
              所属物料
            </label>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">列筛选：</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">类型：</span>
              <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="px-2 py-1 border border-gray-300 rounded text-sm">
                <option value="">全部</option>
                <option value="设计图">设计图</option>
                <option value="生产图">生产图</option>
              </select>
            </div>
          </div>
          {(globalSearch || filterType) && (
            <button onClick={clearFilters} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded cursor-pointer">清空筛选</button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        {drawings.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FolderTree className="w-12 h-12 mb-2" />
            <p>暂无图纸数据</p>
            <p className="text-sm">点击"上传图纸"或"批量导入"添加</p>
          </div>
        ) : (
          <div className="min-w-0">
            {/* 表头 */}
            <div className="sticky top-0 bg-gray-100 border-b border-gray-300 z-10">
              <div className="flex items-center text-xs font-semibold text-gray-700 py-2.5 px-2">
                {/* checkbox */}
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  <input type="checkbox" checked={selectAll} onChange={e => setSelectAll(e.target.checked)} className="rounded border-gray-300 cursor-pointer" />
                </div>
                {/* 数据列 */}
                <div className="flex-1 flex items-center min-w-0">
                  {visibleColumns.map((col) => {
                    const column = DEFAULT_COLUMNS.find(c => c.key === col.key);
                    if (!column) return null;
                    const width = col.width || column.width;
                    const canDrag = col.canReorder !== false;
                    const canResize = col.canResize !== false;
                    return (
                      <div key={col.key} data-column-key={col.key} className="flex-shrink-0 truncate px-1 relative group" style={{ width: `${width}px` }}
                        draggable={canDrag}
                        onDragStart={(e) => { if (!canDrag) return; e.dataTransfer.setData('columnKey', col.key); e.dataTransfer.effectAllowed = 'move'; }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                        onDrop={(e) => { e.preventDefault(); if (!canDrag) return; const dragKey = e.dataTransfer.getData('columnKey'); if (dragKey && dragKey !== col.key) moveColumn(dragKey, col.key); }}
                      >
                        <span>{column.label}</span>
                        {canResize && <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors" onMouseDown={(e) => handleColumnResizeStart(e, col.key)} />}
                      </div>
                    );
                  })}
                </div>
                {/* 列设置按钮 */}
                <button onClick={openColumnSettings} className="flex-shrink-0 ml-2 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer" title="列设置">
                  <Settings size={16} />
                </button>
              </div>
            </div>

            {/* 数据行 */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">加载中...</div>
            ) : (
              drawings.map((drawing) => (
                <div key={drawing.id} className={`flex items-center border-b border-gray-200 hover:bg-gray-50 transition-all ${selectedIds.includes(drawing.id) ? 'bg-blue-50' : ''}`}>
                  {/* checkbox */}
                  <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    <input type="checkbox" checked={selectedIds.includes(drawing.id)} onChange={() => toggleSelect(drawing.id)} disabled={drawing.status !== 'active'} className="rounded border-gray-300 cursor-pointer" />
                  </div>
                  {/* 数据列 */}
                  <div className="flex-1 flex items-center py-2.5 text-sm min-w-0">
                    {visibleColumns.map((col) => {
                      const column = DEFAULT_COLUMNS.find(c => c.key === col.key);
                      if (!column) return null;
                      const width = col.width || column.width;
                      return (
                        <div key={col.key} className="flex-shrink-0 truncate px-1" style={{ width: `${width}px` }}>
                          {renderCellContent(col.key, drawing)}
                        </div>
                      );
                    })}
                  </div>
                  {/* 操作列 */}
                  <div className="w-32 flex-shrink-0 flex items-center justify-center gap-0.5 px-1">
                    <button onClick={() => handlePreview(drawing)} className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors cursor-pointer" title="预览"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handleShowVersions(drawing)} className="p-1 text-indigo-600 hover:bg-indigo-100 rounded transition-colors cursor-pointer" title="版本历史"><FileText className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(drawing.id)} className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors cursor-pointer" title="删除"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-500">共 {total} 条</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">上一页</button>
            <span className="text-sm text-gray-600">{page} / {Math.ceil(total / pageSize)}</span>
            <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">下一页</button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 列设置弹窗 */}
      {/* ========================================================================= */}
      {showColumnSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">列设置</h3>
              <button onClick={() => setShowColumnSettings(false)} className="text-gray-500 hover:text-gray-700 cursor-pointer">✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4"><p className="text-sm text-gray-600 mb-2">拖动调整列顺序，勾选控制列显示，点击宽度数值可调整宽度</p></div>
              <div className="space-y-2">
                {columnsConfig.map((col, index) => {
                  const isExpandColumn = col.key === 'checkbox';
                  const canDrag = col.canReorder !== false;
                  const canHide = col.canHide !== false;
                  const canResize = col.canResize !== false;
                  return (
                    <div key={col.key} draggable={canDrag}
                      onDragStart={(e) => { if (!canDrag) return; e.dataTransfer.setData('text/plain', index.toString()); }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); if (!canDrag) return; const dragIndex = parseInt(e.dataTransfer.getData('text/plain')); if (dragIndex !== index) { const newColumns = [...columnsConfig]; const [removed] = newColumns.splice(dragIndex, 1); newColumns.splice(index, 0, removed); newColumns.forEach((c, idx) => { c.order = idx; }); setColumnsConfig(newColumns); } }}
                      className={`flex items-center gap-3 p-2 bg-gray-50 rounded hover:bg-gray-100 ${canDrag ? 'cursor-move' : 'cursor-default'}`}
                    >
                      <span className={`text-gray-400 ${canDrag ? '' : 'opacity-30'}`}>⋮⋮</span>
                      {canHide ? (
                        <input type="checkbox" checked={col.visible} onChange={(e) => { const newColumns = [...columnsConfig]; newColumns[index] = { ...col, visible: e.target.checked }; setColumnsConfig(newColumns); }} className="w-4 h-4 cursor-pointer" />
                      ) : <div className="w-4 h-4" />}
                      <span className="flex-1">{col.label || '(选择列)'}</span>
                      {canResize && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">宽度:</span>
                          <input type="number" value={col.width} onChange={(e) => { const newWidth = parseInt(e.target.value) || 80; const newColumns = [...columnsConfig]; newColumns[index] = { ...col, width: Math.max(60, Math.min(400, newWidth)) }; setColumnsConfig(newColumns); }} className="w-16 px-2 py-1 text-sm border rounded text-right" min={60} max={400} />
                          <span className="text-sm text-gray-500">px</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t flex justify-between">
              <button onClick={resetColumnConfig} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded cursor-pointer">恢复默认</button>
              <div className="flex gap-2">
                <button onClick={() => setShowColumnSettings(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded cursor-pointer">取消</button>
                <button onClick={saveColumnConfigFromModal} className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded cursor-pointer">保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 预览弹窗 */}
      {/* ========================================================================= */}
      {previewUrl && previewFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setPreviewUrl(null); setPreviewFile(null); }}>
          <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">图纸预览 - {previewFile.fileName}</h3>
              <button onClick={() => { setPreviewUrl(null); setPreviewFile(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer">&times;</button>
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
              <button onClick={() => setShowVersionModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none cursor-pointer">&times;</button>
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
                        <td className="px-3 py-2"><span className="font-mono text-xs">{v.version}</span>{v.isLatest && <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">最新</span>}</td>
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
              <h3 className="text-lg font-semibold">{matchedMaterials.length > 0 ? '选择关联物料' : '搜索关联物料'}</h3>
              <button onClick={() => setShowMaterialDialog(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              {matchedMaterials.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-500 mb-3">文件名与以下物料匹配，请选择要关联的物料：</p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {matchedMaterials.map((m: any) => (
                      <div key={m.id} className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => handleSelectMaterial(m)}>
                        <div className="font-medium text-sm">{m.materialName}</div>
                        <div className="text-xs text-gray-500 mt-1">内部编码: {m.internalCode || '-'} | 图纸编码: {m.drawingCode || '-'} | 图号: {m.drawingNo || '-'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-400 mb-2">以上都不匹配？搜索其他物料：</p>
                    <div className="flex gap-2">
                      <input type="text" value={materialSearchKeyword} onChange={e => setMaterialSearchKeyword(e.target.value)} placeholder="输入物料名称/编码搜索..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onKeyDown={e => e.key === 'Enter' && handleSearchMaterial()} />
                      <button onClick={handleSearchMaterial} disabled={searching} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 cursor-pointer">{searching ? '搜索中...' : '搜索'}</button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                        {searchResults.map((m: any) => (
                          <div key={m.id} className="p-2 border rounded-lg hover:bg-blue-50 cursor-pointer text-sm" onClick={() => handleSelectMaterial(m)}>{m.materialName} ({m.internalCode || m.drawingCode || '-'})</div>
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
                    <button onClick={handleSearchMaterial} disabled={searching} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 cursor-pointer">{searching ? '搜索中...' : '搜索'}</button>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {searchResults.map((m: any) => (
                        <div key={m.id} className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors" onClick={() => handleSelectMaterial(m)}>
                          <div className="font-medium text-sm">{m.materialName}</div>
                          <div className="text-xs text-gray-500 mt-1">内部编码: {m.internalCode || '-'} | 图纸编码: {m.drawingCode || '-'} | 图号: {m.drawingNo || '-'}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">输入关键词搜索物料，也可以 <button onClick={() => { setShowMaterialDialog(false); if (uploadFile) doUpload(uploadFile, null); }} className="text-blue-600 hover:underline cursor-pointer">不关联物料直接上传</button></p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MD5重复检测弹窗 */}
      {/* ========================================================================= */}
      {showDuplicateDialog && duplicateInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDuplicateDialog(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[500px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-yellow-50">
              <h3 className="text-lg font-semibold text-yellow-800">文件已存在</h3>
              <button onClick={() => setShowDuplicateDialog(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                文件 <strong>{duplicateInfo.duplicateFile.name}</strong> 的MD5与已存在的文件相同，以下是已存在的文件信息：
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">已存在文件</span>
                  <span className="font-medium">{duplicateInfo.existingFile.fileName || duplicateInfo.existingFile.file_name}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">文件大小</span>
                  <span className="font-medium">{formatFileSize(duplicateInfo.existingFile.fileSize || duplicateInfo.existingFile.file_size)}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-gray-500">版本</span>
                  <span className="font-medium">{duplicateInfo.existingFile.version || 'V1'}</span>
                </div>
                {duplicateInfo.material && (
                  <>
                    <div className="text-gray-700 font-medium mt-4 mb-1">关联物料信息：</div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-500">物料名称</span>
                      <span className="font-medium">{duplicateInfo.material.materialName}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-500">图纸编码</span>
                      <span className="font-medium">{duplicateInfo.material.drawingCode || '-'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-500">内部编码</span>
                      <span className="font-medium">{duplicateInfo.material.internalCode || '-'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-500">图号</span>
                      <span className="font-medium">{duplicateInfo.material.drawingNo || '-'}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-500">物料类型</span>
                      <span className="font-medium">{typeLabelMap[duplicateInfo.material.materialType] || duplicateInfo.material.materialType}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowDuplicateDialog(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 物料详情弹窗 */}
      {/* ========================================================================= */}
      {showMaterialDetail && materialDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white shadow-xl overflow-hidden flex flex-col ${isDetailModalMaximized ? 'inset-0 absolute w-full h-full rounded-none' : 'rounded-lg w-[95vw] max-w-[1400px] mx-auto max-h-[90vh]'}`}>
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">物料详情</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsDetailModalMaximized(!isDetailModalMaximized)} className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer" title={isDetailModalMaximized ? '还原' : '最大化'}>
                  {isDetailModalMaximized ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v2m0 8v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                  )}
                </button>
                <button onClick={() => { setShowMaterialDetail(false); setIsDetailModalMaximized(false); setDetailExpandedKeys(new Set()); }} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className={`p-6 overflow-y-auto ${isDetailModalMaximized ? 'flex-1' : 'max-h-[calc(90vh-120px)]'}`}>
              {materialDetailLoading ? (
                <div className="text-center py-8 text-sm text-gray-400">加载中...</div>
              ) : (
                <>
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2 pb-1 border-b">物料信息<span className="font-bold text-red-600 ml-2">(所属客户：{materialDetail.customer?.customerName || '无'})</span></h4>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm border-collapse">
                        <tbody>
                          <tr>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 w-20 border border-gray-200">物料名称</td>
                            <td className="py-1.5 px-2 border border-gray-200 font-medium">{materialDetail.materialName || '-'}</td>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 w-20 border border-gray-200">图纸编码</td>
                            <td className="py-1.5 px-2 border border-gray-200">{materialDetail.drawingCode || '-'}</td>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 w-20 border border-gray-200">内部编码</td>
                            <td className="py-1.5 px-2 border border-gray-200 font-mono">{materialDetail.internalCode || '-'}</td>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 w-16 border border-gray-200">图号</td>
                            <td className="py-1.5 px-2 border border-gray-200">{materialDetail.drawingNo || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">物料类型</td>
                            <td className="py-1.5 px-2 border border-gray-200">{typeLabelMap[materialDetail.materialType] || materialDetail.materialType || '-'}</td>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">重量</td>
                            <td className="py-1.5 px-2 border border-gray-200">{materialDetail.weight ? `${materialDetail.weight} kg` : '-'}</td>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">单位</td>
                            <td className="py-1.5 px-2 border border-gray-200">{materialDetail.unit || '-'}</td>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">规格</td>
                            <td className="py-1.5 px-2 border border-gray-200">{materialDetail.spec || '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">创建者</td>
                            <td className="py-1.5 px-2 border border-gray-200">{materialDetail.createdBy || '-'}</td>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">创建时间</td>
                            <td className="py-1.5 px-2 border border-gray-200">{materialDetail.createdAt ? new Date(materialDetail.createdAt).toLocaleDateString('zh-CN') : '-'}</td>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">修改者</td>
                            <td className="py-1.5 px-2 border border-gray-200">{materialDetail.modifiedBy || '-'}</td>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">修改时间</td>
                            <td className="py-1.5 px-2 border border-gray-200">{materialDetail.updatedAt ? new Date(materialDetail.updatedAt).toLocaleDateString('zh-CN') : '-'}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">物料备注</td>
                            <td className="py-1.5 px-2 border border-gray-200 whitespace-pre-wrap" colSpan={7}>{materialDetail.remark || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {(materialBomTree.length > 0 || loadingBomTree) && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2 pb-1 border-b">
                        <h4 className="text-sm font-semibold text-gray-600">BOM子件结构</h4>
                        <button onClick={handleExportBomCsv} disabled={materialBomTree.length === 0} className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors cursor-pointer"><Download className="w-3 h-3" />导出BOM</button>
                      </div>
                      {loadingBomTree ? <div className="text-center py-4 text-sm text-gray-400">加载中...</div> : (
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="flex items-center bg-gray-50 border-b border-gray-200 py-2 pl-8 select-none">
                            {Object.entries({ materialName: '物料名称', internalCode: '内部编码', drawingCode: '图纸编码', drawingNo: '图号', materialType: '类型', quantity: '用量', bomRemark: 'BOM备注' }).map(([key, label]) => (
                              <div key={key} className="flex-shrink-0 px-1 relative group" style={{ width: `${detailColumnWidths[key as keyof typeof detailColumnWidths]}px` }}>
                                <span className="font-medium text-gray-600 truncate">{label}</span>
                                <div className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300 z-10" onMouseDown={(e) => handleDetailColumnResizeStart(e, key)} />
                              </div>
                            ))}
                            <div className="flex-shrink-0 px-1 flex items-center justify-center" style={{ width: `${detailColumnWidths.operation}px` }}><span className="font-medium text-gray-600">操作</span></div>
                          </div>
                          {renderBomTreeRows(materialBomTree, 0)}
                        </div>
                      )}
                    </div>
                  )}
                  {materialDetail.drawings && materialDetail.drawings.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2 pb-1 border-b">关联图纸</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="py-2 px-3 text-left text-gray-600 font-medium border border-gray-200">文件名称</th>
                              <th className="py-2 px-3 text-left text-gray-600 font-medium border border-gray-200">版本</th>
                              <th className="py-2 px-3 text-left text-gray-600 font-medium border border-gray-200">文件大小</th>
                              <th className="py-2 px-3 text-left text-gray-600 font-medium border border-gray-200">上传时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {materialDetail.drawings.map((d: any) => (
                              <tr key={d.id} className="hover:bg-gray-50">
                                <td className="py-1.5 px-3 border border-gray-200 text-blue-600 cursor-pointer hover:underline" onClick={() => handleDownloadSingle(d)}>{d.fileName}</td>
                                <td className="py-1.5 px-3 border border-gray-200">{d.version}</td>
                                <td className="py-1.5 px-3 border border-gray-200">{d.fileSize ? formatFileSize(d.fileSize) : '-'}</td>
                                <td className="py-1.5 px-3 border border-gray-200">{d.createdAt ? new Date(d.createdAt).toLocaleString('zh-CN') : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button onClick={() => { setShowMaterialDetail(false); setIsDetailModalMaximized(false); setDetailExpandedKeys(new Set()); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded cursor-pointer">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}