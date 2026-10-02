---
name: sleep-analyzer
description: 分析睡眠数据、识别睡眠模式、评估睡眠质量，并提供个性化睡眠改善建议。支持与其他健康数据的关联分析。. Use when the task involves sleep analyzer.
allowed-tools: Read, Grep, Glob, Write
risk: unknown
source: community
---

# 睡眠分析器技能

分析睡眠数据，识别睡眠模式，评估睡眠质量，并提供个性化睡眠改善建议。

## When to Use
- 需要分析睡眠时长、效率、作息规律或睡眠质量时使用。
- 任务涉及失眠模式、夜间觉醒、PSQI 评分或睡眠问题识别。
- 需要把睡眠数据与情绪、运动或其他健康因素做关联分析时使用。

## 功能

### 1. 睡眠趋势分析

分析睡眠时长、质量、效率的变化趋势，识别改善或需要关注的方面。

**分析维度**：
- 睡眠时长趋势（平均睡眠时长变化）
- 睡眠效率趋势（睡眠效率百分比变化）
- 入睡时间模式（上床时间、入睡时间、起床时间）
- 作息规律性评分（sleep consistency score）
- 周末vs工作日对比（social jetlag）

**输出**：
- 趋势方向（改善/稳定/下降）
- 变化幅度和百分比
- 趋势显著性评估
- 最佳睡眠时间窗口识别
- 改进建议

### 2. 睡眠质量评估

综合评估睡眠质量，识别影响睡眠质量的关键因素。

**评估内容**：
- PSQI分数追踪和趋势
- 主观睡眠质量分布（好/中/差）
- 夜间觉醒分析（次数、时长、原因）
- 睡眠阶段分析（深睡、浅睡、REM比例）
- 睡后恢复感评估

**输出**：
- 睡眠质量等级（优秀/良好/一般/较差）
- 质量变化趋势
- 主要影响因素识别
- 质量改善优先级建议

### 3. 睡眠问题识别

识别常见的睡眠问题和风险因素。

**识别内容**：
- **失眠模式**：
  - 入睡困难（sleep latency >30分钟）
  - 睡眠维持困难（夜间觉醒>2次或总觉醒时间>30分钟）
  - 早醒（比预期提前醒来>30分钟）
  - 混合型失眠

- **呼吸暂停风险**：
  - STOP-BANG问卷评分
  - 症状分析（打鼾、憋醒、白天嗜睡）
  - 风险等级（低/中/高）

- **其他问题**：
  - 作息不规律检测
  - 睡眠债计算（理想时长vs实际时长）
  - 社交时差评估

**输出**：
- 问题存在与否
- 问题类型和严重程度
- 风险因素列表
- 是否需要就医建议

### 4. 相关性分析

分析睡眠与其他健康指标的相关性。

**支持的相关性分析**：
- **睡眠 ↔ 运动**：
  - 运动日vs休息日的睡眠差异
  - 运动时间对睡眠的影响（早晨/下午/晚间运动）
  - 运动强度与睡眠质量的相关性

- **睡眠 ↔ 饮食**：
  - 咖啡因摄入与睡眠时长、入睡时间的关系
  - 酒精摄入对睡眠结构的影响
  - 晚餐时间与睡眠质量的关系

- **睡眠 ↔ 情绪**：
  - 睡眠与情绪的双向关系分析
  - 压力水平对睡眠质量的影响
  - 睡眠剥夺对日间情绪的影响

- **睡眠 ↔ 慢性病**：
  - 睡眠与高血压的关系
  - 睡眠与血糖控制的关联
  - 睡眠与体重变化的关系

**输出**：
- 相关系数（-1到1）
- 相关性强度（弱/中/强）
- 统计显著性
- 因果关系推断
- 实践建议

### 5. 个性化建议生成

基于用户数据生成个性化睡眠改善建议。

**建议类型**：
- **作息调整建议**：
  - 最佳上床/起床时间
  - 作息一致性改善方案
  - 午睡管理建议

- **睡前准备建议**：
  - 睡前例行程序设计
  - 放松技巧推荐
  - 屏幕时间管理

- **睡眠环境优化**：
  - 温度、湿度、光线、噪音优化
  - 床品舒适度建议

- **生活方式调整**：
  - 运动、饮食、咖啡因、酒精管理
  - 压力管理建议

- **CBT-I元素**：
  - 刺激控制建议
  - 睡眠限制建议
  - 认知重构建议

**输出**：
- 优先级排序的建议列表
- 具体实施步骤
- 预期效果说明
- 实施时间线

---

## 使用说明

### 触发条件

当用户请求以下内容时触发本技能：
- 睡眠趋势分析
- 睡眠质量评估
- 睡眠问题识别
- 睡眠改善建议
- 睡眠与其他健康指标的关联分析

### 执行步骤

#### 步骤 1: 确定分析范围

明确用户请求的分析类型和时间范围：
- 分析类型：趋势/质量/问题/相关性/建议
- 时间范围：周/月/季度/自定义

#### 步骤 2: 读取数据

**主要数据源**：
1. `data-example/sleep-tracker.json` - 睡眠追踪主数据
2. `data-example/sleep-logs/YYYY-MM/YYYY-MM-DD.json` - 每日睡眠记录

**关联数据源**：
1. `data-example/fitness-tracker.json` - 运动数据
2. `data-example/hypertension-tracker.json` - 血压数据
3. `data-example/diabetes-tracker.json` - 血糖数据
4. `data-example/diet-records/` - 饮食记录
5. `data-example/mood-tracker.json` - 情绪数据

#### 步骤 3: 数据分析

根据分析类型执行相应的分析算法：

**趋势分析算法**：
- 线性回归计算趋势斜率
- 移动平均平滑波动
- 统计显著性检验

**相关性分析算法**：
- Pearson相关系数计算
- 滞后相关性分析（考虑时间延迟效应）
- 多变量回归分析

**模式识别算法**：
- 时间序列模式识别
- 异常值检测
- 周期性分析

#### 步骤 4: 生成报告

按照标准格式输出分析报告（见"输出格式"部分）

---

## 输出格式

### 睡眠质量分析报告

```markdown
# 睡眠质量分析报告

## 分析周期
2025-03-20 至 2025-06-20（3个月）

---

## 睡眠时长趋势

- **趋势**：⬆️ 改善
- **开始**：平均6.2小时/晚
- **当前**：平均7.1小时/晚
- **变化**：+0.9小时 (+14.5%)
- **解读**：睡眠时长显著增加，接近理想目标（7.5小时）

**趋势线**：
```
6.5h ┤     ╭╮
6.0h ┤   ╭─╯╰╮
5.5h ┤ ╭─╯   ╰─╮
5.0h ┼─┘       ╰─
     └───────────
     3月  4月  5月  6月
> See [references/details.md](references/details.md) for full code examples.
12 ┤ ●
10 ┤  ●
 8 ┤    ●
 6 ┤
   └──────
   12月 3月 6月

---

## 数据结构

### 睡眠记录数据

> See [references/details.md](references/details.md) for full code examples.

---

## 算法说明

### 睡眠质量评分算法

> See [references/details.md](references/details.md) for full code examples.

### 作息规律性评分算法

> See [references/details.md](references/details.md) for full code examples.

### 相关性分析算法

> See [references/details.md](references/details.md) for full code examples.

---

## 医学安全声明

本技能提供的分析和建议仅供参考，不构成医疗诊断或治疗方案。

**本技能能够做到的**：
- ✅ 分析睡眠数据和模式
- ✅ 识别睡眠问题风险
- ✅ 提供睡眠卫生建议
- ✅ 评估与其他健康指标的相关性

**本技能不能做的**：
- ❌ 诊断失眠、睡眠呼吸暂停等疾病
- ❌ 开具助眠药物或治疗
- ❌ 替代专业睡眠医学治疗
- ❌ 处理严重睡眠障碍

**何时需要就医**：
- 🏥 失眠持续>3个月
- 🏥 疑似睡眠呼吸暂停（STOP-BANG≥3）
- 🏥 严重嗜睡影响安全
- 🏥 突发严重睡眠问题

---

## 参考资源

- AASM 睡眠评分标准：https://aasm.org/
- PSQI 量表：https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3455216/
- STOP-BANG 问卷：https://www.stopbang.ca/
- CBT-I 治疗：https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3455216/

---

**技能版本**: v1.0
**创建日期**: 2026-01-02
**维护者**: WellAlly Tech

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
