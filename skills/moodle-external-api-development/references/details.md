# Moodle External Api Development — Code Reference

## ### Step 2: Define Input Parameters

```

**Common Parameter Types**:
- `PARAM_INT` - Integers
- `PARAM_TEXT` - Plain text (HTML stripped)
- `PARAM_RAW` - Raw text (no cleaning)
- `PARAM_BOOL` - Boolean values
- `PARAM_FLOAT` - Floating point numbers
- `PARAM_ALPHANUMEXT` - Alphanumeric with extended chars

**Structures**:
- `external_value` - Single value
- `external_single_structure` - Object with named fields
- `external_multiple_structure` - Array of items

**Value Flags**:
- `VALUE_REQUIRED` - Parameter must be provided
- `VALUE_OPTIONAL` - Parameter is optional
- `VALUE_DEFAULT, defaultvalue` - Optional with default

### Step 3: Implement Business Logic

```php


## ### Step 5: Register the Service

```php
<?php
defined('MOODLE_INTERNAL') || die();

$functions = [
    'local_yourplugin_your_api_name' => [
        'classname'   => 'local_yourplugin/external/your_api_name',
        'methodname'  => 'execute',
        'classpath'   => 'local/yourplugin/classes/external/your_api_name.php',
        'description' => 'Brief description of what this API does',
        'type'        => 'read',  // or 'write'
        'ajax'        => true,
        'capabilities'=> 'moodle/course:view', // comma-separated if multiple
        'services'    => [MOODLE_OFFICIAL_MOBILE_SERVICE] // Optional
    ],
];

$services = [
    'Your Plugin Web Service' => [
        'functions' => [
            'local_yourplugin_your_api_name'
        ],
        'restrictedusers' => 0,
        'enabled' => 1
    ]
];
```


## ### Step 6: Implement Error Handling & Logging

```php
private static function log_debug($message) {
    global $CFG;
    $logdir = $CFG->dataroot . '/local_yourplugin';
    if (!file_exists($logdir)) {
        mkdir($logdir, 0777, true);
    }
    $debuglog = $logdir . '/api_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($debuglog, "[$timestamp] $message/n", FILE_APPEND | LOCK_EX);
}

public static function execute($userid, $courseid) {
    global $DB;

    try {
        self::log_debug("API called: userid=$userid, courseid=$courseid");
        
        // Validate parameters
        $params = self::validate_parameters(self::execute_parameters(), [
            'userid' => $userid,
            'courseid' => $courseid
        ]);

        // Your logic here
        
        self::log_debug("API completed successfully");
        return $result;

    } catch (/invalid_parameter_exception $e) {
        self::log_debug("Parameter validation failed: " . $e->getMessage());
        throw $e;
    } catch (/moodle_exception $e) {
        self::log_debug("Moodle exception: " . $e->getMessage());
        throw $e;
    } catch (/Exception $e) {
        // Log detailed error info
        $lastsql = method_exists($DB, 'get_last_sql') ? $DB->get_last_sql() : '[N/A]';
        self::log_debug("Fatal error: " . $e->getMessage());
        self::log_debug("Last SQL: " . $lastsql);
        self::log_debug("Stack trace: " . $e->getTraceAsString());
        throw $e;
    }
}
```


## ### Working with Course Modules

```php
// Create course module
$moduleid = $DB->get_field('modules', 'id', ['name' => 'quiz'], MUST_EXIST);

$cm = new /stdClass();
$cm->course = $courseid;
$cm->module = $moduleid;
$cm->instance = 0; // Will be updated after activity creation
$cm->visible = 1;
$cm->groupmode = 0;
$cmid = add_course_module($cm);

// Create activity instance (e.g., quiz)
$quiz = new /stdClass();
$quiz->course = $courseid;
$quiz->name = 'My Quiz';
$quiz->coursemodule = $cmid;
// ... other quiz fields ...

$quizid = quiz_add_instance($quiz, null);

// Update course module with instance ID
$DB->set_field('course_modules', 'instance', $quizid, ['id' => $cmid]);
course_add_cm_to_section($courseid, $cmid, 0);
```


## ### Access Restrictions (Groups/Availability)

```php
// Restrict activity to specific user via group
$groupname = 'activity_' . $activityid . '_user_' . $userid;

// Create or get group
if (!$groupid = $DB->get_field('groups', 'id', ['courseid' => $courseid, 'name' => $groupname])) {
    $groupdata = (object)[
        'courseid' => $courseid,
        'name' => $groupname,
        'timecreated' => time(),
        'timemodified' => time()
    ];
    $groupid = $DB->insert_record('groups', $groupdata);
}

// Add user to group
if (!$DB->record_exists('groups_members', ['groupid' => $groupid, 'userid' => $userid])) {
    $DB->insert_record('groups_members', (object)[
        'groupid' => $groupid,
        'userid' => $userid,
        'timeadded' => time()
    ]);
}

// Set availability condition
$restriction = [
    'op' => '&',
    'show' => false,
    'c' => [
        [
            'type' => 'group',
            'id' => $groupid
        ]
    ],
    'showc' => [false]
];

$DB->set_field('course_modules', 'availability', json_encode($restriction), ['id' => $cmid]);
```


## ### Random Question Selection with Tags

```php
private static function get_random_questions($categoryid, $tagname, $limit) {
    global $DB;
    
    $sql = "SELECT q.id
            FROM {question} q
            INNER JOIN {question_versions} qv ON qv.questionid = q.id
            INNER JOIN {question_bank_entries} qbe ON qbe.id = qv.questionbankentryid
            INNER JOIN {question_categories} qc ON qc.id = qbe.questioncategoryid
            JOIN {tag_instance} ti ON ti.itemid = q.id
            JOIN {tag} t ON t.id = ti.tagid
            WHERE LOWER(t.name) = :tagname
              AND qc.id = :categoryid
              AND ti.itemtype = 'question'
              AND q.qtype = 'multichoice'";
    
    $qids = $DB->get_fieldset_sql($sql, [
        'categoryid' => $categoryid,
        'tagname' => strtolower($tagname)
    ]);
    
    shuffle($qids);
    return array_slice($qids, 0, $limit);
}
```


## ### 3. Via JavaScript (AJAX)

```

## Common Pitfalls & Solutions

### 1. "Function not found" Error
**Solution**: 
- Purge caches: **Site administration > Development > Purge all caches**
- Verify function name in services.php matches exactly
- Check namespace and class name are correct

### 2. "Invalid parameter value detected"
**Solution**:
- Ensure parameter types match between definition and usage
- Check required vs optional parameters
- Validate nested structure definitions

### 3. SQL Injection Vulnerabilities
**Solution**:
- Always use placeholder parameters (`:paramname`)
- Never concatenate user input into SQL strings
- Use Moodle's database methods: `get_record()`, `get_records()`, etc.

### 4. Permission Denied Errors
**Solution**:
- Call `self::validate_context($context)` early in execute()
- Check required capabilities match user's permissions
- Verify user has role assignments in the context

### 5. Transaction Deadlocks
**Solution**:
- Keep transactions short
- Always commit or rollback in finally blocks
- Avoid nested transactions

## Debugging Checklist

- [ ] Check Moodle debug mode: **Site administration > Development > Debugging**
- [ ] Review web services logs: **Site administration > Reports > Logs**
- [ ] Check custom log files in `$CFG->dataroot/local_yourplugin/`
- [ ] Verify database queries using `$DB->set_debug(true)`
- [ ] Test with admin user to rule out permission issues
- [ ] Clear browser cache and Moodle caches
- [ ] Check PHP error logs on server

## Plugin Structure Checklist

```


## ### Simple Read API (Get Quiz Attempts)

```php
<?php
namespace local_userlog/external;

defined('MOODLE_INTERNAL') || die();
require_once("$CFG->libdir/externallib.php");

use external_api;
use external_function_parameters;
use external_single_structure;
use external_value;

class get_quiz_attempts extends external_api {
    public static function execute_parameters() {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'User ID'),
            'courseid' => new external_value(PARAM_INT, 'Course ID')
        ]);
    }

    public static function execute($userid, $courseid) {
        global $DB;

        self::validate_parameters(self::execute_parameters(), [
            'userid' => $userid,
            'courseid' => $courseid
        ]);

        $sql = "SELECT COUNT(*) AS quiz_attempts
                FROM {quiz_attempts} qa
                JOIN {quiz} q ON qa.quiz = q.id
                WHERE qa.userid = :userid AND q.course = :courseid";

        $attempts = $DB->get_field_sql($sql, [
            'userid' => $userid,
            'courseid' => $courseid
        ]);

        return ['quiz_attempts' => (int)$attempts];
    }

    public static function execute_returns() {
        return new external_single_structure([
            'quiz_attempts' => new external_value(PARAM_INT, 'Total number of quiz attempts')
        ]);
    }
}
```


## ## Quick Reference: Common Moodle Tables

| Table | Purpose |
|-------|---------|
| `{user}` | User accounts |
| `{course}` | Courses |
| `{course_modules}` | Activity instances in courses |
| `{modules}` | Available activity types (quiz, forum, etc.) |
| `{quiz}` | Quiz configurations |
| `{quiz_attempts}` | Quiz attempt records |
| `{question}` | Question bank |
| `{question_categories}` | Question categories |
| `{grade_items}` | Gradebook items |
| `{grade_grades}` | Student grades |
| `{groups}` | Course groups |
| `{groups_members}` | Group memberships |
| `{logstore_standard_log}` | Activity logs |


