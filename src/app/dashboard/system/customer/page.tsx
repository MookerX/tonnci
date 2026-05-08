'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';

interface Customer {
  id?: number;
  customerCode: string;
  customerName: string;
  customerType: 'enterprise' | 'personal';
  invoiceInfo?: {
    companyName?: string;
    taxId?: string;
    address?: string;
    phone?: string;
    bankName?: string;
    bankAccount?: string;
  };
  contacts?: CustomerContact[];
  contactPerson?: string;
  contactPhone?: string;
  address?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerContact {
  id?: number;
  contactName: string;
  postType: string;
  postTypeName?: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
  remark?: string;
}

const postTypes = [
  { value: 'boss', label: '老板' },
  { value: 'finance', label: '财务' },
  { value: 'tech', label: '技术' },
  { value: 'quality', label: '质量' },
  { value: 'business', label: '商务' },
  { value: 'delivery', label: '交付' },
  { value: 'production', label: '生产' },
];

export default function CustomerPage() {
  const { success, error, warning } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showContactDetail, setShowContactDetail] = useState(false);
  const [selectedContact, setSelectedContact] = useState<CustomerContact | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingContacts, setEditingContacts] = useState<CustomerContact[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    customerName: '',
    customerType: 'enterprise' as 'enterprise' | 'personal',
    address: '',
    remark: '',
    invoiceInfo: {
      companyName: '',
      taxId: '',
      address: '',
      phone: '',
      bankName: '',
      bankAccount: '',
    },
  });
  const [contactForm, setContactForm] = useState({
    contactName: '',
    postType: 'business',
    phone: '',
    email: '',
    isPrimary: false,
    remark: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customer');
      const data = await res.json();
      if (data.code === 200) {
        // 兼容分页格式 { list, total } 和数组格式
        const list = data.data?.list || data.data || [];
        setCustomers(Array.isArray(list) ? list : []);
      }
    } catch (error) {
      console.error('获取客户列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async (customerId: number) => {
    try {
      const res = await fetch(`/api/customer/${customerId}/contact`);
      const data = await res.json();
      if (data.code === 200) {
        setEditingContacts(data.data || []);
      }
    } catch (error) {
      console.error('获取联系人失败:', error);
    }
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setForm({
        customerName: customer.customerName || '',
        customerType: customer.customerType || 'enterprise',
        address: customer.address || '',
        remark: customer.remark || '',
        invoiceInfo: {
          companyName: customer.invoiceInfo?.companyName || '',
          taxId: customer.invoiceInfo?.taxId || '',
          address: customer.invoiceInfo?.address || '',
          phone: customer.invoiceInfo?.phone || '',
          bankName: customer.invoiceInfo?.bankName || '',
          bankAccount: customer.invoiceInfo?.bankAccount || '',
        },
      });
    } else {
      setEditingCustomer(null);
      setForm({
        customerName: '',
        customerType: 'enterprise',
        address: '',
        remark: '',
        invoiceInfo: {
          companyName: '',
          taxId: '',
          address: '',
          phone: '',
          bankName: '',
          bankAccount: '',
        },
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const url = editingCustomer?.id ? `/api/customer/${editingCustomer.id}` : '/api/customer';
      const method = editingCustomer?.id ? 'PUT' : 'POST';

      const token = localStorage.getItem('token') || '';
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
        success(editingCustomer?.id ? '修改成功' : '添加成功');
        setShowModal(false);
        fetchCustomers();
      } else {
        error(data.message || '操作失败');
      }
    } catch (err) {
      console.error('保存失败:', err);
      error('保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/customer/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.code === 200) {
        success('删除成功');
        setDeleteConfirmId(null);
        fetchCustomers();
      } else {
        error(data.message || '删除失败');
      }
    } catch (err) {
      console.error('删除失败:', err);
      error('删除失败');
    }
  };

  const postTypeLabels: Record<string, string> = {
    boss: '老板',
    finance: '财务',
    tech: '技术',
    quality: '质量',
    business: '商务',
    delivery: '交付',
    production: '生产',
  };

  const handleViewContact = (contact: CustomerContact) => {
    setSelectedContact(contact);
    setShowContactDetail(true);
  };

  const handleAddContact = () => {
    setEditingContacts([
      ...editingContacts,
      {
        contactName: '',
        postType: 'business',
        phone: '',
        email: '',
        isPrimary: editingContacts.length === 0,
        remark: '',
      },
    ]);
  };

  const handleRemoveContact = (index: number) => {
    setEditingContacts(editingContacts.filter((_, i) => i !== index));
  };

  const handleContactChange = (index: number, field: string, value: any) => {
    const newContacts = [...editingContacts];
    newContacts[index] = { ...newContacts[index], [field]: value };

    // 如果设置为主要联系人，取消其他主要
    if (field === 'isPrimary' && value) {
      newContacts.forEach((c, i) => {
        if (i !== index) c.isPrimary = false;
      });
    }

    setEditingContacts(newContacts);
  };

  const handleSaveContacts = async () => {
    if (!currentCustomer?.id) return;

    // 验证联系人数据
    for (let i = 0; i < editingContacts.length; i++) {
      const c = editingContacts[i];
      if (!c.contactName.trim()) {
        warning(`第${i + 1}个联系人姓名不能为空`);
        return;
      }
      if (c.phone && !/^[\d\-+\s()]{7,20}$/.test(c.phone)) {
        warning(`第${i + 1}个联系人电话格式不正确`);
        return;
      }
      if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) {
        warning(`第${i + 1}个联系人邮箱格式不正确`);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/customer/${currentCustomer.id}/contact`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ contacts: editingContacts }),
      });

      const data = await res.json();
      if (data.code === 200) {
        success('保存成功');
        setShowContactModal(false);
        fetchCustomers();
      } else {
        error(data.message || '保存失败');
      }
    } catch (err) {
      console.error('保存联系人失败:', err);
      error('保存失败');
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return (
      c.customerName?.toLowerCase().includes(kw) ||
      c.customerCode?.toLowerCase().includes(kw)
    );
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">客户管理</h1>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          新增客户
        </button>
      </div>

      {/* 搜索框 */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索客户名称、编码、联系人..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 客户列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客户编码</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客户名称</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">联系人</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">创建时间</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800">{customer.customerCode}</td>
                <td className="px-4 py-3 text-sm text-gray-800 font-medium">{customer.customerName}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs ${
                    customer.customerType === 'enterprise'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {customer.customerType === 'enterprise' ? '企业' : '个人'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {customer.contacts && customer.contacts.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {customer.contacts.map((contact, idx) => (
                        <button
                          key={contact.id || idx}
                          onClick={() => handleViewContact(contact)}
                          className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          title={`${contact.contactName}${contact.postType ? ` - ${postTypeLabels[contact.postType] || contact.postType}` : ''}${contact.phone ? ` (${contact.phone})` : ''}`}
                        >
                          {contact.contactName}
                          {contact.postType ? `(${postTypeLabels[contact.postType] || contact.postType})` : ''}
                          {contact.isPrimary && <span className="text-red-500 ml-1">*</span>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>

                <td className="px-4 py-3 text-sm text-gray-500">
                  {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setCurrentCustomer(customer);
                        setEditingContacts(customer.contacts || []);
                        setShowContactModal(true);
                      }}
                      className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                    >
                      管理联系人
                    </button>
                    <button
                      onClick={() => handleOpenModal(customer)}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => customer.id && setDeleteConfirmId(customer.id)}
                      className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 客户编辑弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold">{editingCustomer?.id ? '编辑客户' : '新增客户'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本信息 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">客户名称 *</label>
                    <input
                      type="text"
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">客户类型 *</label>
                    <select
                      value={form.customerType}
                      onChange={(e) => setForm({ ...form, customerType: e.target.value as 'enterprise' | 'personal' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="enterprise">企业</option>
                      <option value="personal">个人</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">地址</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">备注</label>
                    <textarea
                      value={form.remark}
                      onChange={(e) => setForm({ ...form, remark: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 开票信息 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">开票信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">单位名称</label>
                    <input
                      type="text"
                      value={form.invoiceInfo.companyName}
                      onChange={(e) => setForm({
                        ...form,
                        invoiceInfo: { ...form.invoiceInfo, companyName: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">纳税人识别号</label>
                    <input
                      type="text"
                      value={form.invoiceInfo.taxId}
                      onChange={(e) => setForm({
                        ...form,
                        invoiceInfo: { ...form.invoiceInfo, taxId: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">注册地址</label>
                    <input
                      type="text"
                      value={form.invoiceInfo.address}
                      onChange={(e) => setForm({
                        ...form,
                        invoiceInfo: { ...form.invoiceInfo, address: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">联系电话</label>
                    <input
                      type="text"
                      value={form.invoiceInfo.phone}
                      onChange={(e) => setForm({
                        ...form,
                        invoiceInfo: { ...form.invoiceInfo, phone: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">开户银行</label>
                    <input
                      type="text"
                      value={form.invoiceInfo.bankName}
                      onChange={(e) => setForm({
                        ...form,
                        invoiceInfo: { ...form.invoiceInfo, bankName: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">银行账号</label>
                    <input
                      type="text"
                      value={form.invoiceInfo.bankAccount}
                      onChange={(e) => setForm({
                        ...form,
                        invoiceInfo: { ...form.invoiceInfo, bankAccount: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
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

      {/* 联系人详情弹窗 */}
      {showContactDetail && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md m-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">联系人详情</h3>
              <button onClick={() => setShowContactDetail(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">姓名</label>
                  <p className="mt-1 text-gray-900">{selectedContact.contactName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">岗位</label>
                  <p className="mt-1 text-gray-900">{selectedContact.postType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">联系电话</label>
                  <p className="mt-1 text-gray-900">{selectedContact.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">邮箱</label>
                  <p className="mt-1 text-gray-900">{selectedContact.email || '-'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-500">备注</label>
                  <p className="mt-1 text-gray-900">{selectedContact.remark || '-'}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowContactDetail(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 联系人管理弹窗 */}
      {showContactModal && currentCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-bold">联系人管理 - {currentCustomer.customerName}</h3>
              <button onClick={() => setShowContactModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="p-6">
              <button
                onClick={handleAddContact}
                className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                + 添加联系人
              </button>

              <div className="space-y-4">
                {editingContacts.map((contact, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-medium text-gray-700">联系人 {index + 1}</span>
                      <button
                        onClick={() => handleRemoveContact(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">姓名 *</label>
                        <input
                          type="text"
                          value={contact.contactName}
                          onChange={(e) => handleContactChange(index, 'contactName', e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">岗位 *</label>
                        <select
                          value={contact.postType}
                          onChange={(e) => handleContactChange(index, 'postType', e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {postTypes.map((pt) => (
                            <option key={pt.value} value={pt.value}>{pt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">电话</label>
                        <input
                          type="tel"
                          value={contact.phone || ''}
                          onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                          placeholder="手机号或固话"
                          className={`w-full px-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                            contact.phone && !/^[\d\-+\s()]{7,20}$/.test(contact.phone)
                              ? 'border-red-400 bg-red-50'
                              : 'border-gray-300'
                          }`}
                        />
                        {contact.phone && !/^[\d\-+\s()]{7,20}$/.test(contact.phone) && (
                          <p className="text-xs text-red-500 mt-0.5">请输入有效的电话号码</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">邮箱</label>
                        <input
                          type="email"
                          value={contact.email || ''}
                          onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                          placeholder="example@mail.com"
                          className={`w-full px-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                            contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
                              ? 'border-red-400 bg-red-50'
                              : 'border-gray-300'
                          }`}
                        />
                        {contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && (
                          <p className="text-xs text-red-500 mt-0.5">请输入有效的邮箱地址</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">备注</label>
                        <input
                          type="text"
                          value={contact.remark || ''}
                          onChange={(e) => handleContactChange(index, 'remark', e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={contact.isPrimary || false}
                            onChange={(e) => handleContactChange(index, 'isPrimary', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-gray-700">设为主要联系人</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                {editingContacts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    暂无联系人，点击上方按钮添加
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
              <button
                onClick={() => setShowContactModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSaveContacts}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存联系人
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">确认删除</h3>
            </div>
            <div className="px-6 py-6">
              <p className="text-gray-600">确定要删除该客户吗？此操作不可恢复。</p>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
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
    </div>
  );
}
