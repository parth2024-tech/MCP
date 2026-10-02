# Wordpress — Code Reference

## #### Copy-Paste Prompts

```

### Phase 2: Theme Development

#### Skills to Invoke
- `frontend-developer` - Component development
- `frontend-design` - UI implementation
- `tailwind-patterns` - Styling
- `web-performance-optimization` - Performance

#### Actions
1. Design theme architecture
2. Create theme files (style.css, functions.php, index.php)
3. Implement template hierarchy
4. Create custom page templates
5. Add custom post types and taxonomies
6. Implement theme customization options
7. Add responsive design
8. Test with WordPress 7.0 admin refresh

#### WordPress 7.0 Theme Considerations
- Block API v3 now reference model
- Pseudo-element support in theme.json
- Global Styles custom CSS honors block-defined selectors
- View transitions for admin navigation

#### Theme Structure
```


```

### Phase 3: Plugin Development

#### Skills to Invoke
- `backend-dev-guidelines` - Backend standards
- `api-design-principles` - API design
- `auth-implementation-patterns` - Authentication

#### Actions
1. Design plugin architecture
2. Create plugin boilerplate
3. Implement hooks (actions and filters)
4. Create admin interfaces
5. Add custom database tables
6. Implement REST API endpoints
7. Add settings and options pages

#### WordPress 7.0 Plugin Considerations
- **RTC Compatibility**: Register post meta with `show_in_rest => true`
- **AI Integration**: Use `wp_ai_client_prompt()` for AI features
- **DataViews**: Consider new admin UI patterns
- **Meta Boxes**: Migrate to block-based UIs for collaboration support

#### RTC-Compatible Post Meta Registration
```php


```

### Phase 4: WooCommerce Integration

#### Skills to Invoke
- `payment-integration` - Payment processing
- `stripe-integration` - Stripe payments
- `billing-automation` - Billing workflows

#### Actions
1. Install and configure WooCommerce
2. Create custom product types
3. Customize checkout flow
4. Integrate payment gateways
5. Set up shipping methods
6. Create custom order statuses
7. Implement subscription products
8. Add custom email templates

#### WordPress 7.0 + WooCommerce Considerations
- Test checkout with new admin interfaces
- AI connectors for product descriptions
- DataViews for order management screens
- RTC for collaborative order editing

#### Copy-Paste Prompts
```


```

### Phase 5: Performance Optimization

#### Skills to Invoke
- `web-performance-optimization` - Performance optimization
- `database-optimizer` - Database optimization

#### Actions
1. Implement caching (object, page, browser)
2. Optimize images (lazy loading, WebP)
3. Minify and combine assets
4. Enable CDN
5. Optimize database queries
6. Implement lazy loading
7. Configure OPcache
8. Set up Redis/Memcached

#### WordPress 7.0 Performance
- Client-side media processing
- Font Library enabled for all themes
- Responsive grid block optimizations
- View transitions reduce perceived load time

#### Performance Checklist
- [ ] Page load time < 3 seconds
- [ ] Time to First Byte < 200ms
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] First Input Delay < 100ms

#### Copy-Paste Prompts
```


```

### Phase 6: Security Hardening

#### Skills to Invoke
- `security-auditor` - Security audit
- `wordpress-penetration-testing` - WordPress security testing
- `sast-configuration` - Static analysis

#### Actions
1. Update WordPress core, themes, plugins
2. Implement security headers
3. Configure file permissions
4. Set up firewall rules
5. Enable two-factor authentication
6. Implement rate limiting
7. Configure security logging
8. Set up malware scanning

#### WordPress 7.0 Security Considerations
- PHP 7.4 minimum (drops 7.2/7.3 support)
- Test Abilities API permission boundaries
- Verify collaboration data isolation
- AI connector credential security

#### Security Checklist
- [ ] WordPress core updated (7.0+ recommended)
- [ ] All plugins/themes updated
- [ ] Strong passwords enforced
- [ ] Two-factor authentication enabled
- [ ] Security headers configured
- [ ] XML-RPC disabled or protected
- [ ] File editing disabled
- [ ] Database prefix changed
- [ ] Regular backups configured

#### Copy-Paste Prompts
```


```

### Phase 7: Testing

#### Skills to Invoke
- `test-automator` - Test automation
- `playwright-skill` - E2E testing
- `webapp-testing` - Web app testing

#### Actions
1. Write unit tests for custom code
2. Create integration tests
3. Set up E2E tests
4. Test cross-browser compatibility
5. Test responsive design
6. Performance testing
7. Security testing

#### WordPress 7.0 Testing Priorities
- Test with iframed post editor
- Verify DataViews integration
- Test collaboration (RTC) workflows
- Validate AI connector functionality
- Test Interactivity API with watch()

#### Copy-Paste Prompts
```


```

### Phase 8: Deployment

#### Skills to Invoke
- `deployment-engineer` - Deployment
- `cicd-automation-workflow-automate` - CI/CD
- `github-actions-templates` - GitHub Actions

#### Actions
1. Set up staging environment
2. Configure deployment pipeline
3. Set up database migrations
4. Configure environment variables
5. Enable maintenance mode during deployment
6. Deploy to production
7. Verify deployment
8. Monitor post-deployment

#### Copy-Paste Prompts
```


## #### AI Connector Example

```php
// Using WordPress 7.0 AI Connector
// Note: Requires an AI provider plugin (OpenAI, Claude, or Gemini) to be installed and configured

// Basic text generation
$response = wp_ai_client_prompt('Summarize this content.')
    ->generate_text();

// With temperature for deterministic output
$response = wp_ai_client_prompt('Summarize this content.')
    ->using_temperature(0.2)
    ->generate_text();

// With model preference (tries first available in list)
$response = wp_ai_client_prompt('Summarize this content.')
    ->using_model_preference('gpt-4', 'claude-3-opus', 'gemini-2-pro')
    ->generate_text();

// For JSON structured output
$schema = [
    'type' => 'object',
    'properties' => [
        'summary' => ['type' => 'string'],
        'keywords' => ['type' => 'array', 'items' => ['type' => 'string']]
    ],
    'required' => ['summary']
];
$response = wp_ai_client_prompt('Analyze this content and return JSON.')
    ->using_system_instruction('You are a content analyzer.')
    ->as_json_response($schema)
    ->generate_text();
```


## ### WordPress 7.0 AI Connector Usage

```php
// Auto-generate post excerpt with AI
add_action('save_post', function($post_id, $post) {
    if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
        return;
    }
    
    // Skip if excerpt already exists
    if (!empty($post->post_excerpt)) {
        return;
    }
    
    $content = strip_tags($post->post_content);
    if (empty($content)) {
        return;
    }
    
    // Check if AI client is available
    if (!function_exists('wp_ai_client_prompt')) {
        return;
    }
    
    // Build prompt with input
    $result = wp_ai_client_prompt(
        'Create a brief 2-sentence summary of this content: ' . substr($content, 0, 1000)
    );
    
    if (is_wp_error($result)) {
        return; // Silently fail - don't block post saving
    }
    
    // Use temperature for consistent output
    $result->using_temperature(0.3);
    $summary = $result->generate_text();
    
    if ($summary && !is_wp_error($summary)) {
        wp_update_post([
            'ID' => $post_id,
            'post_excerpt' => sanitize_textarea_field($summary)
        ]);
    }
}, 10, 2);
```


## ### Abilities API Registration

```php
// Register ability category on correct hook
add_action('wp_abilities_api_categories_init', function() {
    wp_register_ability_category('content-creation', [
        'label' => __('Content Creation', 'my-plugin'),
        'description' => __('Abilities for generating and managing content', 'my-plugin'),
    ]);
});

// Register abilities on correct hook
add_action('wp_abilities_api_init', function() {
    wp_register_ability('my-plugin/generate-summary', [
        'label' => __('Generate Post Summary', 'my-plugin'),
        'description' => __('Creates an AI-powered summary of a post', 'my-plugin'),
        'category' => 'content-creation',
        'input_schema' => [
            'type' => 'object',
            'properties' => [
                'post_id' => ['type' => 'integer', 'description' => 'The post ID to summarize']
            ],
            'required' => ['post_id']
        ],
        'output_schema' => [
            'type' => 'object',
            'properties' => [
                'summary' => ['type' => 'string', 'description' => 'The generated summary']
            ]
        ],
        'execute_callback' => 'my_plugin_generate_summary_handler',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ]);
});

// Handler function for the ability
function my_plugin_generate_summary_handler($input) {
    $post_id = isset($input['post_id']) ? absint($input['post_id']) : 0;
    $post = get_post($post_id);
    
    if (!$post) {
        return new WP_Error('invalid_post', 'Post not found');
    }
    
    $content = strip_tags($post->post_content);
    if (empty($content)) {
        return ['summary' => ''];
    }
    
    if (!function_exists('wp_ai_client_prompt')) {
        return new WP_Error('ai_unavailable', 'AI client not available');
    }
    
    $result = wp_ai_client_prompt('Summarize in 2 sentences: ' . substr($content, 0, 1000))
        ->using_temperature(0.3)
        ->generate_text();
    
    if (is_wp_error($result)) {
        return $result;
    }
    
    return ['summary' => sanitize_textarea_field($result)];
}
```


## ### WooCommerce Custom Product Type

```

## Quality Gates

Before moving to next phase, verify:
- [ ] All custom code tested
- [ ] Security scan passed
- [ ] Performance targets met
- [ ] Cross-browser tested
- [ ] Mobile responsive verified
- [ ] Accessibility checked (WCAG 2.1)
- [ ] WordPress 7.0 compatibility verified (for new projects)

## Related Workflow Bundles

- `development` - General web development
- `security-audit` - Security testing
- `testing-qa` - Testing workflow
- `ecommerce` - E-commerce development

(End of file - total 440 lines)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


