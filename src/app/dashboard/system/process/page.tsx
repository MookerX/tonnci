'use client';

import { useState, useEffect } from 'react';
import { 
  Cpu, Plus, Edit2, Trash2, X, Search, FileText
} from 'lucide-react';

interface Process {
  id: number;
  processCode: string;
  processName: string;
  processType: string;
  description: string;
  prepareHours: number;
  workHours: number;
  needDrawing: boolean;
  drawingTypes: string;
  status: string;
  createdAt: string;
}

interface FormData {
  processCode: string;
  processName: string;
  processType: string;
  description: string;
  prepareHours: number;
  workHours: number;
  needDrawing: boolean;
  drawingTypes: string[];
  status: string;
  remark: string;
}

export default function ProcessManagement() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [formData, setFormData] = useState<FormData>({
    processCode: '',
    processName: '',
    processType: '',
    description: '',
    prepareHours: 0,
    workHours: 0,
    needDrawing: false,
    drawingTypes: [],
    status: 'active',
    remark: '',
  });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // 获取工序列表
  const fetchProcesses = async () => {
    setLoading(true);
    try {
      let url = '/api/system/process';
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (selectedType) params.append('processType', selectedType);
      if (params.toString()) url += '?' + params.toString();
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200) {
        setProcesses(data.data || []);
      }
    } catch (error) {
      console.error('获取工序列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  useEffect(() => {
    fetchProcesses();
  }, [keyword, selectedType]);

  // 打开弹窗
  const handleOpenModal = (process?: Process) => {
    if (process) {
      setEditingProcess(process);
      let drawingTypes: string[] = [];
      try {
        if (process.drawingTypes) {
          drawingTypes = JSON.parse(process.drawingTypes);
        }
      } catch (e) {}
      
      setFormData({
        processCode: process.processCode,
        processName: process.processName,
        processType: process.processType || '',
        description: process.description || '',
        prepareHours: process.prepareHours || 0,
        workHours: process.workHours || 0,
        needDrawing: process.needDrawing || false,
        drawingTypes,
        status: process.status || 'active',
        remark: '',
      });
    } else {
      setEditingProcess(null);
      setFormData({
        processCode: '',
        processName: '',
        processType: '',
        description: '',
        prepareHours: 0,
        workHours: 0,
        needDrawing: false,
        drawingTypes: [],
        status: 'active',
        remark: '',
      });
    }
    setShowModal(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProcess(null);
  };

  // 保存
  const handleSubmit = async () => {
    if (!formData.processCode || !formData.processName) {
      alert('请填写工序编码和名称');
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        ...formData,
        needDrawing: formData.needDrawing,
      };
      const url = editingProcess ? `/api/system/process/${editingProcess.id}` : '/api/system/process';
      const method = editingProcess ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(submitData),
      });
      
      const data = await res.json();
      if (data.code === 200) {
        alert(editingProcess ? '更新成功' : '创建成功');
        handleCloseModal();
        fetchProcesses();
      } else {
        alert(data.message || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    } finally {
      setSaving(false);
    }
  };

  // 删除
  const handleDelete = async (process: Process) => {
    if (!confirm(`确定删除工序 "${process.processName}" 吗？`)) return;
    
    try {
      const res = await fetch(`/api/system/process/${process.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200) {
        alert('删除成功');
        fetchProcesses();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  // 处理图纸类型选择
  const handleDrawingTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        drawingTypes: [...formData.drawingTypes, type],
        needDrawing: true,
      });
    } else {
      const newTypes = formData.drawingTypes.filter(t => t !== type);
      setFormData({
        ...formData,
        drawingTypes: newTypes,
        needDrawing: newTypes.length > 0,
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      cutting: '切割',
      laser: '激光切割',
      plasma: '等离子切割',
      welding: '焊接',
      assembly: '装配',
      painting: '喷涂',
      inspection: '质检',
      packaging: '包装',
      general: '通用',
    };
    return types[type] || type;
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Cpu className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold">工序管理</h1>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新建工序
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索工序名称或编码..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部类型</option>
          <option value="laser">激光切割</option>
          <option value="plasma">等离子切割</option>
          <option value="cutting">切割</option>
          <option value="welding">焊接</option>
          <option value="assembly">装配</option>
          <option value="painting">喷涂</option>
          <option value="inspection">质检</option>
          <option value="general">通用</option>
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">工序编码</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">工序名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">工序类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">工序描述</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">准备工时</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">作业工时</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">需附图</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : processes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              processes.map((process) => (
                <tr key={process.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{process.processCode}</td>
                  <td className="px-4 py-3 text-sm font-medium">{process.processName}</td>
                  <td className="px-4 py-3 text-sm">{getTypeLabel(process.processType)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {process.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">{process.prepareHours}h</td>
                  <td className="px-4 py-3 text-sm text-center">{process.workHours}h</td>
                  <td className="px-4 py-3 text-sm text-center">
                    {process.needDrawing ? (
                      <span className="inline-flex items-center gap-1 text-orange-600">
                        <FileText className="w-4 h-4" />
                        是
                      </span>
                    ) : (
                      <span className="text-gray-400">否</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(process)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(process)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editingProcess ? '编辑工序' : '新建工序'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    工序编码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.processCode}
                    onChange={(e) => setFormData({...formData, processCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="如: PROC001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    工序名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.processName}
                    onChange={(e) => setFormData({...formData, processName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="如: 激光切割"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工序类型</label>
                <select
                  value={formData.processType}
                  onChange={(e) => setFormData({...formData, processType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择类型</option>
                  <option value="laser">激光切割</option>
                  <option value="plasma">等离子切割</option>
                  <option value="cutting">切割</option>
                  <option value="welding">焊接</option>
                  <option value="assembly">装配</option>
                  <option value="painting">喷涂</option>
                  <option value="inspection">质检</option>
                  <option value="general">通用</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">工序描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="描述该工序的具体操作内容和技术要求"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">准备工时（小时）</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.prepareHours}
                    onChange={(e) => setFormData({...formData, prepareHours: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">作业工时（小时）</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.workHours}
                    onChange={(e) => setFormData({...formData, workHours: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">是否需要工艺附图</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.needDrawing}
                      onChange={(e) => setFormData({...formData, needDrawing: e.target.checked})}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm">需要附图</span>
                  </label>
                </div>
                
                {formData.needDrawing && (
                  <div className="mt-3 pl-6 space-y-2">
                    <p className="text-sm text-gray-600">需要的图纸类型（可多选）：</p>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.drawingTypes.includes('laser')}
                          onChange={(e) => handleDrawingTypeChange('laser', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">激光切割图</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.drawingTypes.includes('plasma')}
                          onChange={(e) => handleDrawingTypeChange('plasma', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">等离子切割图</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.drawingTypes.includes('general')}
                          onChange={(e) => handleDrawingTypeChange('general', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">一般工艺图</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.drawingTypes.includes('assembly')}
                          onChange={(e) => handleDrawingTypeChange('assembly', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">装配图</span>
                      </label>
                    </div>
                    <p className="text-xs text-orange-600 mt-2">
                      提示：激光切割、等离子切割默认需要工艺附图
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">启用</option>
                  <option value="inactive">停用</option>
                </select>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
