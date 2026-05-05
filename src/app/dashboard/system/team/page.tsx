'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit2, Trash2, X, Search, CheckCircle,
  UsersRound
} from 'lucide-react';

interface Dept {
  id: number;
  deptName: string;
}

interface Team {
  id: number;
  teamName: string;
  teamCode: string;
  deptId: number | null;
  dept?: Dept;
  leaderName: string;
  memberCount: number;
  status: string;
  createdAt: string;
  createdByName?: string;
}

interface FormData {
  teamName: string;
  teamCode: string;
  deptId: number | null;
  leaderName: string;
  status: string;
  remark: string;
}

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [keyword, setKeyword] = useState('');
  const [formData, setFormData] = useState<FormData>({
    teamName: '',
    teamCode: '',
    deptId: null,
    leaderName: '',
    status: 'active',
    remark: '',
  });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // 获取班组列表
  const fetchTeams = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // 获取部门列表
  const fetchDepts = async () => {
    try {
      const res = await fetch('/api/system/dept', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200) {
        setDepts(data.data || []);
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchDepts();
  }, []);

  // 过滤班组
  const filteredTeams = teams.filter(team => {
    if (!keyword) return true;
    return team.teamName.includes(keyword) || team.teamCode.includes(keyword);
  });

  // 打开弹窗
  const handleOpenModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        teamName: team.teamName,
        teamCode: team.teamCode,
        deptId: team.deptId,
        leaderName: team.leaderName,
        status: team.status,
        remark: '',
      });
    } else {
      setEditingTeam(null);
      setFormData({
        teamName: '',
        teamCode: '',
        deptId: null,
        leaderName: '',
        status: 'active',
        remark: '',
      });
    }
    setShowModal(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTeam(null);
    setFormData({
      teamName: '',
      teamCode: '',
      deptId: null,
      leaderName: '',
      status: 'active',
      remark: '',
    });
  };

  // 保存
  const handleSubmit = async () => {
    if (!formData.teamName || !formData.teamCode) {
      alert('请填写班组名称和编码');
      return;
    }

    setSaving(true);
    try {
      const url = editingTeam ? `/api/system/team/${editingTeam.id}` : '/api/system/team';
      const method = editingTeam ? 'PUT' : 'POST';
      
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
        alert(editingTeam ? '更新成功' : '创建成功');
        handleCloseModal();
        fetchTeams();
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
  const handleDelete = async (team: Team) => {
    if (!confirm(`确定删除班组 "${team.teamName}" 吗？`)) return;
    
    try {
      const res = await fetch(`/api/system/team/${team.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code === 200) {
        alert('删除成功');
        fetchTeams();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UsersRound className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-bold">班组管理</h1>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          新建班组
        </button>
      </div>

      {/* 搜索 */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索班组名称或编码..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">班组编码</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">班组名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">所属部门</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">负责人</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">成员数</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">创建时间</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : filteredTeams.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              filteredTeams.map((team) => (
                <tr key={team.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{team.teamCode}</td>
                  <td className="px-4 py-3 text-sm font-medium">{team.teamName}</td>
                  <td className="px-4 py-3 text-sm">{team.dept?.deptName || '-'}</td>
                  <td className="px-4 py-3 text-sm">{team.leaderName || '-'}</td>
                  <td className="px-4 py-3 text-sm">{team.memberCount || 0}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      team.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {team.status === 'active' ? '正常' : '停用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(team.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(team)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(team)}
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
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                {editingTeam ? '编辑班组' : '新建班组'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  班组编码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.teamCode}
                  onChange={(e) => setFormData({...formData, teamCode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="如: TEAM001"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  班组名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.teamName}
                  onChange={(e) => setFormData({...formData, teamName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="如: 切割班组"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所属部门</label>
                <select
                  value={formData.deptId || ''}
                  onChange={(e) => setFormData({...formData, deptId: e.target.value ? Number(e.target.value) : null})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择部门</option>
                  {depts.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.deptName}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">负责人</label>
                <input
                  type="text"
                  value={formData.leaderName}
                  onChange={(e) => setFormData({...formData, leaderName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入负责人姓名"
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
