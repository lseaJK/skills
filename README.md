# Universal Skills Architecture

一个可迁移的、分层的技能管理平台，为任何项目和任何 AI 代理提供标准化的技能调用和扩展机制。

## 🚀 项目概述

通用技能架构系统是一个基于分层架构的可迁移技能管理平台。系统采用三层架构设计，提供从底层原子操作到高级API包装的完整技能生态。核心设计理念是创建一个标准化、可扩展、跨平台的技能定义和执行框架。

## 🏗️ 三层架构

- **第一层：函数调用层** - 提供最基础的原子操作接口（文件读写、数据处理、基础计算）
- **第二层：沙盒工具层** - 提供工具和命令的安全执行环境（Shell命令、外部工具调用、脚本执行）
- **第三层：包装API层** - 提供高级抽象和复合功能（复杂业务逻辑、多步骤工作流、智能决策）

## ✨ 核心特性

- 🏗️ **分层架构**: 三个不同抽象级别的清晰分层
- 🔧 **技能管理**: 创建、注册、发现和执行技能
- 🔌 **扩展系统**: 扩展和组合现有技能
- 📦 **迁移支持**: 跨环境导出和导入技能包
- 🎯 **VS Code 集成**: 丰富的技能管理和编辑UI
- ✅ **属性测试**: 全面的正确性验证
- 🛡️ **安全执行**: 沙盒化技能执行环境

## 🖥️ VS Code 扩展

项目包含完整的 VS Code 扩展，提供专业的技能开发环境：

### 主要功能
- **技能浏览器** - 按层级和类别组织的分层树视图
- **可视化编辑器** - 带实时验证的富文本技能编辑界面
- **命令集成** - 完整的命令面板和上下文菜单支持
- **文件系统集成** - 自动技能文件监控和同步
- **导入导出** - 项目间技能共享功能
- **测试集成** - 内置技能测试和验证
- **配置管理** - 灵活的扩展配置和调试支持

### 扩展安装
```bash
cd extension
npm install
npm run compile
```

## 📦 项目结构

```
src/
├── types/              # 核心类型定义
├── core/               # 核心实现（注册表、执行引擎）
├── layers/             # 分层特定实现
├── extensions/         # 扩展管理
├── migration/          # 迁移和可移植性
└── vscode-extension/   # VS Code 集成接口

extension/              # VS Code 扩展
├── src/
│   ├── managers/       # 配置、命令、事件管理器
│   ├── providers/      # 树视图和编辑器提供者
│   └── media/          # UI 资源文件
└── package.json        # 扩展清单

tests/                  # 测试套件
├── core/               # 单元测试
├── extensions/         # 扩展管理测试
├── migration/          # 迁移功能测试
├── integration/        # 集成和端到端测试 ✨
│   ├── skill-lifecycle.test.ts      # 技能生命周期测试
│   ├── vscode-extension.test.ts     # VS Code扩展集成测试
│   ├── end-to-end-workflows.test.ts # 端到端工作流测试
│   ├── system-integration.test.ts   # 系统集成测试
│   └── integration-test-runner.ts   # 集成测试运行器
└── setup.ts            # 测试配置
```

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 构建项目
```bash
npm run build
npm run build:extension  # 构建VS Code扩展
```

### 运行测试
```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行集成测试运行器（推荐）
npm run test:integration:runner

# 运行所有测试（单元 + 集成）
npm run test:all

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监控模式运行测试
npm run test:watch
```

### 开发模式
```bash
# 启动自动编译的开发模式
npm run dev

# 代码检查
npm run lint
```

## 🧪 测试策略

项目采用双重测试方法，包含完整的单元测试和集成测试：

### 单元测试
- 具体示例验证特定功能
- 集成点测试验证组件间接口
- 边界条件和错误情况测试

### 集成和端到端测试 ✨
- **完整的集成测试套件**，验证所有系统组件协同工作
- **21个集成测试**，覆盖完整的技能生命周期
- **端到端工作流验证**：开发者工作流、团队协作、生产部署
- **VS Code扩展集成测试**：UI组件和系统集成验证
- **性能和可扩展性测试**：并发操作、大规模数据处理
- **跨平台兼容性测试**：迁移和环境适配验证

### 属性测试（Property-Based Testing）
- 使用 **fast-check** 框架
- 每个属性测试运行最少100次迭代
- 验证通用正确性属性，如：
  - 技能定义模板一致性
  - 注册查询往返行为
  - 分层接口特性
  - 扩展机制支持

### 测试结果 📊
- ✅ **21个集成测试全部通过**
- 📈 **成功率：100%**
- ⏱️ **总执行时间：~11秒**
- 🎯 **覆盖率：所有主要系统组件和工作流**

## 📋 开发进度

### ✅ 已完成任务

- [x] **项目结构和核心接口** - TypeScript项目结构、核心接口定义、测试框架配置
- [x] **技能定义引擎** - 技能定义模型、验证逻辑、模板生成功能
- [x] **技能注册表** - 内存存储实现、技能发现和解析、查询过滤机制
- [x] **分层执行引擎** - 三层执行架构、上下文管理、结果处理
- [x] **错误处理和日志系统** - 统一错误处理、执行日志记录、性能监控
- [x] **迁移管理器** - 配置导出、技能包序列化、环境兼容性检查
- [x] **扩展管理器** - 技能继承组合、冲突检测解决、扩展路由管理
- [x] **VS Code扩展基础架构** - 完整扩展实现、技能管理面板、可视化编辑器
- [x] **集成和端到端测试** ✨ - 完整工作流测试、跨组件集成验证、21个集成测试全部通过

### ✅ 最新完成任务

- [x] **性能优化和文档** ✨ - 智能缓存机制、资源管理、完整API文档、用户指南、示例技能库

### 🔄 进行中任务

- [ ] **技能管理面板完善** - 技能树视图优化、搜索过滤功能
- [ ] **技能编辑器增强** - 语法高亮、自动完成、预览功能
- [ ] **同步和通知系统** - 变更监听、自动同步、状态更新

## 💡 使用示例

### 创建技能
```typescript
import { SkillDefinitionEngine } from './src/core';

const engine = new SkillDefinitionEngine();
const skill = engine.createSkillTemplate(1); // 第一层技能

skill.name = '文件读取器';
skill.description = '读取文件内容';
// ... 配置技能
```

### 注册和执行技能
```typescript
import { InMemorySkillRegistry, BasicExecutionEngine } from './src/core';

const registry = new InMemorySkillRegistry();
const executor = new BasicExecutionEngine();

await registry.register(skill);
const result = await executor.execute(skill.id, { filename: 'test.txt' });
```

### VS Code 扩展使用
1. 在VS Code中打开项目
2. 侧边栏显示技能浏览器
3. 点击"+"创建新技能
4. 使用可视化编辑器编辑技能
5. 实时验证和预览功能
6. 一键测试和导出

## 🤝 贡献指南

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 为新功能添加测试
4. 确保所有测试通过
5. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
6. 推送到分支 (`git push origin feature/AmazingFeature`)
7. 打开 Pull Request

## 📄 许可证

MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📚 完整文档体系 ✨

项目提供了全面的文档支持，涵盖从入门到高级使用的所有场景：

### 核心文档
- **[API 文档](docs/api/README.md)** - 完整的API接口文档，包含所有类、方法和接口说明
- **[用户指南](docs/user-guide/README.md)** - 详细的使用教程，从基础概念到高级功能
- **[性能优化指南](docs/performance/optimization-guide.md)** - 性能调优策略和最佳实践

### 示例和教程
- **[示例技能库](examples/README.md)** - 涵盖三层架构的完整示例技能
  - Layer 1: 高级文件读取器、数据处理工具
  - Layer 2: Docker管理器、Git操作工具  
  - Layer 3: CI/CD流水线、API数据处理器
- **[使用案例](examples/use-cases/)** - 真实场景的完整解决方案
- **[性能测试](examples/performance/)** - 性能优化示例和基准测试

### 技术规范
- **[设计文档](.kiro/specs/universal-skills-architecture/design.md)** - 详细的系统设计和架构
- **[需求文档](.kiro/specs/universal-skills-architecture/requirements.md)** - 功能需求和验收标准
- **[任务列表](.kiro/specs/universal-skills-architecture/tasks.md)** - 开发任务和进度跟踪

## 🚀 性能优化 ✨

系统实现了全面的性能优化机制：

### 智能缓存系统
- **LRU缓存**: 带TTL支持的高效缓存机制
- **分层缓存**: 技能定义、查询结果、验证结果分别缓存
- **自动失效**: 技能变更时智能缓存失效
- **性能监控**: 实时缓存命中率和性能指标

```typescript
// 缓存性能监控
const metrics = registry.getPerformanceMetrics();
console.log('缓存命中率:', metrics.cache.hitRate);
console.log('平均查询时间:', metrics.averageQueryTime);

// 预加载常用技能
await registry.preloadSkills(['file-reader-v1', 'data-validator-v1']);
```

### 资源管理
- **执行限制**: 内存、CPU、网络请求限制
- **资源监控**: 实时资源使用情况跟踪
- **自动清理**: 过期资源和缓存自动清理
- **性能分析**: 详细的执行性能报告

```typescript
// 资源限制配置
const result = await engine.execute('skill-id', params, {
  resourceLimits: {
    maxMemory: 512 * 1024 * 1024,  // 512MB
    maxDuration: 30000,            // 30秒
    maxNetworkRequests: 50         // 最多50个网络请求
  }
});
```

### 查询优化
- **智能查询**: 基于索引的快速技能发现
- **结果缓存**: 查询结果自动缓存
- **分页支持**: 大结果集的高效分页
- **并行处理**: 兼容操作的并行执行