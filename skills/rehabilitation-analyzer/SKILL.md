---
name: rehabilitation-analyzer
description: 分析康复训练数据、识别康复模式、评估康复进展，并提供个性化康复建议. Use when the task involves rehabilitation analyzer.
allowed-tools: Read, Grep, Glob, Write, Edit
risk: unknown
source: community
---

# 康复训练分析技能

## When to Use
- 需要分析康复训练记录、功能恢复趋势或康复阶段进展时使用。
- 任务涉及 ROM、肌力、疼痛、依从性或康复目标达成率分析。
- 用户请求康复报告、趋势分析或训练计划优化建议时使用。

## 核心功能

康复训练分析技能提供全面的康复数据分析功能，帮助用户追踪康复进展、识别改善模式和优化训练计划。

**主要功能模块：**

1. **康复进展分析** - 评估功能改善趋势和康复效果
2. **功能改善曲线** - 可视化ROM、肌力、平衡等功能指标变化
3. **疼痛模式识别** - 分析疼痛评分变化趋势和触发因素
4. **目标达成率评估** - 追踪康复目标完成情况
5. **康复阶段分析** - 评估当前阶段进展和阶段转换准备度
6. **训练依从性评估** - 分析训练计划执行情况

## 触发条件

技能在以下情况下自动触发：

1. 用户使用 `/rehab progress` 查看康复进展
2. 用户使用 `/rehab analysis` 进行康复分析
3. 用户使用 `/rehab trends` 查看趋势分析
4. 用户使用 `/rehab report` 生成康复报告

## 执行步骤

### 第1步：数据读取
读取康复数据文件：
- `data/rehabilitation-tracker.json` - 主康复档案
- `data/rehabilitation-logs/YYYY-MM/YYYY-MM-DD.json` - 每日训练日志

**数据验证：**
- 检查文件是否存在
- 验证数据结构完整性
- 确认有足够的数据点进行分析（建议至少3次评估或10天训练记录）

### 第2步：功能评估趋势分析

**关节活动度（ROM）分析：**
```
- 分析不同时间点的ROM测量值
- 计算ROM改善速率（度/周）
- 识别ROM平台期或倒退
- 预测达到目标ROM的时间
- 与目标范围对比
```

**肌力改善分析：**
```
- 追踪肌力等级变化（MMT评分）
- 识别肌力提升模式
- 比较不同肌群恢复速度
- 评估肌力不平衡情况
```

**平衡功能分析：**
```
- 平衡测试分数趋势
- 单腿站立时间改善
- 平衡稳定性评估
- 跌倒风险变化
```

### 第3步：疼痛模式分析

**疼痛时序分析：**
```
- 分析晨起疼痛趋势
- 分析活动后疼痛趋势
- 识别疼痛加重/缓解模式
- 关联疼痛与训练强度
```

**疼痛触发因素识别：**
```
- 特定训练项目与疼痛关系
- 训练强度与疼痛相关性
- 活动类型与疼痛关系
- 时间因素对疼痛影响
```

### 第4步：训练依从性计算

**依从性指标：**
```
依从性 = (实际训练次数 / 计划训练次数) × 100%
> See [references/details.md](references/details.md) for full code examples.
# 康复进展报告
**报告日期**: YYYY-MM-DD
**康复时长**: X天
**当前阶段**: 第X阶段 - 阶段名称

## 1. 康复进展摘要

[整体进展评价：优秀/良好/一般/需改进]
- 康复时长：X天（第X周）
- 完成训练：X次
- 训练依从性：X%
- 当前阶段进展：X%

## 2. 功能改善趋势

### 关节活动度（ROM）
- [关节名] [活动类型]: 基线X° → 当前X° → 改善X°
- 改善速率：X°/周
- 达到目标时间预估：X周
- 趋势分析：[改善趋势描述]

### 肌力评估
- [肌群名]: 基线X/5 → 当前X/5 → 改善X级
- 肌力提升模式：[描述]
- 肌力平衡：[评估]

### 平衡功能
- [测试类型]: 基线X → 当前X → 改善X
- 平衡稳定性：[评估]
- 跌倒风险：[评估]

## 3. 疼痛控制情况

- 平均疼痛水平：X/10
- 疼痛趋势：[改善/稳定/加重]
- 疼痛模式：[描述]
- 触发因素：[识别出的触发因素]
- 疼痛控制建议：[建议]

## 4. 训练依从性

- 整体依从性：X%
- 计划训练：X次
- 实际训练：X次
- 依从性评价：[优秀/良好/一般/需改进]
- 缺训原因分析：[如有]

## 5. 目标达成情况

### 已达成目标（X个）
- 目标1：[描述] - 达成日期：YYYY-MM-DD
- ...

### 进行中目标（X个）
- 目标1：[描述] - 当前进度：X% - 预计达成：YYYY-MM-DD
- ...

### 滞后目标（X个）
- 目标1：[描述] - 当前进度：X% - 需要关注

## 6. 康复阶段进展

**当前阶段**: 第X阶段 - [阶段名称]
- 阶段目标完成：X/X
- 阶段进度：X%
- 阶段持续时间：X周
- **阶段评价**: [评价]

**是否准备好进入下一阶段**: [是/否]
- [准备好的理由] / [需要继续努力的项目]

## 7. 个性化建议

### 训练建议
- [具体训练建议]

### 目标调整建议
- [目标调整建议]

### 阶段转换建议
- [阶段转换建议]

### 注意事项
- [需要注意的事项]

## 8. 下次评估

**下次评估日期**: YYYY-MM-DD
**评估重点**: [重点评估项目]
```

### 简要进展报告

> See [references/details.md](references/details.md) for full code examples.

## 数据源

### 主数据文件
- **文件路径**: `data/rehabilitation-tracker.json`
- **读取字段**:
  - `user_profile` - 用户档案和康复基本信息
  - `rehabilitation_goals` - 康复目标列表
  - `exercise_log` - 训练日志
  - `functional_assessments` - 功能评估记录
  - `phase_progression` - 阶段进展记录
  - `pain_diary` - 疼痛日记
  - `statistics` - 统计数据

### 日志数据文件
- **文件路径**: `data/rehabilitation-logs/YYYY-MM/YYYY-MM-DD.json`
- **读取字段**:
  - `daily_summary` - 日训练摘要
  - `exercise_sessions` - 训练详情
  - `pain_entries` - 疼痛记录
  - `assessments` - 评估记录
  - `notes` - 每日备注

## 分析算法

### 1. 改善趋势分析

**线性回归分析：**
```
使用最小二乘法拟合功能改善趋势
改善速率 = (当前值 - 基线值) / 时间间隔
```

**改善模式识别：**
- 线性改善：稳定持续改善
- 阶梯式改善：平台期后快速改善
- 平台期：改善停滞
- 倒退：功能下降（需要关注）

### 2. 疼痛时序分析

**移动平均计算：**
```
7日移动平均疼痛 = sum(近7天疼痛) / 7
```

**疼痛趋势判断：**
- 改善：疼痛评分下降≥20%
- 稳定：疼痛评分变化<20%
- 加重：疼痛评分上升≥20%

### 3. 依从性计算

```
总体依从性 = (实际训练天数 / 计划训练天数) × 100%

训练类型依从性 = (某类型实际完成 / 某类型计划完成) × 100%
```

**依从性评价：**
- 优秀：≥90%
- 良好：75-89%
- 一般：60-74%
- 需改进：<60%

### 4. 目标达成预测

**线性外推：**
```
预测时间 = 当前日期 + ((目标值 - 当前值) / 改善速率)
```

**考虑因素：**
- 近期改善速率
- 平台期历史
- 训练依从性

### 5. 阶段转换准备度评估

**准备度评分：**
```
准备度 = (已达成阶段目标数 / 阶段目标总数) × 100%

准备度 ≥ 80%: 建议进入下一阶段
准备度 60-79%: 可考虑进入下一阶段，需谨慎
准备度 < 60%: 建议继续当前阶段
> See [references/details.md](references/details.md) for full code examples.
错误信息: "未找到康复数据文件，请先使用 /rehab start 开始康复追踪"
处理建议: 引导用户开始康复记录
```

**错误类型2：数据不足**
```
错误信息: "数据不足，至少需要3次功能评估或10天训练记录才能生成分析报告"
当前数据: X次评估，X天训练记录
处理建议: 建议用户继续记录更多数据
```

**错误类型3：数据结构错误**
```
错误信息: "数据文件结构异常，请检查数据完整性"
处理建议: 建议用户重新初始化康复档案
```

### 分析过程错误

**错误类型：计算异常**
```
错误信息: "数据分析过程中出现异常，请稍后重试"
处理建议: 记录错误日志，提供基础数据展示
```

### 输出生成错误

**错误类型：报告生成失败**
```
错误信息: "报告生成失败，请尝试简化查询条件或联系技术支持"
处理建议: 提供简化版报告或原始数据导出
```

## 使用示例

### 示例1：查看康复进展

**用户输入：**
```
/rehab progress
```

**技能执行：**
1. 读取 rehabilitation-tracker.json
2. 读取近30天的康复日志
3. 分析功能改善趋势
4. 计算训练依从性
5. 评估目标达成情况
6. 生成进展报告

**输出：**
> See [references/details.md](references/details.md) for full code examples.

### 示例2：分析功能改善趋势

**用户输入：**
```
/rehab trends rom
```

**技能执行：**
1. 提取所有ROM评估记录
2. 绘制ROM改善曲线（文字描述）
3. 计算改善速率
4. 预测达到目标时间
5. 识别改善模式

**输出：**
> See [references/details.md](references/details.md) for full code examples.

### 示例3：评估疼痛模式

**用户输入：**
```
/rehab analysis pain
```

**技能执行：**
1. 提取所有疼痛记录
2. 分析疼痛时序变化
3. 识别疼痛触发因素
4. 评估疼痛控制效果

**输出：**
> See [references/details.md](references/details.md) for full code examples.

## 相关性分析

### 与运动模块关联

**关联分析：**
- 康复训练与运动能力恢复的关联
- 康复训练强度与心率变化的关系
- 功能改善与日常活动量的关联

**示例：**
```
用户使用 /rehab analysis correlation fitness
技能读取:
- rehabilitation-tracker.json
- fitness-tracker.json
- 分析康复训练与运动指标的相关性
> See [references/details.md](references/details.md) for full code examples.
用户: /rehab start acl-surgery 2025-05-01
系统: 初始化康复档案，设置基础目标，提供初始建议
技能: rehabilitation-analyzer（可选，用于初步评估）
```

### 场景2：记录每日训练
```
用户: /rehab exercise slr 3x15 pain2
系统: 记录训练数据，更新训练日志
技能: 不触发（仅记录）
```

### 场景3：查看进展报告
```
用户: /rehab progress
系统: 调用 rehabilitation-analyzer 技能
技能: 完整分析，生成进展报告
```

### 场景4：分析特定功能
```
用户: /rehab trends rom
系统: 调用 rehabilitation-analyzer 技能
技能: ROM专项分析，生成趋势报告
```

### 场景5：评估疼痛模式
```
用户: /rehab analysis pain
系统: 调用 rehabilitation-analyzer 技能
技能: 疼痛专项分析，识别模式和触发因素
```

---

**技能版本**: v1.0
**最后更新**: 2026-01-06
**维护者**: WellAlly Tech

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
