import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/response';
import { jwtTokenManager, hashPassword } from '@/lib/auth/jwt';

/**
 * 系统初始化设置接口
 * 首次启动时配置超级管理员等信息
 */

// 参数校验
function validateParams(data: any): { valid: boolean; message?: string } {
  // 支持两种数据格式：扁平结构 adminUsername 或嵌套结构 admin.username
  const username = data.adminUsername || data.admin?.username;
  const password = data.adminPassword || data.admin?.password;
  const realName = data.adminRealName || data.admin?.realName;
  const phone = data.adminPhone || data.admin?.phone;
  const email = data.adminEmail || data.admin?.email;
  
  if (!username || username.length < 2) {
    return { valid: false, message: '管理员用户名至少2个字符' };
  }
  if (!password || password.length < 6) {
    return { valid: false, message: '管理员密码至少6个字符' };
  }
  if (!realName) {
    return { valid: false, message: '请输入管理员姓名' };
  }
  // 手机号格式校验（可选）
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    return { valid: false, message: '手机号格式不正确' };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求参数
    let data: any;
    try {
      data = await request.json();
    } catch {
      return errorResponse('无效的请求参数', 400);
    }

    // 2. 参数校验
    const validation = validateParams(data);
    if (!validation.valid) {
      return errorResponse(400, validation.message!);
    }

    // 3. 检查系统是否已初始化
    const existingInit = await prisma.systemInitStatus.findFirst({
      orderBy: { id: 'desc' },
    });

    if (existingInit?.stepStatus === 'completed') {
      return errorResponse(403, '系统已初始化，无法重复配置');
    }

    // 4. 开启事务执行初始化
    await prisma.$transaction(async (tx) => {
      // 4.1 创建超级管理员角色
      const superAdminRole = await tx.role.create({
        data: {
          roleCode: 'super_admin',
          roleName: '超级管理员',
          dataScope: 'all',
          status: 'active',
          sortOrder: 1,
          remark: '系统内置超级管理员角色，拥有全部权限',
        },
      });

      // 4.2 创建默认部门（公司总部）
      const defaultDept = await tx.dept.create({
        data: {
          deptCode: 'HQ',
          deptName: '公司总部',
          sortOrder: 0,
          status: 'active',
          remark: '系统默认顶级部门',
        },
      });

      // 4.3 创建超级管理员用户
      const username = data.adminUsername || data.admin?.username;
      const password = data.adminPassword || data.admin?.password;
      const realName = data.adminRealName || data.admin?.realName;
      const phone = data.adminPhone || data.admin?.phone;
      const email = data.adminEmail || data.admin?.email;
      
      const hashedPassword = await hashPassword(password);
      await tx.user.create({
        data: {
          uuid: crypto.randomUUID(),
          username: username,
          password: hashedPassword,
          realName: realName,
          phone: phone || null,
          email: email || null,
          deptId: defaultDept.id,
          roleIds: JSON.stringify([superAdminRole.id]),
          userType: 'internal',
          status: 'active',
        },
      });

      // 4.4 创建默认菜单
      const menus = [
        { menuName: '首页', menuCode: 'home', path: '/dashboard', icon: 'Home' },
        { menuName: '系统管理', menuCode: 'system', path: '/system', icon: 'Setting' },
        { menuName: '用户管理', menuCode: 'system:user', path: '/system/user', icon: 'User' },
        { menuName: '角色管理', menuCode: 'system:role', path: '/system/role', icon: 'Key' },
        { menuName: '部门管理', menuCode: 'system:dept', path: '/system/dept', icon: 'Office' },
        { menuName: '技术管理', menuCode: 'tech', path: '/tech', icon: 'Tools' },
        { menuName: 'BOM管理', menuCode: 'tech:bom', path: '/tech/bom', icon: 'Document' },
        { menuName: '工艺管理', menuCode: 'tech:process', path: '/tech/process', icon: 'Process' },
        { menuName: '订单管理', menuCode: 'order', path: '/order', icon: 'Document' },
        { menuName: '生产管理', menuCode: 'production', path: '/production', icon: 'Factory' },
        { menuName: '质量管理', menuCode: 'quality', path: '/quality', icon: 'Check' },
        { menuName: '采购管理', menuCode: 'purchase', path: '/purchase', icon: 'ShoppingCart' },
        { menuName: '仓库管理', menuCode: 'warehouse', path: '/warehouse', icon: 'Warehouse' },
        { menuName: '发货管理', menuCode: 'delivery', path: '/delivery', icon: 'Van' },
        { menuName: '财务对账', menuCode: 'finance', path: '/finance', icon: 'Money' },
        { menuName: '工资管理', menuCode: 'wage', path: '/wage', icon: 'Salary' },
        { menuName: '客户管理', menuCode: 'customer', path: '/customer', icon: 'User' },
      ];

      for (const menu of menus) {
        await tx.menu.create({
          data: {
            menuName: menu.menuName,
            menuCode: menu.menuCode,
            menuType: 'menu',
            path: menu.path,
            icon: menu.icon || null,
            sortOrder: 0,
            status: 'active',
          },
        });
      }

      // 4.5 创建默认数据字典
      const dictData = [
        { dictType: 'material_type', dictLabel: '零件', dictValue: 'part', sortOrder: 1 },
        { dictType: 'material_type', dictLabel: '组件', dictValue: 'component', sortOrder: 2 },
        { dictType: 'material_type', dictLabel: '原材料', dictValue: 'raw_material', sortOrder: 3 },
        { dictType: 'material_type', dictLabel: '外购件', dictValue: 'purchased', sortOrder: 4 },
        { dictType: 'material_type', dictLabel: '标准件', dictValue: 'standard', sortOrder: 5 },
        { dictType: 'material_type', dictLabel: '辅材', dictValue: 'auxiliary', sortOrder: 6 },
        { dictType: 'order_status', dictLabel: '待处理', dictValue: 'pending', sortOrder: 1 },
        { dictType: 'order_status', dictLabel: '在制中', dictValue: 'in_production', sortOrder: 2 },
        { dictType: 'order_status', dictLabel: '暂停中', dictValue: 'paused', sortOrder: 3 },
        { dictType: 'order_status', dictLabel: '已完成', dictValue: 'completed', sortOrder: 4 },
        { dictType: 'order_status', dictLabel: '已取消', dictValue: 'cancelled', sortOrder: 5 },
        { dictType: 'task_status', dictLabel: '待处理', dictValue: 'pending', sortOrder: 1 },
        { dictType: 'task_status', dictLabel: '处理中', dictValue: 'processing', sortOrder: 2 },
        { dictType: 'task_status', dictLabel: '已完成', dictValue: 'completed', sortOrder: 3 },
        { dictType: 'gender', dictLabel: '男', dictValue: 'male', sortOrder: 1 },
        { dictType: 'gender', dictLabel: '女', dictValue: 'female', sortOrder: 2 },
        { dictType: 'gender', dictLabel: '未知', dictValue: 'unknown', sortOrder: 3 },
        { dictType: 'customer_type', dictLabel: '企业', dictValue: 'enterprise', sortOrder: 1 },
        { dictType: 'customer_type', dictLabel: '个人', dictValue: 'personal', sortOrder: 2 },
      ];

      for (const dict of dictData) {
        await tx.systemDict.create({
          data: {
            dictType: dict.dictType,
            dictLabel: dict.dictLabel,
            dictValue: dict.dictValue,
            sortOrder: dict.sortOrder,
            status: 'active',
          },
        });
      }

      // 4.6 创建系统参数配置
      const configs = [
        { paramKey: 'storage_path', paramValue: data.storagePath || '/workspace/projects/storage', paramType: 'string', remark: '本地存储路径' },
        { paramKey: 'order_no_prefix', paramValue: 'DD', paramType: 'string', remark: '订单号前缀' },
        { paramKey: 'material_no_prefix', paramValue: 'M', paramType: 'string', remark: '物料编码前缀规则' },
        { paramKey: 'customer_no_prefix', paramValue: 'KH', paramType: 'string', remark: '客户编码前缀' },
        { paramKey: 'tech_task_enabled', paramValue: 'true', paramType: 'boolean', remark: '是否开启技术任务流程' },
        { paramKey: 'quality_check_enabled', paramValue: 'true', paramType: 'boolean', remark: '是否开启质检流程' },
        { paramKey: 'auto_lock_material', paramValue: 'true', paramType: 'boolean', remark: '是否自动锁定原材料' },
      ];

      for (const config of configs) {
        await tx.systemConfig.create({
          data: {
            paramKey: config.paramKey,
            paramValue: config.paramValue,
            paramType: config.paramType,
            remark: config.remark,
          },
        });
      }

      // 4.7 创建默认客户（用于测试）
      await tx.customer.create({
        data: {
          customerCode: 'KH000001',
          customerName: '测试客户',
          customerType: 'enterprise',
          status: 'active',
        },
      });

      // 4.8 更新系统初始化状态
      await tx.systemInitStatus.create({
        data: {
          initStep: 'complete',
          stepStatus: 'completed',
          completedAt: new Date(),
          configData: JSON.stringify({
            adminUsername: data.adminUsername,
            storagePath: data.storagePath || '/workspace/projects/storage',
          }),
        },
      });
    });

    return successResponse(null, '系统初始化完成');
  } catch (error: any) {
    console.error('System init error:', error);
    
    // 处理 Prisma 验证错误
    if (error.code === 'P2009' || error.code === 'P2012') {
      return errorResponse(400, `数据验证错误: ${error.message}`);
    }
    
    return serverErrorResponse();
  }
}
