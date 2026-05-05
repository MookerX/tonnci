'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Building2, User, Phone, MapPin, FileText } from 'lucide-react';

interface Customer {
  id: number;
  customerCode: string;
  customerName: string;
  customerType: 'enterprise' | 'personal';
  // 开票信息
  invoiceTitle?: string;      // 发票抬头
  taxNumber?: string;         // 纳税人识别号
  bankName?: string;          // 开户银行
  bankAccount?: string;       // 银行账号
  registerAddress?: string;   // 注册地址
  registerPhone?: string;     // 注册电话
  // 联系信息
  contactPerson?: string;      // 联系人
  contactPhone?: string;       // 联系电话
  contactMobile?: string;      // 手机
  contactEmail?: string;       // 邮箱
  address?: string;            // 地址
  // 其他
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
  creator?: { realName: string };
  updater?: { realName: string };
}

interface FormData {
  customerName: string;
  customerType: 'enterprise' | 'personal';
  invoiceTitle: string;
  taxNumber: string;
  bankName: string;
  bankAccount: string;
  registerAddress: string;
  registerPhone: string;
  contactPerson: string;
  contactPhone: string;
  contactMobile: string;
  contactEmail: string;
  address: string;
  remark: string;
}

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'invoice' | 'contact'>('basic');
  const pageSize = 20;

  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerType: 'enterprise',
    invoiceTitle: '',
    taxNumber: '',
    bankName: '',
    bankAccount: '',
    registerAddress: '',
    registerPhone: '',
    contactPerson: '',
    contactPhone: '',
    contactMobile: '',
    contactEmail: '',
    address: '',
    remark: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [currentPage]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
      });
      if (searchKeyword) {
        params.append('keyword', searchKeyword);
      }

      const res = await fetch(`/api/customer?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.code === 200) {
        setCustomers(data.data.list || []);
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchCustomers();
  };

  const handleAdd = () => {
    setEditingCustomer(null);
    setFormData({
      customerName: '',
      customerType: 'enterprise',
      invoiceTitle: '',
      taxNumber: '',
      bankName: '',
      bankAccount: '',
      registerAddress: '',
      registerPhone: '',
      contactPerson: '',
      contactPhone: '',
      contactMobile: '',
      contactEmail: '',
      address: '',
      remark: '',
    });
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      customerName: customer.customerName || '',
      customerType: customer.customerType || 'enterprise',
      invoiceTitle: customer.invoiceTitle || '',
      taxNumber: customer.taxNumber || '',
      bankName: customer.bankName || '',
      bankAccount: customer.bankAccount || '',
      registerAddress: customer.registerAddress || '',
      registerPhone: customer.registerPhone || '',
      contactPerson: customer.contactPerson || '',
      contactPhone: customer.contactPhone || '',
      contactMobile: (customer as any).contactMobile || '',
      contactEmail: (customer as any).contactEmail || '',
      address: customer.address || '',
      remark: customer.remark || '',
    });
    setActiveTab('basic');
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除该客户吗？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/customer/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (data.code === 200) {
        alert('删除成功');
        fetchCustomers();
      } else {
        alert(data.message || '删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleSubmit = async () => {
    if (!formData.customerName.trim()) {
      alert('请输入客户名称');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingCustomer 
        ? `/api/customer/${editingCustomer.id}` 
        : '/api/customer';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.code === 200) {
        alert(editingCustomer ? '修改成功' : '添加成功');
        setShowModal(false);
        fetchCustomers();
      } else {
        alert(data.message || '操作失败');
      }
    } catch (error) {
      alert('操作失败');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">客户管理</h1>
      </div>

      {/* 搜索栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索客户名称、编码、联系人..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>
          <button
            onClick={handleAdd}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新增客户
          </button>
        </div>
      </div>

      {/* 客户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户编码</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系人</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系电话</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">地址</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{customer.customerCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{customer.customerName}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      customer.customerType === 'enterprise' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {customer.customerType === 'enterprise' ? '企业' : '个人'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{customer.contactPerson || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{customer.contactPhone || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{customer.address || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-500">
              第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {editingCustomer ? '编辑客户' : '新增客户'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            {/* Tab 切换 */}
            <div className="px-6 py-3 border-b flex gap-6">
              <button
                onClick={() => setActiveTab('basic')}
                className={`pb-2 text-sm font-medium ${
                  activeTab === 'basic' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                基本信息
              </button>
              <button
                onClick={() => setActiveTab('invoice')}
                className={`pb-2 text-sm font-medium flex items-center gap-1 ${
                  activeTab === 'invoice' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                开票信息
              </button>
              <button
                onClick={() => setActiveTab('contact')}
                className={`pb-2 text-sm font-medium flex items-center gap-1 ${
                  activeTab === 'contact' 
                    ? 'text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Phone className="w-4 h-4" />
                联系信息
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {/* 基本信息 */}
              {activeTab === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="text-red-500">*</span> 客户名称
                    </label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入客户名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      客户类型
                    </label>
                    <select
                      value={formData.customerType}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        customerType: e.target.value as 'enterprise' | 'personal',
                        // 企业类型自动填充发票抬头
                        invoiceTitle: e.target.value === 'enterprise' && !formData.invoiceTitle 
                          ? formData.customerName 
                          : formData.invoiceTitle
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="enterprise">企业</option>
                      <option value="personal">个人</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      备注
                    </label>
                    <textarea
                      value={formData.remark}
                      onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入备注信息"
                    />
                  </div>
                </div>
              )}

              {/* 开票信息 */}
              {activeTab === 'invoice' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    完善开票信息，方便后续开具发票
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Building2 className="w-4 h-4 inline mr-1" />
                        发票抬头
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceTitle}
                        onChange={(e) => setFormData({ ...formData, invoiceTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入发票抬头"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        纳税人识别号
                      </label>
                      <input
                        type="text"
                        value={formData.taxNumber}
                        onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入纳税人识别号"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        开户银行
                      </label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入开户银行"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        银行账号
                      </label>
                      <input
                        type="text"
                        value={formData.bankAccount}
                        onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入银行账号"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        注册地址
                      </label>
                      <input
                        type="text"
                        value={formData.registerAddress}
                        onChange={(e) => setFormData({ ...formData, registerAddress: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入注册地址"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        注册电话
                      </label>
                      <input
                        type="text"
                        value={formData.registerPhone}
                        onChange={(e) => setFormData({ ...formData, registerPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入注册电话"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 联系信息 */}
              {activeTab === 'contact' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    完善联系信息，方便业务沟通
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <User className="w-4 h-4 inline mr-1" />
                        联系人
                      </label>
                      <input
                        type="text"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入联系人姓名"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Phone className="w-4 h-4 inline mr-1" />
                        联系电话
                      </label>
                      <input
                        type="text"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入联系电话"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        手机号码
                      </label>
                      <input
                        type="text"
                        value={formData.contactMobile}
                        onChange={(e) => setFormData({ ...formData, contactMobile: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入手机号码"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        电子邮箱
                      </label>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入电子邮箱"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        地址
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="请输入详细地址"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
