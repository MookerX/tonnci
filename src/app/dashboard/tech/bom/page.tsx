'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Upload, Download, ChevronRight, ChevronDown, FileText, Edit2, Trash2,
  X, Save, AlertCircle, CheckCircle, RefreshCw, FolderTree, Eye, DownloadCloud, Settings2, Layers
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
  levelCode: string;
  children: TreeNode[];
  _count?: { children: number };
  hasDrawing?: boolean;
  processId?: number | null;
  bomItemId?: number; // BOM关系ID，用于唯一标识父子关系
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

const typeLabelMap: Record<string, string> = {
  part: '零件',
  component: '组件',
  material: '原材料',
  purchased: '外购件',
  standard: '标准件',
  auxiliary: '辅材',
};

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
  const [parentMaterial, setParentMaterial] = useState<{ drawingCode: string; materialName: string } | null>(null);
  // 编辑时存储父物料信息（用于子物料编辑时的客户群组锁定）
  const [editingParentInfo, setEditingParentInfo] = useState<{ id: number; groupId: number; groupName: string } | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    materialName: '',
    internalCode: '',
    drawingCode: '',
    drawingNo: '',
    materialType: 'part',
    groupId: null as number | null,
    quantity: 1,
    remark: '',
  });
  
  // 导入时选择的客户群组
  const [importGroupId, setImportGroupId] = useState<number | null>(null);
  
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

  const fetchBOMTree = async (targetGroupId?: number | null) => {
    const res = await fetchApi(`/api/bom${targetGroupId ? `?groupId=${targetGroupId}` : ''}`);
    if (res.code === 200) {
      setTreeData(res.data || []);
      // 默认全部折叠，不自动展开
    }
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
      setExpandedKeys(new Set());
      return;
    }

    // 搜索为空时，全部折叠
    if (!globalSearch) {
      setExpandedKeys(new Set());
      return;
    }

    const keyword = globalSearch.toLowerCase();
    console.log('[搜索展开] 关键词:', keyword, 'searchFields:', searchFields);

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
        console.log('[搜索展开] 匹配到节点:', node.internalCode, '展开键:', Array.from(keysToExpand).slice(-3));
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

    console.log('[搜索展开] 最终需要展开的键:', Array.from(keysToExpand));
    setExpandedKeys(keysToExpand);
  }, [globalSearch, treeData, searchFields]);

  // 筛选条件变化时自动展开命中的节点
  useEffect(() => {
    // 只有当有筛选条件时才执行展开逻辑
    const hasFilter = filterType || filterGroupId || filterName;
    if (treeData.length === 0) {
      return;
    }

    if (!hasFilter) {
      // 清空筛选时折叠所有
      setExpandedKeys(new Set());
      return;
    }

    const keysToExpand = new Set<string>();

    // 递归查找并收集所有匹配节点的完整路径
    const collectMatchPaths = (node: TreeNode, currentPath: string[]) => {
      const nodeKey = `node_${node.id}`;
      const newPath = [...currentPath, nodeKey];

      // 检查当前节点是否匹配筛选条件
      let selfMatch = true;
      if (filterType && node.materialType !== filterType) selfMatch = false;
      if (filterGroupId && node.groupId !== filterGroupId) selfMatch = false;
      if (filterName && !node.materialName.toLowerCase().includes(filterName.toLowerCase())) selfMatch = false;

      // 匹配则收集所有祖先节点
      if (selfMatch) {
        for (let i = 0; i < newPath.length; i++) {
          const prefixPath = newPath.slice(0, i + 1).join('_');
          keysToExpand.add(prefixPath);
        }
        console.log('[筛选展开] 匹配到节点:', node.internalCode, '展开键:', Array.from(keysToExpand).slice(-3));
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

    console.log('[筛选展开] 最终需要展开的键:', Array.from(keysToExpand));
    setExpandedKeys(keysToExpand);
  }, [filterType, filterGroupId, filterName, treeData]);

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
      quantity: 1,
      remark: '',
    });
    setShowMaterialModal(true);
  };

  const handleAddChildMaterial = (parentId: number, parentGroupId: number | null, parentDrawingCode: string, parentMaterialName: string) => {
    setEditingMaterial(null);
    setParentMaterialId(parentId);
    setParentMaterial({ drawingCode: parentDrawingCode, materialName: parentMaterialName });
    setFormData({
      materialName: '',
      internalCode: '',  // 空字符串，由保存时API自动生成
      drawingCode: '',
      drawingNo: '',
      materialType: 'part',
      groupId: parentGroupId,
      quantity: 1,
      remark: '',
    });
    setShowMaterialModal(true);
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
        // 子物料：客户群组与父物料一致，使用父物料的groupId
        setFormData({
          materialName: node.materialName,
          internalCode: node.internalCode || '',
          drawingCode: node.drawingCode || '',
          drawingNo: node.drawingNo || '',
          materialType: node.materialType,
          groupId: parentNode.groupId ?? 0, // 使用父物料的groupId
          quantity: node.quantity || 1, // 子物料有单层用量
          remark: node.remark || '',
        });
      } else {
        setEditingParentInfo(null);
        setFormData({
          materialName: node.materialName,
          internalCode: node.internalCode || '',
          drawingCode: node.drawingCode || '',
          drawingNo: node.drawingNo || '',
          materialType: node.materialType,
          groupId: node.groupId ?? 0,
          quantity: node.quantity || 1,
          remark: node.remark || '',
        });
      }
    } else {
      // 顶层物料：客户群组可修改，无单层用量
      setEditingParentInfo(null);
      setFormData({
        materialName: node.materialName,
        internalCode: node.internalCode || '',
        drawingCode: node.drawingCode || '',
        drawingNo: node.drawingNo || '',
        materialType: node.materialType,
        groupId: node.groupId ?? 0,
        quantity: 1, // 顶层物料无单层用量
        remark: node.remark || '',
      });
    }
    setShowMaterialModal(true);
  };

  const handleSaveMaterial = async () => {
    if (!formData.materialName) {
      warning('物料名称不能为空');
      return;
    }
    // 新增顶层物料时必须选择客户群组，子物料继承父物料的群组
    if (!editingMaterial && !parentMaterialId && !formData.groupId) {
      warning('请选择所属客户群组');
      return;
    }

    const url = editingMaterial
      ? `/api/bom/material/${editingMaterial.id}`
      : '/api/bom/material';

    const method = editingMaterial ? 'PUT' : 'POST';

    // 新增时，如果内部编码为空则通过API自动生成
    let payload: any = { ...formData };
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
      // 如果是新增子物料，需要建立BOM关系
      if (!editingMaterial && parentMaterialId && res.data?.id) {
        await handleAddBOMRelation(parentMaterialId, res.data.id, formData.quantity || 1);
      }
      
      setShowMaterialModal(false);
      success(editingMaterial ? '物料更新成功' : '物料创建成功');
      if (formData.groupId) {
        fetchBOMTree(formData.groupId);
      }
      fetchMaterials();
    } else {
      error(res.message || '保存失败');
    }
  };

  const handleAddBOMRelation = async (parentId: number, childId: number, quantity: number) => {
    const res = await fetchApi('/api/bom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentMaterialId: parentId, childMaterialId: childId, quantity }),
    });

    if (res.code === 200) {
      success('BOM关系添加成功');
    } else {
      error(res.message || '添加BOM关系失败');
    }
  };

  const handleDeleteMaterial = async (material: TreeNode) => {
    const materialData: Material = {
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
      processId: material.processId,
    };
    setDeleteMaterial(materialData);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteMaterial = async () => {
    const id = deleteMaterial?.id;
    if (!id) return;
    
    const res = await fetchApi(`/api/bom/material/${id}`, { method: 'DELETE' });
    if (res.code === 200) {
      success('物料删除成功');
      fetchBOMTree();
      fetchMaterials();
    } else {
      error(res.message || '删除失败');
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
      const data = res.data || [];
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
          <div className={`flex-1 grid grid-cols-9 gap-1 ${paddingY} ${fontSize} min-w-0`}>
            {/* 内部编码 */}
            <div className="col-span-1 font-mono text-gray-700 truncate px-1">{node.internalCode}</div>
            {/* 图纸编码 */}
            <div className="col-span-1 text-gray-600 truncate px-1">{node.drawingCode || '-'}</div>
            {/* 物料名称 */}
            <div className="col-span-2 font-medium text-gray-800 truncate px-1">{node.materialName}</div>
            {/* 图号 */}
            <div className="col-span-1 text-gray-600 truncate px-1">{node.drawingNo || '-'}</div>
            {/* 单层用量 */}
            <div className="col-span-1 text-center text-gray-700 truncate px-1">{node.quantity}</div>
            {/* 物料类型 */}
            <div className="col-span-1 text-center truncate px-1">
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
            </div>
            {/* 所属客户 */}
            <div className="col-span-1 text-gray-600 truncate px-1">{groupName}</div>
            {/* 备注 */}
            <div className="col-span-1 text-gray-500 truncate px-1">{node.remark || '-'}</div>
          </div>

          {/* 操作列 */}
          <div className="w-32 flex-shrink-0 flex items-center justify-center gap-1 px-1">
            {/* 编辑 */}
            <button
              onClick={() => handleEditMaterial(node)}
              className="p-1.5 text-amber-600 hover:bg-amber-100 rounded transition-colors"
              title="编辑"
            >
              <Edit2 className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
            </button>
            {/* 添加子物料 */}
            <button
              onClick={() => handleAddChildMaterial(node.id, node.groupId ?? null, node.drawingCode || '', node.materialName)}
              className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
              title="添加子物料"
            >
              <Plus className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
            </button>
            {/* 查看图纸 */}
            <button
              onClick={() => {/* TODO: 查看图纸 */}}
              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="查看图纸"
            >
              <FileText className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
            </button>
            {/* 查看工艺 */}
            <button
              onClick={() => {/* TODO: 查看工艺 */}}
              className="p-1.5 text-purple-600 hover:bg-purple-100 rounded transition-colors"
              title="查看工艺"
            >
              <Settings2 className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
            </button>
            {/* 删除 */}
            <button
              onClick={() => handleDeleteMaterial(node)}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="删除"
            >
              <Trash2 className={`w-4 h-4 ${level > 0 ? 'w-3 h-3' : ''}`} />
            </button>
          </div>
        </div>
        {/* 子节点 */}
        {hasChildren && isExpanded && node.children.map(child => renderTreeNode(child, level + 1, fullKey))}
      </div>
    );
  };

  const downloadTemplate = () => {
    const headers = ['序号', '物料名称', '图纸编码', '内部编码', '图号', '单层用量', '物料类型', '物料备注', 'BOM备注', '层级编码'];
    const sampleData = [
      ['1', '产品A', 'DWG001', '', 'P-001', '1', '组件', '', '', '1'],
      ['1.1', '零件X', 'DWG002', '', 'P-002', '2', '零件', '', '', '1.1'],
      ['1.2', '零件Y', 'DWG003', '', 'P-003', '4', '零件', '', '', '1.2'],
      ['2', '产品B', 'DWG004', '', 'P-004', '1', '组件', '', '', '2'],
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
              onChange={e => setGlobalSearch(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-56"
            />
          </div>
          
          {/* 搜索字段勾选 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">检索字段：</span>
            <label className="flex items-center gap-1 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={searchFields.materialName}
                onChange={() => toggleSearchField('materialName')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300"
              />
              物料名称
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
          <>
            {/* 表头 */}
            <div className="sticky top-0 bg-gray-100 border-b border-gray-300 z-10">
              <div className="flex items-center text-xs font-semibold text-gray-700 py-2.5 px-2">
                <div className="w-8 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-9 gap-1 min-w-0">
                  <div className="col-span-1 truncate">内部编码</div>
                  <div className="col-span-1 truncate">图纸编码</div>
                  <div className="col-span-2 truncate">物料名称</div>
                  <div className="col-span-1 truncate">图号</div>
                  <div className="col-span-1 text-center truncate">单层用量</div>
                  <div className="col-span-1 text-center truncate">物料类型</div>
                  <div className="col-span-1 truncate">所属客户</div>
                  <div className="col-span-1 truncate">备注</div>
                </div>
                <div className="w-32 flex-shrink-0 text-center truncate px-1">操作</div>
              </div>
            </div>
            {/* 树内容 */}
            {filteredTreeData.map(node => renderTreeNode(node))}
          </>
        )}
      </div>

      {/* 物料编辑弹窗 */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold">
                {editingMaterial ? (
                  parentMaterialId || editingParentInfo ? '编辑子物料' : '编辑物料'
                ) : parentMaterialId ? (
                  <span>
                    为：(<span className="text-blue-600">{parentMaterial?.drawingCode || '-'}_{parentMaterial?.materialName || '-'}</span>) 新增子物料
                  </span>
                ) : '新增物料'}
              </h3>
              <button onClick={() => setShowMaterialModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  客户群组 <span className="text-red-500">*</span>
                  {(parentMaterialId || editingParentInfo) && <span className="text-gray-400 text-xs ml-1">(继承自父物料，不可修改)</span>}
                </label>
                <select
                  value={formData.groupId || ''}
                  onChange={e => setFormData({ ...formData, groupId: e.target.value ? parseInt(e.target.value) : null })}
                  disabled={!!(parentMaterialId || editingParentInfo)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                >
                  <option value="">请选择客户群组</option>
                  {customerGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.groupName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  物料名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.materialName}
                  onChange={e => setFormData({ ...formData, materialName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="请输入物料名称"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    物料类型
                    {(parentMaterialId || editingParentInfo) && <span className="text-gray-400 text-xs ml-1">(不可修改)</span>}
                  </label>
                  <select
                    value={formData.materialType}
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  >
                    {materialTypeOptions.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">内部编码</label>
                  <input
                    type="text"
                    value={formData.internalCode}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    placeholder="自动生成"
                  />
                </div>
                {(parentMaterialId || editingParentInfo) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">单层用量 <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">图纸编码</label>
                  <input
                    type="text"
                    value={formData.drawingCode}
                    onChange={e => setFormData({ ...formData, drawingCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">图号</label>
                  <input
                    type="text"
                    value={formData.drawingNo}
                    onChange={e => setFormData({ ...formData, drawingNo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea
                  value={formData.remark}
                  onChange={e => setFormData({ ...formData, remark: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowMaterialModal(false)}
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
                                value={row.quantity || 1}
                                onChange={e => updateImportRow(idx, 'quantity', parseFloat(e.target.value) || 1)}
                                className="w-16 border border-gray-300 rounded px-1 py-0.5"
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => setDeleteConfirmOpen(open)}
        title="确认删除"
        description={`确定要删除物料"${deleteMaterial?.materialName}"吗？此操作不可恢复。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={confirmDeleteMaterial}
      />
    </div>
  );
}
