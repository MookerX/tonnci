'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';

interface CustomerGroup {
  id: number;
  groupCode: string;
  groupName: string;
  description: string;
  status: string;
  customerCount: number;
  createdAt: string;
  createdBy: number;
}

export default function CustomerGroupPage() {
  const { success, error } = useToast();
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  // 弹窗状态
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [form, setForm] = useState({
    groupName: '',
    description: '',
    status: 'active',
  });

  // 群组详情
  const [showDetail, setShowDetail] = useState(false);
  const [detailGroup, setDetailGroup] = useState<any>(null);

  useEffect(() => {
    fetchGroups();
  }, [page, keyword]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        keyword,
      });
      const res = await fetch(`/api/customer-group?${params}`);
      const data = await res.json();
      if (data.code === 200) {
        setGroups(data.data.list || []);
        setTotal(data.data.total || 0);
      }
    } catch (e: any) {
      error('获取群组列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (group?: CustomerGroup) => {
    if (group) {
      setEditingGroup(group);
      setForm({
        groupName: group.groupName,
        description: group.description || '',
        status: group.status,
      });
    } else {
      setEditingGroup(null);
      setForm({ groupName: '', description: '', status: 'active' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.groupName.trim()) {
      error('群组名称不能为空');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const url = editingGroup ? `/api/customer-group/${editingGroup.id}` : '/api/customer-group';
      const method = editingGroup ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.code === 200) {
        success(editingGroup ? '修改成功' : '添加成功');
        setShowModal(false);
        fetchGroups();
      } else {
        error(data.message || '操作失败');
      }
    } catch (e: any) {
      error('操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/customer-group/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        success('删除成功');
        setDeleteConfirmId(null);
        fetchGroups();
      } else {
        error(data.message || '删除失败');
      }
    } catch (e: any) {
      error('删除失败');
    }
  };

  const handleViewDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/customer-group/${id}`);
      const data = await res.json();
      if (data.code === 200) {
        setDetailGroup(data.data);
        setShowDetail(true);
      }
    } catch (e: any) {
      error('获取详情失败');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">客户群组管理</h1>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          + 新增群组
        </button>
      </div>

      {/* 搜索栏 */}
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
          placeholder="搜索群组编码、名称..."
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 w-64"
        />
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">群组编码</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">群组名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客户数</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">描述</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">创建时间</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">加载中...</td></tr>
            ) : groups.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">暂无数据</td></tr>
            ) : (
              groups.map(group => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-800 font-mono">{group.groupCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{group.groupName}</td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleViewDetail(group.id)}
                      className="text-blue-600 hover:underline"
                    >
                      {group.customerCount} 个客户
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{group.description || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      group.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {group.status === 'active' ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(group.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(group)}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(group.id)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editingGroup ? '编辑群组' : '新增群组'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">群组名称 *</label>
                <input
                  type="text"
                  value={form.groupName}
                  onChange={(e) => setForm({ ...form, groupName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入群组名称"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="同一群组内的客户共用同一套技术资料"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">状态</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">启用</option>
                  <option value="disabled">禁用</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-3">确认删除</h3>
            <p className="text-gray-600 mb-6">确定要删除该群组吗？群组内有客户时无法删除。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 群组详情弹窗 */}
      {showDetail && detailGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">{detailGroup.groupName} - 客户列表</h2>
            <div className="text-sm text-gray-500 mb-3">
              编码：{detailGroup.groupCode} | 描述：{detailGroup.description || '无'}
            </div>
            {detailGroup.customers && detailGroup.customers.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">客户编码</th>
                    <th className="px-3 py-2 text-left">客户名称</th>
                    <th className="px-3 py-2 text-left">类型</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {detailGroup.customers.map((c: any) => (
                    <tr key={c.id}>
                      <td className="px-3 py-2 font-mono">{c.customerCode}</td>
                      <td className="px-3 py-2">{c.customerName}</td>
                      <td className="px-3 py-2">{c.customerType === 'enterprise' ? '企业' : '个人'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400 text-center py-4">该群组暂无客户</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => { setShowDetail(false); setDetailGroup(null); }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
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
