'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Plus, Upload, Download, ChevronRight, ChevronDown, FileText, Edit2, Trash2,
  X, Save, AlertCircle, CheckCircle, RefreshCw, FolderTree, Eye, DownloadCloud, Settings2, Layers, Settings
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface TreeNode {
  id: number;
  uuid: string;
  materialName: string;
  internalCode: string;
  drawingCode: string | null;
  drawingNo: string | null;
  materialType: string;
  quantity: number;
  remark: string | null;
  bomRemark?: string | null; // BOM备注
  levelCode: string;
  children: TreeNode[];
  _count?: { children: number };
  hasDrawing?: boolean;
  processId?: number | null;
  bomItemId?: number; // BOM关系ID，用于唯一标识父子关系
  parentBomItemId?: number | null; // 父BOM关系ID（用于判断是否有父件）
  groupId?: number | null;
  customerGroupName?: string | null;
  unit?: string | null;
  spec?: string | null;
  weight?: number | null; // 重量
  // 创建者和修改者
  bomCreatorName?: string | null;
  bomModifierName?: string | null;
  materialCreatorName?: string | null;
  materialModifierName?: string | null;
  // 创建者和修改者 ID
  bomCreatorId?: number | null;
  bomModifierId?: number | null;
  materialCreatorId?: number | null;
  materialModifierId?: number | null;
  // 创建和修改时间
  bomCreatedAt?: string | null;
  bomUpdatedAt?: string | null;
  materialCreatedAt?: string | null;
  materialUpdatedAt?: string | null;
}

interface Material {
  id: number;
  uuid: string;
  materialName: string;
  internalCode: string;
  drawingCode: string | null;
  drawingNo: string | null;
  materialType: string;
  remark: string | null;
  customerId: number | null;
  customerName?: string;
  groupId: number | null;
  customerGroupName?: string;
  processId?: number | null;
  bomItemId?: number;
  hasChildren?: boolean;
  hasParent?: boolean;
}

interface CustomerGroup {
  id: number;
  groupCode: string;
  groupName: string;
  customerCount?: number;
}

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  customerType: string;
  groupId: number | null;
}

const materialTypeOptions = [
  { label: '零件', value: 'part' },
  { label: '组件', value: 'component' },
  { label: '原材料', value: 'material' },
  { label: '外购件', value: 'purchased' },
  { label: '标准件', value: 'standard' },
  { label: '辅材', value: 'auxiliary' },
];

// 列配置接口
interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  visible: boolean;
  order: number;
  canHide?: boolean; // 有些列不能隐藏，如操作列
  canResize?: boolean; // 有些列不能调整宽度，如展开列
  canReorder?: boolean; // 有些列不能拖动调整位置，如展开列、操作列
  textAlign?: 'left' | 'center' | 'right'; // 文本对齐方式
}

// 默认列配置
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'expand', label: '', width: 32, visible: true, order: 0, canHide: false, canResize: false, canReorder: false },
  { key: 'internalCode', label: '内部编码', width: 100, visible: true, order: 1, canHide: true, canResize: true, canReorder: true },
  { key: 'materialName', label: '名称', width: 120, visible: true, order: 2, canHide: true, canResize: true, canReorder: true },
  { key: 'drawingCode', label: '图纸编码', width: 120, visible: true, order: 3, canHide: true, canResize: true, canReorder: true },
  { key: 'drawingNo', label: '图号', width: 130, visible: true, order: 4, canHide: true, canResize: true, canReorder: true },
  { key: 'materialType', label: '物料类型', width: 60, visible: true, order: 5, canHide: true, canResize: true, canReorder: true },
  { key: 'quantity', label: '单层用量', width: 60, visible: true, order: 6, canHide: true, canResize: true, canReorder: true },
  { key: 'customerGroupName', label: '所属客户', width: 60, visible: true, order: 7, canHide: true, canResize: true, canReorder: true },
  { key: 'remark', label: '备注', width: 172, visible: true, order: 8, canHide: true, canResize: true, canReorder: true },
  { key: 'bomCreatorName', label: 'BOM创建者', width: 84, visible: false, order: 9, canHide: true, canResize: true, canReorder: true },
  { key: 'bomCreatedAt', label: 'BOM创建时间', width: 110, visible: true, order: 10, canHide: true, canResize: true, canReorder: true },
  { key: 'materialCreatorName', label: '物料创建者', width: 90, visible: false, order: 11, canHide: true, canResize: true, canReorder: true },
  { key: 'materialCreatedAt', label: '物料创建时间', width: 110, visible: true, order: 12, canHide: true, canResize: true, canReorder: true },
  { key: 'bomUpdatedAt', label: 'BOM修改时间', width: 140, visible: false, order: 13, canHide: true, canResize: true, canReorder: true },
  { key: 'materialModifierName', label: '物料修改者', width: 90, visible: false, order: 14, canHide: true, canResize: true, canReorder: true },
  { key: 'materialUpdatedAt', label: '物料修改时间', width: 140, visible: false, order: 15, canHide: true, canResize: true, canReorder: true },
  { key: 'bomModifierName', label: 'BOM修改者', width: 64, visible: false, order: 16, canHide: true, canResize: true, canReorder: true },
  { key: 'actions', label: '操作', width: 130, visible: true, order: 17, canHide: false, canResize: false, canReorder: false },
];

const typeLabelMap: Record<string, string> = {
  part: '零件',
  component: '组件',
  material: '原材料',
  purchased: '外购件',
  standard: '标准件',
  auxiliary: '辅材',
};

// 用户详情弹窗组件
function UserDetailModal({ userId, userName, onClose }: { userId: number; userName: string; onClose: () => void }) {
  const [userDetail, setUserDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetail = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/system/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.code === 200) {
          setUserDetail(data.data);
        }
      } catch (e) {
        console.error('获取用户详情失败', e);
      } finally {
        setLoading(false);
      }
    };
    fetchUserDetail();
  }, [userId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[400px] max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold">用户详情</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : userDetail ? (
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">用户名</span>
                <span className="font-medium">{userDetail.username || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">姓名</span>
                <span className="font-medium">{userDetail.realName || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">邮箱</span>
                <span className="font-medium">{userDetail.email || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">电话</span>
                <span className="font-medium">{userDetail.phone || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">部门</span>
                <span className="font-medium">{userDetail.deptName || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">状态</span>
                <span className="font-medium">
                  {userDetail.status === 'active' ? '正常' : 
                   userDetail.status === 'disabled' ? '禁用' : 
                   userDetail.status === 'locked' ? '锁定' : '-'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">创建时间</span>
                <span className="font-medium">{userDetail.createdAt ? new Date(userDetail.createdAt).toLocaleString() : '-'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">未找到用户信息</div>
          )}
        </div>
        <div className="flex justify-end px-4 py-3 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BOMManagementPage() {
  const { success, error, warning } = useToast();
  const [token, setToken] = useState<string>('');
  // 全局搜索和筛选状态
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFields, setSearchFields] = useState({
    materialName: true,
    drawingCode: true,
    internalCode: true,
    drawingNo: true,
  });
  const [filterName, setFilterName] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterGroupId, setFilterGroupId] = useState<number | null>(null);
  
  // 树形视图状态
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  // 使用唯一键标识展开状态：parentId_bomItemId，确保同一物料在不同位置可独立展开
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  
  // 用于滚动到指定物料行的ref
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const skipAutoCollapse = useRef(false); // 跳过自动折叠标记
  
  // 用户详情弹窗状态
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  
  // 列配置状态
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [columnConfigLoading, setColumnConfigLoading] = useState(false);
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);
  
  // 物料详情弹窗状态
  const [showMaterialDetailModal, setShowMaterialDetailModal] = useState(false);
  const [selectedMaterialNode, setSelectedMaterialNode] = useState<TreeNode | null>(null);
  const [materialBomTree, setMaterialBomTree] = useState<any[]>([]);
  const [loadingBomTree, setLoadingBomTree] = useState(false);
  const [isDetailModalMaximized, setIsDetailModalMaximized] = useState(false);
  // 弹窗中BOM子树的展开状态
  const [detailExpandedKeys, setDetailExpandedKeys] = useState<Set<string>>(new Set());
  
  // 弹窗中BOM子件列表的列宽配置（可拖拽调整）
  const [detailColumnWidths, setDetailColumnWidths] = useState({
    materialName: 200,
    internalCode: 100,
    drawingCode: 100,
    drawingNo: 60,
    materialType: 60,
    quantity: 60,
    bomRemark: 100,
    // 操作列固定宽度，不可调整
    operation: 130,
  });
  
  // 弹窗列宽拖拽调整相关状态
  const [detailResizingColumn, setDetailResizingColumn] = useState<string | null>(null);
  const [detailResizeStartX, setDetailResizeStartX] = useState(0);
  const [detailResizeStartWidth, setDetailResizeStartWidth] = useState(0);
  
  // 开始拖拽调整列宽
  const handleDetailColumnResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDetailResizingColumn(columnKey);
    setDetailResizeStartX(e.clientX);
    setDetailResizeStartWidth(detailColumnWidths[columnKey as keyof typeof detailColumnWidths] || 100);
  };
  
  // 拖拽过程中更新列宽
  useEffect(() => {
    if (!detailResizingColumn) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - detailResizeStartX;
      const newWidth = Math.max(40, Math.min(400, detailResizeStartWidth + delta)); // 最小40px，最大400px
      
      setDetailColumnWidths(prev => ({
        ...prev,
        [detailResizingColumn]: newWidth,
      }));
    };
    
    const handleMouseUp = () => {
      setDetailResizingColumn(null);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [detailResizingColumn, detailResizeStartX, detailResizeStartWidth]);
  
  // 弹窗中BOM子树展开/折叠切换
  const toggleDetailExpand = (key: string) => {
    setDetailExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  
  // 弹窗中的层级样式配置（与主页面一致）
  const detailLevelColors = [
    'bg-white',       // 0级：白色
    'bg-blue-50',     // 1级：浅蓝
    'bg-green-50',    // 2级：浅绿
    'bg-yellow-50',   // 3级：浅黄
    'bg-purple-50',   // 4级：浅紫
    'bg-pink-50',     // 5级：浅粉
  ];
  const detailLevelFontSizes = [
    'text-sm',        // 0级：正常
    'text-sm',        // 1级：稍小
    'text-xs',        // 2级：较小
    'text-xs',        // 3级：更小
    'text-xs',        // 4级：更小
    'text-xs',        // 5级：最小
  ];
  const detailLevelPadding = [
    'py-2.5',         // 0级：正常
    'py-2',           // 1级：稍小
    'py-1.5',         // 2级：较小
    'py-1.5',         // 3级：更小
    'py-1',           // 4级：更小
    'py-1',           // 5级：最小
  ];

  // 渲染BOM子树表格行（递归）- 样式与主BOM页面一致，支持展开/折叠
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
      
      // 构建TreeNode格式用于操作按钮
      const treeNode: TreeNode = {
        id: item.materialId || item.id,
        materialName: item.materialName || '',
        internalCode: item.internalCode || '',
        drawingCode: item.drawingCode || '',
        drawingNo: item.drawingNo || '',
        materialType: item.materialType || '',
        quantity: item.quantity || '',
        unit: item.unit || '',
        spec: item.spec || '',
        weight: item.weight ?? null,
        groupId: item.groupId || null,
        customerGroupName: item.customerGroupName || '',
        remark: item.remark || '',
        bomRemark: item.bomRemark || '',
        bomItemId: item.bomItemId || null,
        bomCreatorName: item.bomCreatorName || '',
        bomCreatedAt: item.bomCreatedAt || null,
        bomModifierName: item.bomModifierName || '',
        bomUpdatedAt: item.bomUpdatedAt || null,
        materialCreatorName: item.materialCreatorName || '',
        materialCreatedAt: item.materialCreatedAt || null,
        materialModifierName: item.materialModifierName || '',
        materialUpdatedAt: item.materialUpdatedAt || null,
        hasChildren: hasChildren,
        hasParent: true,
        children: item.children || [],
      };
      
      return (
        <div key={fullKey}>
          {/* 数据行 */}
          <div className={`flex items-center border-b border-gray-200 hover:brightness-95 transition-all ${bgColor}`}
               style={{ paddingLeft: `${level * 20 + 8}px` }}>
            {/* 展开/折叠图标 */}
            <div className="w-8 flex-shrink-0 flex items-center justify-center">
              {hasChildren ? (
                <button
                  onClick={() => toggleDetailExpand(fullKey)}
                  className="p-1 hover:bg-black/5 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className={`w-4 h-4 text-gray-500 ${level > 0 ? 'text-gray-400' : ''}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 text-gray-500 ${level > 0 ? 'text-gray-400' : ''}`} />
                  )}
                </button>
              ) : (
                <span className="w-4 h-4" />
              )}
            </div>
            
            {/* 数据列 */}
            <div className={`flex-1 flex items-center ${paddingY} ${fontSize} min-w-0`}>
              {/* 物料名称 */}
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.materialName}px` }}>
                <span className="font-medium text-gray-800 truncate">{item.materialName || '-'}</span>
              </div>
              {/* 内部编码 */}
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.internalCode}px` }}>
                <span className="text-gray-600 font-mono truncate">{item.internalCode || '-'}</span>
              </div>
              {/* 图纸编码 */}
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.drawingCode}px` }}>
                <span className="text-gray-600 truncate">{item.drawingCode || '-'}</span>
              </div>
              {/* 图号 */}
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.drawingNo}px` }}>
                <span className="text-gray-600 truncate">{item.drawingNo || '-'}</span>
              </div>
              {/* 类型 */}
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.materialType}px` }}>
                <span className="text-gray-600 truncate">{typeLabelMap[item.materialType] || item.materialType || '-'}</span>
              </div>
              {/* 用量 */}
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.quantity}px` }}>
                <span className="text-gray-800 font-medium truncate">{item.quantity || '-'}</span>
              </div>
              {/* BOM备注 */}
              <div className="flex-shrink-0 truncate px-1" style={{ width: `${detailColumnWidths.bomRemark}px` }}>
                <span className="text-gray-500 truncate">{item.bomRemark || '-'}</span>
              </div>
              
              {/* 操作列 */}
              <div className="flex-shrink-0 flex items-center justify-center gap-0.5 px-1" style={{ width: `${detailColumnWidths.operation}px` }}>
                {/* 编辑 */}
                <button
                  onClick={() => handleEditMaterial(treeNode)}
                  className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                  title="编辑"
                >
                  <Edit2 className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
                </button>
                {/* 添加子物料 */}
                <button
                  onClick={() => handleAddChildMaterial(treeNode.id, treeNode.groupId ?? null, treeNode.drawingCode || '', treeNode.materialName)}
                  className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                  title="添加子物料"
                >
                  <Plus className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
                </button>
                {/* 查看图纸 */}
                <button
                  onClick={() => {/* TODO: 查看图纸 */}}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  title="查看图纸"
                >
                  <FileText className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
                </button>
                {/* 查看工艺 */}
                <button
                  onClick={() => {/* TODO: 查看工艺 */}}
                  className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                  title="查看工艺"
                >
                  <Settings2 className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
                </button>
                {/* 删除 */}
                <button
                  onClick={() => handleDeleteMaterial(treeNode)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="删除"
                >
                  <Trash2 className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
                </button>
              </div>
            </div>
          </div>
          
          {/* 子节点 - 仅在展开时显示 */}
          {hasChildren && isExpanded && renderBomTreeRows(item.children, level + 1, fullKey)}
        </div>
      );
    });
  };

  // 收集BOM子树中所有节点的key（用于默认全部展开）
  const collectAllNodeKeys = (items: any[], parentKey: string = ''): string[] => {
    const keys: string[] = [];
    items.forEach((item: any) => {
      const nodeKey = `detail_node_${item.materialId || item.id}`;
      const fullKey = parentKey ? `${parentKey}_${nodeKey}` : nodeKey;
      keys.push(fullKey);
      if (item.children && item.children.length > 0) {
        keys.push(...collectAllNodeKeys(item.children, fullKey));
      }
    });
    return keys;
  };

  // 刷新物料详情弹窗中的BOM子树数据
  const refreshMaterialDetailBomTree = async () => {
    if (!selectedMaterialNode || !showMaterialDetailModal) return;
    
    setLoadingBomTree(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bom/${selectedMaterialNode.id}/bom-tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200 && data.data) {
        const bomTree = data.data.bomTree || [];
        setMaterialBomTree(bomTree);
        // 默认全部展开
        const allKeys = collectAllNodeKeys(bomTree);
        setDetailExpandedKeys(new Set(allKeys));
      }
    } catch (e) {
      console.error('刷新BOM子树失败', e);
    } finally {
      setLoadingBomTree(false);
    }
  };

  // 导出BOM为CSV
  const handleExportBomCsv = () => {
    if (!selectedMaterialNode || materialBomTree.length === 0) return;

    // 构建文件名：图纸编码+内部编码+物料名称
    const drawingCode = selectedMaterialNode.drawingCode || '';
    const internalCode = selectedMaterialNode.internalCode || '';
    const materialName = selectedMaterialNode.materialName || '';
    const fileName = `${drawingCode}_${internalCode}_${materialName}.csv`;

    // CSV表头
    const headers = ['层级', '物料名称', '内部编码', '图纸编码', '图号', '类型', '用量', 'BOM备注'];

    // 递归收集所有节点数据，生成位置编号层级（如1, 1.1, 1.1.1）
    const rows: string[][] = [];
    const collectRows = (nodes: any[], levelPrefix: string) => {
      nodes.forEach((node, index) => {
        // 生成层级编号：第一层为1,2,3...，子层为父编号.子序号
        const levelNumber = levelPrefix ? `${levelPrefix}.${index + 1}` : `${index + 1}`;
        rows.push([
          levelNumber,
          node.materialName || '',
          node.internalCode || '',
          node.drawingCode || '',
          node.drawingNumber || '',
          typeLabelMap[node.materialType] || node.materialType || '',
          String(node.quantity || ''),
          node.bomRemark || ''
        ]);
        if (node.children && node.children.length > 0) {
          collectRows(node.children, levelNumber);
        }
      });
    };
    collectRows(materialBomTree, '');

    // 构建CSV内容
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // 处理包含逗号或引号的单元格
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');

    // 创建Blob并下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // 从主BOM页面导出某个物料的BOM（需要先获取BOM子树数据）
  const handleExportBomFromTreeNode = async (node: TreeNode) => {
    try {
      // 获取该物料的BOM子树数据
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bom/${node.id}/bom-tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.code !== 200 || !data.data) {
        error('获取BOM数据失败');
        return;
      }

      const bomTree = data.data.bomTree || [];
      if (bomTree.length === 0) {
        error('该物料没有BOM子件');
        return;
      }

      // 构建文件名：图纸编码_内部编码_物料名称
      const drawingCode = node.drawingCode || '';
      const internalCode = node.internalCode || '';
      const materialName = node.materialName || '';
      const fileName = `${drawingCode}_${internalCode}_${materialName}.csv`;

      // CSV表头
      const headers = ['层级', '物料名称', '内部编码', '图纸编码', '图号', '类型', '用量', 'BOM备注'];

      // 递归收集所有节点数据，生成位置编号层级（如1, 1.1, 1.1.1）
      const rows: string[][] = [];
      const collectRows = (nodes: any[], levelPrefix: string) => {
        nodes.forEach((childNode, index) => {
          // 生成层级编号：第一层为1,2,3...，子层为父编号.子序号
          const levelNumber = levelPrefix ? `${levelPrefix}.${index + 1}` : `${index + 1}`;
          rows.push([
            levelNumber,
            childNode.materialName || '',
            childNode.internalCode || '',
            childNode.drawingCode || '',
            childNode.drawingNumber || '',
            typeLabelMap[childNode.materialType] || childNode.materialType || '',
            String(childNode.quantity || ''),
            childNode.bomRemark || ''
          ]);
          if (childNode.children && childNode.children.length > 0) {
            collectRows(childNode.children, levelNumber);
          }
        });
      };
      collectRows(bomTree, '');

      // 构建CSV内容
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
          // 处理包含逗号或引号的单元格
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(','))
      ].join('\n');

      // 创建Blob并下载
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      success('BOM导出成功');
    } catch (e) {
      console.error('导出BOM失败', e);
      error('导出BOM失败');
    }
  };

  // 打开物料详情弹窗
  const handleShowMaterialDetail = async (node: TreeNode) => {
    setSelectedMaterialNode(node);
    setShowMaterialDetailModal(true);
    // 加载该物料的BOM子树
    setLoadingBomTree(true);
    setMaterialBomTree([]);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/bom/${node.id}/bom-tree`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200 && data.data) {
        const bomTree = data.data.bomTree || [];
        setMaterialBomTree(bomTree);
        // 默认全部展开
        const allKeys = collectAllNodeKeys(bomTree);
        setDetailExpandedKeys(new Set(allKeys));
      }
    } catch (e) {
      console.error('加载BOM子树失败', e);
    } finally {
      setLoadingBomTree(false);
    }
  };
  
  // 弹窗中的列配置状态（编辑副本）
  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
  
  // 打开列设置弹窗时，复制当前配置
  const openColumnSettings = () => {
    setColumnsConfig([...columns]);
    setShowColumnSettings(true);
  };
  
  // 弹窗中修改列配置
  const handleColumnConfigChange = (newColumns: ColumnConfig[]) => {
    setColumnsConfig(newColumns);
  };
  
  // 保存弹窗中的列配置
  const saveColumnConfigFromModal = async () => {
    // 以 columnsConfig 为基础（保留用户修改的顺序和配置）
    // 首先根据 columnsConfig 的数组顺序更新 order 属性
    const orderedColumns = columnsConfig.map((col, index) => ({
      ...col,
      order: index
    }));
    
    // 合并 DEFAULT_COLUMNS 中的 canReorder/canResize/canHide 属性
    // 同时过滤掉 DEFAULT_COLUMNS 中不存在的列（如已删除的旧列）
    const mergedColumns = orderedColumns
      .filter(configCol => DEFAULT_COLUMNS.find(d => d.key === configCol.key))
      .map(configCol => {
        const defaultCol = DEFAULT_COLUMNS.find(d => d.key === configCol.key);
        if (defaultCol) {
          return {
            ...configCol,
            canReorder: defaultCol.canReorder,
            canResize: defaultCol.canResize,
            canHide: defaultCol.canHide,
          };
        }
        return configCol;
      });
    
    // 添加 DEFAULT_COLUMNS 中有但 columnsConfig 中没有的列
    DEFAULT_COLUMNS.forEach(defaultCol => {
      if (!mergedColumns.find(c => c.key === defaultCol.key)) {
        mergedColumns.push({ ...defaultCol, order: mergedColumns.length });
      }
    });
    
    // 先更新本地状态，实现实时刷新
    setColumns([...mergedColumns]);
    setShowColumnSettings(false);
    
    // 然后保存到服务器（异步，不阻塞UI更新）
    saveColumnConfig(mergedColumns);
  };
  
  // 获取所有列（用于表格渲染，expand 和 actions 固定在首尾）
  const visibleColumns = useMemo(() => {
    return [...columns]
      .filter(col => col.visible && col.key !== 'expand' && col.key !== 'actions')
      .sort((a, b) => a.order - b.order);
  }, [columns]);
  
  // 拖拽移动列
  const moveColumn = (fromKey: string, toKey: string) => {
    const fromCol = columns.find(c => c.key === fromKey);
    const toCol = columns.find(c => c.key === toKey);
    // 检查是否允许移动
    if (fromCol?.canReorder === false || toCol?.canReorder === false) return;
    
    const newColumns = [...columns];
    const fromIndex = newColumns.findIndex(c => c.key === fromKey);
    const toIndex = newColumns.findIndex(c => c.key === toKey);
    if (fromIndex === -1 || toIndex === -1) return;
    const [removed] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, removed);
    // 更新 order
    newColumns.forEach((col, index) => col.order = index);
    setColumns(newColumns);
    saveColumnConfig(newColumns);
  };
  
  // 加载列配置
  const loadColumnConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/system/column-config?pageKey=bom_list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200 && data.data) {
        // API 返回的是数组，直接作为 columns
        const savedColumns = Array.isArray(data.data) ? data.data : (data.data.columns as ColumnConfig[]);
        
        // 合并配置：保留默认配置中的 canReorder/canResize/canHide 等固定属性
        // 同时过滤掉 DEFAULT_COLUMNS 中不存在的列（如已删除的旧列）
        const mergedColumns = savedColumns
          .filter((savedCol: ColumnConfig) => DEFAULT_COLUMNS.find(c => c.key === savedCol.key))
          .map((savedCol: ColumnConfig) => {
            const defaultCol = DEFAULT_COLUMNS.find(c => c.key === savedCol.key);
            if (defaultCol) {
              return {
                ...savedCol,
                canReorder: defaultCol.canReorder,
                canResize: defaultCol.canResize,
                canHide: defaultCol.canHide,
              };
            }
            return savedCol;
          });
        
        // 添加 DEFAULT_COLUMNS 中有但 savedColumns 中没有的列
        DEFAULT_COLUMNS.forEach(defaultCol => {
          if (!mergedColumns.find((c: ColumnConfig) => c.key === defaultCol.key)) {
            mergedColumns.push({ ...defaultCol });
          }
        });
        
        // 按 order 属性排序
        mergedColumns.sort((a: ColumnConfig, b: ColumnConfig) => (a.order || 0) - (b.order || 0));
        
        setColumns(mergedColumns);
      }
    } catch (error) {
      console.error('加载列配置失败:', error);
    }
  };
  
  // 保存列配置
  const saveColumnConfig = async (newColumns: ColumnConfig[]) => {
    try {
      setColumnConfigLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/system/column-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pageKey: 'bom_list',
          columns: newColumns
        })
      });
      const data = await res.json();
      if (data.code !== 200) {
        alert('保存列配置失败: ' + data.message);
      }
    } catch (error) {
      console.error('保存列配置失败:', error);
      alert('保存列配置失败');
    } finally {
      setColumnConfigLoading(false);
    }
  };
  
  // 重置列配置
  const resetColumnConfig = async () => {
    if (!confirm('确定要重置列配置为默认设置吗？')) return;
    setColumns(DEFAULT_COLUMNS);
    setColumnsConfig(DEFAULT_COLUMNS);
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/system/column-config?pageKey=bom_list', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('重置列配置失败:', error);
    }
  };
  
  // 列宽调整
  const handleColumnResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    resizingColumn.current = columnKey;
    const column = columns.find(c => c.key === columnKey);
    if (column) {
      startX.current = e.clientX;
      startWidth.current = column.width;
      document.addEventListener('mousemove', handleColumnResizeMove);
      document.addEventListener('mouseup', handleColumnResizeEnd);
    }
  };
  
  const handleColumnResizeMove = (e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff);
    setColumns(prev => prev.map(col => 
      col.key === resizingColumn.current ? { ...col, width: newWidth } : col
    ));
  };
  
  const handleColumnResizeEnd = () => {
    if (resizingColumn.current) {
      saveColumnConfig(columns);
    }
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', handleColumnResizeEnd);
  };
  
  // 拖拽排序
  const handleColumnReorder = (fromIndex: number, toIndex: number) => {
    const newColumns = [...columns];
    const [removed] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, removed);
    // 更新 order
    newColumns.forEach((col, index) => col.order = index);
    setColumns(newColumns);
    saveColumnConfig(newColumns);
  };
  
  // 列显示/隐藏
  const handleColumnVisibilityChange = (columnKey: string, visible: boolean) => {
    const newColumns = columns.map(col =>
      col.key === columnKey ? { ...col, visible } : col
    );
    setColumns(newColumns);
    saveColumnConfig(newColumns);
  };
  
  // 打开用户详情弹窗
  const handleShowUserDetail = (userId: number | null, userName: string) => {
    if (userId) {
      setSelectedUserId(userId);
      setSelectedUserName(userName);
      setShowUserModal(true);
    }
  };
  
  // 打开物料详情弹窗
  
  // 辅助函数：在树中查找指定ID的节点
  const findNodeById = (nodes: TreeNode[], id: number): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  // 列表视图状态（保留用于筛选后的数据）
  const [materials, setMaterials] = useState<Material[]>([]);
  
  // 群组列表
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  // 群组名称映射（用于快速查找）
  const [groupNameMap, setGroupNameMap] = useState<Record<number, string>>({});
  // 客户列表（当前群组下的客户）
  const [customers, setCustomers] = useState<Customer[]>([]);

  // 弹窗状态
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [parentMaterialId, setParentMaterialId] = useState<number | null>(null);
  const [parentMaterial, setParentMaterial] = useState<{ drawingCode: string; materialName: string; groupId: number | null } | null>(null);
  // 编辑时存储父物料信息（用于子物料编辑时的客户群组锁定）
  const [editingParentInfo, setEditingParentInfo] = useState<{ id: number; groupId: number; groupName: string } | null>(null);
  // 编辑子物料时存储 BOM 关系 ID
  const [editingBOMItemId, setEditingBOMItemId] = useState<number | null>(null);
  
  // 物料搜索状态（新增子物料时使用）
  const [materialSearchKey, setMaterialSearchKey] = useState('');
  const [materialSearchResults, setMaterialSearchResults] = useState<Material[]>([]);
  const [selectedExistingMaterial, setSelectedExistingMaterial] = useState<Material | null>(null);
  const [isSearchingMaterial, setIsSearchingMaterial] = useState(false);
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  
  // 图纸编码搜索状态
  const [drawingCodeSearchKey, setDrawingCodeSearchKey] = useState('');
  const [drawingCodeSearchResults, setDrawingCodeSearchResults] = useState<Material[]>([]);
  const [isSearchingDrawingCode, setIsSearchingDrawingCode] = useState(false);
  const [showDrawingCodeDropdown, setShowDrawingCodeDropdown] = useState(false);
  
  // 表单状态
  const [formData, setFormData] = useState({
    materialName: '',
    internalCode: '',
    drawingCode: '',
    drawingNo: '',
    materialType: 'part',
    groupId: null as number | null,
    customerId: null as number | null, // 添加客户ID用于图纸编码唯一性检查
    quantity: 1,
    weight: null as number | null, // 重量
    unit: '', // 单位
    spec: '', // 规格（对应TreeNode的spec字段）
    remark: '',
    bomRemark: '', // BOM备注
  });
  
  // 唯一性检查状态
  const [internalCodeError, setInternalCodeError] = useState<string | null>(null);
  const [drawingCodeError, setDrawingCodeError] = useState<string | null>(null);
  const [checkingUnique, setCheckingUnique] = useState(false);
  
  // 导入时选择的客户群组
  const [importGroupId, setImportGroupId] = useState<number | null>(null);
  
  // 唯一性检查函数
  const checkUnique = useCallback(async (
    internalCode?: string, 
    drawingCode?: string, 
    groupId?: number | null,
    excludeMaterialId?: number
  ) => {
    if (!internalCode && !drawingCode) return { internalCodeExists: false, drawingCodeExists: false };
    
    setCheckingUnique(true);
    try {
      const params = new URLSearchParams();
      if (internalCode) params.append('internalCode', internalCode);
      if (drawingCode) params.append('drawingCode', drawingCode);
      if (groupId) params.append('groupId', String(groupId));
      if (excludeMaterialId) params.append('excludeId', String(excludeMaterialId));
      
      const response = await fetch(`/api/bom/material/check-unique?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      
      if (result.code === 200) {
        return {
          internalCodeExists: result.data?.internalCodeExists || false,
          internalCodeMessage: result.data?.internalCodeMessage || '',
          drawingCodeExists: result.data?.drawingCodeExists || false,
          drawingCodeMessage: result.data?.drawingCodeMessage || ''
        };
      }
      return { internalCodeExists: false, drawingCodeExists: false, internalCodeMessage: '', drawingCodeMessage: '' };
    } catch (error) {
      console.error('检查唯一性失败:', error);
      return { internalCodeExists: false, drawingCodeExists: false, internalCodeMessage: '', drawingCodeMessage: '' };
    } finally {
      setCheckingUnique(false);
    }
  }, [token]);
  
  // 导入状态
  const [importStep, setImportStep] = useState(1);
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<Record<number, string>>({});
  const [editedImportData, setEditedImportData] = useState<any[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteMaterial, setDeleteMaterial] = useState<Material | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (token) {
      fetchCustomerGroups();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchBOMTree();
      fetchGroupCustomers();
      loadColumnConfig();
    } else {
      setTreeData([]);
      setCustomers([]);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMaterials();
    }
  }, [token, globalSearch, filterName, filterType, filterGroupId]);

  // 清空所有筛选
  const clearFilters = () => {
    setGlobalSearch('');
    setSearchFields({
      materialName: true,
      drawingCode: true,
      internalCode: true,
      drawingNo: true,
    });
    setFilterName('');
    setFilterType('');
    setFilterGroupId(null);
  };

  // 切换搜索字段
  const toggleSearchField = (field: keyof typeof searchFields) => {
    setSearchFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const fetchApi = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json();
  };

  const fetchCustomerGroups = async () => {
    const res = await fetchApi('/api/customer-group?pageSize=1000');
    if (res.code === 200) {
      const groups = res.data?.list || [];
      setCustomerGroups(groups);
      // 构建群组名称映射
      const nameMap: Record<number, string> = {};
      groups.forEach((g: CustomerGroup) => {
        nameMap[g.id] = g.groupName;
      });
      setGroupNameMap(nameMap);
    }
  };

  const fetchGroupCustomers = async () => {
    const res = await fetchApi('/api/customer?pageSize=1000');
    if (res.code === 200) {
      setCustomers(res.data?.list || []);
    }
  };

  const fetchBOMTree = async (targetGroupId?: number | null): Promise<TreeNode[]> => {
    const res = await fetchApi(`/api/bom${targetGroupId ? `?groupId=${targetGroupId}` : ''}`);
    if (res.code === 200) {
      const newData = res.data || [];
      setTreeData(newData);
      return newData;
    }
    return [];
  };

  // 递归查找匹配的节点及其所有祖先节点ID
  const findAncestorsAndMatch = (node: TreeNode, keyword: string, ancestorKeys: string[]): { matched: boolean; ancestorKeys: string[] } => {
    const fieldMatches: Record<string, boolean> = {
      materialName: searchFields.materialName,
      drawingCode: searchFields.drawingCode,
      internalCode: searchFields.internalCode,
      drawingNo: searchFields.drawingNo,
    };

    // 生成当前节点的唯一键（使用父路径+节点ID确保唯一性）
    const nodeKey = `node_${node.id}`;
    // 当前节点加入祖先链
    const currentKeys = [...ancestorKeys, nodeKey];

    // 检查当前节点是否匹配
    let selfMatch = false;
    if (keyword) {
      if (fieldMatches.materialName && node.materialName.toLowerCase().includes(keyword)) selfMatch = true;
      if (fieldMatches.drawingCode && (node.drawingCode?.toLowerCase().includes(keyword) || false)) selfMatch = true;
      if (fieldMatches.internalCode && node.internalCode.toLowerCase().includes(keyword)) selfMatch = true;
      if (fieldMatches.drawingNo && (node.drawingNo?.toLowerCase().includes(keyword) || false)) selfMatch = true;
    }

    // 如果当前节点匹配，返回当前节点及其祖先
    if (selfMatch) {
      return { matched: true, ancestorKeys: currentKeys };
    }

    // 递归检查所有子节点
    for (const child of node.children || []) {
      const result = findAncestorsAndMatch(child, keyword, currentKeys);
      if (result.matched) {
        return result;
      }
    }

    // 未匹配
    return { matched: false, ancestorKeys: [] };
  };

  // 搜索时自动展开到匹配的子物料
  useEffect(() => {
    if (treeData.length === 0) {
      return; // 不再自动重置 expandedKeys
    }

    // 搜索为空时，不自动折叠（让其他逻辑控制）
    if (!globalSearch) {
      return; // 不再自动重置 expandedKeys
    }

    const keyword = globalSearch.toLowerCase();

    // 收集所有需要展开的键
    const keysToExpand = new Set<string>();

    // 递归查找并收集所有匹配节点的完整路径
    const collectMatchPaths = (node: TreeNode, currentPath: string[]) => {
      // 生成当前节点的键
      const nodeKey = `node_${node.id}`;
      const newPath = [...currentPath, nodeKey];

      // 检查当前节点是否匹配
      const fieldMatches: Record<string, boolean> = {
        materialName: searchFields.materialName,
        drawingCode: searchFields.drawingCode,
        internalCode: searchFields.internalCode,
        drawingNo: searchFields.drawingNo,
      };

      let selfMatch = false;
      if (fieldMatches.materialName && node.materialName.toLowerCase().includes(keyword)) selfMatch = true;
      if (fieldMatches.drawingCode && (node.drawingCode?.toLowerCase().includes(keyword) || false)) selfMatch = true;
      if (fieldMatches.internalCode && node.internalCode.toLowerCase().includes(keyword)) selfMatch = true;
      if (fieldMatches.drawingNo && (node.drawingNo?.toLowerCase().includes(keyword) || false)) selfMatch = true;

      // 当前节点匹配，收集完整路径上的所有键（每一层的前缀都要存储）
      if (selfMatch) {
        // newPath 包含从根到当前节点的所有键
        // 需要把每一层的前缀都加入展开列表
        for (let i = 0; i < newPath.length; i++) {
          const prefixPath = newPath.slice(0, i + 1).join('_');
          keysToExpand.add(prefixPath);
        }
      }

      // 递归检查所有子节点
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          collectMatchPaths(child, newPath);
        }
      }
    };

    // 遍历所有顶层节点
    for (const node of treeData) {
      collectMatchPaths(node, []);
    }

    setExpandedKeys(keysToExpand);
  }, [globalSearch, treeData, searchFields]);

  // 筛选条件变化时自动展开命中的节点
  useEffect(() => {
    // 只有当有筛选条件时才执行展开逻辑
    const hasFilter = filterType || filterGroupId || filterName;
    if (treeData.length === 0) {
      return;
    }

    // 只在类型筛选或名称筛选有值时才自动展开匹配节点
    // 客户筛选（filterGroupId）不影响展开状态
    const hasExpandFilter = filterType || filterName;
    if (!hasExpandFilter) {
      // 类型筛选和名称筛选都为空时，折叠所有节点
      // 但如果刚新增了子物料（skipAutoCollapse），则跳过
      if (!skipAutoCollapse.current) {
        setExpandedKeys(new Set());
      }
      return;
    }

    const keysToExpand = new Set<string>();

    // 递归查找并收集所有匹配节点的完整路径
    const collectMatchPaths = (node: TreeNode, currentPath: string[]) => {
      const nodeKey = `node_${node.id}`;
      const newPath = [...currentPath, nodeKey];

      // 只检查类型筛选和名称筛选（客户筛选不影响展开）
      let selfMatch = true;
      if (filterType && node.materialType !== filterType) selfMatch = false;
      if (filterName && !node.materialName.toLowerCase().includes(filterName.toLowerCase())) selfMatch = false;

      // 匹配则收集所有祖先节点
      if (selfMatch) {
        for (let i = 0; i < newPath.length; i++) {
          const prefixPath = newPath.slice(0, i + 1).join('_');
          keysToExpand.add(prefixPath);
        }
      }

      // 递归检查所有子节点
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          collectMatchPaths(child, newPath);
        }
      }
    };

    for (const node of treeData) {
      collectMatchPaths(node, []);
    }

    setExpandedKeys(keysToExpand);
  }, [filterType, filterName, treeData]);

  const fetchMaterials = async () => {
    let url = `/api/bom/material?pageSize=1000`;
    const params = new URLSearchParams();
    if (globalSearch) params.append('keyword', globalSearch);
    if (filterType) params.append('materialType', filterType);
    if (params.toString()) url += '&' + params.toString();
    
    const res = await fetchApi(url);
    if (res.code === 200) {
      setMaterials(res.data?.list || []);
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddRootMaterial = () => {
    setEditingMaterial(null);
    setParentMaterialId(null);
    setFormData({
      materialName: '',
      internalCode: '',  // 空字符串，由保存时API自动生成
      drawingCode: '',
      drawingNo: '',
      materialType: 'part',
      groupId: null,
      customerId: null,
      quantity: 1,
      weight: null,
      unit: '',
      spec: '',
      remark: '',
      bomRemark: '',
    });
    // 重置唯一性检查错误
    setInternalCodeError(null);
    setDrawingCodeError(null);
    setShowMaterialModal(true);
  };

  const handleAddChildMaterial = (parentId: number, parentGroupId: number | null, parentDrawingCode: string, parentMaterialName: string) => {
    setEditingMaterial(null);
    setParentMaterialId(parentId);
    setParentMaterial({ drawingCode: parentDrawingCode, materialName: parentMaterialName, groupId: parentGroupId });
    setFormData({
      materialName: '',
      internalCode: '',  // 用于输入搜索
      drawingCode: '',
      drawingNo: '',
      materialType: 'part',
      groupId: parentGroupId,
      customerId: null,
      quantity: 1,
      weight: null,
      unit: '',
      spec: '',
      remark: '',
      bomRemark: '',
    });
    // 重置物料搜索状态
    setMaterialSearchKey('');
    setMaterialSearchResults([]);
    setSelectedExistingMaterial(null);
    setShowMaterialDropdown(false);
    // 重置唯一性检查错误
    setInternalCodeError(null);
    setDrawingCodeError(null);
    setShowMaterialModal(true);
  };

  // 判断是否满足检索条件：两个中文字符或4个英文字符
  const shouldStartSearch = (keyword: string): boolean => {
    if (!keyword) return false;
    
    let chineseCount = 0;
    let englishCount = 0;
    
    for (let i = 0; i < keyword.length; i++) {
      const char = keyword.charAt(i);
      const code = char.charCodeAt(0);
      
      // 中文字符范围：基本汉字 + 扩展A
      if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF)) {
        chineseCount++;
      }
      // 英文字符或数字
      else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57)) {
        englishCount++;
      }
      // 其他字符也算英文字符数量（比如空格、标点等）
      else {
        englishCount++;
      }
    }
    
    return chineseCount >= 2 || englishCount >= 4;
  };

  // 搜索物料（用于新增子物料时选择已有物料）
  const searchMaterials = async (keyword: string) => {
    if (!shouldStartSearch(keyword)) {
      setMaterialSearchResults([]);
      setShowMaterialDropdown(false);
      return;
    }
    
    setIsSearchingMaterial(true);
    try {
      const res = await fetchApi(`/api/bom/material/search?keyword=${encodeURIComponent(keyword)}`);
      if (res.code === 200 && res.data) {
        setMaterialSearchResults(res.data);
        setShowMaterialDropdown(res.data.length > 0);
      } else {
        setMaterialSearchResults([]);
        setShowMaterialDropdown(false);
      }
    } catch {
      setMaterialSearchResults([]);
      setShowMaterialDropdown(false);
    } finally {
      setIsSearchingMaterial(false);
    }
  };

  // 选择已有物料填充表单
  const selectExistingMaterial = (material: Material) => {
    setSelectedExistingMaterial(material);
    setFormData({
      materialName: material.materialName,
      internalCode: material.internalCode || '',
      drawingCode: material.drawingCode || '',
      drawingNo: material.drawingNo || '',
      materialType: material.materialType,
      groupId: material.groupId,
      quantity: formData.quantity, // 保持当前用量
      weight: material.weight ?? null,
      unit: material.unit || '',
      spec: material.spec || '',
      remark: material.remark || '',
      bomRemark: formData.bomRemark || '', // 保持当前BOM备注
    });
    setShowMaterialDropdown(false);
    // 同时更新图纸编码搜索状态
    setDrawingCodeSearchKey(material.drawingCode || '');
    setDrawingCodeSearchResults([]);
    setShowDrawingCodeDropdown(false);
  };

  // 清除选择的物料（切换到新增模式）
  const clearSelectedMaterial = () => {
    setSelectedExistingMaterial(null);
    setFormData({
      materialName: '',
      internalCode: '', // 新增模式下，保存时自动生成
      drawingCode: '',
      drawingNo: '',
      materialType: 'LJ',
      groupId: formData.groupId, // 保持当前客户群组
      quantity: 1,
      weight: null,
      unit: '',
      spec: '',
      remark: '',
      bomRemark: '',
    });
    setMaterialSearchKey('');
    setMaterialSearchResults([]);
    setShowMaterialDropdown(false);
    setDrawingCodeSearchKey('');
    setDrawingCodeSearchResults([]);
    setShowDrawingCodeDropdown(false);
  };

  // 搜索图纸编码
  const searchDrawingCode = async (keyword: string) => {
    if (!shouldStartSearch(keyword)) {
      setDrawingCodeSearchResults([]);
      setShowDrawingCodeDropdown(false);
      return;
    }
    
    setIsSearchingDrawingCode(true);
    try {
      const res = await fetchApi(`/api/bom/material/search?keyword=${encodeURIComponent(keyword)}`);
      if (res.code === 200 && res.data) {
        setDrawingCodeSearchResults(res.data);
        setShowDrawingCodeDropdown(res.data.length > 0);
      } else {
        setDrawingCodeSearchResults([]);
        setShowDrawingCodeDropdown(false);
      }
    } catch {
      setDrawingCodeSearchResults([]);
      setShowDrawingCodeDropdown(false);
    } finally {
      setIsSearchingDrawingCode(false);
    }
  };

  // 选择图纸编码对应的物料 - 与内部编码选择逻辑一致
  const selectDrawingCodeMaterial = (material: Material) => {
    setSelectedExistingMaterial(material);
    setFormData({
      materialName: material.materialName,
      internalCode: material.internalCode || '',
      drawingCode: material.drawingCode || '',
      drawingNo: material.drawingNo || '',
      materialType: material.materialType,
      groupId: material.groupId,
      quantity: formData.quantity, // 保持当前用量
      weight: material.weight ?? null,
      unit: material.unit || '',
      spec: material.spec || '',
      remark: material.remark || '',
      bomRemark: formData.bomRemark, // 保持当前BOM备注
      customerId: formData.customerId, // 保持当前客户
    });
    setMaterialSearchKey(material.internalCode || '');
    setShowMaterialDropdown(false);
    setShowDrawingCodeDropdown(false);
    setDrawingCodeSearchKey('');
  };

  const handleEditMaterial = (node: TreeNode) => {
    const materialData: Material = {
      id: node.id,
      uuid: node.uuid,
      materialName: node.materialName,
      internalCode: node.internalCode || '',
      drawingCode: node.drawingCode || '',
      drawingNo: node.drawingNo || '',
      materialType: node.materialType as 'LJ' | 'ZJ' | 'CL' | 'WG' | 'BZ' | 'FC',
      remark: node.remark || '',
      quantity: node.quantity || 1,
      weight: node.weight ?? null,
      unit: node.unit || '',
      spec: node.spec || '',
      groupId: node.groupId ?? 0,
      isDelete: false,
    } as unknown as Material;
    setEditingMaterial(materialData);

    // 检查是否是子物料（通过parentId判断）
    const isChild = (node as any).parentId !== undefined && (node as any).parentId !== null;
    
    if (isChild) {
      // 子物料：从树中查找父物料信息
      const parentId = (node as any).parentId;
      const parentNode = findNodeById(treeData, parentId);
      if (parentNode) {
        setEditingParentInfo({
          id: parentNode.id,
          groupId: parentNode.groupId ?? 0,
          groupName: parentNode.customerGroupName || '',
        });
        // 同时设置 parentMaterial，用于弹窗标题显示
        setParentMaterial({
          drawingCode: parentNode.drawingCode || '',
          materialName: parentNode.materialName || '',
        });
        // 子物料：客户群组与父物料一致，使用父物料的groupId
        setFormData({
          materialName: node.materialName,
          internalCode: node.internalCode || '',
          drawingCode: node.drawingCode || '',
          drawingNo: node.drawingNo || '',
          materialType: node.materialType,
          groupId: parentNode.groupId ?? 0, // 使用父物料的groupId
          quantity: node.quantity || 1, // 子物料有单层用量
          weight: node.weight ?? null,
          unit: node.unit || '',
          spec: node.spec || '',
          remark: node.remark || '',
          bomRemark: node.bomRemark || '',
        });
      } else {
        // 子物料但找不到父节点
        setEditingParentInfo(null);
        setParentMaterial(null);
        setFormData({
          materialName: node.materialName,
          internalCode: node.internalCode || '',
          drawingCode: node.drawingCode || '',
          drawingNo: node.drawingNo || '',
          materialType: node.materialType,
          groupId: node.groupId ?? 0,
          quantity: node.quantity || 1,
          weight: node.weight ?? null,
          unit: node.unit || '',
          spec: node.spec || '',
          remark: node.remark || '',
          bomRemark: node.bomRemark || '',
        });
      }
      // 设置 BOM 关系 ID
      setEditingBOMItemId(node.bomItemId ?? null);
    } else {
      // 顶层物料：客户群组可修改，无单层用量
      setEditingParentInfo(null);
      setEditingBOMItemId(null);
      setParentMaterial(null);
      setFormData({
        materialName: node.materialName,
        internalCode: node.internalCode || '',
        drawingCode: node.drawingCode || '',
        drawingNo: node.drawingNo || '',
        materialType: node.materialType,
        groupId: node.groupId ?? 0,
        quantity: 1, // 顶层物料无单层用量
        weight: node.weight ?? null,
        unit: node.unit || '',
        spec: node.spec || '',
        remark: node.remark || '',
        bomRemark: '', // 顶层物料无BOM备注
      });
    }
    setShowMaterialModal(true);
  };

  const handleSaveMaterial = async () => {
    // 新增子物料时，如果选择了已有物料，只创建BOM关系
    if (!editingMaterial && parentMaterialId && selectedExistingMaterial) {
      // 检测1：不能将物料作为自身的子件
      if (selectedExistingMaterial.id === parentMaterialId) {
        warning('不能将物料作为自身的子件');
        return;
      }
      
      // 检测2：不能将父物料及所有直系上级作为子件（需要查询BOM链）
      try {
        const checkRes = await fetchApi(`/api/bom/check-ancestor?parentMaterialId=${parentMaterialId}&childMaterialId=${selectedExistingMaterial.id}`);
        if (checkRes.code === 200 && checkRes.data?.isAncestor) {
          warning('不能将父物料或其直系上级作为子件，这将形成循环引用');
          return;
        }
      } catch (e) {
        // 如果检测接口失败，继续保存（后端会做最终检测）
      }
      
      // 检测3：客户群组必须相同
      if (parentMaterial?.groupId !== selectedExistingMaterial.groupId) {
        warning('子物料的客户群组必须与父物料相同');
        return;
      }
      
      // 只创建BOM关系
      const bomRes = await fetchApi('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentMaterialId: parentMaterialId,
          childMaterialId: selectedExistingMaterial.id,
          quantity: formData.quantity || 1,
          bomRemark: formData.bomRemark || '',
        }),
      });
      if (bomRes.code === 200) {
        success('BOM关系创建成功');
        setShowMaterialModal(false);
        setParentMaterialId(null);
        setParentMaterial(null);
        setSelectedExistingMaterial(null);
        setMaterialSearchKey('');
        setMaterialSearchResults([]);
        
        // 等待数据刷新后获取新数据并展开定位
        const newTreeData = await fetchBOMTree();
        fetchMaterials();
        
        // 刷新物料详情弹窗中的BOM子树数据
        refreshMaterialDetailBomTree();
        
        // 展开父物料并定位到子件
        const savedMaterialId = selectedExistingMaterial.id;
        const parentId = parentMaterialId;
        
        const findNodeById = (nodes: TreeNode[], id: number): TreeNode | null => {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children && node.children.length > 0) {
              const found = findNodeById(node.children, id);
              if (found) return found;
            }
          }
          return null;
        };
        
        const parentNode = findNodeById(newTreeData, parentId);
        const newMaterialNode = findNodeById(newTreeData, savedMaterialId);
        
        // 找到该物料在树中的完整键和所有父节点键
        const findNodeInfo = (nodes: TreeNode[], targetId: number, parentKey: string = ''): { fullKey: string | null; parentKeys: string[] } => {
          for (const node of nodes) {
            const nodeKey = `node_${node.id}`;
            const fullKey = parentKey ? `${parentKey}_${nodeKey}` : nodeKey;
            if (node.id === targetId) {
              return { fullKey, parentKeys: [] };
            }
            if (node.children && node.children.length > 0) {
              const result = findNodeInfo(node.children, targetId, fullKey);
              if (result.fullKey) {
                return { 
                  fullKey: result.fullKey, 
                  parentKeys: [fullKey, ...result.parentKeys] 
                };
              }
            }
          }
          return { fullKey: null, parentKeys: [] };
        };
        
        const { fullKey, parentKeys } = findNodeInfo(newTreeData, savedMaterialId);
        
        // 展开所有父节点
        if (parentKeys.length > 0) {
          skipAutoCollapse.current = true;
          setExpandedKeys(prev => {
            const newKeys = new Set(prev);
            parentKeys.forEach(key => newKeys.add(key));
            return newKeys;
          });
        }
        
        // 延迟滚动，等待展开渲染完成
        setTimeout(() => {
          if (fullKey && itemRefs.current[fullKey]) {
            itemRefs.current[fullKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            itemRefs.current[fullKey]?.classList.add('ring-2', 'ring-blue-400');
            setTimeout(() => {
              itemRefs.current[fullKey]?.classList.remove('ring-2', 'ring-blue-400');
            }, 2000);
          }
          skipAutoCollapse.current = false;
        }, 500);
      } else {
        error('BOM关系创建失败: ' + (bomRes.message || '未知错误'));
      }
      return;
    }

    // 新增子物料时，如果没有选择已有物料，需要先创建物料再创建BOM关系
    if (!editingMaterial && parentMaterialId && !selectedExistingMaterial) {
      // 验证必须输入物料名称
      if (!formData.materialName) {
        warning('物料名称不能为空');
        return;
      }
      // 如果输入了内部编码且长度>=4但没选择物料，提示用户选择
      if (formData.internalCode && formData.internalCode.length >= 4 && materialSearchResults.length > 0) {
        warning('请从下拉列表中选择已有物料，或清空内部编码后创建新物料');
        return;
      }
      // 内部编码为空或太短时，将自动生成新编码（不需要用户输入）
    }

    if (!formData.materialName) {
      warning('物料名称不能为空');
      return;
    }
    // 新增顶层物料时必须选择客户群组，子物料继承父物料的群组
    if (!editingMaterial && !parentMaterialId && !formData.groupId) {
      warning('请选择所属客户群组');
      return;
    }

    // 新增子物料时必须与父物料的客户群组相同
    if (!editingMaterial && parentMaterialId && parentMaterial?.groupId !== null) {
      if (formData.groupId !== parentMaterial.groupId) {
        warning('子物料的客户群组必须与父物料相同');
        return;
      }
    }

    // 新增物料时检查唯一性
    if (!editingMaterial) {
      // 检查内部编码唯一性（全局唯一）
      if (formData.internalCode) {
        try {
          const checkRes = await fetch(`/api/bom/material/check-unique?internalCode=${encodeURIComponent(formData.internalCode)}`);
          const checkData = await checkRes.json();
          if (checkData.code === 200 && checkData.data?.internalCodeExists) {
            error('内部编码已存在，请使用其他编码');
            return;
          }
        } catch {
          // 检查失败不阻止保存
        }
      }

      // 检查图纸编码唯一性（客户群组内唯一）
      if (formData.drawingCode && formData.groupId) {
        try {
          const checkRes = await fetch(`/api/bom/material/check-unique?drawingCode=${encodeURIComponent(formData.drawingCode)}&groupId=${formData.groupId}`);
          const checkData = await checkRes.json();
          if (checkData.code === 200 && checkData.data?.drawingCodeExists) {
            error('该客户群组下图纸编码已存在，请使用其他编码');
            return;
          }
        } catch {
          // 检查失败不阻止保存
        }
      }
    }

    const url = editingMaterial
      ? `/api/bom/material/${editingMaterial.id}`
      : '/api/bom/material';

    const method = editingMaterial ? 'PUT' : 'POST';

    // 判断是否是编辑子物料
    const isEditingChildMaterial = !!editingMaterial && !!editingParentInfo;

    // 编辑子物料时：更新物料信息 + 单层用量 + 备注 + BOM关系ID
    let payload: any = isEditingChildMaterial
      ? { 
          materialName: formData.materialName, 
          drawingCode: formData.drawingCode, 
          drawingNo: formData.drawingNo, 
          quantity: formData.quantity, 
          weight: formData.weight,
          unit: formData.unit,
          spec: formData.spec,
          remark: formData.remark,
          bomRemark: formData.bomRemark,
          bomItemId: editingBOMItemId
        }
      : { ...formData };
    
    // 确保weight是有效数字或null，排除NaN和空字符串
    if (payload.weight === '' || payload.weight === undefined || (typeof payload.weight === 'number' && isNaN(payload.weight))) {
      payload.weight = null;
    }
    
    if (!editingMaterial && !payload.internalCode) {
      try {
        const codeRes = await fetch('/api/bom/material/next-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materialType: payload.materialType }),
        });
        const codeData = await codeRes.json();
        if (codeData.code === 200 && codeData.data) {
          payload.internalCode = codeData.data;
        } else {
          error('内部编码生成失败，请重试');
          return;
        }
      } catch {
        error('内部编码生成失败，请重试');
        return;
      }
    }

    const res = await fetchApi(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.code === 200) {
      // 获取保存的物料ID
      const savedMaterialId = editingMaterial ? editingMaterial.id : res.data?.id;
      // 获取父物料ID（新增子物料或编辑子物料时）
      const parentId = parentMaterialId || editingParentInfo?.id;
      
      // 新增子物料时：创建物料后还需要创建BOM关系
      if (!editingMaterial && parentId && savedMaterialId) {
        const bomRes = await fetchApi('/api/bom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentMaterialId: parentId,
            childMaterialId: savedMaterialId,
            quantity: formData.quantity || 1,
            bomRemark: formData.bomRemark || '',
          }),
        });
        if (bomRes.code !== 200) {
          error('BOM关系创建失败: ' + (bomRes.message || '未知错误'));
          return;
        }
      }
      
      // 重置弹窗状态
      setShowMaterialModal(false);
      setEditingBOMItemId(null);
      setEditingParentInfo(null);
      setParentMaterialId(null);
      setParentMaterial(null);
      setEditingMaterial(null);
      
      success(editingMaterial ? '物料更新成功' : '物料创建成功');
      
      // 等待数据刷新后获取新数据
      const newTreeData = await fetchBOMTree();
      fetchMaterials();
      
      // 刷新物料详情弹窗中的BOM子树数据
      refreshMaterialDetailBomTree();
      
      if (savedMaterialId) {
        // 先找父物料是否存在
        const findNodeById = (nodes: TreeNode[], id: number): TreeNode | null => {
          for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children && node.children.length > 0) {
              const found = findNodeById(node.children, id);
              if (found) return found;
            }
          }
          return null;
        };
        
        const parentNode = findNodeById(newTreeData, parentId);
        const newMaterialNode = findNodeById(newTreeData, savedMaterialId);
        
        // 找到该物料在树中的完整键和所有父节点键（键格式与expandedKeys一致）
        const findNodeInfo = (nodes: TreeNode[], targetId: number, parentKey: string = ''): { fullKey: string | null; parentKeys: string[] } => {
          for (const node of nodes) {
            const nodeKey = `node_${node.id}`;
            const fullKey = parentKey ? `${parentKey}_${nodeKey}` : nodeKey;
            if (node.id === targetId) {
              // 找到目标节点，返回空列表（目标节点本身不需要展开）
              return { fullKey, parentKeys: [] };
            }
            if (node.children && node.children.length > 0) {
              const result = findNodeInfo(node.children, targetId, fullKey);
              if (result.fullKey) {
                // 将当前节点加入父节点列表（当前节点需要展开才能显示子节点）
                return { 
                  fullKey: result.fullKey, 
                  parentKeys: [fullKey, ...result.parentKeys] 
                };
              }
            }
          }
          return { fullKey: null, parentKeys: [] };
        };
        
        const { fullKey, parentKeys } = findNodeInfo(newTreeData, savedMaterialId);
        
        // 展开所有父节点
        if (parentKeys.length > 0) {
          skipAutoCollapse.current = true; // 设置跳过自动折叠标记
          setExpandedKeys(prev => {
            const newKeys = new Set(prev);
            parentKeys.forEach(key => newKeys.add(key));
            return newKeys;
          });
        }
        
        // 延迟滚动，等待展开渲染完成
        setTimeout(() => {
          if (fullKey && itemRefs.current[fullKey]) {
            itemRefs.current[fullKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 高亮显示一下
            itemRefs.current[fullKey]?.classList.add('ring-2', 'ring-blue-400');
            setTimeout(() => {
              itemRefs.current[fullKey]?.classList.remove('ring-2', 'ring-blue-400');
            }, 2000);
          }
          // 重置跳过自动折叠标记
          skipAutoCollapse.current = false;
        }, 500);
      }
    } else {
      error(res.message || '保存失败');
    }
  };

  const handleAddBOMRelation = async (parentId: number, childId: number, quantity: number, bomRemark: string = '') => {
    const res = await fetchApi('/api/bom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentMaterialId: parentId, childMaterialId: childId, quantity, bomRemark }),
    });

    if (res.code === 200) {
      success('BOM关系添加成功');
    } else {
      error(res.message || '添加BOM关系失败');
    }
  };

  const handleDeleteMaterial = async (material: TreeNode) => {
    // 保存删除时需要的信息
    setDeleteMaterial({
      id: material.id,
      uuid: material.uuid,
      materialName: material.materialName,
      internalCode: material.internalCode,
      drawingCode: material.drawingCode,
      drawingNo: material.drawingNo,
      materialType: material.materialType,
      remark: material.remark,
      customerId: null,
      groupId: material.groupId ?? null,
      customerGroupName: material.customerGroupName ?? undefined,
      processId: material.processId ?? null,
      bomItemId: material.bomItemId ?? undefined,
      hasChildren: (material.children?.length ?? 0) > 0, // 是否有子件
      hasParent: !!material.bomItemId, // 是否有父件（有bomItemId表示是子件）
    });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteMaterial = async () => {
    const id = deleteMaterial?.id;
    if (!id) return;
    
    let res;
    if (deleteMaterial.hasParent && deleteMaterial.bomItemId) {
      // 有父件：删除此行与父件的BOM关系
      res = await fetchApi(`/api/bom/bom-item/${deleteMaterial.bomItemId}`, { method: 'DELETE' });
      if (res.code === 200) {
        success('BOM关系删除成功');
      }
    } else if (!deleteMaterial.hasParent && deleteMaterial.hasChildren) {
      // 顶层行且有子件：删除该行与其子件的父子关系
      res = await fetchApi(`/api/bom/material/${id}/delete-relations`, { method: 'DELETE' });
      if (res.code === 200) {
        success('物料父子关系删除成功');
      }
    } else {
      // 顶层行且无子件：软删除该物料
      res = await fetchApi(`/api/bom/material/${id}/delete-with-bom`, { method: 'DELETE' });
      if (res.code === 200) {
        success('物料删除成功');
      }
    }
    
    if (res?.code === 200) {
      fetchBOMTree();
      fetchMaterials();
      // 刷新物料详情弹窗中的BOM子树数据
      refreshMaterialDetailBomTree();
    } else {
      error(res?.message || '删除失败');
    }
    
    setDeleteConfirmOpen(false);
    setDeleteMaterial(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!importGroupId) {
      warning('请先选择客户群组');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', importGroupId.toString());

    const res = await fetchApi('/api/bom/material/import', {
      method: 'POST',
      body: formData,
    });

    if (res.code === 200) {
      const data = res.data?.success || [];
      setImportData(data);
      setEditedImportData(data.map((item: any) => ({ ...item })));
      setImportErrors({});
      setImportStep(2);
    } else {
      error(res.message || '导入失败');
    }
  };

  const handleConfirmImport = async () => {
    // 应用编辑的数据
    const validData = editedImportData.filter((_, idx) => !importErrors[idx]);
    
    const res = await fetchApi('/api/bom/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId: importGroupId,
        materials: validData,
      }),
    });

    if (res.code === 200) {
      success('导入成功');
      setShowImportModal(false);
      setImportStep(1);
      setImportData([]);
      setEditedImportData([]);
      setImportErrors({});
      setImportGroupId(null);
      if (importGroupId) {
        fetchBOMTree(importGroupId);
      }
      fetchMaterials();
    } else {
      error(res.message || '导入失败');
    }
  };

  const updateImportRow = (idx: number, field: string, value: any) => {
    setEditedImportData(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // 筛选树形数据
  const filterTreeNode = (node: TreeNode): TreeNode | null => {
    const keyword = globalSearch.toLowerCase();
    const nameMatch = filterName.toLowerCase();
    const typeMatch = filterType;
    const groupMatch = filterGroupId;

    // 检查当前节点是否匹配
    const fieldMatches: Record<string, boolean> = {
      materialName: searchFields.materialName,
      drawingCode: searchFields.drawingCode,
      internalCode: searchFields.internalCode,
      drawingNo: searchFields.drawingNo,
    };

    let selfMatch = true;
    if (keyword && Object.values(fieldMatches).some(v => v)) {
      selfMatch = false;
      if (fieldMatches.materialName && node.materialName.toLowerCase().includes(keyword)) selfMatch = true;
      if (fieldMatches.drawingCode && (node.drawingCode?.toLowerCase().includes(keyword) || false)) selfMatch = true;
      if (fieldMatches.internalCode && node.internalCode.toLowerCase().includes(keyword)) selfMatch = true;
      if (fieldMatches.drawingNo && (node.drawingNo?.toLowerCase().includes(keyword) || false)) selfMatch = true;
    }

    // 列筛选
    if (nameMatch && !node.materialName.toLowerCase().includes(nameMatch)) selfMatch = false;
    if (typeMatch && node.materialType !== typeMatch) selfMatch = false;
    if (groupMatch && node.groupId !== groupMatch) selfMatch = false;

    // 递归筛选子节点
    const filteredChildren = node.children
      .map(child => filterTreeNode(child))
      .filter((child): child is TreeNode => child !== null);

    // 如果当前节点匹配或其子节点有匹配的，则返回
    if (selfMatch || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren,
      };
    }

    return null;
  };

  const filteredTreeData = useMemo(() => {
    if (!globalSearch && !filterName && !filterType && !filterGroupId) {
      return treeData;
    }
    return treeData
      .map(node => filterTreeNode(node))
      .filter((node): node is TreeNode => node !== null);
  }, [treeData, globalSearch, filterName, filterType, filterGroupId, searchFields]);

  // 层级背景颜色配置
  const levelColors = [
    'bg-white',       // 0级：白色
    'bg-blue-50',     // 1级：浅蓝
    'bg-green-50',    // 2级：浅绿
    'bg-yellow-50',   // 3级：浅黄
    'bg-purple-50',   // 4级：浅紫
    'bg-pink-50',     // 5级：浅粉
  ];

  // 层级字体大小配置
  const levelFontSizes = [
    'text-sm',        // 0级：正常
    'text-sm',        // 1级：稍小
    'text-xs',        // 2级：较小
    'text-xs',        // 3级：更小
    'text-xs',        // 4级：更小
    'text-xs',        // 5级：最小
  ];

  // 层级行高配置
  const levelPadding = [
    'py-2.5',        // 0级：正常
    'py-2',          // 1级：稍小
    'py-1.5',        // 2级：较小
    'py-1.5',        // 3级：更小
    'py-1',          // 4级：更小
    'py-1',          // 5级：最小
  ];

  // 渲染单元格内容
  const renderCellContent = (key: string, node: TreeNode) => {
    const groupName = node.customerGroupName || (node.groupId ? '未知' : '-');
    
    // 格式化时间
    const formatDateTime = (dateStr: string | null | undefined) => {
      if (!dateStr) return '-';
      try {
        const date = new Date(dateStr);
        return date.toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return '-';
      }
    };
    
    switch (key) {
      case 'internalCode':
        return (
          <span 
            className="text-blue-600 hover:text-blue-800 cursor-pointer truncate font-mono underline"
            onClick={() => handleShowMaterialDetail(node)}
          >
            {node.internalCode}
          </span>
        );
      case 'materialName':
        return <span className="font-medium text-gray-800 truncate">{node.materialName}</span>;
      case 'drawingCode':
        return <span className="text-gray-600 truncate">{node.drawingCode || '-'}</span>;
      case 'drawingNo':
        return <span className="text-gray-600 truncate">{node.drawingNo || '-'}</span>;
      case 'quantity':
        return <span className="text-center text-gray-700 truncate">{node.quantity || '-'}</span>;
      case 'materialType':
        return (
          <span className={`px-1.5 py-0.5 rounded text-xs ${
            node.materialType === 'component' ? 'bg-blue-100 text-blue-700' :
            node.materialType === 'part' ? 'bg-green-100 text-green-700' :
            node.materialType === 'material' ? 'bg-orange-100 text-orange-700' :
            node.materialType === 'purchased' ? 'bg-purple-100 text-purple-700' :
            node.materialType === 'standard' ? 'bg-cyan-100 text-cyan-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {typeLabelMap[node.materialType] || node.materialType}
          </span>
        );
      case 'customerGroupName':
        return <span className="text-gray-600 truncate">{groupName}</span>;
      case 'bomCreatorName':
        return node.bomCreatorName ? (
          <button
            onClick={() => handleShowUserDetail(node.bomCreatorId, node.bomCreatorName!)}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
          >
            {node.bomCreatorName}
          </button>
        ) : '-';
      case 'bomModifierName':
        return node.bomModifierName ? (
          <button
            onClick={() => handleShowUserDetail(node.bomModifierId, node.bomModifierName!)}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
          >
            {node.bomModifierName}
          </button>
        ) : '-';
      case 'bomCreatedAt':
        return <span className="text-gray-600 truncate text-xs">{formatDateTime(node.bomCreatedAt)}</span>;
      case 'bomUpdatedAt':
        return <span className="text-gray-600 truncate text-xs">{formatDateTime(node.bomUpdatedAt)}</span>;
      case 'materialCreatorName':
        return node.materialCreatorName ? (
          <button
            onClick={() => handleShowUserDetail(node.materialCreatorId, node.materialCreatorName!)}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
          >
            {node.materialCreatorName}
          </button>
        ) : '-';
      case 'materialModifierName':
        return node.materialModifierName ? (
          <button
            onClick={() => handleShowUserDetail(node.materialModifierId, node.materialModifierName!)}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate"
          >
            {node.materialModifierName}
          </button>
        ) : '-';
      case 'materialCreatedAt':
        return <span className="text-gray-600 truncate text-xs">{formatDateTime(node.materialCreatedAt)}</span>;
      case 'materialUpdatedAt':
        return <span className="text-gray-600 truncate text-xs">{formatDateTime(node.materialUpdatedAt)}</span>;
      case 'remark':
        return (
          <span className="text-gray-500 truncate">
            {node.remark ? `W:${node.remark}` : ''}
            {node.bomRemark ? `${node.remark ? '||' : ''}B:${node.bomRemark}` : ''}
            {!node.remark && !node.bomRemark ? '-' : ''}
          </span>
        );
      default:
        return '-';
    }
  };

  const renderTreeNode = (node: TreeNode, level: number = 0, parentKey: string = '') => {
    // 生成唯一键：使用父路径+当前节点ID，确保同一物料在不同位置有唯一键
    const nodeKey = `node_${node.id}`;
    const fullKey = parentKey ? `${parentKey}_${nodeKey}` : nodeKey;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedKeys.has(fullKey);
    
    const levelIndex = Math.min(level, levelColors.length - 1);
    const bgColor = levelColors[levelIndex];
    const fontSize = levelFontSizes[levelIndex];
    const paddingY = levelPadding[levelIndex];
    const groupName = node.customerGroupName || (node.groupId ? '未知' : '-');

    return (
      <div key={fullKey}>
        <div
          ref={(el) => { itemRefs.current[fullKey] = el; }}
          className={`flex items-center border-b border-gray-200 hover:brightness-95 transition-all ${bgColor}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {/* 展开/折叠图标列 */}
          <div className="w-8 flex-shrink-0 flex items-center justify-center">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(fullKey)}
                className="p-1 hover:bg-black/5 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className={`w-4 h-4 text-gray-500 ${level > 0 ? 'text-gray-400' : ''}`} />
                ) : (
                  <ChevronRight className={`w-4 h-4 text-gray-500 ${level > 0 ? 'text-gray-400' : ''}`} />
                )}
              </button>
            ) : (
              <span className="w-4 h-4" />
            )}
          </div>

          {/* 数据列 */}
          <div className={`flex-1 flex items-center ${paddingY} ${fontSize} min-w-0`}>
            {visibleColumns.map((col) => {
              const column = DEFAULT_COLUMNS.find(c => c.key === col.key);
              if (!column) return null;
              
              const width = col.width || column.width;
              
              return (
                <div
                  key={col.key}
                  className="flex-shrink-0 truncate px-1"
                  style={{ width: `${width}px` }}
                >
                  {renderCellContent(col.key, node)}
                </div>
              );
            })}
            {/* 操作 */}
            <div className="w-32 flex-shrink-0 flex items-center justify-center gap-0.5 px-1">
              {/* 编辑 */}
              <button
                onClick={() => handleEditMaterial(node)}
                className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                title="编辑"
              >
                <Edit2 className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
              </button>
              {/* 添加子物料 */}
              <button
                onClick={() => handleAddChildMaterial(node.id, node.groupId ?? null, node.drawingCode || '', node.materialName)}
                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                title="添加子物料"
              >
                <Plus className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
              </button>
              {/* 查看图纸 */}
              <button
                onClick={() => {/* TODO: 查看图纸 */}}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                title="查看图纸"
              >
                <FileText className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
              </button>
              {/* 查看工艺 */}
              <button
                onClick={() => {/* TODO: 查看工艺 */}}
                className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                title="查看工艺"
              >
                <Settings2 className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
              </button>
              {/* 导出BOM */}
              <button
                onClick={() => handleExportBomFromTreeNode(node)}
                className="p-1 text-cyan-600 hover:bg-cyan-100 rounded transition-colors"
                title="导出BOM"
              >
                <Download className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
              </button>
              {/* 删除 */}
              <button
                onClick={() => handleDeleteMaterial(node)}
                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                title="删除"
              >
                <Trash2 className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
              </button>
            </div>
          </div>
        </div>
        {/* 子节点 */}
        {hasChildren && isExpanded && node.children.map(child => renderTreeNode(child, level + 1, fullKey))}
      </div>
    );
  };

  const downloadTemplate = () => {
    const headers = ['层级编码', '物料名称', '图纸编码', '内部编码', '图号', '单层用量', '物料类型', '重量', '单位', '规格', '物料备注', 'BOM备注'];
    const sampleData = [
      ['1', '产品A', 'DWG001', '', 'P-001', '1', '组件', '10.5', '套', '规格A', '', ''],
      ['1.1', '零件X', 'DWG002', '', 'P-002', '2', '零件', '2.3', '个', '规格X', '零件备注', ''],
      ['1.2', '零件Y', 'DWG003', '', 'P-003', '4', '零件', '', '', '', '', 'BOM备注'],
      ['2', '产品B', 'DWG004', '', 'P-004', '1', '组件', '', '', '', '', ''],
    ];
    
    const csv = [headers, ...sampleData].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BOM导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">BOM管理</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Download className="w-4 h-4" />
              导入模板
            </button>
            <button
              onClick={() => { setImportGroupId(null); setShowImportModal(true); }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Upload className="w-4 h-4" />
              Excel导入
            </button>
            <button
              onClick={handleAddRootMaterial}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              新增顶层物料
            </button>
          </div>
        </div>
      </div>

      {/* 全局搜索和列筛选 */}
      <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
        <div className="flex items-center gap-6 flex-wrap">
          {/* 全局搜索 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">全局搜索：</span>
            <input
              type="text"
              placeholder="输入关键词搜索..."
              value={globalSearch}
              onChange={e => {
                const value = e.target.value;
                setGlobalSearch(value);
                // 当搜索框为空时，折叠所有节点
                if (!value.trim()) {
                  setExpandedKeys(new Set());
                }
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-44"
            />
          </div>
          
          {/* 搜索字段勾选 */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={searchFields.materialName}
                onChange={() => toggleSearchField('materialName')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              名称
            </label>
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={searchFields.drawingCode}
                onChange={() => toggleSearchField('drawingCode')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              图纸编码
            </label>
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={searchFields.internalCode}
                onChange={() => toggleSearchField('internalCode')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              内部编码
            </label>
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={searchFields.drawingNo}
                onChange={() => toggleSearchField('drawingNo')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              图号
            </label>
          </div>

          {/* 列筛选 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">列筛选：</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">名称：</span>
              <input
                type="text"
                placeholder="名称筛选"
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm w-32"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">类型：</span>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">全部</option>
                {materialTypeOptions.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600">客户：</span>
              <select
                value={filterGroupId || ''}
                onChange={e => setFilterGroupId(e.target.value ? parseInt(e.target.value) : null)}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="">全部</option>
                {customerGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.groupName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 清空筛选 */}
          {(globalSearch || filterName || filterType || filterGroupId) && (
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
            >
              清空筛选
            </button>
          )}

        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        {filteredTreeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <FolderTree className="w-12 h-12 mb-2" />
            <p>暂无BOM数据</p>
            <p className="text-sm">点击"新增顶层物料"或"Excel导入"添加</p>
          </div>
        ) : (
          <div className="min-w-0">
            {/* 表头 */}
            <div className="sticky top-0 bg-gray-100 border-b border-gray-300 z-10">
              <div className="flex items-center text-xs font-semibold text-gray-700 py-2.5 px-2">
                {/* 展开列 */}
                <div className="w-8 flex-shrink-0" />
                {/* 数据列 - 动态渲染 */}
                <div className="flex-1 flex items-center min-w-0">
                  {visibleColumns.map((col, index) => {
                    const column = DEFAULT_COLUMNS.find(c => c.key === col.key);
                    if (!column) return null;
                    
                    const width = col.width || column.width;
                    const canDrag = col.canReorder !== false;
                    const canResize = col.canResize !== false;
                    
                    return (
                      <div
                        key={col.key}
                        data-column-key={col.key}
                        className="flex-shrink-0 truncate px-1 relative group"
                        style={{ width: `${width}px` }}
                        draggable={canDrag}
                        onDragStart={(e) => {
                          if (!canDrag) return;
                          e.dataTransfer.setData('columnKey', col.key);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!canDrag) return;
                          const dragKey = e.dataTransfer.getData('columnKey');
                          if (dragKey && dragKey !== col.key) {
                            moveColumn(dragKey, col.key);
                          }
                        }}
                      >
                        <span className={column.textAlign === 'center' ? 'block text-center' : ''}>
                          {column.label}
                        </span>
                        {/* 列宽调整手柄 */}
                        {canResize && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                            onMouseDown={(e) => handleColumnResizeStart(e, col.key)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* 列设置按钮 */}
                <button
                  onClick={openColumnSettings}
                  className="flex-shrink-0 ml-2 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="列设置"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>
            {/* 树内容 */}
            {filteredTreeData.map(node => renderTreeNode(node))}
          </div>
        )}
      </div>

      {/* 物料编辑弹窗 */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-[650px] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold">
                {editingMaterial ? (
                  editingParentInfo ? (
                    <span>编辑子物料 - 父物料：<span className="text-blue-600">{parentMaterial?.drawingCode || '-'}_{parentMaterial?.materialName || '-'}</span></span>
                  ) : (
                    <span>编辑物料</span>
                  )
                ) : parentMaterialId ? (
                  <span>为父物料 <span className="text-blue-600">{parentMaterial?.drawingCode || '-'}_{parentMaterial?.materialName || '-'}</span> 新增子物料</span>
                ) : '新增顶层物料'}
              </h3>
              <button 
                onClick={() => { 
                  setShowMaterialModal(false); 
                  setEditingBOMItemId(null); 
                  setEditingParentInfo(null);
                  setParentMaterialId(null);
                  setParentMaterial(null);
                  setEditingMaterial(null);
                }} 
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* 客户群组 */}
              {(() => {
                // 新增顶层物料：可选择（必填）
                // 编辑顶层物料：不可选择
                // 新增子物料：不可选择（继承父物料）
                // 编辑子物料：不可选择（继承父物料）
                const isChildMaterial = !!parentMaterialId || !!editingParentInfo;
                const disabled = !!editingMaterial || isChildMaterial;
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      客户群组 {!disabled && <span className="text-red-500">*</span>}
                      {disabled && <span className="text-gray-400 text-xs ml-1">(不可修改{isChildMaterial ? '，继承自父物料' : ''})</span>}
                    </label>
                    <select
                      value={formData.groupId || ''}
                      onChange={e => setFormData({ ...formData, groupId: e.target.value ? parseInt(e.target.value) : null })}
                      disabled={disabled}
                      className={`w-full px-3 py-2 border rounded-lg ${disabled ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                    >
                      <option value="">请选择客户群组</option>
                      {customerGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.groupName}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  物料名称 {!selectedExistingMaterial && <span className="text-red-500">*</span>}
                  {!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial && <span className="text-gray-400 text-xs ml-1">(已选择物料，不可修改)</span>}
                </label>
                <input
                  type="text"
                  value={formData.materialName}
                  onChange={e => setFormData({ ...formData, materialName: e.target.value })}
                  disabled={!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial}
                  className={`w-full px-3 py-2 border rounded-lg ${(!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial) ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                  placeholder="请输入物料名称"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    物料类型 {!editingMaterial && !selectedExistingMaterial && <span className="text-red-500">*</span>}
                    {(!!editingMaterial || (!!selectedExistingMaterial && !!parentMaterialId)) && <span className="text-gray-400 text-xs ml-1">(不可修改)</span>}
                  </label>
                  <select
                    value={formData.materialType}
                    onChange={e => setFormData({ ...formData, materialType: e.target.value })}
                    disabled={!!editingMaterial || (!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial)}
                    className={`w-full px-3 py-2 border rounded-lg ${(!!editingMaterial || (!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial)) ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                  >
                    {materialTypeOptions.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    内部编码 {!editingMaterial && !parentMaterialId && <span className="text-gray-400 text-xs ml-1">(自动生成)</span>}
                    {!editingMaterial && parentMaterialId && <span className="text-gray-400 text-xs ml-1">(搜索选择或自动生成)</span>}
                    {editingMaterial && <span className="text-gray-400 text-xs ml-1">(不可修改)</span>}
                  </label>
                  {editingMaterial ? (
                    // 编辑模式：只读
                    <input
                      type="text"
                      value={formData.internalCode}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  ) : parentMaterialId ? (
                    // 新增子物料：内部编码只能自动生成或从搜索结果中选择
                    selectedExistingMaterial ? (
                      // 已选择物料：显示选中物料的内部编码（只读，不可修改），带清除按钮
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.internalCode}
                          readOnly
                          className="w-full px-3 py-2 pr-20 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <span className="text-green-600 text-xs font-medium">已选择</span>
                          <button
                            type="button"
                            onClick={() => {
                              // 清除选定的物料，但保留客户群组
                              setSelectedExistingMaterial(null);
                              setMaterialSearchKey('');
                              setDrawingCodeSearchKey('');
                              setShowDrawingCodeDropdown(false);
                              setFormData({
                                ...formData,
                                materialName: '',
                                internalCode: '',
                                drawingCode: '',
                                drawingNo: '',
                                materialType: 'material',
                                quantity: 1,
                                remark: '',
                                bomRemark: '',
                              });
                            }}
                            className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-500 transition-colors"
                            title="清除选定"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 未选择物料：搜索输入框，不保存到formData，仅用于搜索
                      <div className="relative">
                        <input
                          type="text"
                          value={materialSearchKey}
                          onChange={e => {
                            const value = e.target.value;
                            setMaterialSearchKey(value);
                            // 搜索物料
                            searchMaterials(value);
                          }}
                          onFocus={() => {
                            if (shouldStartSearch(materialSearchKey)) {
                              setShowMaterialDropdown(true);
                            }
                          }}
                          onBlur={() => {
                            // 延迟关闭下拉框，确保点击下拉项时能触发点击事件
                            setTimeout(() => setShowMaterialDropdown(false), 200);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="输入2个中文字符或4个英文字符搜索已有物料，留空则自动生成新编码"
                        />
                        {/* 搜索下拉列表 - 宽度加倍 */}
                        {showMaterialDropdown && materialSearchResults.length > 0 && (
                          <div className="absolute z-50 w-[200%] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {materialSearchResults.map((material) => (
                              <div
                                key={material.id}
                                onClick={() => selectExistingMaterial(material)}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex flex-wrap gap-x-2 gap-y-1">
                                  {material.drawingCode && <span className="font-medium text-gray-900">{material.drawingCode}</span>}
                                  <span className="text-gray-700">{material.materialName}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  <span>内部编码: {material.internalCode}</span>
                                  {material.internalCode && material.drawingNo && <span className="mx-1">|</span>}
                                  {material.drawingNo && <span>图号: {material.drawingNo}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* 搜索中提示 */}
                        {isSearchingMaterial && (
                          <div className="absolute z-50 w-[200%] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500">
                            搜索中...
                          </div>
                        )}
                        {/* 无结果提示 */}
                        {!isSearchingMaterial && shouldStartSearch(materialSearchKey) && materialSearchResults.length === 0 && (
                          <div className="absolute z-50 w-[200%] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500">
                            未找到匹配的物料，保存时将创建新物料
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    // 新增顶层物料：只读（自动生成）
                    <input
                      type="text"
                      value={formData.internalCode}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                      placeholder="保存时自动生成"
                    />
                  )}
                </div>
                {(parentMaterialId || editingParentInfo) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单层用量 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.quantity ?? 1}
                    onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="1"
                  />
                </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    图纸编码
                  </label>
                  {parentMaterialId ? (
                    // 新增子物料：图纸编码
                    selectedExistingMaterial ? (
                      // 已选择物料：显示选中物料的图纸编码（只读，不可修改），带清除按钮
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.drawingCode}
                          readOnly
                          className="w-full px-3 py-2 pr-20 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <span className="text-green-600 text-xs font-medium">已选择</span>
                          <button
                            type="button"
                            onClick={() => {
                              // 清除选定的物料，但保留客户群组
                              setSelectedExistingMaterial(null);
                              setMaterialSearchKey('');
                              setDrawingCodeSearchKey('');
                              setShowDrawingCodeDropdown(false);
                              setFormData({
                                ...formData,
                                materialName: '',
                                internalCode: '',
                                drawingCode: '',
                                drawingNo: '',
                                materialType: 'material',
                                quantity: 1,
                                remark: '',
                                bomRemark: '',
                              });
                            }}
                            className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-500 transition-colors"
                            title="清除选定"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 未选择物料：搜索输入框
                      <div className="relative">
                        <input
                          type="text"
                          value={drawingCodeSearchKey}
                          onChange={e => {
                            const value = e.target.value;
                            setDrawingCodeSearchKey(value);
                            searchDrawingCode(value);
                          }}
                          onFocus={() => {
                            if (shouldStartSearch(drawingCodeSearchKey)) {
                              setShowDrawingCodeDropdown(true);
                            }
                          }}
                          onBlur={() => {
                            // 延迟关闭下拉框，确保点击下拉项时能触发点击事件
                            setTimeout(() => setShowDrawingCodeDropdown(false), 200);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="输入2个中文字符或4个英文字符搜索已有物料"
                        />
                        {/* 搜索下拉列表 - 宽度加倍 */}
                        {showDrawingCodeDropdown && drawingCodeSearchResults.length > 0 && (
                          <div className="absolute z-50 w-[200%] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {drawingCodeSearchResults.map((material) => (
                              <div
                                key={material.id}
                                onClick={() => selectDrawingCodeMaterial(material)}
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="flex flex-wrap gap-x-2 gap-y-1">
                                  {material.drawingCode && <span className="font-medium text-gray-900">{material.drawingCode}</span>}
                                  <span className="text-gray-700">{material.materialName}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  <span>内部编码: {material.internalCode}</span>
                                  {material.internalCode && material.drawingNo && <span className="mx-1">|</span>}
                                  {material.drawingNo && <span>图号: {material.drawingNo}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* 搜索中提示 */}
                        {isSearchingDrawingCode && (
                          <div className="absolute z-50 w-[200%] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-center text-gray-500">
                            搜索中...
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    // 新增顶层物料或编辑物料：图纸编码可编辑
                    <input
                      type="text"
                      value={formData.drawingCode}
                      onChange={e => setFormData({ ...formData, drawingCode: e.target.value })}
                      disabled={!!(selectedExistingMaterial && !editingMaterial)}
                      className={`w-full px-3 py-2 border rounded-lg ${(selectedExistingMaterial && !editingMaterial) ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                      placeholder="图纸编码"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    图号
                    {!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial && <span className="text-gray-400 text-xs ml-1">(已选择物料，不可修改)</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.drawingNo}
                    onChange={e => setFormData({ ...formData, drawingNo: e.target.value })}
                    disabled={!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial}
                    className={`w-full px-3 py-2 border rounded-lg ${(!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial) ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                  />
                </div>
              </div>
              {/* 重量、单位、规格 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    重量
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.weight ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      const num = val ? parseFloat(val) : null;
                      // 只有是有效数字或null才更新
                      if (num === null || !isNaN(num)) {
                        setFormData({ ...formData, weight: num });
                      }
                    }}
                    disabled={!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial}
                    className={`w-full px-3 py-2 border rounded-lg ${(!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial) ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                    placeholder="kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    单位
                  </label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    disabled={!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial}
                    className={`w-full px-3 py-2 border rounded-lg ${(!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial) ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                  >
                    <option value="">请选择</option>
                    <option value="套">套</option>
                    <option value="个">个</option>
                    <option value="米">米</option>
                    <option value="千克">千克</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    规格
                  </label>
                  <input
                    type="text"
                    value={formData.spec}
                    onChange={e => setFormData({ ...formData, spec: e.target.value })}
                    disabled={!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial}
                    className={`w-full px-3 py-2 border rounded-lg ${(!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial) ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                    placeholder="物料规格"
                  />
                </div>
              </div>
              {/* 备注区域：物料备注和BOM备注并排显示 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    物料备注
                    {!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial && <span className="text-gray-400 text-xs ml-1">(已选择物料，不可修改)</span>}
                  </label>
                  <textarea
                    value={formData.remark}
                    onChange={e => setFormData({ ...formData, remark: e.target.value })}
                    disabled={!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial}
                    className={`w-full px-3 py-2 border rounded-lg ${(!!selectedExistingMaterial && !!parentMaterialId && !editingMaterial) ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                    rows={2}
                    placeholder="物料本身的备注信息"
                  />
                </div>
                {/* BOM备注：仅子物料（新增/编辑）显示 */}
                {(parentMaterialId || editingParentInfo) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      BOM备注
                      <span className="text-gray-400 text-xs font-normal ml-1">(父级BOM中)</span>
                    </label>
                    <textarea
                      value={formData.bomRemark || ''}
                      onChange={e => setFormData({ ...formData, bomRemark: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={2}
                      placeholder="BOM关系备注"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowMaterialModal(false);
                  setEditingBOMItemId(null);
                  setEditingParentInfo(null);
                  setParentMaterialId(null);
                  setParentMaterial(null);
                  setEditingMaterial(null);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveMaterial}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[900px] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold">Excel导入BOM</h3>
              <button onClick={() => { setShowImportModal(false); setImportStep(1); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {importStep === 1 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="mb-4 w-full max-w-xs">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      客户群组 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={importGroupId || ''}
                      onChange={e => setImportGroupId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">请选择客户群组</option>
                      {customerGroups.map(g => (
                        <option key={g.id} value={g.id}>{g.groupName}</option>
                      ))}
                    </select>
                  </div>
                  <Upload className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-600 mb-4">请上传Excel文件</p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="import-file"
                  />
                  <label
                    htmlFor="import-file"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
                  >
                    选择文件
                  </label>
                  <p className="text-xs text-gray-400 mt-4">
                    支持 .xlsx, .xls, .csv 格式
                  </p>
                </div>
              )}
              {importStep === 2 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        Object.keys(importErrors).length === 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {Object.keys(importErrors).length === 0 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      </span>
                      <span className="text-sm">
                        共 {editedImportData.length} 条数据，{Object.keys(importErrors).length} 条异常
                      </span>
                    </div>
                    <button
                      onClick={downloadTemplate}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      下载模板
                    </button>
                  </div>
                  <div className="max-h-96 overflow-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left">状态</th>
                          <th className="px-2 py-1 text-left">序号</th>
                          <th className="px-2 py-1 text-left">物料名称</th>
                          <th className="px-2 py-1 text-left">物料类型</th>
                          <th className="px-2 py-1 text-left">图纸编码</th>
                          <th className="px-2 py-1 text-left">内部编码</th>
                          <th className="px-2 py-1 text-left">图号</th>
                          <th className="px-2 py-1 text-left">用量</th>
                          <th className="px-2 py-1 text-left">重量</th>
                          <th className="px-2 py-1 text-left">单位</th>
                          <th className="px-2 py-1 text-left">规格</th>
                          <th className="px-2 py-1 text-left">物料备注</th>
                          <th className="px-2 py-1 text-left">BOM备注</th>
                          <th className="px-2 py-1 text-left">层级</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editedImportData.map((row, idx) => (
                          <tr key={idx} className={`border-t border-gray-100 ${importErrors[idx] ? 'bg-red-50' : ''}`}>
                            <td className="px-2 py-1">
                              {importErrors[idx] ? (
                                <span className="text-red-500" title={importErrors[idx]}>
                                  <AlertCircle className="w-4 h-4" />
                                </span>
                              ) : (
                                <span className="text-green-500"><CheckCircle className="w-4 h-4" /></span>
                              )}
                            </td>
                            <td className="px-2 py-1">{row.serialNumber || idx + 1}</td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={row.materialName || ''}
                                onChange={e => updateImportRow(idx, 'materialName', e.target.value)}
                                className="w-full border border-gray-300 rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <select
                                value={row.materialType || 'part'}
                                onChange={e => updateImportRow(idx, 'materialType', e.target.value)}
                                className="border border-gray-300 rounded px-1 py-0.5"
                              >
                                {materialTypeOptions.map(t => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={row.drawingCode || ''}
                                onChange={e => updateImportRow(idx, 'drawingCode', e.target.value)}
                                className="w-full border border-gray-300 rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-2 py-1">{row.internalCode || '-'}</td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={row.drawingNo || ''}
                                onChange={e => updateImportRow(idx, 'drawingNo', e.target.value)}
                                className="w-full border border-gray-300 rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                step="1"
                                min="1"
                                value={row.quantity || 1}
                                onChange={e => updateImportRow(idx, 'quantity', parseFloat(e.target.value) || 1)}
                                className="w-16 border border-gray-300 rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={row.weight || ''}
                                onChange={e => updateImportRow(idx, 'weight', e.target.value ? parseFloat(e.target.value) : null)}
                                className="w-16 border border-gray-300 rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <select
                                value={row.unit || ''}
                                onChange={e => updateImportRow(idx, 'unit', e.target.value)}
                                className="border border-gray-300 rounded px-1 py-0.5"
                              >
                                <option value="">请选择</option>
                                <option value="套">套</option>
                                <option value="个">个</option>
                                <option value="米">米</option>
                                <option value="千克">千克</option>
                              </select>
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={row.spec || ''}
                                onChange={e => updateImportRow(idx, 'spec', e.target.value)}
                                className="w-full border border-gray-300 rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={row.materialRemark || ''}
                                onChange={e => updateImportRow(idx, 'materialRemark', e.target.value)}
                                className="w-full border border-gray-300 rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={row.bomRemark || ''}
                                onChange={e => updateImportRow(idx, 'bomRemark', e.target.value)}
                                className="w-full border border-gray-300 rounded px-1 py-0.5"
                              />
                            </td>
                            <td className="px-2 py-1 font-mono">{row.levelCode || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => { setShowImportModal(false); setImportStep(1); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              {importStep === 2 && (
                <button
                  onClick={handleConfirmImport}
                  disabled={editedImportData.length === 0}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  确认导入
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 用户详情弹窗 */}
      {showUserModal && selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          userName={selectedUserName}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUserId(null);
            setSelectedUserName('');
          }}
        />
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => setDeleteConfirmOpen(open)}
        title="确认删除"
        description={
          deleteMaterial?.hasParent && deleteMaterial?.bomItemId
            ? `确定要删除物料"${deleteMaterial?.materialName}"与父物料的BOM关系吗？`
            : !deleteMaterial?.hasParent && deleteMaterial?.hasChildren
            ? `确定要删除物料"${deleteMaterial?.materialName}"与其所有子物料的父子关系吗？物料本身不会被删除。`
            : `确定要删除物料"${deleteMaterial?.materialName}"吗？此操作不可恢复。`
        }
        confirmText="删除"
        variant="destructive"
        onConfirm={confirmDeleteMaterial}
      />

      {/* 列设置弹窗 */}
      {showColumnSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">列设置</h3>
              <button
                onClick={() => setShowColumnSettings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">拖动调整列顺序，勾选控制列显示，点击宽度数值可调整宽度</p>
              </div>
              <div className="space-y-2">
                {columnsConfig.map((col, index) => {
                  // 展开列特殊处理：显示但不可拖动、不可隐藏、不可调整宽度
                  const isExpandColumn = col.key === 'expand';
                  const canDrag = col.canReorder !== false;
                  const canHide = col.canHide !== false;
                  const canResize = col.canResize !== false;
                  
                  return (
                    <div
                      key={col.key}
                      draggable={canDrag}
                      onDragStart={(e) => {
                        if (!canDrag) return;
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (!canDrag) return;
                        const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (dragIndex !== index) {
                          const newColumns = [...columnsConfig];
                          const [removed] = newColumns.splice(dragIndex, 1);
                          newColumns.splice(index, 0, removed);
                          // 更新 order 属性，确保顺序正确
                          newColumns.forEach((col, idx) => {
                            col.order = idx;
                          });
                          handleColumnConfigChange(newColumns);
                        }
                      }}
                      className={`flex items-center gap-3 p-2 bg-gray-50 rounded hover:bg-gray-100 ${canDrag ? 'cursor-move' : 'cursor-default'}`}
                    >
                      <span className={`text-gray-400 ${canDrag ? '' : 'opacity-30'}`}>⋮⋮</span>
                      {canHide ? (
                        <input
                          type="checkbox"
                          checked={col.visible}
                          onChange={(e) => {
                            const newColumns = [...columnsConfig];
                            newColumns[index] = { ...col, visible: e.target.checked };
                            handleColumnConfigChange(newColumns);
                          }}
                          className="w-4 h-4"
                        />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                      <span className="flex-1">{col.label || '(展开列)'}</span>
                      {canResize && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">宽度:</span>
                          <input
                            type="number"
                            value={col.width}
                            onChange={(e) => {
                              const newWidth = parseInt(e.target.value) || 80;
                              const newColumns = [...columnsConfig];
                              newColumns[index] = { ...col, width: Math.max(60, Math.min(400, newWidth)) };
                              handleColumnConfigChange(newColumns);
                            }}
                            className="w-16 px-2 py-1 text-sm border rounded text-right"
                            min={60}
                            max={400}
                          />
                          <span className="text-sm text-gray-500">px</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t flex justify-between">
              <button
                onClick={resetColumnConfig}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              >
                恢复默认
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowColumnSettings(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                >
                  取消
                </button>
                <button
                  onClick={saveColumnConfigFromModal}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 物料详情弹窗 */}
      {showMaterialDetailModal && selectedMaterialNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white shadow-xl overflow-hidden flex flex-col ${
            isDetailModalMaximized 
              ? 'inset-0 absolute w-full h-full rounded-none' 
              : 'rounded-lg w-[95vw] max-w-[1400px] mx-auto max-h-[90vh]'
          }`}>
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">物料详情</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDetailModalMaximized(!isDetailModalMaximized)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title={isDetailModalMaximized ? '还原' : '最大化'}
                >
                  {isDetailModalMaximized ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H6a2 2 0 00-2 2v2m0 8v2a2 2 0 002 2h2m8-16h2a2 2 0 012 2v2m0 8v2a2 2 0 01-2 2h-2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowMaterialDetailModal(false);
                    setIsDetailModalMaximized(false);
                    setDetailExpandedKeys(new Set()); // 重置展开状态
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className={`p-6 overflow-y-auto ${isDetailModalMaximized ? 'flex-1' : 'max-h-[calc(90vh-120px)]'}`}>
              {/* 物料基本信息 */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-600 mb-2 pb-1 border-b">
                  物料信息
                  <span className="font-bold text-red-600 ml-2">(所属客户群组：{selectedMaterialNode.customerGroupName || '无'})</span>
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* 物料信息表格 */}
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      {/* 第一行：物料名称、图纸编码、内部编码、图号 */}
                      <tr>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 w-20 border border-gray-200">物料名称</td>
                        <td className="py-1.5 px-2 border border-gray-200 font-medium">{selectedMaterialNode.materialName || '-'}</td>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 w-20 border border-gray-200">图纸编码</td>
                        <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.drawingCode || '-'}</td>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 w-20 border border-gray-200">内部编码</td>
                        <td className="py-1.5 px-2 border border-gray-200 font-mono">{selectedMaterialNode.internalCode || '-'}</td>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 w-16 border border-gray-200">图号</td>
                        <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.drawingNo || '-'}</td>
                      </tr>
                      {/* 第二行：物料类型、重量、单位、规格 */}
                      <tr>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">物料类型</td>
                        <td className="py-1.5 px-2 border border-gray-200">{typeLabelMap[selectedMaterialNode.materialType] || selectedMaterialNode.materialType || '-'}</td>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">重量</td>
                        <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.weight ? `${selectedMaterialNode.weight} kg` : '-'}</td>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">单位</td>
                        <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.unit || '-'}</td>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">规格</td>
                        <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.spec || '-'}</td>
                      </tr>
                      {/* 第三行：创建者、创建时间、修改者、修改时间 */}
                      <tr>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">创建者</td>
                        <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.materialCreatorName || '-'}</td>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">创建时间</td>
                        <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.materialCreatedAt ? new Date(selectedMaterialNode.materialCreatedAt).toLocaleDateString('zh-CN') : '-'}</td>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">修改者</td>
                        <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.materialModifierName || '-'}</td>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">修改时间</td>
                        <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.materialUpdatedAt ? new Date(selectedMaterialNode.materialUpdatedAt).toLocaleDateString('zh-CN') : '-'}</td>
                      </tr>
                      {/* 物料备注单独一行 */}
                      <tr>
                        <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">物料备注</td>
                        <td className="py-1.5 px-2 border border-gray-200 whitespace-pre-wrap" colSpan={7}>{selectedMaterialNode.remark || '-'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* BOM相关信息 - 仅子层物料显示（有 bomItemId 表示是子层物料） */}
              {selectedMaterialNode.bomItemId && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-600 mb-2 pb-1 border-b">
                    BOM信息
                    <span className="font-bold text-red-600 ml-2">(单层用量：{selectedMaterialNode.quantity || '-'})</span>
                  </h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm border-collapse">
                      <tbody>
                        {/* 第一行：BOM创建者、BOM创建时间、BOM修改者、BOM修改时间 */}
                        <tr>
                          <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">BOM创建者</td>
                          <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.bomCreatorName || '-'}</td>
                          <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">BOM创建时间</td>
                          <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.bomCreatedAt ? new Date(selectedMaterialNode.bomCreatedAt).toLocaleDateString('zh-CN') : '-'}</td>
                          <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">BOM修改者</td>
                          <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.bomModifierName || '-'}</td>
                          <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">BOM修改时间</td>
                          <td className="py-1.5 px-2 border border-gray-200">{selectedMaterialNode.bomUpdatedAt ? new Date(selectedMaterialNode.bomUpdatedAt).toLocaleDateString('zh-CN') : '-'}</td>
                        </tr>
                        {/* 第二行：BOM备注 */}
                        <tr>
                          <td className="py-1.5 px-2 bg-gray-50 text-gray-500 border border-gray-200">BOM备注</td>
                          <td className="py-1.5 px-2 border border-gray-200 whitespace-pre-wrap" colSpan={7}>{selectedMaterialNode.bomRemark || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* BOM子件树 - 当物料有子件时显示 */}
              {(materialBomTree.length > 0 || loadingBomTree) && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b">
                    <h4 className="text-sm font-semibold text-gray-600">BOM子件结构</h4>
                    <button
                      onClick={handleExportBomCsv}
                      disabled={materialBomTree.length === 0}
                      className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      导出BOM
                    </button>
                  </div>
                  {loadingBomTree ? (
                    <div className="text-center py-4 text-sm text-gray-400">加载中...</div>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* 表头 - 可拖拽调整列宽 */}
                      <div className="flex items-center bg-gray-50 border-b border-gray-200 py-2 pl-8 select-none">
                        {/* 物料名称 */}
                        <div className="flex-shrink-0 px-1 relative group" style={{ width: `${detailColumnWidths.materialName}px` }}>
                          <span className="font-medium text-gray-600 truncate">物料名称</span>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300 z-10"
                            onMouseDown={(e) => handleDetailColumnResizeStart(e, 'materialName')}
                          />
                        </div>
                        {/* 内部编码 */}
                        <div className="flex-shrink-0 px-1 relative group" style={{ width: `${detailColumnWidths.internalCode}px` }}>
                          <span className="font-medium text-gray-600 truncate">内部编码</span>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300 z-10"
                            onMouseDown={(e) => handleDetailColumnResizeStart(e, 'internalCode')}
                          />
                        </div>
                        {/* 图纸编码 */}
                        <div className="flex-shrink-0 px-1 relative group" style={{ width: `${detailColumnWidths.drawingCode}px` }}>
                          <span className="font-medium text-gray-600 truncate">图纸编码</span>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300 z-10"
                            onMouseDown={(e) => handleDetailColumnResizeStart(e, 'drawingCode')}
                          />
                        </div>
                        {/* 图号 */}
                        <div className="flex-shrink-0 px-1 relative group" style={{ width: `${detailColumnWidths.drawingNo}px` }}>
                          <span className="font-medium text-gray-600 truncate">图号</span>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300 z-10"
                            onMouseDown={(e) => handleDetailColumnResizeStart(e, 'drawingNo')}
                          />
                        </div>
                        {/* 类型 */}
                        <div className="flex-shrink-0 px-1 relative group" style={{ width: `${detailColumnWidths.materialType}px` }}>
                          <span className="font-medium text-gray-600 truncate">类型</span>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300 z-10"
                            onMouseDown={(e) => handleDetailColumnResizeStart(e, 'materialType')}
                          />
                        </div>
                        {/* 用量 */}
                        <div className="flex-shrink-0 px-1 relative group" style={{ width: `${detailColumnWidths.quantity}px` }}>
                          <span className="font-medium text-gray-600 truncate">用量</span>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300 z-10"
                            onMouseDown={(e) => handleDetailColumnResizeStart(e, 'quantity')}
                          />
                        </div>
                        {/* BOM备注 */}
                        <div className="flex-shrink-0 px-1 relative group" style={{ width: `${detailColumnWidths.bomRemark}px` }}>
                          <span className="font-medium text-gray-600 truncate">BOM备注</span>
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-300 z-10"
                            onMouseDown={(e) => handleDetailColumnResizeStart(e, 'bomRemark')}
                          />
                        </div>
                        {/* 操作列 - 固定宽度 */}
                        <div className="flex-shrink-0 px-1 flex items-center justify-center" style={{ width: `${detailColumnWidths.operation}px` }}>
                          <span className="font-medium text-gray-600">操作</span>
                        </div>
                      </div>
                      {/* 数据行 */}
                      {renderBomTreeRows(materialBomTree, 0)}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setShowMaterialDetailModal(false);
                  setIsDetailModalMaximized(false);
                  setDetailExpandedKeys(new Set()); // 重置展开状态
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
