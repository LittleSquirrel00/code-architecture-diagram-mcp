# 项目需求文档:代码架构依赖关系可视化工具

## 1. 需求背景

### 1.1 核心问题
在AI辅助编码场景中,存在以下痛点:

**现象:**
- AI生成代码时,开发者难以实时追踪架构变化
- 组件和模块不断增加,依赖关系变得混乱
- 代码迁移时,依赖链条断裂难以发现
- 最终导致技术债务累积,维护成本激增

**根本原因:**
开发者只能看到"代码快照",无法直观看到"架构演变"和"依赖关系图"的变化。

### 1.2 核心需求
需要展示以下7种元素的关系图和变更:

1. **架构(Architecture)** - 系统级的大模块划分(如:前端、后端、数据库)
2. **模块(Module)** - 业务功能模块(如:Auth、User、Order)
3. **组件(Component)** - 代码组件(如:Service、Controller、View)
4. **文件(File)** - 具体的代码文件(如:.ts, .tsx文件)
5. **UI布局(UI Layout)** - 前端组件的嵌套关系
6. **接口(Interface)** - 接口定义(如:IUserRepository)
7. **数据模型(Data Model)** - 数据类型定义(如:User, UserRole)

### 1.3 解决方案
构建一个代码架构依赖关系可视化工具,核心功能:

1. **依赖图生成:** 解析代码生成依赖关系图
2. **变更对比:** 对比代码变更前后的架构差异
3. **图形化展示:** 可视化呈现依赖关系和变更
4. **MCP接口:** 提供标准化接口供AI调用

**设计原则:**
- ✅ 数据结构简洁,无特殊情况
- ✅ 增量迭代,MVP只做最核心功能
- ✅ 向后兼容,不破坏已有接口

---

## 2. 核心概念定义

### 2.1 数据结构
本项目的核心数据结构是**分层依赖图(Hierarchical Dependency Graph)**:

```typescript
// 依赖图
type Graph = {
  nodes: Node[]
  edges: Edge[]
}

// 节点定义(使用判别联合类型,消除特殊情况)
type Node =
  // 层级节点
  | {
      type: 'architecture'  // 架构层
      id: string
      path: string
      parent?: string
      status: Status
    }
  | {
      type: 'module'        // 模块层
      id: string
      path: string
      parent?: string
      status: Status
    }
  | {
      type: 'component'     // 组件层
      id: string
      path: string
      parent?: string
      status: Status
    }
  | {
      type: 'file'          // 文件层
      id: string
      path: string
      parent?: string
      status: Status
    }

  // 抽象节点(接口)
  | {
      type: 'interface'     // 接口定义
      id: string
      path: string          // 定义所在的文件路径
      parent?: string       // 挂在哪个层级节点下
      status: Status
      name: string          // 接口名称,如'IUserRepository'
      isExported: boolean   // 是否被导出
    }

  // 抽象节点(数据模型)
  | {
      type: 'datamodel'     // 数据模型定义
      id: string
      path: string
      parent?: string
      status: Status
      kind: 'type' | 'class' | 'enum'  // 数据模型的具体类型
      name: string          // 模型名称,如'User', 'UserRole'
      isExported: boolean
    }

type Status = 'normal' | 'added' | 'modified' | 'removed'

// 边定义(使用判别联合类型,消除特殊情况)
type Edge =
  // 基础依赖边
  | {
      type: 'import'        // 代码导入依赖
      from: string
      to: string
      status: EdgeStatus
    }

  // UI布局边
  | {
      type: 'render'        // 组件渲染依赖(UI布局)
      from: string
      to: string
      status: EdgeStatus
      slotName?: string     // 插槽名称,如'children', 'header'
      position?: number     // 在父组件中的位置索引
      conditional?: boolean // 是否条件渲染
    }

  // 抽象依赖边
  | {
      type: 'implement'     // 实现接口
      from: string          // 实现类
      to: string            // 接口节点ID
      status: EdgeStatus
      symbolName: string    // 实现的接口名
      importPath?: string   // 导入路径
    }
  | {
      type: 'use'           // 使用类型/模型
      from: string          // 使用方
      to: string            // 数据模型节点ID
      status: EdgeStatus
      symbolName: string    // 使用的类型名
      importPath?: string
    }

type EdgeStatus = 'normal' | 'added' | 'removed'
```

**为什么这样设计?**

1. **消除特殊情况**
   - ❌ 旧设计:`abstractMeta`只在`type='abstract'`时存在,需要类型判断
   - ✅ 新设计:TypeScript保证`type='interface'`时必有`name`字段,无需运行时判断

2. **类型安全**
   - TypeScript编译器强制你先判断`node.type`再访问特定字段
   - 不可能出现`type='file'`但有`name`字段的数据

3. **易于扩展**
   - 未来加新节点类型,只需在联合类型中添加一个分支
   - 不会影响已有节点类型的结构

**关键设计原则:**

1. **7种元素的层级关系**
   ```
   Architecture(架构层)          ← 系统级大模块
        ↓
   Module(模块层)               ← 业务功能模块
        ↓
   Component(组件层)            ← 代码组件
        ↓
   File(文件层)                 ← 具体文件

   同时存在:
   Interface(接口)              ← 接口定义
   DataModel(数据模型)          ← 类型定义

   关系通过:
   UI Layout(UI布局)            ← render边表示组件嵌套
   ```

2. **层级推断**
   - MVP阶段:基于目录结构
     ```
     src/modules/auth/services/auth.ts
     └─ module: auth
        └─ component: services
           └─ file: auth.ts
     ```
   - 未来:基于依赖密度聚类(Louvain算法)

3. **为什么需要分层?**
   - ❌ 单层依赖图:1000文件 → 1000节点 → 不可读
   - ✅ 分层依赖图:1000文件 → 10模块 → 可理解

**4. 前端布局依赖(render边)**

前端项目存在两种依赖关系:

```typescript
// 类型1: 代码依赖(import边)
import { UserCard } from './components/UserCard'
→ 静态依赖,通过AST解析import语句

// 类型2: 布局依赖(render边)
<Dashboard>
  <Header />
  <Sidebar>
    <UserCard />  ← UserCard被Sidebar包含,这是动态布局关系
  </Sidebar>
</Dashboard>
→ 动态依赖,通过解析JSX/模板语法
```

**布局依赖的价值:**
- AI可以理解"组件在页面中的位置"
- 检测布局变更(如组件从Header移到Sidebar)
- 发现遗留组件(import了但没有render)
- 辅助样式调整(父子组件的样式继承关系)

**示例:布局依赖图**
```json
{
  "edges": [
    {
      "from": "Dashboard",
      "to": "Header",
      "type": "render",
      "metadata": { "position": 0 }
    },
    {
      "from": "Dashboard",
      "to": "Sidebar",
      "type": "render",
      "metadata": { "position": 1 }
    },
    {
      "from": "Sidebar",
      "to": "UserCard",
      "type": "render",
      "metadata": { "slotName": "children", "position": 0 }
    }
  ]
}
```

**MVP范围:**
- ✅ 支持解析JSX/TSX的render关系
- ✅ 使用`edgeTypes: ['render']`控制是否返回布局依赖
- ❌ 不支持Vue/Angular模板(Phase 4)
- ❌ 不支持条件渲染分析(Phase 2)

**5. 视图模式(View Mode)**

为了解决"用户只关心部分模块"的问题,本项目提供三种视图模式:

**模式1: global(全局视图)**
```
语义: 展示整个项目在指定层级的所有依赖关系
适用: AI想了解整体架构

示例: mode='global', level='module'
输出: [auth] -> [user]
      [order] -> [payment]
      [order] -> [user]
```

**模式2: focused(聚焦视图)**
```
语义: 只展示指定路径内部的依赖,完全忽略外部
适用: AI重构单个模块,不想被外部干扰

示例: mode='focused', level='component', focusPath='src/modules/auth'
输出: (auth内部)
      [LoginForm] -> [AuthService] -> [TokenManager]

      (不包含外部模块,如user、utils)
```

**模式3: neighbors(邻居视图)**
```
语义: 展示指定路径 + 其直接依赖者 + 被依赖者
适用: AI评估修改影响范围

示例: mode='neighbors', level='module', focusPath='src/modules/auth'
输出: [auth<焦点>] -> [user]
      [auth<焦点>] -> [utils]
      [order] -> [auth<焦点>]

      (不包含payment,因为没有直接关系)
```

**邻居深度(neighborDepth):**
- `neighborDepth: 1` - 只看直接依赖(默认)
- `neighborDepth: 2` - 看2层依赖(如:A依赖B,B依赖C,则C也包含)
- 最大值: `3` (防止图太大)

**6. 抽象层支持(Abstract Layer)**

为了追踪"接口定义"和"数据模型"的依赖关系,本项目支持抽象层(Abstract Layer)。

**问题背景:**
在TypeScript项目中,存在"代码依赖"和"类型依赖"两种关系:

```typescript
// 文件: UserService.ts
import { IUserRepository } from './IUserRepository'  // ← 文件依赖(import边)
import { User } from '../models/User'                // ← 文件依赖(import边)

export class UserService implements IUserRepository {  // ← 实现接口(implement边)
  async getUser(id: string): Promise<User> {          // ← 使用类型(use边)
    // ...
  }
}
```

**当前问题:**
- 只追踪文件依赖,无法回答"哪些类实现了IUserRepository接口?"
- 无法回答"修改User模型会影响哪些组件?"
- 接口定义变更的影响范围难以评估

**解决方案:抽象节点(Abstract Node)**

```typescript
// 抽象节点示例
{
  id: 'abstract:IUserRepository',
  type: 'abstract',
  path: 'src/repositories/IUserRepository.ts',  // 定义所在文件
  parent: 'component:repositories',              // 挂在component下
  status: 'normal',
  abstractMeta: {
    kind: 'interface',                           // 接口类型
    name: 'IUserRepository',                     // 符号名称
    sourceFile: 'src/repositories/IUserRepository.ts',
    isExported: true
  }
}

// 实现关系(implement边)
{
  from: 'file:UserService.ts',
  to: 'abstract:IUserRepository',
  type: 'implement',
  metadata: {
    symbolName: 'IUserRepository',
    importPath: './IUserRepository'
  }
}

// 使用关系(use边)
{
  from: 'file:UserService.ts',
  to: 'abstract:User',
  type: 'use',
  metadata: {
    symbolName: 'User',
    importPath: '../models/User'
  }
}
```

**抽象节点的4种类型:**

| kind | 定义 | 示例 | 用途 |
|------|------|------|------|
| `interface` | 接口定义 | `interface IUserRepository` | 定义契约 |
| `type` | 类型别名 | `type User = {...}` | 数据模型 |
| `class` | 抽象类 | `abstract class BaseRepository` | 基类 |
| `enum` | 枚举 | `enum UserRole` | 常量集合 |

**MVP范围:**
- ✅ 支持解析interface/type/enum定义
- ✅ 支持implement边(类实现接口)
- ✅ 支持use边(函数参数/返回值使用类型)
- ❌ 不支持泛型约束分析(Phase 2)
- ❌ 不支持类型推断(Phase 3)

**使用场景:**

```typescript
// 场景1: 查看某个接口的所有实现
const graph = getDependencyGraph('/project', {
  mode: 'neighbors',
  level: 'abstract',
  focusPath: 'src/repositories/IUserRepository.ts',
  edgeTypes: ['implement']
})
// 输出: IUserRepository + 所有实现类(UserService, MockUserService等)

// 场景2: 查看某个数据模型的使用范围
const graph = getDependencyGraph('/project', {
  mode: 'neighbors',
  level: 'file',
  focusPath: 'src/models/User.ts',
  edgeTypes: ['use'],
  neighborDepth: 2
})
// 输出: User模型 + 直接使用者 + 间接使用者

// 场景3: 查看某个组件依赖的所有抽象
const graph = getDependencyGraph('/project', {
  mode: 'focused',
  level: 'abstract',
  focusPath: 'src/modules/auth',
  edgeTypes: ['use', 'implement']
})
// 输出: auth模块内所有使用的接口和类型
```

### 2.2 术语说明
| 术语 | 定义 | 示例 |
|------|------|------|
| 节点(Node) | 依赖图中的基本单元 | 文件、组件、模块、抽象、系统 |
| 边(Edge) | 节点之间的依赖关系 | import边、render边、use边、implement边 |
| import边 | 代码导入依赖 | `import A from 'B'` |
| render边 | 组件渲染依赖(布局) | `<Parent><Child /></Parent>` |
| call边 | 函数调用依赖 | `functionA()` 调用 `functionB()` |
| implement边 | 实现接口 | `class A implements IRepository` |
| use边 | 使用类型/模型 | `user: User` 使用User类型 |
| 层级(Level) | 抽象程度 | System > Module > Component > Abstract > File |
| 抽象层(Abstract) | 接口/类型/模型定义 | interface, type, enum, abstract class |
| 视图模式(View Mode) | 依赖图的展示范围 | global/focused/neighbors |
| 全局视图(Global) | 展示整个项目的依赖 | 适合了解整体架构 |
| 聚焦视图(Focused) | 只展示指定路径内部 | 适合专注单个模块 |
| 邻居视图(Neighbors) | 展示焦点+直接依赖 | 适合评估影响范围 |
| 依赖图(Dependency Graph) | 所有节点和边构成的图 | 整个项目的依赖关系 |
| 分层依赖图(Hierarchical Graph) | 具有父子关系的多层依赖图 | 可折叠/展开的依赖图 |
| 布局依赖(Layout Dependency) | 前端组件的渲染关系 | 页面中组件的嵌套结构 |
| 抽象依赖(Abstract Dependency) | 类型/接口的使用关系 | 组件依赖的数据模型 |
| 变更(Change) | 节点或边的增删改 | 新增文件、删除导入、修改依赖 |

**层级示例:**
```
System:    Frontend ←→ Backend ←→ Database
             ↓
Module:    [Auth] [User] [Order] [Payment]
             ↓
Component: [AuthService] [LoginForm] [TokenManager]
             ↓
Abstract:  IUserRepository  User(model)  LoginRequest(type)
             ↓
File:      auth.ts  login.tsx  token.ts
```

---

## 3. 功能需求

### 3.1 核心功能

#### F1: 依赖图生成(支持分层)
**输入:**
- 项目代码路径
- 视图层级配置

**输出:** 分层依赖关系图(JSON格式)

```json
{
  "nodes": [
    {
      "id": "auth-module",
      "type": "module",
      "path": "src/modules/auth",
      "status": "normal"
    },
    {
      "id": "auth-service",
      "type": "component",
      "path": "src/modules/auth/services",
      "parent": "auth-module",
      "status": "normal"
    },
    {
      "id": "auth.ts",
      "type": "file",
      "path": "src/modules/auth/services/auth.ts",
      "parent": "auth-service",
      "status": "modified"
    }
  ],
  "edges": [
    {
      "from": "auth-module",
      "to": "user-module",
      "type": "import",
      "status": "normal"
    }
  ]
}

// 注意: children字段不在JSON中,客户端可通过过滤parent字段获取:
// function getChildren(nodeId) {
//   return nodes.filter(n => n.parent === nodeId)
// }
```

**技术约束:**
- 支持TypeScript/JavaScript(优先)
- 使用成熟的AST解析器(如tree-sitter)
- 大型项目(>1000文件)需在5秒内完成解析
- **层级推断:**
  - MVP阶段:基于目录结构(如`src/modules/*`识别为模块)
  - 未来:基于依赖密度聚类(Louvain算法)

#### F2: 变更对比
**输入:**
- 当前代码路径
- Git diff或变更文件列表

**输出:** 依赖图变更(JSON格式)

```json
{
  "added": {"nodes": [...], "edges": [...]},
  "removed": {"nodes": [...], "edges": [...]},
  "modified": {"nodes": [...], "edges": [...]}
}
```

**关键场景:**
1. 重命名文件:所有引用该文件的边应更新
2. 删除模块:所有依赖该模块的边应标记为断裂
3. 新增导入:检测是否引入循环依赖

#### F3: 图形化展示
**输入:** 依赖关系图JSON
**输出:** 可视化图表(SVG/HTML)

**展示要求:**
- 使用现成库(Mermaid/D3/vis.js)
- 支持层级布局和力导向布局
- 变更节点/边用颜色区分(新增/删除/修改)
- 支持节点展开/折叠(控制复杂度)

**反例(避免):**
- ❌ 不要自己实现图形渲染引擎
- ❌ 不要做动画效果(增加复杂度但无实际价值)

#### F4: MCP接口
**接口标准:** 遵循MCP(Model Context Protocol)规范

**核心接口:**
```typescript
// 1. 获取依赖图(支持三种视图模式)
getDependencyGraph(
  projectPath: string,
  options?: {
    // 视图模式(核心参数)
    mode?: 'global' |          // 全局视图:展示整个项目
           'focused' |         // 聚焦视图:只展示指定路径内部
           'neighbors',        // 邻居视图:展示指定路径+直接依赖
                               // 默认:'global'

    // 视图层级
    level?: 'module' | 'component' | 'abstract' | 'file',  // 默认:'module'

    // 焦点路径(仅在focused/neighbors模式下有效)
    focusPath?: string,        // 如:'src/modules/auth'

    // 邻居深度(仅在neighbors模式下有效)
    neighborDepth?: number,    // 默认:1, 最大:3

    // 依赖类型过滤
    edgeTypes?: ('import' | 'call' | 'render' | 'implement' | 'use')[],  // 默认:['import']

    // 是否包含外部依赖
    includeExternal?: boolean  // 默认:false
  }
): HierarchicalGraph

// 2. 获取变更对比
getArchitectureDiff(
  projectPath: string,
  changes: Changes,
  options?: {
    mode?: 'global' | 'focused' | 'neighbors',
    level?: 'module' | 'component' | 'abstract' | 'file',
    focusPath?: string
  }
): DiffResult

// 3. 生成可视化图表
generateVisualization(
  graph: HierarchicalGraph,
  format?: 'mermaid' | 'dot' | 'json'  // 默认:'mermaid'
): string
```

**三种视图模式说明:**

| 模式 | 语义 | 适用场景 |
|------|------|---------|
| `global` | 展示整个项目在指定层级的依赖关系 | AI想了解整体架构 |
| `focused` | 只展示指定路径内部的依赖,忽略外部 | AI重构单个模块,不想被外部干扰 |
| `neighbors` | 展示指定路径+直接依赖者+被依赖者 | AI评估修改影响范围 |

**使用场景示例:**

```typescript
// 场景1: AI想了解整体架构(全局视图)
const graph = getDependencyGraph('/path/to/project', {
  mode: 'global',
  level: 'module'
})
// 输出: 所有模块 + 模块间依赖
// auth -> user, order -> payment, order -> user

// 场景2: AI要重构auth模块,只想看auth内部(聚焦视图)
const graph = getDependencyGraph('/path/to/project', {
  mode: 'focused',
  level: 'component',
  focusPath: 'src/modules/auth'
})
// 输出: 只返回auth内部的组件
// LoginForm -> AuthService -> TokenManager
// 不包含外部模块(如user、utils)

// 场景3: AI要修改auth,需要评估影响范围(邻居视图)
const graph = getDependencyGraph('/path/to/project', {
  mode: 'neighbors',
  level: 'module',
  focusPath: 'src/modules/auth',
  neighborDepth: 1
})
// 输出: auth + 直接依赖/被依赖者
// auth -> user, auth -> utils, order -> auth
// 不包含payment(没有直接关系)

// 场景4: AI要看auth模块的文件级依赖(聚焦视图+文件层级)
const graph = getDependencyGraph('/path/to/project', {
  mode: 'focused',
  level: 'file',
  focusPath: 'src/modules/auth'
})
// 输出: auth内所有文件的依赖关系
// auth/index.ts -> auth/service.ts -> auth/types.ts

// 场景5: AI要理解某个页面的布局(聚焦视图+render边)
const layoutGraph = getDependencyGraph('/path/to/project', {
  mode: 'focused',
  level: 'component',
  focusPath: 'src/pages/Dashboard.tsx',
  edgeTypes: ['render']  // 只看布局,不看import
})
// 输出: Dashboard页面的组件树
// Dashboard -> Header, Sidebar, Content
// Sidebar -> UserMenu, Navigation

// 场景6: AI要评估修改某个组件的影响(邻居视图+2层深度)
const graph = getDependencyGraph('/path/to/project', {
  mode: 'neighbors',
  level: 'component',
  focusPath: 'src/components/Button.tsx',
  neighborDepth: 2
})
// 输出: Button + 1层邻居 + 2层邻居
// 1层: LoginForm使用Button, Header使用Button
// 2层: Dashboard使用LoginForm, App使用Header

// 场景7: 检测变更影响(变更对比+邻居视图)
const diff = getArchitectureDiff('/path/to/project', {
  modified: ['src/modules/auth/service.ts']
}, {
  mode: 'neighbors',
  level: 'module',
  focusPath: 'src/modules/auth'
})
// 输出: auth模块的变更 + 影响到的邻居模块
// auth.service.ts修改 -> 影响order模块(依赖auth)

// 场景8: 查看某个接口的所有实现(抽象层+implement边)
const graph = getDependencyGraph('/path/to/project', {
  mode: 'neighbors',
  level: 'abstract',
  focusPath: 'src/repositories/IUserRepository.ts',
  edgeTypes: ['implement']
})
// 输出: IUserRepository接口 + 所有实现类
// IUserRepository <- UserService, MockUserService, CachedUserService

// 场景9: 评估数据模型变更的影响范围(抽象层+use边)
const graph = getDependencyGraph('/path/to/project', {
  mode: 'neighbors',
  level: 'file',
  focusPath: 'src/models/User.ts',
  edgeTypes: ['use'],
  neighborDepth: 2
})
// 输出: User模型 + 直接使用者 + 间接使用者
// User <- LoginForm, UserProfile, UserService
//        <- Dashboard(通过UserProfile), AuthGuard(通过UserService)

// 场景10: 查看auth模块的"契约层"(只看接口和类型定义)
const graph = getDependencyGraph('/path/to/project', {
  mode: 'focused',
  level: 'abstract',
  focusPath: 'src/modules/auth',
  edgeTypes: ['use', 'implement']
})
// 输出: auth模块内所有interface/type定义 + 依赖关系
// IAuthService, ITokenManager, LoginRequest, User
// UserService implements IAuthService
// LoginForm uses LoginRequest, User
```

**设计原则:**
- 只读操作,不修改任何代码
- 独立进程运行,崩溃不影响主程序
- 返回JSON,由AI决定如何使用
- **默认返回Module层级,避免信息过载**

### 3.2 非功能需求

#### NF1: 性能
- 小型项目(<100文件): <1秒
- 中型项目(100-1000文件): <5秒
- 大型项目(>1000文件): <30秒或增量解析

#### NF2: 兼容性
- 优先支持TypeScript/JavaScript
- 架构设计支持扩展其他语言
- 不要为每种语言写特殊逻辑,使用统一解析器

#### NF3: 可维护性
- 代码简洁,函数不超过50行
- 不超过3层缩进
- 不做"未来可能需要"的功能

---

## 4. 技术方案(概要)

### 4.1 架构设计
```
┌─────────────┐
│ 代码输入    │
└──────┬──────┘
       ↓
┌─────────────┐
│ AST解析器   │ (tree-sitter)
└──────┬──────┘   提取import/export关系
       ↓
┌─────────────┐
│ 文件依赖图  │ (基础依赖图)
└──────┬──────┘   File级别的完整依赖
       ↓
┌─────────────┐
│ 层级推断器  │ ← 核心新增!
└──────┬──────┘   根据目录/聚类识别Module/Component
       ↓
┌─────────────┐
│ 分层依赖图  │ (Hierarchical Graph)
└──────┬──────┘   支持4个层级,可折叠
       ↓
┌─────────────┐
│ 视图过滤器  │ (View Filter)
└──────┬──────┘   根据level/focusPath过滤节点
       ↓
┌─────────────┐
│ 变更对比    │ (Diff Engine)
└──────┬──────┘   可选:对比两个版本
       ↓
┌─────────────┐
│ 图形渲染    │ (Mermaid/D3)
└──────┬──────┘   生成可视化图表
       ↓
┌─────────────┐
│ MCP接口     │ (JSON-RPC)
└─────────────┘   返回JSON给AI
```

**核心流程:**
```
1. AST解析:    1000个文件 → 1000个节点,5000条边
                ↓
2. 层级推断:   根据目录结构推断:
                - src/modules/* → 10个Module节点
                - */components/* → 50个Component节点
                ↓
3. 构建树形图: File → Component → Module → System
                ↓
4. 视图过滤:   level='module' → 只返回10个Module节点
                ↓
5. AI获取:     10个节点,20条边(可理解)
```

**关键决策:**
1. **不重复造轮子:** 解析用tree-sitter,渲染用Mermaid
2. **数据驱动:** 所有逻辑基于分层依赖图这个数据结构
3. **无状态:** MCP接口不保存任何状态,每次请求独立处理
4. **默认折叠:** 大型项目默认返回Module层,避免信息过载

### 4.2 技术栈
| 模块 | 技术选型 | 理由 |
|------|---------|------|
| AST解析 | tree-sitter | 多语言支持,性能好,增量解析 |
| 层级推断 | 自实现(基于目录) | MVP阶段逻辑简单,不需要复杂算法 |
| 图数据结构 | 原生TypeScript | 简单场景不需要图数据库 |
| 变更对比 | 自实现 | 逻辑简单,不依赖第三方库 |
| 图形渲染 | Mermaid | 轻量,支持Markdown嵌入,AI友好 |
| MCP服务 | Node.js + @modelcontextprotocol/sdk | 官方SDK,与AI工具链集成方便 |

**为什么不用XXX?**
- ❌ 图数据库(Neo4j):杀鸡用牛刀,增加部署复杂度
- ❌ 复杂聚类算法(Louvain):MVP阶段不需要,目录结构足够
- ❌ 自己实现图形渲染:Mermaid已经够用,不要重复造轮子

---

## 5. 实施计划

### 5.1 增量迭代策略

**核心原则:**
- 每个Phase都是**完整可用的产品**,而不是半成品
- 后续Phase只**增加**功能,不**修改**已有接口(向后兼容)
- 只做已验证需求的功能,拒绝臆想的需求

---

### Phase 1: 基础依赖图(MVP) - 2-3天

**目标:** 验证技术方案可行性

**范围:**
- 支持TypeScript/JavaScript
- 解析import/export关系
- 只返回文件级依赖图
- 生成Mermaid文本

**数据结构:**
```typescript
type Graph = {
  nodes: Array<{ type: 'file', id: string, path: string, status: Status }>
  edges: Array<{ type: 'import', from: string, to: string, status: Status }>
}
```

**接口:**
```typescript
getDependencyGraph(projectPath: string): Graph
generateMermaid(graph: Graph): string
```

**验收标准:**
- ✅ 能解析本项目的import关系
- ✅ 1000文件 < 5秒
- ✅ AI调用成功率 > 99%
- ✅ 生成的Mermaid图可读(人工验证)

**不做:**
- ❌ 层级推断(Module/Component)
- ❌ 视图过滤(focused/neighbors)
- ❌ UI布局(render边)
- ❌ 抽象层(interface/datamodel)
- ❌ 变更对比
- ❌ 可视化渲染

---

### Phase 2: 层级支持 - 2-3天

**目标:** 解决"节点太多"的问题

**新增节点类型:**
```typescript
type Node =
  | { type: 'module', ... }
  | { type: 'component', ... }
  | { type: 'file', ... }
```

**新增接口参数(向后兼容):**
```typescript
getDependencyGraph(
  projectPath: string,
  options?: { level?: 'module' | 'component' | 'file' }  // 默认'file'
): Graph
```

**验收标准:**
- ✅ Phase 1的调用方式仍然有效
- ✅ 1000文件项目,`level='module'`时只返回10-20个节点
- ✅ 层级推断准确率 > 90%

---

### Phase 3: 抽象层支持 - 2-3天

**目标:** 追踪接口和数据模型

**新增节点类型:**
```typescript
type Node =
  | { type: 'module', ... }
  | { type: 'component', ... }
  | { type: 'file', ... }
  | { type: 'interface', name: string, isExported: boolean, ... }
  | { type: 'datamodel', kind: 'type'|'class'|'enum', name: string, ... }
```

**新增边类型:**
```typescript
type Edge =
  | { type: 'import', ... }
  | { type: 'implement', symbolName: string, ... }
  | { type: 'use', symbolName: string, ... }
```

**新增接口参数(向后兼容):**
```typescript
getDependencyGraph(
  projectPath: string,
  options?: {
    level?: 'module' | 'component' | 'file' | 'interface' | 'datamodel',
    edgeTypes?: ('import' | 'implement' | 'use')[]  // 默认['import']
  }
): Graph
```

**验收标准:**
- ✅ Phase 1和Phase 2的调用方式仍然有效
- ✅ 能回答"哪些类实现了IUserRepository接口?"
- ✅ 能回答"User类型被哪些文件使用?"

---

### Phase 4: UI布局支持 - 1-2天

**目标:** 前端项目的组件嵌套关系

**新增边类型:**
```typescript
type Edge =
  | { type: 'import', ... }
  | { type: 'implement', ... }
  | { type: 'use', ... }
  | { type: 'render', slotName?: string, position?: number, ... }
```

**新增接口参数(向后兼容):**
```typescript
getDependencyGraph(
  projectPath: string,
  options?: {
    level?: ...,
    edgeTypes?: ('import' | 'implement' | 'use' | 'render')[]
  }
): Graph
```

**验收标准:**
- ✅ 能生成React组件的嵌套树
- ✅ 能识别组件在页面中的位置

---

### Phase 5: 变更对比 - 2-3天

**目标:** 检测架构变化

**新增接口:**
```typescript
getArchitectureDiff(
  projectPath: string,
  changes: { added: string[], modified: string[], removed: string[] },
  options?: { level?: ..., edgeTypes?: ... }
): DiffResult

type DiffResult = {
  added: Graph,
  removed: Graph,
  modified: Graph
}
```

**验收标准:**
- ✅ 能检测"新增了哪些依赖"
- ✅ 能检测"哪些依赖被删除"
- ✅ 能检测循环依赖

---

### Phase 6: 视图过滤 - 1-2天

**目标:** 聚焦特定模块

**新增接口参数(向后兼容):**
```typescript
getDependencyGraph(
  projectPath: string,
  options?: {
    level?: ...,
    edgeTypes?: ...,
    mode?: 'global' | 'focused' | 'neighbors',  // 默认'global'
    focusPath?: string,
    neighborDepth?: number  // 默认1
  }
): Graph
```

**验收标准:**
- ✅ `mode='focused'`时只返回指定模块内部的依赖
- ✅ `mode='neighbors'`时返回焦点+直接依赖者

---

### Phase 7: Architecture层(可选) - 1-2天

**目标:** 系统级架构视图

**新增节点类型:**
```typescript
type Node =
  | { type: 'architecture', ... }
  | { type: 'module', ... }
  | ...
```

**新增接口参数(向后兼容):**
```typescript
getDependencyGraph(
  projectPath: string,
  options?: {
    level?: 'architecture' | 'module' | 'component' | 'file' | 'interface' | 'datamodel',
    ...
  }
): Graph
```

**验收标准:**
- ✅ 能展示"前端 ← → 后端 ← → 数据库"的依赖
- ✅ 需要配置文件`.architecture.json`定义Architecture划分

---

### 5.2 总结

**总开发时间:** 11-17天(分7个Phase)

**关键里程碑:**
- Day 3: Phase 1完成,验证方案可行性
- Day 6: Phase 2完成,支持层级
- Day 9: Phase 3完成,支持抽象层
- Day 11: Phase 4完成,支持UI布局
- Day 14: Phase 5完成,支持变更对比
- Day 16: Phase 6完成,支持视图过滤
- Day 17: Phase 7完成,支持Architecture层(可选)

**每个Phase都是可交付的完整产品!**

---

## 6. 风险与应对

### 6.1 技术风险
| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|---------|
| 大型项目解析慢 | 用户体验差 | 高 | Phase 1先验证性能;如果慢则在Phase 2加缓存 |
| 层级推断不准确 | 显示混乱 | 中 | Phase 2提供配置项覆盖默认规则 |
| 循环依赖检测漏报 | 误导用户 | 中 | Phase 5完善测试用例 |
| 不同语言AST差异大 | 开发成本高 | 高 | MVP只支持TS/JS,验证后再扩展 |
| 依赖图过大无法渲染 | Mermaid崩溃 | 中 | Phase 2默认返回Module层,节点数控制在50以内 |

### 6.2 最大风险:过度设计

**症状:**
- MVP声称要做所有功能
- 定义了太多概念和组合
- 臆想使用场景而非验证真实需求

**应对:**
- ✅ 严格执行7个Phase的增量迭代
- ✅ 每个Phase都先验证需求,再开发功能
- ✅ 拒绝做"未来可能需要"的功能

### 6.3 范围风险

**症状:做成"大而全"的工具**

**应对:**
- 严格遵循"只做依赖关系图"的定位
- 拒绝以下功能:
  - ❌ 代码质量分析
  - ❌ 性能分析
  - ❌ 安全漏洞扫描
  - ❌ 代码生成

---

## 7. 成功标准

### 7.1 定量指标(Phase 1)
- 解析速度:1000文件 < 5秒
- 准确率:依赖关系识别准确率 > 95%
- 可用性:AI调用成功率 > 99%

### 7.2 定性指标(所有Phase完成后)
- 开发者能通过可视化图快速发现架构问题
- AI能基于依赖图给出合理的重构建议
- 代码简洁,新人能在1天内理解核心逻辑

---

## 8. 附录

### 8.1 参考资料
- [MCP协议规范](https://modelcontextprotocol.io/)
- [tree-sitter文档](https://tree-sitter.github.io/)
- [Mermaid语法](https://mermaid.js.org/)

### 8.2 术语映射表

| 需求术语 | PRD术语 | 数据结构 | 说明 |
|---------|--------|---------|------|
| 架构(Architecture) | Architecture层 | `type: 'architecture'` | 系统级大模块 |
| 模块(Module) | Module层 | `type: 'module'` | 业务功能模块 |
| 组件(Component) | Component层 | `type: 'component'` | 代码组件 |
| 文件(File) | File层 | `type: 'file'` | 具体代码文件 |
| UI布局(UI Layout) | render边 | `type: 'render'` | 组件嵌套关系 |
| 接口(Interface) | Interface节点 | `type: 'interface'` | 接口定义 |
| 数据模型(Data Model) | DataModel节点 | `type: 'datamodel'` | 类型定义 |
