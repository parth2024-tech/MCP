# Sleep Analyzer — Code Reference

## ## 睡眠时长趋势

```

---

## 睡眠效率

- **平均睡眠效率**：85.3%
- **效率范围**：78%-92%
- **达标率**：63%（>85%为达标）
- **解读**：睡眠效率正常，仍有提升空间

**效率分布**：
- 优秀（>90%）：15晚
- 良好（85-90%）：28晚
- 需改善（<85%）：47晚

---

## 作息规律性

- **平均上床时间**：23:15（范围：22:30-01:00）
- **平均起床时间**：07:05（范围：06:30-08:30）
- **作息一致性评分**：72/100
- **社交时差**：45分钟（周末比工作日晚睡晚起）
- **解读**：作息基本规律，但周末波动较大

**建议**：
- 🎯 保持一致的起床时间，包括周末
- 🎯 逐步调整上床时间，避免周末过度延迟

---

## 睡眠质量分布

| 质量等级 | 天数 | 占比 | 趋势 |
|---------|------|------|------|
| 优秀 | 8 | 9% | ⬆️ |
| 很好 | 12 | 13% | ➡️ |
| 好 | 15 | 17% | ⬆️ |
| 一般 | 42 | 47% | ⬇️ |
| 差 | 10 | 11% | ⬇️ |
| 很差 | 3 | 3% | ➡️ |

**解读**：睡眠质量以"一般"为主，但"好"及以上质量的天数在增加

---

## 夜间觉醒分析

- **平均觉醒次数**：1.8次/晚
- **平均觉醒时长**：18分钟
- **主要原因**：
  1. 尿意（45%）
  2. 噪音（25%）
  3. 温度过热（15%）
  4. 其他（15%）

**建议**：
- 🎯 睡前2小时限制液体摄入
- 🎯 优化卧室温度（18-22℃）
- 🎯 使用白噪音机器遮蔽背景噪音

---

## PSQI 评估趋势

- **最新分数**：8分（睡眠质量一般）
- **上次分数**：10分（2025-03-20）
- **变化**：-2分（改善）
- **趋势**：⬆️ 持续改善

**历史趋势**：
```


```

**各成分变化**：
- 主观睡眠质量：2→2（稳定）
- 入睡时间：2→2（稳定）
- 睡眠时长：2→1（改善）
- 睡眠效率：2→1（改善）
- 睡眠障碍：2→1（改善）

---

## 睡眠问题识别

### 失眠评估

- **类型**：混合型失眠
- **频率**：4-5晚/周
- **持续时间**：18个月
- **主要症状**：
  - ✗ 入睡困难（潜伏期>30分钟）
  - ✗ 睡眠维持困难（夜间觉醒>2次）
  - ✓ 无早醒问题

- **影响**：
  - 白天疲劳：中度
  - 情绪烦躁：是
  - 注意力困难：是
  - 工作表现：轻度影响

- **建议**：🏥 持续>3个月，建议就医咨询睡眠专科

### 呼吸暂停筛查（STOP-BANG）

- **评分**：3/8
- **风险等级**：中等风险
- **阳性项目**：
  - ✗ Snoring（打鼾）
  - ✗ Tired（白天疲劳）
  - ✓ Observed apnea（未观察到呼吸暂停）
  - ✗ Pressure（高血压）
  - ✓ BMI > 28
  - ✓ Age > 50
  - ✗ Neck size > 40cm
  - ✓ Gender = male

- **建议**：⚠️ 建议进行睡眠检查（PSG）

---

## 相关性分析

### 睡眠 ↔ 运动

**运动日 vs 休息日**：
- 运动日平均睡眠：7.3小时
- 休息日平均睡眠：6.8小时
- 差异：+0.5小时（+7.4%）

**运动时间对睡眠的影响**：
- 早晨运动：睡眠时长7.5小时，质量评分7.8/10
- 下午运动：睡眠时长7.2小时，质量评分7.5/10
- 晚间运动：睡眠时长6.8小时，质量评分6.8/10

**相关性**：中等正相关（r = 0.42）
**结论**：规律运动有助于改善睡眠，但应避免睡前2-3小时剧烈运动

**建议**：
- 🎯 保持规律运动习惯
- 🎯 将运动时间移至早晨或下午
- 🎯 睡前2-3小时避免剧烈运动

---

### 睡眠 ↔ 咖啡因

**咖啡因摄入时间分析**：
- 下午2点前摄入：平均睡眠7.2小时，入睡潜伏期25分钟
- 下午2点后摄入：平均睡眠6.7小时，入睡潜伏期40分钟
- 差异：-0.5小时时长，+15分钟潜伏期

**相关性**：中等负相关（r = -0.38）
**结论**：下午2点后摄入咖啡因显著影响睡眠

**建议**：
- 🎯 避免下午2点后摄入咖啡因
- 🎯 睡前6小时完全避免咖啡因

---

### 睡眠 ↔ 情绪

**睡眠质量对次日情绪的影响**：
- 睡眠好：次日情绪积极概率82%
- 睡眠一般：次日情绪积极概率45%
- 睡眠差：次日情绪积极概率18%

**睡前情绪对入睡的影响**：
- 睡前压力高：入睡潜伏期45分钟
- 睡前压力低：入睡潜伏期20分钟
- 差异：+25分钟

**相关性**：强双向相关（r = 0.65）
**结论**：睡眠与情绪存在显著的相互影响

**建议**：
- 🎯 睡前进行压力管理（冥想、深呼吸）
- 🎯 建立放松的睡前例行程序
- 🎯 记录情绪日记，识别压力模式

---

## 洞察与建议

### 关键洞察

1. **作息不一致是主要问题**
   - 社交时差45分钟
   - 周末作息显著偏离工作日
   - 影响：生物钟紊乱，周一"时差反应"

2. **晚间运动影响入睡**
   - 晚间运动日入睡潜伏期延长15分钟
   - 建议：调整运动时间

3. **睡眠环境可优化**
   - 噪音觉醒占25%
   - 温度过热占15%
   - 建议针对性改善

---

### 优先级行动计划

#### Priority 1：建立一致作息（2周）

**目标**：提高作息一致性评分至85分

**具体行动**：
1. 固定起床时间07:00（包括周末）
2. 固定上床时间23:00
3. 限制午睡<30分钟，且下午3点前
4. 逐步调整周末作息（每次提前15分钟）

**预期效果**：
- 作息一致性评分：72 → 85
- 睡眠效率提升：+3-5%
- 周一疲劳感减轻

---

#### Priority 2：创建睡前例行程序（3周）

**目标**：建立稳定的睡前例行程序

**具体行动**：
1. 提前1小时开始例行程序（22:00）
2. 关闭电子设备（22:30）
3. 调暗卧室灯光
4. 进行放松活动（阅读、冥想、温水澡）
5. 保持卧室安静、黑暗、凉爽（18-22℃）

**预期效果**：
- 入睡潜伏期缩短：30 → 20分钟
- 睡眠质量提升：一般 → 好
- 睡前压力降低

---

#### Priority 3：优化睡眠环境（1周）

**目标**：消除环境对睡眠的干扰

**具体行动**：
1. 安装遮光窗帘
2. 使用白噪音机器遮蔽背景噪音
3. 优化温度至18-22℃
4. 移除卧室时钟
5. 更换舒适的枕头和床垫

**预期效果**：
- 夜间觉醒减少：1.8 → 1.2次/晚
- 睡眠连续性提升
- 晨起状态改善

---

#### Priority 4：生活方式调整（4周）

**目标**：消除影响睡眠的生活习惯

**具体行动**：
1. 将运动移至早晨或下午
2. 下午2点后停止咖啡因摄入
3. 睡前3小时避免酒精
4. 睡前2小时避免大餐
5. 睡前1小时避免工作相关讨论

**预期效果**：
- 睡眠时长增加：+0.3小时
- 睡眠质量评分提升：+1分
- PSQI分数改善：8 → 6

---

## 长期目标

- **睡眠时长**：达到7.5小时/晚（当前7.1小时）
- **睡眠效率**：提升至>90%（当前85%）
- **PSQI分数**：降至≤5分（当前8分）
- **作息一致性**：提升至≥85分（当前72分）
- **入睡潜伏期**：缩短至<20分钟（当前28分钟）

---

## 医学安全提醒

⚠️ **就医建议**：
- 🏥 失眠持续>3个月，建议咨询睡眠专科
- 🏥 STOP-BANG≥3分，建议进行睡眠检查（PSG）
- 🏥 严重嗜睡影响驾驶安全，需立即就医

---

**报告生成时间**：2025-06-20
**分析周期**：2025-03-20 至 2025-06-20（90天）
**数据记录数**：90晚
**睡眠分析器版本**：v1.0
```


## ### 睡眠记录数据

```json
{
  "sleep_records": [
    {
      "id": "sleep_20250620001",
      "date": "2025-06-20",
      "sleep_times": {
        "bedtime": "23:00",
        "sleep_onset_time": "23:30",
        "wake_time": "07:00",
        "out_of_bed_time": "07:15"
      },
      "sleep_metrics": {
        "sleep_duration_hours": 7.0,
        "time_in_bed_hours": 8.25,
        "sleep_latency_minutes": 30,
        "sleep_efficiency": 84.8
      },
      "sleep_quality": {
        "subjective_quality": "fair",
        "quality_score": 5,
        "rested_feeling": "somewhat"
      },
      "factors": {
        "exercise": true,
        "exercise_time": "evening",
        "caffeine_after_2pm": false,
        "screen_time_before_bed_minutes": 60
      }
    }
  ]
}
```


## ### 睡眠质量评分算法

```python
def calculate_sleep_quality_score(record):
    """
    计算睡眠质量评分（0-10分）

    因素权重：
    - 睡眠时长：30%
    - 睡眠效率：25%
    - 入睡潜伏期：20%
    - 夜间觉醒：15%
    - 主观质量：10%
    """
    score = 0

    # 睡眠时长评分（理想7-9小时）
    duration = record['sleep_duration_hours']
    if 7 <= duration <= 9:
        duration_score = 10
    elif 6 <= duration < 7 or 9 < duration <= 10:
        duration_score = 7
    else:
        duration_score = 4
    score += duration_score * 0.30

    # 睡眠效率评分（>90%优秀）
    efficiency = record['sleep_efficiency']
    efficiency_score = min(efficiency / 90 * 10, 10)
    score += efficiency_score * 0.25

    # 入睡潜伏期评分（<15分钟优秀）
    latency = record['sleep_latency_minutes']
    if latency <= 15:
        latency_score = 10
    elif latency <= 30:
        latency_score = 7
    elif latency <= 45:
        latency_score = 4
    else:
        latency_score = 1
    score += latency_score * 0.20

    # 夜间觉醒评分（0次优秀）
    awakenings = record['awakenings']['count']
    awakening_score = max(10 - awakenings * 2, 0)
    score += awakening_score * 0.15

    # 主观质量评分
    quality_map = {
        'excellent': 10,
        'very_good': 8,
        'good': 7,
        'fair': 5,
        'poor': 3,
        'very_poor': 1
    }
    subjective_score = quality_map.get(
        record['sleep_quality']['subjective_quality'],
        5
    )
    score += subjective_score * 0.10

    return round(score, 1)
```


## ### 作息规律性评分算法

```python
def calculate_sleep_consistency_score(records):
    """
    计算作息规律性评分（0-100分）

    因素：
    - 上床时间标准差
    - 起床时间标准差
    - 睡眠时长标准差
    - 工作日vs周末差异
    """
    # 提取时间数据
    bedtimes = [r['bedtime'] for r in records]
    wake_times = [r['wake_time'] for r in records]
    durations = [r['sleep_duration_hours'] for r in records]

    # 计算标准差（分钟）
    bedtime_std = time_to_minutes_std(bedtimes)
    wake_std = time_to_minutes_std(wake_times)
    duration_std = statistics.stdev(durations)

    # 计算工作日vs周末差异
    weekday_avg = avg([r['sleep_duration_hours']
                       for r in records if is_weekday(r)])
    weekend_avg = avg([r['sleep_duration_hours']
                       for r in records if is_weekend(r)])
    diff = abs(weekday_avg - weekend_avg)

    # 综合评分
    score = 100
    score -= bedtime_std * 0.5  # 上床时间标准差影响
    score -= wake_std * 0.5     # 起床时间标准差影响
    score -= duration_std * 2   # 睡眠时长标准差影响
    score -= diff * 10          # 工作日周末差异影响

    return max(0, min(100, round(score)))
```


## ### 相关性分析算法

```python
def calculate_correlation(sleep_data, other_data, lag_days=0):
    """
    计算睡眠与其他指标的相关性

    参数：
    - sleep_data: 睡眠数据列表
    - other_data: 其他指标数据列表
    - lag_days: 滞后天数（考虑延迟效应）

    返回：
    - correlation_coefficient: 相关系数
    - p_value: 统计显著性
    - interpretation: 相关性解释
    """
    # 对齐数据（考虑滞后）
    aligned = align_data_with_lag(sleep_data, other_data, lag_days)

    # 计算Pearson相关系数
    from scipy import stats
    corr, p_value = stats.pearsonr(
        aligned['sleep_values'],
        aligned['other_values']
    )

    # 解释相关性
    if abs(corr) < 0.3:
        strength = "弱"
    elif abs(corr) < 0.7:
        strength = "中等"
    else:
        strength = "强"

    direction = "正相关" if corr > 0 else "负相关"
    significant = p_value < 0.05

    interpretation = f"{strength}{direction}"
    if significant:
        interpretation += "（统计学显著）"

    return {
        'correlation_coefficient': round(corr, 3),
        'p_value': round(p_value, 4),
        'interpretation': interpretation,
        'significant': significant
    }
```


