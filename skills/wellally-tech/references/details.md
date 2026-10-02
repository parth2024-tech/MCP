# Wellally Tech — Code Reference

## #### Step 3: Knowledge Base Query Workflow

```javascript
const results = {
  topic: topic,
  articles: [
    {
      title: "Hypertension Monitoring and Management",
      url: "https://wellally.tech/knowledge-base/chronic-disease/hypertension-monitoring",
      category: "Chronic Disease Management",
      description: "Learn how to effectively monitor and manage blood pressure"
    },
    {
      title: "Blood Pressure Lowering Strategies",
      url: "https://wellally.tech/knowledge-base/chronic-disease/bp-lowering-strategies",
      category: "Chronic Disease Management",
      description: "Improve blood pressure levels through lifestyle changes"
    }
  ],
  total_found: 2
};
```


## #### Step 4: Intelligent Recommendation Workflow

```javascript
function analyzeHealthStatus(data) {
  const status = {
    concerns: [],
    good_patterns: []
  };

  // Analyze blood pressure
  if (data.blood_pressure?.average > 140/90) {
    status.concerns.push({
      area: "blood_pressure",
      severity: "high",
      condition: "Hypertension",
      value: data.blood_pressure.average
    });
  }

  // Analyze sleep
  if (data.sleep?.average_duration < 6) {
    status.concerns.push({
      area: "sleep",
      severity: "medium",
      condition: "Sleep Deprivation",
      value: data.sleep.average_duration + " hours"
    });
  }

  // Analyze weight trend
  if (data.weight?.trend === "increasing") {
    status.concerns.push({
      area: "weight",
      severity: "medium",
      condition: "Weight Gain",
      value: data.weight.change + " kg"
    });
  }

  // Identify good patterns
  if (data.steps?.average > 8000) {
    status.good_patterns.push({
      area: "activity",
      description: "Daily average steps over 8000",
      value: data.steps.average
    });
  }

  return status;
}
```


## ### Data Import Output

```
✅ Data Import Successful

Data Source: Apple Health
Import Time: 2025-01-22 14:30:00

Import Records Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Step Records: 1,234 records
⚖️ Weight Records: 30 records
❤️ Heart Rate Records: 1,200 records
😴 Sleep Records: 90 records

Data Time Range: 2025-01-01 to 2025-01-22
━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 Data Saved To:
• data/fitness/activities.json (steps)
• data/profile.json (weight history)
• data/fitness/heart-rate.json (heart rate)
• data/sleep/sleep-records.json (sleep)

⚠️  Validation Warnings:
• 3 step records missing timestamps, used default values
• 1 weight record abnormal (<20kg), skipped

💡 Next Steps:
• Use /health-trend to analyze imported data
• Use /wellally-tech for personalized article recommendations
```


## ### Knowledge Base Query Output

```
📚 WellAlly Knowledge Base Search Results

Search Topic: Hypertension Management
Articles Found: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Hypertension Monitoring and Management
   Category: Chronic Disease Management
   Link: https://wellally.tech/knowledge-base/chronic-disease/hypertension-monitoring
   Description: Learn how to effectively monitor and manage blood pressure

2. Blood Pressure Lowering Strategies
   Category: Chronic Disease Management
   Link: https://wellally.tech/knowledge-base/chronic-disease/bp-lowering-strategies
   Description: Improve blood pressure levels through lifestyle modifications

━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Related Topics:
• Diabetes Management
• Cardiovascular Health
• Medication Adherence

💡 Tips:
Click links to visit [WellAlly.tech](https://www.wellally.tech/) platform for full articles
```


## ### Intelligent Recommendation Output

```
💡 Article Recommendations Based on Your Health Data

Generated Time: 2025-01-22 14:30:00

━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 Attention Needed: Blood Pressure Management
━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Status: Average blood pressure 142/92 mmHg (elevated)

Recommended Articles:
1. Hypertension Monitoring and Management
   https://wellally.tech/knowledge-base/chronic-disease/hypertension-monitoring

2. Blood Pressure Lowering Strategies
   https://wellally.tech/knowledge-base/chronic-disease/bp-lowering-strategies

3. Antihypertensive Medication Adherence Guide
   https://wellally.tech/knowledge-base/chronic-disease/medication-adherence

━━━━━━━━━━━━━━━━━━━━━━━━━━

🟡 Attention Needed: Sleep Improvement
━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Status: Average sleep duration 5.8 hours (insufficient)

Recommended Articles:
1. Sleep Hygiene Basics
   https://wellally.tech/knowledge-base/sleep/sleep-hygiene

2. Improve Sleep Quality
   https://wellally.tech/knowledge-base/sleep/sleep-quality-improvement

━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 Keep Up: Daily Activity
━━━━━━━━━━━━━━━━━━━━━━━━━━
Current Status: Daily average steps 9,234 (good)

Related Reading:
1. Maintain Active Lifestyle
   https://wellally.tech/knowledge-base/fitness/active-lifestyle

━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary: 5 related articles recommended
Visit [WellAlly.tech](https://www.wellally.tech/) Knowledge Base for full content
```


## ### Article Recommendation Mapping

```javascript
const articleMapping = {
  "Hypertension": [
    "chronic-disease/hypertension-monitoring",
    "chronic-disease/bp-lowering-strategies"
  ],
  "Diabetes": [
    "chronic-disease/diabetes-management",
    "nutrition/diabetic-diet"
  ],
  "Sleep Deprivation": [
    "sleep/sleep-hygiene",
    "sleep/sleep-quality-improvement"
  ],
  "Weight Gain": [
    "nutrition/healthy-diet",
    "nutrition/calorie-management"
  ],
  "High Stress": [
    "mental-health/stress-management",
    "mental-health/mindfulness"
  ]
};
```


## ### Generic CSV/JSON Import

```

## Security & Privacy

### Must Follow

- ❌ Do not upload data to external servers (except API sync)
- ❌ Do not hardcode API credentials in code
- ❌ Do not share user access tokens
- ✅ All imported data stored locally only
- ✅ OAuth credentials encrypted storage
- ✅ Import only after explicit user authorization

### Data Validation

- ✅ Validate imported data types and ranges
- ✅ Filter abnormal values (e.g., negative steps)
- ✅ Preserve data source information
- ✅ Handle timezone conversion

### Error Handling

**File Read Failure**:
- Output "Unable to read file, please check file path and format"
- Provide correct file format examples
- Suggest re-exporting data

**API Call Failure**:
- Output "API call failed, please check network connection and credentials"
- Provide OAuth re-authentication guidance
- Fall back to CSV import method

**Data Validation Failure**:
- Output "Incorrect data format, skipped invalid records"
- Log number of skipped records
- Continue processing valid data

## Related Commands

- `/health-trend`: Analyze health trends (using imported data)
- `/sleep`: Record sleep data
- `/diet`: Record diet data
- `/fitness`: Record exercise data
- `/profile`: Manage personal profile

## Technical Implementation

### Tool Limitations

This Skill only uses the following tools:
- **Read**: Read external data files and configurations
- **Grep**: Search data patterns
- **Glob**: Find data files
- **Write**: Save imported data to local JSON files

### Python Dependencies

Python packages potentially needed for import scripts:
```python


## # Generic Import

```

### Performance Optimization

- Incremental reading: Only import data within specified time range
- Data deduplication: Avoid importing duplicate data for same day
- Batch writing: Save data in batches for better performance
- Error recovery: Support resume from breakpoint

## Usage Examples

### Example 1: Import Apple Health Data
**User**: "Import fitness tracker data from Apple Health"
**Output**: Execute import workflow, generate import report

### Example 2: Query Knowledge Base
**User**: "WellAlly platform articles about sleep"
**Output**: Return sleep-related knowledge base article links

### Example 3: Get Personalized Recommendations
**User**: "Recommend articles based on my health data"
**Output**: Analyze health data, recommend relevant articles

### Example 4: Import Generic CSV
**User**: "Import this CSV health data file health.csv"
**Output**: Parse CSV, map fields, save to local

## Extensibility

### Adding New Data Sources

1. Create new integration guide in `integrations/` directory
2. Create new import script in `scripts/` directory
3. Update `data-sources.md` documentation
4. Add usage instructions in SKILL.md

### Adding New Knowledge Base Categories

1. Create new category file in `knowledge-base/` directory
2. Add related article links
3. Update `knowledge-base/index.md`
4. Update article recommendation mapping

## Reference Resources

- **WellAlly.tech**: https://www.wellally.tech/
- **WellAlly Knowledge Base**: https://wellally.tech/knowledge-base/
- **WellAlly Blog**: https://wellally.tech/blog/
- **Apple HealthKit**: https://developer.apple.com/documentation/healthkit
- **Fitbit API**: https://dev.fitbit.com/
- **Oura Ring API**: https://cloud.ouraring.com/api/

## FAQ

**Q: Will imported data overwrite existing data?**
A: No. Imported data will be appended to existing data, not overwritten. Duplicate data will be automatically deduplicated.

**Q: Can I import data from multiple platforms?**
A: Yes. You can import data from Apple Health, Fitbit, Oura, and other platforms simultaneously, the system will merge all data.

**Q: Are WellAlly.tech knowledge base articles offline?**
A: No. Knowledge base articles are referenced via URLs, requiring network connection to access the [WellAlly.tech](https://www.wellally.tech/) platform.

**Q: Where are API credentials stored?**
A: API credentials are encrypted and stored in local configuration files, not uploaded to any server.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


