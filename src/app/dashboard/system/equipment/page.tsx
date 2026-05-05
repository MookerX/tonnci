'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Plus, Edit2, Trash2, X, Search
} from 'lucide-react';

interface Team {
  id: number;
  teamName: string;
}

interface Equipment {
  id: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string;
  teamId: number | null;
  team?: Team;
  parameters: string;
  brand: string;
  model: string;
  status: string;
  createdAt: string;
}

interface FormData {
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string;
  teamId: number | null;
  parameters: string;
  brand: string;
  model: string;
  status: string;
  remark: string;
}

export default function EquipmentManagement() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    equipmentCode: '',
    equipmentName: '',
    equipmentType: '',
    teamId: null,
    parameters: '',
    brand: '',
    model: '',
    status: 'active',
    remark: '',
  });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // 获取设备列表
  const fetchEquipments = async () => {
    setLoading(true);
    try {
      let url = '/api/system/equipment';
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (selectedTeam) params.append('teamId', selectedTeam);
      if (params.toString()) url += '?' + params.toString();
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200) {
        setEquipments(data.data || []);
      }
    } catch (error) {
      console.error('获取设备列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取班组列表
  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/system/team', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200) {
        setTeams(data.data || []);
      }
    } catch (error) {
      console.error('获取班组列表失败:', error);
    }
  };

  useEffect(() => {
    fetchEquipments();
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchEquipments();
  }, [keyword, selectedTeam]);

  // 打开弹窗
  const handleOpenModal = (equipment?: Equipment) => {
    if (equipment) {
      setEditingEquipment(equipment);
      setFormData({
        equipmentCode: equipment.equipmentCode,
        equipmentName: equipment.equipmentName,
        equipmentType: equipment.equipmentType || '',
        teamId: equipment.teamId,
        parameters: equipment.parameters || '',
        brand: equipment.brand || '',
        model: equipment.model || '',
        status: equipment.status || 'active',
        remark: '',
      });
    } else {
      setEditingEquipment(null);
      setFormData({
        equipmentCode: '',
        equipmentName: '',
        equipmentType: '',
        teamId: null,
        parameters: '',
        brand: '',
        model: '',
        status: 'active',
        remark: '',
      });
    }
    setShowModal(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEquipment(null);
  };

  // 保存
  const handleSubmit = async () => {
    if (!formData.equipmentCode || !formData.equipmentName) {
      alert('请填写设备编码和名称');
      return;
    }

    setSaving(true);
    try {
      const url = editingEquipment ? `/api/system/equipment/${editingEquipment.id}` : '/api/system/equipment';
      const method = editingEquipment ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      if (data.code === 200) {
        alert(editingEquipment ? '更新成功' : '创建成功');
        handleCloseModal();
        fetchEquipments();
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
  const handleDelete = async (equipment: Equipment) => {
    if (!confirm(`确定删除设备 "${equipment.equipmentName}" 吗？`)) return;
    
    try {
      const res = await fetch(`/api/system/equipment/${equipment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200) {
        alert('删除成功');
        fetchEquipments();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return '正常';
      case 'maintenance': return '维护中';
      case 'broken': return '故障';
      case 'idle': return '闲置';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'maintenance': return 'bg-yellow-100 text-yellow-700';
      case 'broken': return 'bg-red-100 text-red-700';
      case 'idle': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold">设备管理</h1>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新建设备
        </button>
      </div>

      {/* 搜索和筛选 */}
      <div className="mb-4 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索设备名称或编码..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部班组</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.teamName}</option>
          ))}
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">设备编码</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">设备名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">所属班组</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">品牌/型号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">设备参数</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : equipments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              equipments.map((equipment) => (
                <tr key={equipment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{equipment.equipmentCode}</td>
                  <td className="px-4 py-3 text-sm font-medium">{equipment.equipmentName}</td>
                  <td className="px-4 py-3 text-sm">{equipment.team?.teamName || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {equipment.brand || '-'}{equipment.model ? ` / ${equipment.model}` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {equipment.parameters || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(equipment.status)}`}>
                      {getStatusLabel(equipment.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(equipment)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(equipment)}
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
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editingEquipment ? '编辑设备' : '新建设备'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    设备编码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.equipmentCode}
                    onChange={(e) => setFormData({...formData, equipmentCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="如: EQ001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    设备名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.equipmentName}
                    onChange={(e) => setFormData({...formData, equipmentName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="如: 激光切割机"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">设备类型</label>
                  <select
                    value={formData.equipmentType}
                    onChange={(e) => setFormData({...formData, equipmentType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="laser">激光切割机</option>
                    <option value="plasma">等离子切割机</option>
                    <option value="welding">焊接设备</option>
                    <option value="drilling">钻孔设备</option>
                    <option value="bending">折弯设备</option>
                    <option value="other">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">所属班组</label>
                  <select
                    value={formData.teamId || ''}
                    onChange={(e) => setFormData({...formData, teamId: e.target.value ? Number(e.target.value) : null})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择班组</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.teamName}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="如: 大族"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">型号</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="如: G3015H"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">设备参数</label>
                <textarea
                  value={formData.parameters}
                  onChange={(e) => setFormData({...formData, parameters: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="功率: 3000W, 加工范围: 3000x1500mm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">正常</option>
                  <option value="maintenance">维护中</option>
                  <option value="broken">故障</option>
                  <option value="idle">闲置</option>
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
