---
name: moodle-external-api-development
description: This skill guides you through creating custom external web service APIs for Moodle LMS, following Moodle's external API framework and coding standards. Use when the task involves moodle external api development.
risk: unknown
source: community
date_added: "2026-02-27"
---

# Moodle External API Development

This skill guides you through creating custom external web service APIs for Moodle LMS, following Moodle's external API framework and coding standards.

## When to Use This Skill

- Creating custom web services for Moodle plugins
- Implementing REST/AJAX endpoints for course management
- Building APIs for quiz operations, user tracking, or reporting
- Exposing Moodle functionality to external applications
- Developing mobile app backends using Moodle

## Core Architecture Pattern

Moodle external APIs follow a strict three-method pattern:

1. **`execute_parameters()`** - Defines input parameter structure
2. **`execute()`** - Contains business logic
3. **`execute_returns()`** - Defines return structure

## Step-by-Step Implementation

### Step 1: Create the External API Class File

**Location**: `/local/yourplugin/classes/external/your_api_name.php`

```php
<?php
namespace local_yourplugin/external;

defined('MOODLE_INTERNAL') || die();
require_once("$CFG->libdir/externallib.php");

use external_api;
use external_function_parameters;
use external_single_structure;
use external_value;

class your_api_name extends external_api {
    
    // Three required methods will go here
    
}
```

**Key Points**:
- Class must extend `external_api`
- Namespace follows: `local_pluginname/external` or `mod_modname/external`
- Include the security check: `defined('MOODLE_INTERNAL') || die();`
- Require externallib.php for base classes

### Step 2: Define Input Parameters

```php
public static function execute_parameters() {
    return new external_function_parameters([
        'userid' => new external_value(PARAM_INT, 'User ID', VALUE_REQUIRED),
        'courseid' => new external_value(PARAM_INT, 'Course ID', VALUE_REQUIRED),
        'options' => new external_single_structure([
            'includedetails' => new external_value(PARAM_BOOL, 'Include details', VALUE_DEFAULT, false),
            'limit' => new external_value(PARAM_INT, 'Result limit', VALUE_DEFAULT, 10)
        ], 'Options', VALUE_OPTIONAL)
    ]);
}
> See [references/details.md](references/details.md) for full code examples.
public static function execute($userid, $courseid, $options = []) {
    global $DB, $USER;

    // 1. Validate parameters
    $params = self::validate_parameters(self::execute_parameters(), [
        'userid' => $userid,
        'courseid' => $courseid,
        'options' => $options
    ]);

    // 2. Check permissions/capabilities
    $context = /context_course::instance($params['courseid']);
    self::validate_context($context);
    require_capability('moodle/course:view', $context);

    // 3. Verify user access
    if ($params['userid'] != $USER->id) {
        require_capability('moodle/course:viewhiddenactivities', $context);
    }

    // 4. Database operations
    $sql = "SELECT id, name, timecreated
            FROM {your_table}
            WHERE userid = :userid
              AND courseid = :courseid
            LIMIT :limit";
    
    $records = $DB->get_records_sql($sql, [
        'userid' => $params['userid'],
        'courseid' => $params['courseid'],
        'limit' => $params['options']['limit']
    ]);

    // 5. Process and return data
    $results = [];
    foreach ($records as $record) {
        $results[] = [
            'id' => $record->id,
            'name' => $record->name,
            'timestamp' => $record->timecreated
        ];
    }

    return [
        'items' => $results,
        'count' => count($results)
    ];
}
```

**Critical Steps**:
1. **Always validate parameters** using `validate_parameters()`
2. **Check context** using `validate_context()`
3. **Verify capabilities** using `require_capability()`
4. **Use parameterized queries** to prevent SQL injection
5. **Return structured data** matching return definition

### Step 4: Define Return Structure

```php
public static function execute_returns() {
    return new external_single_structure([
        'items' => new external_multiple_structure(
            new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Item ID'),
                'name' => new external_value(PARAM_TEXT, 'Item name'),
                'timestamp' => new external_value(PARAM_INT, 'Creation time')
            ])
        ),
        'count' => new external_value(PARAM_INT, 'Total items')
    ]);
}
```

**Return Structure Rules**:
- Must match exactly what `execute()` returns
- Use appropriate parameter types
- Document each field with description
- Nested structures allowed

### Step 5: Register the Service

**Location**: `/local/yourplugin/db/services.php`

> See [references/details.md](references/details.md) for full code examples.

**Service Registration Keys**:
- `classname` - Full namespaced class name
- `methodname` - Always 'execute'
- `type` - 'read' (SELECT) or 'write' (INSERT/UPDATE/DELETE)
- `ajax` - Set true for AJAX/REST access
- `capabilities` - Required Moodle capabilities
- `services` - Optional service bundles

### Step 6: Implement Error Handling & Logging

> See [references/details.md](references/details.md) for full code examples.

**Error Handling Best Practices**:
- Wrap logic in try-catch blocks
- Log errors with timestamps and context
- Capture SQL queries on database errors
- Preserve stack traces for debugging
- Re-throw exceptions after logging

## Advanced Patterns

### Complex Database Operations

```php
// Transaction example
$transaction = $DB->start_delegated_transaction();

try {
    // Insert record
    $recordid = $DB->insert_record('your_table', $dataobject);
    
    // Update related records
    $DB->set_field('another_table', 'status', 1, ['recordid' => $recordid]);
    
    // Commit transaction
    $transaction->allow_commit();
} catch (/Exception $e) {
    $transaction->rollback($e);
    throw $e;
}
```

### Working with Course Modules

> See [references/details.md](references/details.md) for full code examples.

### Access Restrictions (Groups/Availability)

> See [references/details.md](references/details.md) for full code examples.

### Random Question Selection with Tags

> See [references/details.md](references/details.md) for full code examples.

## Testing Your API

### 1. Via Moodle Web Services Test Client

1. Enable web services: **Site administration > Advanced features**
2. Enable REST protocol: **Site administration > Plugins > Web services > Manage protocols**
3. Create service: **Site administration > Server > Web services > External services**
4. Test function: **Site administration > Development > Web service test client**

### 2. Via curl

```bash
# Get token first
curl -X POST "https://yourmoodle.com/login/token.php" \
  -d "username=admin" \
  -d "password=yourpassword" \
  -d "service=moodle_mobile_app"

# Call your API
curl -X POST "https://yourmoodle.com/webservice/rest/server.php" \
  -d "wstoken=YOUR_TOKEN" \
  -d "wsfunction=local_yourplugin_your_api_name" \
  -d "moodlewsrestformat=json" \
  -d "userid=2" \
  -d "courseid=3"
```

### 3. Via JavaScript (AJAX)

```javascript
require(['core/ajax'], function(ajax) {
    var promises = ajax.call([{
        methodname: 'local_yourplugin_your_api_name',
        args: {
            userid: 2,
            courseid: 3
        }
    }]);

    promises[0].done(function(response) {
        console.log('Success:', response);
    }).fail(function(error) {
        console.error('Error:', error);
    });
});
> See [references/details.md](references/details.md) for full code examples.
local/yourplugin/
├── version.php                 # Plugin version and metadata
├── db/
│   ├── services.php           # External service definitions
│   └── access.php             # Capability definitions (optional)
├── classes/
│   └── external/
│       ├── your_api_name.php  # External API implementation
│       └── another_api.php    # Additional APIs
├── lang/
│   └── en/
│       └── local_yourplugin.php  # Language strings
└── tests/
    └── external_test.php      # Unit tests (optional but recommended)
```

## Examples from Real Implementation

### Simple Read API (Get Quiz Attempts)

> See [references/details.md](references/details.md) for full code examples.

### Complex Write API (Create Quiz from Categories)

See attached `create_quiz_from_categories.php` for a comprehensive example including:
- Multiple database insertions
- Course module creation
- Quiz instance configuration
- Random question selection with tags
- Group-based access restrictions
- Extensive error logging
- Transaction management

## Quick Reference: Common Moodle Tables

> See [references/details.md](references/details.md) for full code examples.

## Additional Resources

- [Moodle External API Documentation](https://moodledev.io/docs/5.2/apis/subsystems/external/functions)
- [Moodle Coding Style](https://moodledev.io/general/development/policies/codingstyle)
- [Moodle Database API](https://moodledev.io/docs/5.2/apis/core/dml)
- [Web Services API Documentation](https://moodledev.io/docs/5.2/apis/subsystems/external)

## Guidelines

- Always validate input parameters using `validate_parameters()`
- Check user context and capabilities before operations
- Use parameterized SQL queries (never string concatenation)
- Implement comprehensive error handling and logging
- Follow Moodle naming conventions (lowercase, underscores)
- Document all parameters and return values clearly
- Test with different user roles and permissions
- Consider transaction safety for write operations
- Purge caches after service registration changes
- Keep API methods focused and single-purpose

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
