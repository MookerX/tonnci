"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { fetchApi } from "@/lib/utils/fetch";
import { PagePermission } from "@/components/AuthProvider";
import { PermissionGuard } from "@/components/PermissionGuard";

interface ConfigItem {
  id?: number;
  configKey: string;
  configValue: string;
  remark?: string;
}

export default function SystemConfigPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  
  // 系统名称
  const [systemName, setSystemName] = useState({ id: 0, configKey: 'system_name', configValue: '', remark: '系统名称' });
  
  // 编码规则
  const [encodingRules, setEncodingRules] = useState<Record<string, string>>({
    materialPrefix: '',
    orderPrefix: '',
    customerPrefix: '',
    purchasePrefix: '',
  });
  
  // 上传限制
  const [uploadLimits, setUploadLimits] = useState<Record<string, string>>({
    allowedFileTypes: '',
    maxFileSizeMB: '',
  });
  
  // 流程开关
  const [flowSwitches, setFlowSwitches] = useState<Record<string, string>>({
    enableProofread: 'false',
    enableAudit: 'false',
    enableCustomerProgress: 'false',
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        // 获取所有参数配置
        const res = await fetchApi("/api/system/config?type=param", { headers });
        if (res.code === 200 && res.data) {
          const configMap: Record<string, ConfigItem> = {};
          res.data.forEach((item: any) => {
            configMap[item.paramKey] = item;
          });
          
          // 系统名称
          if (configMap['system_name']) {
            setSystemName({
              id: configMap['system_name'].id,
              configKey: configMap['system_name'].paramKey,
              configValue: configMap['system_name'].paramValue,
              remark: configMap['system_name'].remark,
            });
          }
          
          // 编码规则
          setEncodingRules({
            materialPrefix: configMap['materialPrefix']?.paramValue || '',
            orderPrefix: configMap['orderPrefix']?.paramValue || '',
            customerPrefix: configMap['customerPrefix']?.paramValue || '',
            purchasePrefix: configMap['purchasePrefix']?.paramValue || '',
          });
          
          // 上传限制
          setUploadLimits({
            allowedFileTypes: configMap['allowedFileTypes']?.paramValue || '',
            maxFileSizeMB: configMap['maxFileSizeMB']?.paramValue || '',
          });
          
          // 流程开关
          setFlowSwitches({
            enableProofread: configMap['enableProofread']?.paramValue || 'false',
            enableAudit: configMap['enableAudit']?.paramValue || 'false',
            enableCustomerProgress: configMap['enableCustomerProgress']?.paramValue || 'false',
          });
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchConfig();
  }, []);

  // 保存单个配置项
  const saveConfig = async (configKey: string, configValue: string, remark?: string) => {
    try {
      const data = await fetchApi("/api/system/config", {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "param",
          data: { configKey, configValue, remark }
        })
      });
      if (data.code === 200) {
        success(`${remark || configKey} 保存成功`);
        return data.data;
      } else {
        error(`保存失败: ${data.message}`);
        return null;
      }
    } catch (e) { 
      error("保存失败");
      return null;
    }
  };

  // 保存系统名称
  const handleSaveSystemName = async () => {
    await saveConfig(systemName.configKey, systemName.configValue, '系统名称');
  };

  // 保存编码规则
  const handleSaveEncodingRules = async () => {
    for (const [key, value] of Object.entries(encodingRules)) {
      await saveConfig(key, value, key);
    }
    success("编码规则保存成功");
  };

  // 保存上传限制
  const handleSaveUploadLimits = async () => {
    for (const [key, value] of Object.entries(uploadLimits)) {
      await saveConfig(key, value, key === 'allowedFileTypes' ? '允许上传文件类型' : '单文件最大大小');
    }
    success("上传限制保存成功");
  };

  // 保存流程开关
  const handleSaveFlowSwitches = async () => {
    const names: Record<string, string> = {
      enableProofread: '启用校对流程',
      enableAudit: '启用审核流程',
      enableCustomerProgress: '客户可查看工序进度',
    };
    for (const [key, value] of Object.entries(flowSwitches)) {
      await saveConfig(key, value, names[key]);
    }
    success("流程开关保存成功");
  };

  if (loading) return <div className="p-8 text-center text-gray-400">加载中...</div>;

  return (
    <PagePermission permission="system:config:query">
      <div className="p-6">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">参数配置</h1>
        
        <div className="space-y-6">
          {/* 系统名称 */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">系统名称</h3>
              <PermissionGuard permission="system:config:update">
                <button 
                  onClick={handleSaveSystemName}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  保存
                </button>
              </PermissionGuard>
            </div>
            <div className="max-w-md">
              <input 
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={systemName.configValue}
                onChange={e => setSystemName({...systemName, configValue: e.target.value})}
                placeholder="请输入系统名称"
              />
            </div>
          </div>

          {/* 编码规则 */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">编码规则</h3>
              <PermissionGuard permission="system:config:update">
                <button 
                  onClick={handleSaveEncodingRules}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  保存
                </button>
              </PermissionGuard>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">物料编码前缀</label>
                <input 
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={encodingRules.materialPrefix}
                  onChange={e => setEncodingRules({...encodingRules, materialPrefix: e.target.value})}
                  placeholder="如: MAT"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">订单编码前缀</label>
                <input 
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={encodingRules.orderPrefix}
                  onChange={e => setEncodingRules({...encodingRules, orderPrefix: e.target.value})}
                  placeholder="如: ORD"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">客户编码前缀</label>
                <input 
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={encodingRules.customerPrefix}
                  onChange={e => setEncodingRules({...encodingRules, customerPrefix: e.target.value})}
                  placeholder="如: CUS"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">采购编码前缀</label>
                <input 
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={encodingRules.purchasePrefix}
                  onChange={e => setEncodingRules({...encodingRules, purchasePrefix: e.target.value})}
                  placeholder="如: PUR"
                />
              </div>
            </div>
          </div>

          {/* 上传限制 */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">上传限制</h3>
              <PermissionGuard permission="system:config:update">
                <button 
                  onClick={handleSaveUploadLimits}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  保存
                </button>
              </PermissionGuard>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">允许上传文件类型（逗号分隔）</label>
                <input 
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={uploadLimits.allowedFileTypes}
                  onChange={e => setUploadLimits({...uploadLimits, allowedFileTypes: e.target.value})}
                  placeholder=".pdf,.dwg,.xlsx,.doc"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">单文件最大大小(MB)</label>
                <input 
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={uploadLimits.maxFileSizeMB}
                  onChange={e => setUploadLimits({...uploadLimits, maxFileSizeMB: e.target.value})}
                  placeholder="如: 50"
                />
              </div>
            </div>
          </div>

          {/* 流程开关 */}
          <div className="bg-white rounded-lg border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">流程开关</h3>
              <PermissionGuard permission="system:config:update">
                <button 
                  onClick={handleSaveFlowSwitches}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  保存
                </button>
              </PermissionGuard>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="enableProofread"
                  checked={flowSwitches.enableProofread === 'true'}
                  onChange={e => setFlowSwitches({...flowSwitches, enableProofread: e.target.checked ? 'true' : 'false'})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="enableProofread" className="text-sm text-gray-700">启用校对流程</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="enableAudit"
                  checked={flowSwitches.enableAudit === 'true'}
                  onChange={e => setFlowSwitches({...flowSwitches, enableAudit: e.target.checked ? 'true' : 'false'})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="enableAudit" className="text-sm text-gray-700">启用审核流程</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="enableCustomerProgress"
                  checked={flowSwitches.enableCustomerProgress === 'true'}
                  onChange={e => setFlowSwitches({...flowSwitches, enableCustomerProgress: e.target.checked ? 'true' : 'false'})}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="enableCustomerProgress" className="text-sm text-gray-700">客户可查看工序进度</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PagePermission>
  );
}
