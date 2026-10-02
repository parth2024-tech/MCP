---
name: nutrition-analyzer
description: 分析营养数据、识别营养模式、评估营养状况，并提供个性化营养建议。支持与运动、睡眠、慢性病数据的关联分析。. Use when the task involves nutrition analyzer.
allowed-tools: Read, Grep, Glob, Write
risk: unknown
source: community
---

# 营养分析器技能

分析饮食和营养数据，识别营养模式，评估营养状况，并提供个性化营养改善建议。

## When to Use
- 需要分析营养摄入、饮食模式或营养素达标情况时使用。
- 任务涉及宏量/微量营养素评估、RDA 对比、饮食趋势或膳食改进建议。
- 需要把营养数据与运动、睡眠或慢性病数据关联分析时使用。

## 功能

### 1. 营养趋势分析

分析营养素摄入的变化趋势，识别改善或需要关注的方面。

**分析维度**：
- 宏量营养素趋势（蛋白质、碳水、脂肪、纤维、卡路里）
- 微量营养素趋势（维生素、矿物质）
- 热量来源分布变化
- 餐食模式（饮食时间、频率）
- 食物类别偏好

**输出**：
- 趋势方向（改善/稳定/下降）
- 变化幅度和百分比
- 趋势显著性
- 改进建议

### 2. 营养素摄入评估

评估营养素摄入是否达到推荐标准（RDA/AI）。

**评估内容**：
- **宏量营养素评估**：
  - 蛋白质摄入量和质量
  - 碳水化合物类型分布（精制 vs 复杂碳水）
  - 脂肪类型分布（饱和/单不饱和/多不饱和/反式脂肪）
  - 膳食纤维摄入量

- **维生素评估**：
  - 维生素A、C、D、E、K
  - 维生素B族（B1、B2、B3、B6、B12、叶酸、泛酸、生物素）
  - 与RDA对比
  - 缺乏风险评估

- **矿物质评估**：
  - 常量矿物质：钙、磷、镁、钠、钾、氯、硫
  - 微量矿物质：铁、锌、铜、锰、碘、硒、铬、钼
  - 与RDA对比
  - 缺乏风险评估

- **特殊营养素评估**：
  - Omega-3脂肪酸（EPA、DHA、ALA）
  - 胆碱
  - 辅酶Q10
  - 植物化学物（类黄酮、类胡萝卜素等）

**输出**：
- 每种营养素的达成率
- 缺乏/不足/充足/过量分级
- 缺乏风险识别
- 优先改善建议

### 3. 营养状况评估

综合评估用户的营养状况。

**评估内容**：
- **整体营养质量评分**：
  - 营养密度评分
  - 食物多样性评分
  - 均衡饮食评分

- **营养模式识别**：
  - 饮食模式类型（地中海式、DASH、素食等）
  - 饮食时间模式（进食频率、进食窗口）
  - 零食和加餐模式

- **营养风险识别**：
  - 营养缺乏风险（如维生素D缺乏、铁缺乏）
  - 营养过量风险（如维生素A过量、钠过量）
  - 不健康饮食习惯（高糖、高脂、高钠）

**输出**：
- 营养状况等级（优秀/良好/一般/较差）
- 主要营养问题识别
- 风险因素列表
- 改善优先级

### 4. 相关性分析

分析营养与其他健康指标的相关性。

**支持的相关性分析**：
- **营养 ↔ 体重**：
  - 卡路里摄入与体重变化的关系
  - 宏量营养素比例与体重管理
  - 进食时间与代谢关系

- **营养 ↔ 运动**：
  - 营养摄入对运动表现的影响
  - 运动日vs休息日的营养需求
  - 蛋白质摄入与肌肉恢复

- **营养 ↔ 睡眠**：
  - 咖啡因摄入与睡眠质量
  - 晚餐时间与入睡时间
  - 特定营养素（如镁、色氨酸）与睡眠

- **营养 ↔ 血压**：
  - 钠摄入与血压
  - 钾/钠比值与血压
  - DASH饮食依从性与血压控制

- **营养 ↔ 血糖**：
  - 碳水化合物类型与血糖波动
  - 膳食纤维与血糖控制
  - 进食时间与血糖曲线

**输出**：
- 相关系数（-1到1）
- 相关性强度（弱/中/强）
- 统计显著性
- 因果关系推断
- 实践建议

### 5. 个性化建议生成

基于用户数据生成个性化营养改善建议。

**建议类型**：
- **营养素调整建议**：
  - 增加缺乏的营养素
  - 减少过量的营养素
  - 优化营养素比例

- **食物选择建议**：
  - 推荐特定食物类别
  - 食物替换建议（更健康的选择）
  - 食物搭配建议（促进吸收）

- **饮食习惯建议**：
  - 进食时间调整
  - 餐食频率调整
  - 烹饪方式建议

- **补充剂建议**（仅供参考）：
  - 基于缺乏风险的补充剂建议
  - 补充剂剂量和时机
  - 相互作用警示

**建议依据**：
- DRIs/RDA标准
- 用户营养历史数据
- 用户健康状况和目标
- 循证营养学证据

---

## 使用说明

### 触发条件

当用户请求以下内容时触发本技能：
- 营养趋势分析
- 营养素摄入评估
- 营养状况评估
- 营养改善建议
- 营养与其他健康指标的关联分析

### 执行步骤

#### 步骤 1: 确定分析范围

明确用户请求的分析类型和时间范围：
- 分析类型：趋势/评估/相关性/建议
- 时间范围：周/月/季度/自定义
- 分析深度：宏量营养素/微量营养素/全面分析

#### 步骤 2: 读取数据

**主要数据源**：
1. `data-example/nutrition-tracker.json` - 营养追踪主数据
2. `data-example/nutrition-logs/YYYY-MM/YYYY-MM-DD.json` - 每日饮食记录

**关联数据源**：
1. `data-example/profile.json` - 体重、BMI等基础数据
2. `data-example/fitness-tracker.json` - 运动数据
3. `data-example/sleep-tracker.json` - 睡眠数据
4. `data-example/hypertension-tracker.json` - 血压数据
5. `data-example/diabetes-tracker.json` - 血糖数据

#### 步骤 3: 数据分析

根据分析类型执行相应的分析算法：

**趋势分析算法**：
- 线性回归计算趋势斜率
- 移动平均平滑波动
- 统计显著性检验

**RDA达成率计算**：
```python
rda_achievement = (actual_intake / rda_value) * 100

status_classification:
- < 50%: 严重缺乏
- 50-75%: 不足
- 75-100%: 接近目标
- 100-150%: 充足（理想范围）
- > 150%: 过量（注意安全上限UL）
```

**营养密度评分**：
```python
nutrient_density_score = (
    (vitamins_achieved / total_vitamins) * 40 +
    (minerals_achieved / total_minerals) * 30 +
    (fiber_achieved / fiber_rda) * 30
)
```

**相关性分析算法**：
- Pearson相关系数计算
- 滞后相关性分析（考虑时间延迟效应）
- 多变量回归分析

#### 步骤 4: 生成报告

按照标准格式输出分析报告（见"输出格式"部分）

---

## 输出格式

### 营养趋势分析报告

```markdown
# 营养摄入趋势分析报告

## 分析周期
2025-03-20 至 2025-06-20（3个月，90天记录）

## 宏量营养素趋势

### 卡路里摄入
- **趋势**：⬇️ 下降
- **开始**：平均2100卡/天
- **当前**：平均1950卡/天
- **变化**：-150卡/天 (-7.1%)
- **解读**：卡路里摄入适度减少，与减重目标一致

**趋势线**：
```
2100 ┤ ╭╮
2050 ┤ ╭╯╰╮
2000 ┼─╯   ╰╮
1950 ┤      ╰
1900 └───────────
     3月  4月  5月  6月
> See [references/details.md](references/details.md) for full code examples.

---

## 数据结构

### 饮食记录数据

> See [references/details.md](references/details.md) for full code examples.

---

## 算法说明

### RDA达成率计算

> See [references/details.md](references/details.md) for full code examples.

### 营养密度评分

> See [references/details.md](references/details.md) for full code examples.

### 健康饮食指数评分

> See [references/details.md](references/details.md) for full code examples.

---

## 医学安全边界

⚠️ **重要声明**

本分析仅供健康参考，不构成医疗诊断或营养处方。

### 分析能力范围

✅ **能做到**：
- 营养数据统计和分析
- 趋势识别和可视化
- RDA达成率计算
- 营养缺乏风险评估
- 一般性营养建议
- 补充剂相互作用检查

❌ **不做到**：
- 诊断营养缺乏疾病
- 开具补充剂处方
- 替代注册营养师
- 处理严重营养不良
- 评估食物过敏

### 危险信号检测

在分析过程中检测以下危险信号：

1. **营养素过量**：
   - 维生素A > 3000μg（长期）
   - 维生素D > 100μg（长期）
   - 铁 > 45mg（长期）
   - 硒 > 400μg
   - 钠 > 2300mg（持续）

2. **营养素缺乏**：
   - 维生素D < 10μg/天（血清<12 ng/mL）
   - 维生素B12 < 1.5μg/天（素食者）
   - 铁 < 6mg/天（育龄女性）
   - 钙 < 500mg/天

3. **能量摄入异常**：
   - 持续<1200卡/天（可能营养不良）
   - 持续>3500卡/天（可能超重）

4. **饮食模式异常**：
   - 膳食纤维<10g/天
   - 添加糖>25%热量
   - 饱和脂肪>15%热量

### 建议分级

**Level 1: 一般性建议**
- 基于DRIs/RDA标准
- 适用于一般人群
- 无需医疗监督

**Level 2: 参考性建议**
- 基于用户数据和健康状况
- 需结合个人情况
- 建议咨询营养师

**Level 3: 医疗建议**
- 涉及疾病管理或补充剂
- 需医生确认
- 不得自行调整药物剂量

---

## 参考资源

- 中国居民膳食营养素参考摄入量 (DRIs)：http://www.cnsoc.org/
- 美国膳食指南：https://www.dietaryguidelines.gov/
- USDA FoodData Central：https://fooddatacentral.usda.gov/
- WHO营养建议：https://www.who.int/nutrition/
- 补充剂相互作用数据库：https://naturalmedicines.therapeuticresearch.com/

---

**技能版本**: v1.0
**创建日期**: 2026-01-06
**维护者**: WellAlly Tech

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
