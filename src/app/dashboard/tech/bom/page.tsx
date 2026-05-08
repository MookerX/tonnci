'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, Plus, Upload, Download, ChevronRight, ChevronDown, FileText, Trash2,
  X, AlertCircle, CheckCircle, RefreshCw, Layers
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  createColumnHelper,
  ExpandedState,
  Row,
} from '@tanstack/react-table';

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
  levelCode: string;
  children: TreeNode[];
  _count?: { children: number };
  hasDrawing?: boolean;
  processId?: number | null;
  bomItemId?: number;
  groupId?: number | null;
  customerGroupName?: string | null;
  unit?: string | null;
  spec?: string | null;
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
}

interface CustomerGroup {
  id: number;
  groupName: string;
}

const MATERIAL_TYPES = ['零件', '组件', '原材料', '外购件', '标准件', '辅材'];

const TYPE_COLORS: Record<string, string> = {
  '零件': 'bg-orange-100 text-orange-800',
  '组件': 'bg-blue-100 text-blue-800',
  '原材料': 'bg-green-100 text-green-800',
  '外购件': 'bg-purple-100 text-purple-800',
  '标准件': 'bg-gray-100 text-gray-800',
  '辅材': 'bg-yellow-100 text-yellow-800',
};

const LEVEL_INDENTS: Record<number, string> = {
  1: 'pl-0',
  2: 'pl-6',
  3: 'pl-12',
  4: 'pl-18',
  5: 'pl-24',
};

interface EditableCellProps {
  value: string | number | null;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number';
  disabled?: boolean;
}

function EditableCell({ value, onSave, type = 'text', disabled }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');

  useEffect(() => {
    setEditValue(value ?? '');
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(type === 'number' ? Number(editValue) : editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditValue(value ?? '');
      setIsEditing(false);
    }
  };

  if (disabled) {
    return <span className="text-muted-foreground">{value ?? '-'}</span>;
  }

  if (isEditing) {
    return (
      <input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-7 px-2 border border-primary rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        autoFocus
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-[28px] flex items-center"
    >
      {value ?? '-'}
    </div>
  );
}

export default function BOMManagementPage() {
  const toast = useToast();
  
  // 数据状态
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([]);
  
  // 筛选状态
  const [filterType, setFilterType] = useState('');
  const [filterGroupId, setFilterGroupId] = useState<string>('');
  const [filterName, setFilterName] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  
  // 展开状态
  const [expanded, setExpanded] = useState<ExpandedState>({});
  
  // 弹窗状态
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [parentMaterial, setParentMaterial] = useState<TreeNode | null>(null);
  const [addChildDialogTitle, setAddChildDialogTitle] = useState('');
  
  // 表单状态
  const [formData, setFormData] = useState({
    internalCode: '',
    drawingCode: '',
    materialName: '',
    drawingNo: '',
    materialType: '零件',
    quantity: 1,
    remark: '',
    groupId: '',
  });
  
  // 删除确认
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteMaterial, setDeleteMaterial] = useState<TreeNode | null>(null);
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 将树形数据扁平化，用于表格显示
  const flattenData = useCallback((nodes: TreeNode[], depth = 0): TreeNode[] => {
    let result: TreeNode[] = [];
    for (const node of nodes) {
      result.push({ ...node, levelCode: String(depth + 1) });
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenData(node.children, depth + 1));
      }
    }
    return result;
  }, []);

  // 获取扁平化的数据
  const flatData = useMemo(() => flattenData(treeData), [treeData, flattenData]);

  // 筛选逻辑
  const filteredData = useMemo(() => {
    if (!filterType && !filterGroupId && !filterName && !globalSearch) {
      return flatData;
    }
    
    const searchLower = (globalSearch || filterName || '').toLowerCase();
    
    return flatData.filter(item => {
      // 类型筛选
      if (filterType && item.materialType !== filterType) return false;
      
      // 客户群组筛选
      if (filterGroupId && String(item.groupId) !== filterGroupId) return false;
      
      // 全局搜索或名称筛选
      if (searchLower) {
        const matches = 
          item.materialName?.toLowerCase().includes(searchLower) ||
          item.internalCode?.toLowerCase().includes(searchLower) ||
          item.drawingCode?.toLowerCase().includes(searchLower) ||
          item.drawingNo?.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }
      
      return true;
    });
  }, [flatData, filterType, filterGroupId, filterName, globalSearch]);

  // 收集匹配节点的所有祖先节点键
  const collectAncestors = useCallback((nodes: TreeNode[], targetId: number, path: (string | number)[] = []): (string | number)[] | null => {
    for (const node of nodes) {
      const currentPath = [...path, node.id];
      if (node.id === targetId) {
        return currentPath;
      }
      if (node.children && node.children.length > 0) {
        const result = collectAncestors(node.children, targetId, currentPath);
        if (result) return result;
      }
    }
    return null;
  }, []);

  // 收集所有匹配节点的祖先路径
  const collectAllMatchAncestors = useCallback((nodes: TreeNode[], predicate: (node: TreeNode) => boolean, path: (string | number)[] = []): (string | number)[][] => {
    const result: (string | number)[][] = [];
    
    for (const node of nodes) {
      const currentPath = [...path, node.id];
      if (predicate(node)) {
        result.push(currentPath);
      }
      if (node.children && node.children.length > 0) {
        result.push(...collectAllMatchAncestors(node.children, predicate, currentPath));
      }
    }
    
    return result;
  }, []);

  // 获取顶层物料
  const getTopLevelNodes = useCallback((nodes: TreeNode[]): TreeNode[] => {
    return nodes.filter(node => {
      const isTopLevel = !treeData.some(parent => 
        parent.children?.some(child => child.id === node.id)
      );
      return isTopLevel;
    });
  }, [treeData]);

  // 全局搜索展开逻辑
  useEffect(() => {
    if (!globalSearch || treeData.length === 0) {
      if (globalSearch === '') {
        setExpanded({});
      }
      return;
    }

    const searchLower = globalSearch.toLowerCase();
    const predicate = (node: TreeNode): boolean =>
      node.materialName?.toLowerCase().includes(searchLower) ||
      node.internalCode?.toLowerCase().includes(searchLower) ||
      node.drawingCode?.toLowerCase().includes(searchLower) ||
      node.drawingNo?.toLowerCase().includes(searchLower) ||
      false;

    const matchPaths = collectAllMatchAncestors(treeData, predicate);
    const newExpanded: ExpandedState = {};
    
    for (const path of matchPaths) {
      for (let i = 0; i < path.length - 1; i++) {
        const parentPath = path.slice(0, i + 1).join('.');
        newExpanded[parentPath] = true;
      }
    }

    setExpanded(newExpanded);
  }, [globalSearch, treeData, collectAllMatchAncestors]);

  // 筛选展开逻辑
  useEffect(() => {
    const hasFilter = filterType || filterGroupId || filterName;
    
    if (!hasFilter) {
      if (filterName === '') {
        setExpanded({});
      }
      return;
    }

    const predicate = (node: TreeNode) => {
      if (filterType && node.materialType !== filterType) return false;
      if (filterGroupId && String(node.groupId) !== filterGroupId) return false;
      if (filterName) {
        const searchLower = filterName.toLowerCase();
        if (!node.materialName?.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    };

    const matchPaths = collectAllMatchAncestors(treeData, predicate);
    const newExpanded: ExpandedState = {};
    
    for (const path of matchPaths) {
      for (let i = 0; i < path.length - 1; i++) {
        const parentPath = path.slice(0, i + 1).join('.');
        newExpanded[parentPath] = true;
      }
    }

    setExpanded(newExpanded);
  }, [filterType, filterGroupId, filterName, treeData, collectAllMatchAncestors]);

  // 获取子节点的 key 格式
  const getChildrenKeys = useCallback((parentId: number, parentPath: (string | number)[] = []): string[] => {
    const parent = treeData.find(n => n.id === parentId);
    if (!parent || !parent.children) return [];
    
    const currentPath = [...parentPath, parentId];
    const parentKey = currentPath.join('.');
    const keys: string[] = [parentKey];
    
    for (const child of parent.children) {
      keys.push(...getChildrenKeys(child.id, currentPath));
    }
    
    return keys;
  }, [treeData]);

  // 获取 BOM 树数据
  const fetchBOMTree = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/bom');
      const data = await res.json();
      if (data.code === 200) {
        setTreeData(data.data || []);
      }
    } catch {
      toast.error('获取BOM数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取客户群组列表
  const fetchCustomerGroups = async () => {
    try {
      const res = await fetch('/api/system/customer-group');
      const data = await res.json();
      if (data.code === 200) {
        setCustomerGroups(data.data || []);
      }
    } catch {
      toast.error('获取客户群组失败');
    }
  };

  useEffect(() => {
    fetchBOMTree();
    fetchCustomerGroups();
  }, []);

  // 获取物料详情
  const fetchMaterialDetail = async (materialId: number) => {
    try {
      const res = await fetch(`/api/bom/material?id=${materialId}`);
      const data = await res.json();
      if (data.code === 200) {
        return data.data;
      }
    } catch {
      toast.error('获取物料详情失败');
    }
    return null;
  };

  // 打开添加子物料弹窗
  const handleAddChild = async (material: TreeNode) => {
    const materialWithDetail = await fetchMaterialDetail(material.id);
    if (!materialWithDetail) return;

    setParentMaterial(material);
    setAddChildDialogTitle(`为 ${material.drawingCode || material.internalCode}_${material.materialName} 新增子物料`);
    
    setFormData({
      internalCode: '',
      drawingCode: '',
      materialName: '',
      drawingNo: '',
      materialType: '零件',
      quantity: 1,
      remark: '',
      groupId: materialWithDetail.groupId ? String(materialWithDetail.groupId) : '',
    });
    
    setIsAddChildDialogOpen(true);
  };

  // 打开添加顶层物料弹窗
  const handleAddTopLevel = () => {
    setParentMaterial(null);
    setFormData({
      internalCode: '',
      drawingCode: '',
      materialName: '',
      drawingNo: '',
      materialType: '零件',
      quantity: 1,
      remark: '',
      groupId: customerGroups.length > 0 ? String(customerGroups[0].id) : '',
    });
    setIsAddDialogOpen(true);
  };

  // 保存新增物料
  const handleSaveMaterial = async () => {
    if (!formData.materialName.trim()) {
      toast.error('请输入物料名称');
      return;
    }
    
    setIsSaving(true);
    try {
      // 创建物料
      const createRes = await fetch('/api/bom/material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialName: formData.materialName,
          internalCode: formData.internalCode || undefined,
          drawingCode: formData.drawingCode || undefined,
          drawingNo: formData.drawingNo || undefined,
          materialType: formData.materialType,
          remark: formData.remark || undefined,
          groupId: formData.groupId ? Number(formData.groupId) : undefined,
        }),
      });
      
      const createData = await createRes.json();
      if (createData.code !== 200) {
        toast.error(createData.message || '创建物料失败');
        return;
      }
      
      const materialId = createData.data?.id;
      if (!materialId) {
        toast.error('创建物料失败：未获取到物料ID');
        return;
      }
      
      // 如果是子物料，创建 BOM 关系
      if (parentMaterial) {
        const bomRes = await fetch('/api/bom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parentMaterialId: parentMaterial.id,
            childMaterialId: materialId,
            quantity: formData.quantity,
          }),
        });
        
        const bomData = await bomRes.json();
        if (bomData.code !== 200) {
          toast.error(bomData.message || '创建BOM关系失败');
          return;
        }
      }
      
      toast.success('创建物料成功');
      setIsAddDialogOpen(false);
      setIsAddChildDialogOpen(false);
      fetchBOMTree();
    } catch {
      toast.error('创建物料失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 删除物料
  const handleDeleteMaterial = async () => {
    if (!deleteMaterial) return;
    
    try {
      const res = await fetch(`/api/bom/material?id=${deleteMaterial.id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (data.code === 200) {
        toast.success('删除物料成功');
        fetchBOMTree();
      } else {
        toast.error(data.message || '删除物料失败');
      }
    } catch {
      toast.error('删除物料失败');
    }
    
    setDeleteDialogOpen(false);
    setDeleteMaterial(null);
  };

  // 确认删除
  const confirmDelete = (material: TreeNode) => {
    setDeleteMaterial(material);
    setDeleteDialogOpen(true);
  };

  // 更新物料
  const handleUpdateMaterial = async (id: number, field: string, value: string | number) => {
    try {
      const res = await fetch(`/api/bom/material?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      
      const data = await res.json();
      if (data.code === 200) {
        toast.success('更新成功');
        fetchBOMTree();
      } else {
        toast.error(data.message || '更新失败');
        fetchBOMTree(); // 刷新数据
      }
    } catch {
      toast.error('更新失败');
      fetchBOMTree();
    }
  };

  // 展开/折叠行
  const handleToggleExpand = (row: Row<TreeNode>) => {
    const rowPath = row.original.id.toString();
    setExpanded(prev => {
      // 使用类型断言来处理 ExpandedState
      const prevObj = prev as Record<string, boolean>;
      if (prevObj[rowPath]) {
        const newExpanded = { ...prevObj };
        delete newExpanded[rowPath];
        return newExpanded as ExpandedState;
      } else {
        return { ...prevObj, [rowPath]: true } as ExpandedState;
      }
    });
  };

  // 获取行级别
  const getRowLevel = (row: Row<TreeNode>): number => {
    return parseInt(row.original.levelCode) || 1;
  };

  // 定义列
  const columnHelper = createColumnHelper<TreeNode>();
  
  const columns = [
    columnHelper.display({
      id: 'expand',
      header: '',
      cell: ({ row }) => {
        const hasChildren = row.original.children && row.original.children.length > 0;
        if (!hasChildren) {
          return <div className="w-6" />;
        }
        return (
          <button
            onClick={() => handleToggleExpand(row)}
            className="p-1 hover:bg-muted rounded"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        );
      },
      size: 40,
    }),
    columnHelper.accessor('internalCode', {
      header: '内部编码',
      cell: info => info.getValue() || '-',
      size: 120,
    }),
    columnHelper.accessor('drawingCode', {
      header: '图纸编码',
      cell: ({ row, getValue }) => (
        <EditableCell
          value={getValue()}
          onSave={(value) => handleUpdateMaterial(row.original.id, 'drawingCode', value as string)}
        />
      ),
      size: 120,
    }),
    columnHelper.accessor('materialName', {
      header: '物料名称',
      cell: ({ row, getValue }) => (
        <EditableCell
          value={getValue()}
          onSave={(value) => handleUpdateMaterial(row.original.id, 'materialName', value as string)}
        />
      ),
      size: 180,
    }),
    columnHelper.accessor('drawingNo', {
      header: '图号',
      cell: ({ row, getValue }) => (
        <EditableCell
          value={getValue()}
          onSave={(value) => handleUpdateMaterial(row.original.id, 'drawingNo', value as string)}
        />
      ),
      size: 120,
    }),
    columnHelper.accessor('quantity', {
      header: '单层用量',
      cell: ({ row, getValue }) => {
        const level = getRowLevel(row);
        if (level === 1) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <EditableCell
            value={getValue()}
            onSave={(value) => handleUpdateMaterial(row.original.id, 'quantity', value as number)}
            type="number"
          />
        );
      },
      size: 100,
    }),
    columnHelper.accessor('materialType', {
      header: '物料类型',
      cell: info => {
        const type = info.getValue();
        return (
          <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'}`}>
            {type}
          </span>
        );
      },
      size: 90,
    }),
    columnHelper.accessor('customerGroupName', {
      header: '所属客户',
      cell: info => info.getValue() || '-',
      size: 120,
    }),
    columnHelper.accessor('remark', {
      header: '备注',
      cell: ({ row, getValue }) => (
        <EditableCell
          value={getValue()}
          onSave={(value) => handleUpdateMaterial(row.original.id, 'remark', value as string)}
        />
      ),
      size: 150,
    }),
    columnHelper.display({
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleAddChild(row.original)}
            className="p-1.5 hover:bg-primary/10 rounded text-primary"
            title="添加子物料"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => confirmDelete(row.original)}
            className="p-1.5 hover:bg-destructive/10 rounded text-destructive"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      size: 100,
    }),
  ];

  // 创建表格实例
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    getSubRows: (row) => row.children,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    manualPagination: true,
    autoResetExpanded: false,
  });

  // 获取行样式
  const getRowStyle = (level: number) => {
    const baseStyle = 'border-b';
    const levelStyles: Record<number, string> = {
      1: 'bg-background font-medium',
      2: 'bg-muted/30',
      3: 'bg-muted/10',
      4: '',
      5: '',
    };
    return `${baseStyle} ${levelStyles[level] || ''}`;
  };

  // 获取字体大小样式
  const getFontSizeStyle = (level: number) => {
    const sizes: Record<number, string> = {
      1: 'text-sm',
      2: 'text-sm',
      3: 'text-xs',
      4: 'text-xs',
      5: 'text-xs',
    };
    return sizes[level] || 'text-sm';
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">BOM管理</h1>
        </div>
        <button
          onClick={handleAddTopLevel}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增物料
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
        {/* 全局搜索 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="全局搜索..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* 类型筛选 */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 px-3 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">全部类型</option>
          {MATERIAL_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        {/* 客户群组筛选 */}
        <select
          value={filterGroupId}
          onChange={(e) => setFilterGroupId(e.target.value)}
          className="h-9 px-3 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">全部客户</option>
          {customerGroups.map(group => (
            <option key={group.id} value={group.id}>{group.groupName}</option>
          ))}
        </select>

        {/* 名称筛选 */}
        <div className="relative">
          <input
            type="text"
            placeholder="按名称筛选"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            className="w-40 h-9 pl-3 pr-4 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* 重置按钮 */}
        <button
          onClick={() => {
            setFilterType('');
            setFilterGroupId('');
            setFilterName('');
            setGlobalSearch('');
          }}
          className="flex items-center gap-1 h-9 px-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          重置
        </button>
      </div>

      {/* 表格 */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-muted/50 z-10">
              <tr>
                {table.getHeaderGroups().map(headerGroup => (
                  headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground">
                    暂无数据
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => {
                  const level = getRowLevel(row);
                  const indentClass = LEVEL_INDENTS[level] || LEVEL_INDENTS[5];
                  return (
                    <tr
                      key={row.id}
                      className={`${getRowStyle(level)} ${getFontSizeStyle(level)}`}
                    >
                      {row.getVisibleCells().map(cell => {
                        if (cell.column.id === 'expand') {
                          return (
                            <td key={cell.id} className="px-0 py-1.5">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        }
                        return (
                          <td
                            key={cell.id}
                            className={`px-3 py-1.5 ${indentClass}`}
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 新增顶层物料弹窗 */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-[500px] max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">新增物料</h2>
              <button onClick={() => setIsAddDialogOpen(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">客户群组 <span className="text-destructive">*</span></label>
                <select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                >
                  <option value="">请选择客户群组</option>
                  {customerGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.groupName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">内部编码</label>
                  <input
                    type="text"
                    value={formData.internalCode}
                    onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                    className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">物料类型</label>
                  <select
                    value={formData.materialType}
                    onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                    className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {MATERIAL_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">物料名称 <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  value={formData.materialName}
                  onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">图纸编码</label>
                  <input
                    type="text"
                    value={formData.drawingCode}
                    onChange={(e) => setFormData({ ...formData, drawingCode: e.target.value })}
                    className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">图号</label>
                  <input
                    type="text"
                    value={formData.drawingNo}
                    onChange={(e) => setFormData({ ...formData, drawingNo: e.target.value })}
                    className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">备注</label>
                <input
                  type="text"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/30">
              <button
                onClick={() => setIsAddDialogOpen(false)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveMaterial}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增子物料弹窗 */}
      {isAddChildDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-[500px] max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">{addChildDialogTitle}</h2>
              <button onClick={() => setIsAddChildDialogOpen(false)} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="p-3 bg-muted/50 rounded-md">
                <p className="text-sm text-muted-foreground">
                  父物料：<span className="font-medium text-foreground">{parentMaterial?.materialName}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  客户群组：<span className="font-medium text-foreground">{parentMaterial?.customerGroupName || '-'}</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">内部编码</label>
                  <input
                    type="text"
                    value={formData.internalCode}
                    onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                    className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">物料类型</label>
                  <select
                    value={formData.materialType}
                    onChange={(e) => setFormData({ ...formData, materialType: e.target.value })}
                    className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {MATERIAL_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">物料名称 <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  value={formData.materialName}
                  onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">图纸编码</label>
                  <input
                    type="text"
                    value={formData.drawingCode}
                    onChange={(e) => setFormData({ ...formData, drawingCode: e.target.value })}
                    className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">图号</label>
                  <input
                    type="text"
                    value={formData.drawingNo}
                    onChange={(e) => setFormData({ ...formData, drawingNo: e.target.value })}
                    className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">单层用量</label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">备注</label>
                <input
                  type="text"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-muted/30">
              <button
                onClick={() => setIsAddChildDialogOpen(false)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveMaterial}
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="确认删除"
        description={`确定要删除物料 "${deleteMaterial?.materialName}" 吗？此操作不可恢复。`}
        onConfirm={handleDeleteMaterial}
      />
    </div>
  );
}
