# 腾曦生产管理系统 - AGENTS.md

## 项目概览

腾曦生产管理系统是一个企业级生产管理平台，采用 Next.js 15 + TypeScript + Prisma ORM + MySQL 架构，支持分布式多数据库、多NAS存储。

### 技术栈

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **ORM**: Prisma
- **Database**: MySQL 8.0+
- **Auth**: JWT

## 目录结构

```
├── prisma/
│   └── schema.prisma          # 数据库模型定义
├── src/
│   ├── app/
│   │   └── api/               # API路由
│   │       ├── auth/          # 认证相关
│   │       ├── system/        # 系统管理
│   │       ├── user/          # 用户管理
│   │       ├── bom/           # BOM管理
│   │       ├── order/         # 订单管理
│   │       ├── production/    # 生产管理
│   │       ├── quality/       # 质量管理
│   │       ├── purchase/      # 采购管理
│   │       ├── inventory/     # 库存管理
│   │       ├── delivery/      # 发货管理
│   │       ├── accounting/    # 财务管理
│   │       ├── wages/         # 工资管理
│   │       ├── process/       # 工艺管理
│   │       ├── tech-task/     # 技术任务池
│   │       ├── customer/     # 客户管理
│   │       └── customer-portal/ # 客户进度查询
│   ├── lib/
│   │   ├── prisma.ts          # Prisma客户端
│   │   ├── response.ts        # 统一响应
│   │   ├── auth/              # 认证模块
│   │   └── services/          # 公共服务
│   └── components/            # UI组件
└── package.json
```

## 环境变量

```env
DATABASE_URL=mysql://user:password@host:3306/database
JWT_SECRET=your-jwt-secret-key
LOCAL_STORAGE_PATH=/workspace/projects/storage
```

## 本地开发环境搭建

从 git clone 到本地后，需完成以下步骤：

```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量配置文件并修改
cp .env.example .env
# 编辑 .env，填入 MySQL 连接信息、JWT 密钥等

# 3. 确保 MySQL 服务运行中，创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS tengxi_pms DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. 生成 Prisma 客户端
pnpm prisma generate

# 5. 推送数据库 schema
pnpm prisma db push

# 6. 启动开发服务器
pnpm dev

# 7. 访问 http://localhost:5000 进行系统初始化
```

**操作注意事项：**

- **清空数据库数据前必须确认**：任何涉及删除数据库数据的操作（如 `prisma db push --force-reset`、手动 DELETE SQL 等），必须先与用户确认，获得同意后再执行。
- **优先使用非破坏性命令**：同步数据库结构优先使用 `prisma db push`，避免使用 `--force-reset` 参数。

**常见问题：**

- `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`：通常是数据库未启动或 .env 未配置，API 返回 HTML 错误页而非 JSON。请检查 MySQL 连接和 .env 配置。
- `PrismaClient is not configured`：运行 `pnpm prisma generate` 生成客户端。
- 端口冲突：默认使用 5000 端口，可在启动命令中修改。

## 开发命令

```bash
# 安装依赖
pnpm install

# 生成Prisma客户端
pnpm prisma generate

# 推送数据库 schema
pnpm prisma db push

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## API 规范

### 统一响应格式

```typescript
{
  code: 200 | 400 | 401 | 403 | 500,
  message: "操作提示",
  data: any
}
```

### 认证

所有需要认证的接口需要在请求头中添加：
```
Authorization: Bearer <token>
```

## 核心模块

### 1. 系统初始化
- `POST /api/system/init/setup` - 完成系统初始化配置（幂等设计，可重复调用）

### 2. 用户与权限管理
- `GET/POST /api/system/user` - 用户列表/创建
- `PUT/DELETE /api/system/user/[id]` - 更新/删除用户
- `GET/POST /api/system/dept` - 部门管理
- `GET/POST /api/system/role` - 角色管理
- `GET/POST /api/system/menu` - 菜单管理

### 3. 数据库配置（分布式多数据库）
- `GET /api/system/database` - 获取数据库配置列表
- `POST /api/system/database` - 创建数据库配置
- `GET /api/system/database/[id]` - 获取数据库配置详情
- `PUT /api/system/database/[id]` - 更新数据库配置
- `DELETE /api/system/database/[id]` - 删除数据库配置

### 4. 存储配置（NAS/本地存储）
- `GET /api/system/storage` - 获取存储设备列表
- `POST /api/system/storage` - 创建/测试存储设备
- `PUT /api/system/storage` - 更新存储设备
- `DELETE /api/system/storage` - 删除存储设备

### 5. 系统参数配置
- `GET /api/system/config?type=param` - 获取系统参数列表
- `PUT /api/system/config/param` - 创建/更新系统参数
- `GET /api/system/config/param?key=xxx` - 获取单个系统参数

### 2. 认证模块
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 3. 用户与权限
- `GET/POST /api/system/user` - 用户列表/创建
- `PUT/DELETE /api/system/user/[id]` - 更新/删除用户
- `GET/POST /api/system/dept` - 部门管理
- `GET/POST /api/system/role` - 角色管理
- `GET/POST /api/system/menu` - 菜单管理

### 4. BOM管理
- `GET/POST /api/bom/material` - 物料管理
- `POST /api/bom/material/import` - Excel导入BOM
- `GET /api/bom/tree` - BOM树形结构

### 5. 订单管理
- `GET/POST /api/order/production` - 生产订单
- `POST /api/order/production/import` - 批量导入

### 6. 生产管理
- `GET/POST /api/production/task` - 生产任务
- `POST /api/production/task/issue` - 下发生产任务
- `POST /api/production/report` - 报工
- `POST /api/production/nesting` - 激光套料

### 7. 库存管理
- `GET /api/inventory/stock` - 库存查询
- `POST /api/inventory/lock` - 锁定库存
- `POST /api/inventory/unlock` - 解锁库存

### 8. 质量管理
- `GET /api/quality/qc/task` - 扫码获取质检任务
- `POST /api/quality/qc/result` - 提交质检结果

### 9. 采购管理
- `GET/POST /api/purchase/supplier` - 供应商管理
- `GET/POST /api/purchase/order` - 采购订单
- `POST /api/purchase/receive` - 到货入库

### 10. 发货管理
- `GET /api/delivery/pending` - 待发货订单
- `POST /api/delivery/plan` - 创建发货计划
- `POST /api/delivery/ship` - 发货出库

### 11. 财务对账
- `POST /api/accounting/reconciliation` - 生成对账单
- `POST /api/accounting/invoice` - 开票
- `POST /api/accounting/payment` - 回款登记

### 12. 工资结算
- `GET /api/wages/data` - 获取工资数据
- `POST /api/wages/settlement` - 创建结算单
- `POST /api/wages/payment` - 工资发放

### 13. 客户进度查询
- `POST /api/customer-portal/login` - 客户登录
- `GET /api/customer-portal/orders` - 客户订单列表
- `GET /api/customer-portal/progress` - 工序进度

## 数据库事务

所有涉及多表操作的接口都使用 Prisma 事务：

```typescript
await prisma.$transaction(async (tx) => {
  // 事务操作
});
```

## 软删除

所有业务数据使用软删除：

```typescript
where: { isDelete: false }
```

## 操作日志

关键操作自动记录：

```typescript
await operationLog.logCreate('模块名', userId, username, data, ip);
await operationLog.log('模块名', '类型', userId, username, desc, params, ip, 'success');
```
