---
name: food-database-query
description: Food Database Query. Use when the task involves food database query.
risk: unknown
source: community
---

# 食物数据库查询技能

**技能名称**: Food Database Query
**技能类型**: 数据查询与分析
**创建日期**: 2026-01-06
**版本**: v1.0

---

## When to Use
- 需要查询食物营养成分、比较食物差异或做营养计算时使用。
- 任务涉及食物数据库检索、食物推荐、份量换算或分类筛选。
- 需要基于结构化食物数据生成分析结果而不是自由文本建议时使用。

## 技能概述

本技能提供全面的营养食物数据库查询功能,支持食物营养信息查询、比较、推荐和自动营养计算。

**核心功能**:
- ✅ 食物营养信息查询
- ✅ 食物比较分析
- ✅ 智能食物推荐
- ✅ 自动营养计算
- ✅ 分类浏览和搜索
- ✅ 份量转换和估算

---

## 数据源

### 主数据库
- **文件**: `data/food-database.json`
- **内容**: 50种常见食物的详细营养数据
- **结构**: 每种食物包含30+营养素指标

### 分类体系
- **文件**: `data/food-categories.json`
- **分类**: 10大类,30+子类
- **支持**: 按分类浏览和筛选

---

## 功能模块

### 1. 食物查询 (Food Query)

#### 1.1 精确查询

**用途**: 根据食物名称查询营养信息

**支持输入**:
- 中文名称: "燕麦", "西兰花", "三文鱼"
- 英文名称: "Oats", "Broccoli", "Salmon"
- 别名: "燕麦片", "broccoli", "三文鱼肉"

**查询流程**:
1. 接收食物名称
2. 在数据库中搜索匹配项
3. 支持模糊匹配和别名匹配
4. 返回完整营养信息

**返回信息**:
- 基本信息 (名称、分类、标准份量)
- 宏量营养素 (卡路里、蛋白质、碳水、脂肪、纤维)
- 微量营养素 (维生素、矿物质)
- 特殊营养素 (Omega-3/6、胆碱等)
- 升糖指数数据
- 健康标签和适用人群
- 常见份量
- 营养优势说明

**示例**:
```python
# 用户输入: "燕麦"
# 返回:
{
  "name": "燕麦",
  "name_en": "Oats",
  "category": "谷物类",
  "nutrition_per_100g": {
    "calories": 389,
    "protein_g": 16.9,
    "carbs_g": 66.3,
    "fat_g": 6.9,
    "fiber_g": 10.6,
    # ... 更多营养素
  },
  "health_tags": ["高纤维", "低GI"],
  "glycemic_index": {"value": 55, "level": "低"}
}
```

#### 1.2 模糊搜索

**用途**: 根据营养特征搜索食物

**搜索条件**:
- 营养素含量: "高蛋白", "高纤维", "低GI"
- 营养素组合: "高蛋白 低卡路里", "高纤维 低GI"
- 分类筛选: "谷物类", "蔬菜", "蛋白质"
- 适用人群: "素食友好", "高血压", "糖尿病"

**搜索逻辑**:
```python
# 示例: 搜索"高蛋白 低卡路里"
def search_foods(criteria):
    results = []
    for food in database:
        protein = food.nutrition_per_100g.protein_g
        calories = food.nutrition_per_100g.calories

        # 定义阈值
        high_protein = protein >= 15  # 每100g≥15g蛋白质
        low_calorie = calories <= 150  # 每100g≤150卡

        if high_protein and low_calorie:
            results.append(food)

    return sorted(results, key=lambda x: x.protein_g, reverse=True)
```

**返回格式**:
- 按匹配度排序
- 显示关键营养素
- 标注匹配标签

#### 1.3 分类浏览

**用途**: 按食物分类浏览所有食物

**分类层级**:
```
蛋白质来源
├── 肉类
├── 禽类
├── 鱼虾贝类
├── 蛋类
├── 豆类
├── 坚果种子
└── 乳制品
> See [references/details.md](references/details.md) for full code examples.
def compare_foods(food1, food2):
    comparison = {}

    # 宏量营养素差异
    for nutrient in ["calories", "protein_g", "fiber_g"]:
        val1 = food1.nutrition_per_100g[nutrient]
        val2 = food2.nutrition_per_100g[nutrient]
        diff = val1 - val2
        percent = (diff / val2) * 100

        comparison[nutrient] = {
            "food1": val1,
            "food2": val2,
            "difference": diff,
            "percent_change": percent,
            "better": "food1" if diff > 0 else "food2"
        }

    return comparison
def recommend_by_nutrient(nutrient, min_value=None, max_value=None):
    recommendations = []

    for food in database:
        value = food.nutrition_per_100g[nutrient]

        # 筛选符合条件
        if min_value and value < min_value:
            continue
        if max_value and value > max_value:
            continue

        recommendations.append({
            "food": food,
            "value": value,
            "rda_percent": (value / RDA[nutrient]) * 100
        })

    # 按含量排序
    return sorted(recommendations, key=lambda x: x["value"], reverse=True)
def parse_food_input(text):
    # 示例: "燕麦粥 1杯 + 鸡蛋 1个 + 牛奶 250ml"

    foods = []
    portions = []

    # 识别食物名称
    for item in text.split("+"):
        food_name = extract_food_name(item)  # "燕麦粥"
        portion = extract_portion(item)      # "1杯"

        # 标准化食物名称
        standard_name = normalize_food_name(food_name)  # "燕麦"

        # 查询数据库
        food_data = query_database(standard_name)

        foods.append(food_data)
        portions.append(parse_portion(portion))

    return foods, portions
```

#### 4.2 份量转换

**常见份量**:
- "1杯": 240ml (液体) 或 重量依据食物
- "1个": 鸡蛋50g, 苹果150g
- "1片": 面包30g
- "100g": 直接使用

**份量数据库**:
```json
{
  "common_portions": [
    {
      "amount": 1,
      "unit": "个",
      "weight_g": 50,
      "description": "1个大号鸡蛋"
    },
    {
      "amount": 1,
      "unit": "杯",
      "weight_g": 240,
      "description": "1杯牛奶"
    }
  ]
}
```

#### 4.3 营养计算

**计算公式**:
```python
def calculate_nutrition(food, portion_grams):
    nutrition = {}

    for nutrient, value_per_100g in food.nutrition_per_100g.items():
        # 按100g比例计算
        nutrition[nutrient] = (value_per_100g * portion_grams) / 100

    return nutrition
> See [references/details.md](references/details.md) for full code examples.
def find_food(name):
    # 1. 精确匹配主名称
    if name in database:
        return database[name]

    # 2. 匹配别名
    for food in database:
        if name in food.aliases:
            return food

    # 3. 模糊匹配
    matches = fuzzy_search(name)
    if matches:
        return matches[0]

    return None
```

#### 5.2 拼写纠错

**编辑距离算法**:
```python
def fuzzy_search(name, max_distance=2):
    matches = []

    for food in database:
        # 计算编辑距离
        distance = levenshtein_distance(name, food.name)

        if distance <= max_distance:
            matches.append((food, distance))

    # 按距离排序
    return sorted(matches, key=lambda x: x[1])
```

---

## 数据结构

### 食物数据结构

> See [references/details.md](references/details.md) for full code examples.

---

## RDA参考值

### 成年男性 (19-50岁)

> See [references/details.md](references/details.md) for full code examples.

### 成年女性 (19-50岁)

```python
RDA_FEMALE = {
  "calories": 2000,  # 中等活动水平
  "protein_g": 46,
  "fiber_g": 25,
  "iron_mg": 18,  # 育龄期
  # ... 其他略有差异
}
> See [references/details.md](references/details.md) for full code examples.
/nutrition record breakfast 燕麦粥 1杯 + 鸡蛋 1个 + 牛奶 250ml
```

**系统处理**:
1. 识别食物: 燕麦、鸡蛋、牛奶
2. 查询营养数据
3. 计算份量营养
4. 汇总整餐营养
5. 记录到日志

**返回结果**:
```markdown
✅ 早餐已记录

**食物**: 燕麦粥(1杯) + 鸡蛋(1个) + 牛奶(250ml)

**营养汇总**:
- 卡路里: 417 卡
- 蛋白质: 25.1g
- 碳水化合物: 48.5g
- 脂肪: 15.2g
- 膳食纤维: 8.2g

**微量营养素亮点**:
- 维生素D: 3.1 μg (21% RDA)
- 钙: 332 mg (33% RDA)
- 维生素B12: 1.3 μg (54% RDA)
```

### 示例2: 查询食物

**用户输入**:
```
/nutrition food 三文鱼
```

**返回结果**:
> See [references/details.md](references/details.md) for full code examples.

### 示例3: 比较食物

**用户输入**:
```
/nutrition compare 鸡胸肉 三文鱼
```

**返回结果**:
> See [references/details.md](references/details.md) for full code examples.

---

## 扩展计划

### 短期 (1-2个月)
- ✅ 完成50种常见食物
- ⏳ 扩展至100种食物
- ⏳ 添加更多常见份量
- ⏳ 优化搜索算法

### 中期 (3-6个月)
- ⏳ 扩展至300种食物
- ⏳ 添加品牌食品
- ⏳ 支持用户自定义食物
- ⏳ 添加食物照片

### 长期 (持续)
- ⏳ 持续更新数据库
- ⏳ 添加季节性食物
- ⏳ 集成条形码扫描
- ⏳ AI食物识别

---

## 质量保证

### 数据准确性
- 来源: 《中国食物成分表(第6版)》+ USDA
- 验证: 交叉验证多个来源
- 更新: 定期更新数据

### 功能测试
- 查询准确性测试
- 计算精度测试
- 边界条件测试
- 性能测试

---

## 注意事项

### ⚠️ 重要限制
1. **数据范围**: 当前仅覆盖50种常见食物
2. **烹饪影响**: 数据基于生食/标准烹饪
3. **个体差异**: 实际营养吸收因人而异
4. **地域差异**: 不同地区食物营养可能不同

### ⚠️ 使用建议
1. **均衡饮食**: 不要依赖单一食物
2. **多样化选择**: 轮换不同食物
3. **适量原则**: 即使健康食物也需适量
4. **专业指导**: 特殊需求咨询营养师

---

## 技术实现

### 文件位置
- 数据库: `data/food-database.json`
- 分类: `data/food-categories.json`
- 命令: `.claude/commands/nutrition.md`
- 技能: `.claude/skills/food-database-query/SKILL.md`

### 性能优化
- 数据库索引 (食物名称、分类)
- 缓存常用查询
- 模糊搜索优化

---

**技能版本**: v1.0
**最后更新**: 2026-01-06
**维护者**: WellAlly Tech

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
