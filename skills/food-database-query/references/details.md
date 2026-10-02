# Food Database Query — Code Reference

## #### 1.3 分类浏览

```

**浏览模式**:
- 列出某分类下所有食物
- 按营养素排序
- 按GI值排序
- 按健康标签筛选

---

### 2. 食物比较 (Food Comparison)

#### 2.1 双食物比较

**功能**: 比较两种食物的营养差异

**比较维度**:
- **宏量营养素**: 卡路里、蛋白质、碳水、脂肪、纤维
- **微量营养素**: 主要维生素和矿物质
- **升糖指数**: GI值、升糖负荷
- **营养密度**: 综合评分

**计算逻辑**:
```python


```

**输出格式**:
- 对比表格
- 差异百分比
- 优势标注
- 推荐建议

#### 2.2 多维度比较

**支持模式**:
- 全方位营养比较
- 仅比较特定营养素
- 仅比较GI值
- 仅比较特定健康标签

**示例**: `/nutrition compare 三文鱼 鸡胸肉 营养素`

---

### 3. 食物推荐 (Food Recommendation)

#### 3.1 基于营养素推荐

**推荐逻辑**:
```python


```

**推荐类别**:
- **高蛋白**: ≥15g/100g
- **高纤维**: ≥5g/100g
- **低GI**: ≤55
- **富含维生素C**: ≥50mg/100g
- **富含Omega-3**: ≥1g/100g
- **高钙**: ≥100mg/100g
- **高铁**: ≥3mg/100g

#### 3.2 多条件推荐

**支持组合条件**:
- "高蛋白 低卡路里"
- "高纤维 低GI"
- "富含铁 素食友好"

**排序策略**:
1. 按第一优先级排序
2. 筛选符合第二条件的
3. 综合评分排序

#### 3.3 基于健康状况推荐

**高血压 (DASH饮食)**:
- 低钠食物
- 高钾食物
- 高镁、高钙食物

**糖尿病**:
- 低GI食物
- 高纤维食物
- 低碳水化合物

**高血脂**:
- 高Omega-3食物
- 低饱和脂肪
- 高纤维食物

**骨质疏松**:
- 高钙食物
- 富含维生素D
- 高镁、高锌

**贫血**:
- 富含铁
- 富含叶酸
- 富含维生素B12

---

### 4. 自动营养计算 (Auto Nutrition Calculation)

#### 4.1 食物识别

**输入解析**:
```python


## #### 4.3 营养计算

```

#### 4.4 烹饪影响修正

**考虑因素**:
- 煮熟后重量变化
- 维生素损失
- 营养素保留率

**示例**:
- 燕麦生:100g → 煮熟:约300g (3倍重量)
- 维生素保留: 煮熟保留60-80%

---

### 5. 智能搜索 (Smart Search)

#### 5.1 别名匹配

**支持同义词**:
- "燕麦" = "燕麦片" = "oats" = "rolled oats"
- "西兰花" = "绿花菜" = "broccoli"

**匹配算法**:
```python


## ### 食物数据结构

```json
{
  "id": "FD_001",
  "name": "燕麦",
  "name_en": "Oats",
  "aliases": ["燕麦片", "oats", "rolled oats"],
  "category": "grains",
  "subcategory": "whole_grains",

  "standard_portion": {
    "amount": 100,
    "unit": "g",
    "description": "100克"
  },

  "nutrition_per_100g": {
    "calories": 389,
    "protein_g": 16.9,
    "carbs_g": 66.3,
    "fat_g": 6.9,
    "fiber_g": 10.6,
    "sugar_g": 0.99,
    "saturated_fat_g": 1.4,
    "monounsaturated_fat_g": 2.5,
    "polyunsaturated_fat_g": 2.9,
    "trans_fat_g": 0,
    "water_g": 8.9,

    "vitamin_a_mcg": 0,
    "vitamin_c_mg": 0,
    "vitamin_d_mcg": 0,
    "vitamin_e_mg": 1.1,
    "vitamin_k_mcg": 1.9,
    "thiamine_mg": 0.763,
    "riboflavin_mg": 0.139,
    "niacin_mg": 6.921,
    "vitamin_b6_mg": 0.165,
    "folate_mcg": 56,
    "vitamin_b12_mcg": 0,
    "pantothenic_acid_mg": 1.349,
    "biotin_mcg": 0,

    "calcium_mg": 54,
    "iron_mg": 4.72,
    "magnesium_mg": 177,
    "phosphorus_mg": 523,
    "potassium_mg": 429,
    "sodium_mg": 2,
    "zinc_mg": 3.97,
    "copper_mg": 0.526,
    "manganese_mg": 4.916,
    "selenium_mcg": 2.8,
    "iodine_mcg": 0
  },

  "special_nutrients": {
    "omega_3_g": 0.685,
    "omega_6_g": 1.428,
    "choline_mg": 43.4,
    "beta_carotene_mcg": 0,
    "lutein_mcg": 0,
    "zeaxanthin_mcg": 0
  },

  "glycemic_index": {
    "value": 55,
    "level": "低",
    "glycemic_load": 11
  },

  "common_portions": [
    {
      "amount": 30,
      "unit": "g",
      "description": "1/4杯",
      "approximate_volume": "1/4 cup"
    },
    {
      "amount": 40,
      "unit": "g",
      "description": "1/3杯",
      "approximate_volume": "1/3 cup"
    },
    {
      "amount": 200,
      "unit": "ml",
      "description": "煮熟1杯",
      "notes": "煮熟后体积增加"
    }
  ],

  "cooking_effects": {
    "boiling": {
      "weight_change_percent": 200,
      "nutrient_changes": {
        "vitamin_c_retention": 0,
        "b_vitamins_retention": 60
      }
    }
  },

  "health_tags": ["高纤维", "低GI", "无麸质选项", "心脏健康"],

  "suitable_for": ["素食者", "高血压", "糖尿病", "高血脂"],

  "notes": "富含β-葡聚糖,有助于降低胆固醇"
}
```


## ### 成年男性 (19-50岁)

```python
RDA = {
  # 宏量营养素
  "calories": 2500,  # 中等活动水平
  "protein_g": 56,
  "carbs_g": 130,  # 最低值
  "fiber_g": 38,

  # 维生素
  "vitamin_a_mcg": 900,
  "vitamin_c_mg": 90,
  "vitamin_d_mcg": 15,
  "vitamin_e_mg": 15,
  "vitamin_k_mcg": 120,
  "thiamine_mg": 1.2,
  "riboflavin_mg": 1.3,
  "niacin_mg": 16,
  "vitamin_b6_mg": 1.3,
  "folate_mcg": 400,
  "vitamin_b12_mcg": 2.4,
  "pantothenic_acid_mg": 5,
  "biotin_mcg": 30,

  # 矿物质
  "calcium_mg": 1000,
  "iron_mg": 8,
  "magnesium_mg": 400,
  "phosphorus_mg": 700,
  "potassium_mg": 3400,
  "sodium_mg": 1500,  # 上限
  "zinc_mg": 11,
  "copper_mg": 0.9,
  "manganese_mg": 2.3,
  "selenium_mcg": 55
}
```


## ### 成年女性 (19-50岁)

```

---

## 集成功能

### 与营养模块集成

1. **记录饮食**: 自动查询营养数据
2. **营养分析**: 基于数据库的精确计算
3. **营养建议**: 数据驱动的食物推荐

### 与健康模块集成

1. **高血压**: 推荐DASH饮食友好食物
2. **糖尿病**: 筛选低GI食物
3. **高血脂**: 推荐高Omega-3食物

### 与运动模块集成

1. **运动前后**: 推荐合适的食物
2. **增肌**: 高蛋白食物推荐
3. **减脂**: 低卡路里高蛋白食物

---

## 使用示例

### 示例1: 记录早餐

**用户输入**:
```


## ### 示例2: 查询食物

```markdown
# 三文鱼 营养信息

## 基本信息
- **名称**: 三文鱼 (Salmon)
- **分类**: 蛋白质来源 > 鱼虾贝类
- **标准份量**: 100克

## 宏量营养素 (每100克)
- **卡路里**: 208 卡
- **蛋白质**: 20g ✅
- **碳水化合物**: 0g
- **脂肪**: 13g
- **Omega-3**: 2.5g ✅✅✅

## 营养亮点
- ✅✅✅ 富含Omega-3脂肪酸 (EPA+DHA)
- ✅✅ 高质量蛋白质
- ✅ 富含维生素D (11μg)
- ✅ 富含维生素B12 (3.2μg)

## 健康标签
- ✅ 高蛋白
- ✅ 富含Omega-3
- ✅ 心脏健康
- ✅ 大脑健康

## 推荐份量
- 100-150g/餐 (每周2-3次)
```


## ### 示例3: 比较食物

```markdown
# 食物比较: 鸡胸肉 vs 三文鱼

## 营养对比 (每100克)

| 营养素 | 鸡胸肉 | 三文鱼 | 差异 |
|--------|--------|--------|------|
| 卡路里 | 165 | 208 | +26% |
| 蛋白质 (g) | 31 | 20 | -35% ✅ |
| 脂肪 (g) | 3.6 | 13 | +261% |
| Omega-3 (g) | 0.1 | 2.5 | +2400% ✅✅✅ |

## 推荐建议

**选择鸡胸肉更适合**:
- ✅ 减脂期间 (低卡高蛋白)
- ✅ 控制脂肪摄入
- ✅ 蛋白质需求高

**选择三文鱼更适合**:
- ✅ 心脏健康 (高Omega-3)
- ✅ 大脑健康 (DHA)
- ✅ 抗炎需求
```


