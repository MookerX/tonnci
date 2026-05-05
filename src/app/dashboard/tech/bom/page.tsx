'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Upload, Download, ChevronRight, ChevronDown, FileText, Edit2, Trash2,
  X, Save, AlertCircle, CheckCircle, RefreshCw, FolderTree, Eye, DownloadCloud
} from 'lucide-react';

interface TreeNode {
  id: number;
  uuid: string;
  materialName: string;
  internalCode: string;
  drawingCode: string | null;
  drawingNumber: string | null;
  materialType: string;
  quantity: number;
  remark: string | null;
  levelCode: string;
  children: TreeNode[];
  _count?: { children: number };
  hasDrawing?: boolean;
  processId?: number | null;
}

interface Material {
  id: number;
  uuid: string;
  materialName: string;
  internalCode: string;
  drawingCode: string | null;
  drawingNumber: string | null;
  materialType: string;
  remark: string | null;
  customerId: number | null;
  customerName?: string;
  processId?: number | null;
}

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  customerType: string;
}

const materialTypeOptions = [
  { label: '零件', value: 'part' },
  { label: '组件', value: 'assembly' },
  { label: '原材料', value: 'material' },
  { label: '外购件', value: 'purchased' },
  { label: '标准件', value: 'standard' },
  { label: '辅材', value: 'auxiliary' },
];

const typeLabelMap: Record<string, string> = {
  part: '零件',
  assembly: '组件',
  material: '原材料',
  purchased: '外购件',
  standard: '标准件',
  auxiliary: '辅材',
};

export default function BOMManagementPage() {
  const [token, setToken] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tree' | 'list'>('tree');
  
  // 树形视图状态
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  
  // 列表视图状态
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCustomer, setFilterCustomer] = useState<number | null>(null);
  
  // 客户列表
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // 弹窗状态
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [parentMaterialId, setParentMaterialId] = useState<number | null>(null);
  
  // 表单状态
  const [formData, setFormData] = useState({
    materialName: '',
    internalCode: '',
    drawingCode: '',
    drawingNumber: '',
    materialType: 'part',
    quantity: 1,
    remark: '',
    customerId: null as number | null,
  });
  
  // 导入状态
  const [importStep, setImportStep] = useState(1);
  const [importData, setImportData] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<Record<number, string>>({});
  const [editedImportData, setEditedImportData] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (token) {
      fetchCustomers();
      if (selectedCustomerId) {
        fetchBOMTree();
      }
    }
  }, [token, selectedCustomerId]);

  useEffect(() => {
    if (token) {
      fetchMaterials();
    }
  }, [token, searchKeyword, filterType, filterCustomer]);

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

  const fetchCustomers = async () => {
    const res = await fetchApi('/api/customer?pageSize=1000');
    if (res.code === 200) {
      setCustomers(res.data?.list || []);
    }
  };

  const fetchBOMTree = async () => {
    if (!selectedCustomerId) return;
    const res = await fetchApi(`/api/bom?customerId=${selectedCustomerId}`);
    if (res.code === 200) {
      setTreeData(res.data || []);
      // 自动展开第一层
      const firstLevelIds = new Set<number>();
      (res.data || []).forEach((item: TreeNode) => {
        firstLevelIds.add(item.id);
      });
      setExpandedIds(firstLevelIds);
    }
  };

  const fetchMaterials = async () => {
    let url = `/api/bom/material?pageSize=1000`;
    const params = new URLSearchParams();
    if (searchKeyword) params.append('keyword', searchKeyword);
    if (filterType) params.append('materialType', filterType);
    if (filterCustomer) params.append('customerId', filterCustomer.toString());
    if (params.toString()) url += '&' + params.toString();
    
    const res = await fetchApi(url);
    if (res.code === 200) {
      setMaterials(res.data?.list || []);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddRootMaterial = () => {
    setEditingMaterial(null);
    setParentMaterialId(null);
    setFormData({
      materialName: '',
      internalCode: '',
      drawingCode: '',
      drawingNumber: '',
      materialType: 'part',
      quantity: 1,
      remark: '',
      customerId: selectedCustomerId,
    });
    setShowMaterialModal(true);
  };

  const handleAddChildMaterial = (parentId: number) => {
    setEditingMaterial(null);
    setParentMaterialId(parentId);
    setFormData({
      materialName: '',
      internalCode: '',
      drawingCode: '',
      drawingNumber: '',
      materialType: 'part',
      quantity: 1,
      remark: '',
      customerId: selectedCustomerId,
    });
    setShowMaterialModal(true);
  };

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setParentMaterialId(null);
    setFormData({
      materialName: material.materialName,
      internalCode: material.internalCode,
      drawingCode: material.drawingCode || '',
      drawingNumber: material.drawingNumber || '',
      materialType: material.materialType,
      quantity: 1,
      remark: material.remark || '',
      customerId: material.customerId,
    });
    setShowMaterialModal(true);
  };

  const handleSaveMaterial = async () => {
    if (!formData.materialName) {
      alert('物料名称不能为空');
      return;
    }

    const url = editingMaterial 
      ? `/api/bom/material/${editingMaterial.id}`
      : '/api/bom/material';
    
    const method = editingMaterial ? 'PUT' : 'POST';
    
    const res = await fetchApi(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.code === 200) {
      setShowMaterialModal(false);
      if (selectedCustomerId) fetchBOMTree();
      fetchMaterials();
    } else {
      alert(res.message || '保存失败');
    }
  };

  const handleAddBOMRelation = async (parentId: number, childId: number, quantity: number) => {
    const res = await fetchApi(`/api/bom/${parentId}/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childMaterialId: childId, quantity }),
    });

    if (res.code === 200) {
      fetchBOMTree();
    } else {
      alert(res.message || '添加BOM关系失败');
    }
  };

  const handleDeleteMaterial = async (id: number) => {
    if (!confirm('确定要删除该物料吗？')) return;
    
    const res = await fetchApi(`/api/bom/material/${id}`, { method: 'DELETE' });
    if (res.code === 200) {
      if (selectedCustomerId) fetchBOMTree();
      fetchMaterials();
    } else {
      alert(res.message || '删除失败');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('customerId', selectedCustomerId?.toString() || '');

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
      alert(res.message || '导入失败');
    }
  };

  const handleConfirmImport = async () => {
    // 应用编辑的数据
    const validData = editedImportData.filter((_, idx) => !importErrors[idx]);
    
    const res = await fetchApi('/api/bom/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: selectedCustomerId,
        materials: validData,
      }),
    });

    if (res.code === 200) {
      alert('导入成功');
      setShowImportModal(false);
      setImportStep(1);
      setImportData([]);
      setEditedImportData([]);
      setImportErrors({});
      fetchBOMTree();
      fetchMaterials();
    } else {
      alert(res.message || '导入失败');
    }
  };

  const updateImportRow = (idx: number, field: string, value: any) => {
    setEditedImportData(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    return (
      <div key={node.id}>
        <div
          className={`flex items-center hover:bg-gray-50 border-b border-gray-100 ${
            selectedMaterialId === node.id ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          <button
            onClick={() => hasChildren && toggleExpand(node.id)}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <span className="w-4" />
            )}
          </button>
          <div className="flex-1 grid grid-cols-12 gap-2 py-2 text-sm">
            <div className="col-span-1 font-mono text-gray-600">{node.internalCode}</div>
            <div className="col-span-2">{node.materialName}</div>
            <div className="col-span-1">{typeLabelMap[node.materialType] || node.materialType}</div>
            <div className="col-span-1 font-mono text-gray-500">{node.drawingCode || '-'}</div>
            <div className="col-span-1 font-mono text-gray-500">{node.drawingNumber || '-'}</div>
            <div className="col-span-1 text-center">{node.quantity}</div>
            <div className="col-span-2 text-gray-500 truncate">{node.remark || '-'}</div>
            <div className="col-span-2 flex items-center gap-1">
              <button
                onClick={() => setSelectedMaterialId(node.id)}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="查看"
              >
                <Eye className="w-4 h-4" />
              </button>
              {!node.parentId && (
                <button
                  onClick={() => handleAddChildMaterial(node.id)}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="添加子物料"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleEditMaterial(node)}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                title="编辑"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteMaterial(node.id)}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && node.children.map(child => renderTreeNode(child, level + 1))}
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
            <select
              value={selectedCustomerId || ''}
              onChange={e => setSelectedCustomerId(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">选择客户</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.customerName}</option>
              ))}
            </select>
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
              onClick={() => setShowImportModal(true)}
              disabled={!selectedCustomerId}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Excel导入
            </button>
            <button
              onClick={handleAddRootMaterial}
              disabled={!selectedCustomerId}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              新增顶层物料
            </button>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="border-b border-gray-200 px-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('tree')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'tree'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FolderTree className="w-4 h-4 inline mr-1" />
            树形结构
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === 'list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            列表视图
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'tree' ? (
          <div>
            {!selectedCustomerId ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                请先选择客户
              </div>
            ) : treeData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <FolderTree className="w-12 h-12 mb-2" />
                <p>暂无BOM数据</p>
                <p className="text-sm">点击"新增顶层物料"或"Excel导入"添加</p>
              </div>
            ) : (
              <>
                {/* 表头 */}
                <div className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center text-xs font-medium text-gray-500 py-2 px-3">
                    <div className="w-6" />
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <div className="col-span-1">内部编码</div>
                      <div className="col-span-2">物料名称</div>
                      <div className="col-span-1">物料类型</div>
                      <div className="col-span-1">图纸编码</div>
                      <div className="col-span-1">图号</div>
                      <div className="col-span-1 text-center">用量</div>
                      <div className="col-span-2">备注</div>
                      <div className="col-span-2">操作</div>
                    </div>
                  </div>
                </div>
                {/* 树内容 */}
                {treeData.map(node => renderTreeNode(node))}
              </>
            )}
          </div>
        ) : (
          <div>
            {/* 筛选 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex gap-4">
              <input
                type="text"
                placeholder="搜索编码、名称..."
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-64"
              />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">全部类型</option>
                {materialTypeOptions.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={filterCustomer || ''}
                onChange={e => setFilterCustomer(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">全部客户</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.customerName}</option>
                ))}
              </select>
              <button
                onClick={() => fetchMaterials()}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* 表格 */}
            <table className="w-full">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left">内部编码</th>
                  <th className="px-3 py-2 text-left">物料名称</th>
                  <th className="px-3 py-2 text-left">物料类型</th>
                  <th className="px-3 py-2 text-left">图纸编码</th>
                  <th className="px-3 py-2 text-left">图号</th>
                  <th className="px-3 py-2 text-left">所属客户</th>
                  <th className="px-3 py-2 text-left">备注</th>
                  <th className="px-3 py-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materials.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-sm">{m.internalCode}</td>
                    <td className="px-3 py-2">{m.materialName}</td>
                    <td className="px-3 py-2">{typeLabelMap[m.materialType] || m.materialType}</td>
                    <td className="px-3 py-2 font-mono text-sm">{m.drawingCode || '-'}</td>
                    <td className="px-3 py-2 font-mono text-sm">{m.drawingNumber || '-'}</td>
                    <td className="px-3 py-2 text-sm">{m.customerName || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-500 truncate max-w-32">{m.remark || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditMaterial(m)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 物料编辑弹窗 */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold">{editingMaterial ? '编辑物料' : '新增物料'}</h3>
              <button onClick={() => setShowMaterialModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">物料类型</label>
                  <select
                    value={formData.materialType}
                    onChange={e => setFormData({ ...formData, materialType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                    onChange={e => setFormData({ ...formData, internalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="自动生成，可手动输入"
                  />
                </div>
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
                    value={formData.drawingNumber}
                    onChange={e => setFormData({ ...formData, drawingNumber: e.target.value })}
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
                                value={row.drawingNumber || ''}
                                onChange={e => updateImportRow(idx, 'drawingNumber', e.target.value)}
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
    </div>
  );
}
