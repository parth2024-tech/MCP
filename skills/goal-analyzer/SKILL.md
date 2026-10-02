---
name: goal-analyzer
description: 分析健康目标数据、识别目标模式、评估目标进度,并提供个性化目标管理建议。支持与营养、运动、睡眠等健康数据的关联分析。. Use when the task involves goal analyzer.
allowed-tools: Read, Grep, Glob, Write
risk: unknown
source: community
---

# 健康目标分析器技能

分析健康目标数据,识别目标模式和进度,评估目标达成情况,并提供个性化目标管理建议。

## When to Use
- 你需要评估健康目标是否符合 SMART 原则，并识别目标设定中的薄弱点。
- 你想跟踪目标进度，并结合营养、运动、睡眠等健康数据做关联分析。
- 你需要面向个人健康管理的目标优化建议、风险提示和阶段性调整方案。

## 功能

### 1. SMART目标验证

验证设定的新目标是否符合SMART原则。

**验证维度**:
- **S**pecific(具体性)
  - 目标是否明确具体
  - 是否有清晰的定义
  - 是否避免模糊表述

- **M**easurable(可衡量性)
  - 是否有可量化的指标
  - 是否有明确的衡量标准
  - 是否可以追踪进度

- **A**chievable(可实现性)
  - 目标是否现实可行
  - 是否考虑了当前状况
  - 是否在合理时间范围内
  - 减重目标:建议每周0.5-1公斤
  - 运动目标:建议每周3-5次,每次30-60分钟

- **R**elevant(相关性)
  - 目标是否与健康相关
  - 是否符合用户整体健康计划
  - 是否与现有目标协调

- **T**ime-bound(有时限)
  - 是否有明确的截止日期
  - 时间框架是否合理
  - 是否有阶段性里程碑

**输出**:
- SMART评分(每个维度1-5分)
- 总体评分和等级(S级/A级/B级/C级)
- 改进建议
- 目标优化方案

**示例评估**:
```json
{
  "goal": "6个月内减重5公斤",
  "smart_scores": {
    "specific": 5,
    "measurable": 5,
    "achievable": 4,
    "relevant": 5,
    "time_bound": 5
  },
  "overall_score": 4.8,
  "grade": "A",
  "assessment": "优秀的SMART目标",
  "suggestions": [
    "建议设定阶段性里程碑(每2个月减重1.5-2公斤)",
    "建议配合运动计划和饮食调整"
  ]
}
> See [references/details.md](references/details.md) for full code examples.
{
  "habit": "morning-stretch",
  "current_streak": 21,
  "longest_streak": 21,
  "completion_rate": 95.2,
  "strength_score": 7.5,
  "stage": "巩固期",
  "assessment": "习惯即将形成,继续保持!",
  "next_milestone": 30,
  "suggestions": [
    "继续保持,即将达到30天里程碑",
    "可以尝试添加新的相关习惯"
  ]
}
{
  "goal": "weight-loss",
  "correlations": [
    {
      "factor": "daily_calories",
      "correlation": -0.75,
      "strength": "强负相关",
      "insight": "每日卡路里摄入与减重进度呈强负相关,降低摄入加速进度"
    },
    {
      "factor": "exercise_frequency",
      "correlation": 0.68,
      "strength": "强正相关",
      "insight": "运动频率与减重进度呈强正相关,建议保持每周4次以上"
    },
    {
      "factor": "sleep_duration",
      "correlation": 0.45,
      "strength": "中等正相关",
      "insight": "睡眠时长影响减重,建议保证7-8小时睡眠"
    }
  ],
  "recommendations": [
    "重点控制卡路里摄入,保持当前运动频率",
    "优化睡眠时长,以提升减重效果"
  ]
}
// 进度趋势折线图
{
  type: 'line',
  xAxis: { type: 'category', data: ['1月', '2月', '3月', ...] },
  yAxis: { type: 'value', name: '完成%' },
  series: [{
    name: '目标进度',
    type: 'line',
    data: [0, 15, 35, 50, 70, 85, 100],
    smooth: true,
    markLine: {
      data: [{ yAxis: 50, name: '50%里程碑' }]
    }
  }]
}

// 习惯热图
{
  type: 'heatmap',
  xAxis: { type: 'category', data: ['周一', '周二', ...] },
  yAxis: { type: 'category', data: ['第1周', '第2周', ...] },
  visualMap: {
    min: 0, max: 1,
    inRange: { color: ['#ebedf0', '#216e39'] }
  },
  series: [{
    type: 'heatmap',
    data: [[0, 0, 1], [1, 0, 1], [2, 0, 0], ...]
  }]
}

// 目标达成率环形图
{
  type: 'pie',
  radius: ['50%', '70%'],
  series: [{
    type: 'pie',
    radius: ['50%', '70%'],
    data: [
      { value: 70, name: '已完成' },
      { value: 30, name: '未完成' }
    ],
    label: { formatter: '{b}: {c}%' }
  }]
}
# 健康目标分析报告

## 目标概览
- 目标: 6个月内减重5公斤
- 开始日期: 2025-01-01
- 目标日期: 2025-06-30
- 当前日期: 2025-03-20

## SMART评估
- 具体性: ⭐⭐⭐⭐⭐ (5/5)
- 可衡量性: ⭐⭐⭐⭐⭐ (5/5)
- 可实现性: ⭐⭐⭐⭐ (4/5)
- 相关性: ⭐⭐⭐⭐⭐ (5/5)
- 有时限: ⭐⭐⭐⭐⭐ (5/5)

**总体评分: A (4.8/5)**

## 进度分析
- 当前进度: 70%
- 已完成: 3.5公斤 / 5.0公斤
- 时间进度: 27% (79天/180天)
- 进度评级: 🟢 优秀 (进度超前)

### 趋势分析
- 平均速度: 0.77公斤/月
- 预计完成: 2025-05-20 (提前40天)
- 进度趋势: 稳定上升

## 习惯追踪
### 早上拉伸习惯
- 当前连续: 21天 🔥
- 历史最长: 21天
- 完成率: 95.2%
- 习惯阶段: 巩固期
- 下一个里程碑: 30天 ⭐

## 动机评估
- 当前动机: 8/10
- 动机趋势: 稳定
- 动机状态: 良好

## 数据关联分析
### 强相关因素(影响度>60%)
1. 每日卡路里摄入 (负相关 -0.75)
2. 每周运动频次 (正相关 +0.68)
3. 睡眠时长 (正相关 +0.45)

### 建议
- 保持当前卡路里摄入水平
- 继续保持每周4次运动频率
- 优化睡眠时长至7-8小时

## 障碍识别
主要障碍: 社交活动饮食控制

解决方案:
- 社交活动前提前规划饮食
- 选择健康餐厅
- 适量控制份量

## 成就解锁
🔥 连续21天 - 早上拉伸习惯达成!
🎯 半程达成 - 减重目标完成50%!

## 下一步行动
1. 保持当前进度
2. 关注社交活动饮食控制
3. 继续养成早操习惯
4. 准备达成30天里程碑
> See [references/details.md](references/details.md) for full code examples.
def validate_smart_goal(goal):
    scores = {
        'specific': check_specificity(goal),
        'measurable': check_measurability(goal),
        'achievable': check_achievability(goal),
        'relevant': check_relevance(goal),
        'time_bound': check_time_bound(goal)
    }
    overall = sum(scores.values()) / len(scores)
    grade = get_grade(overall)
    return scores, overall, grade
```

### HTML报告生成
- 使用ECharts 5.x CDN
- 响应式CSS布局
- JavaScript处理图表交互
- 支持深色/浅色主题切换
- 数据从JSON文件动态加载

---

**使用此技能时,始终优先考虑用户的健康和安全!**

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
