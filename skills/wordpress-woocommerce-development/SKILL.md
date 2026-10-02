---
name: wordpress-woocommerce-development
description: "WooCommerce store development workflow covering store setup, payment integration, shipping configuration, customization, and WordPress 7.0 features: AI connectors, DataViews, and collaboration tools. Use when the task involves wordpress woocommerce development."
category: granular-workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# WordPress WooCommerce Development Workflow

## Overview

Specialized workflow for building WooCommerce stores including setup, payment gateway integration, shipping configuration, custom product types, store optimization, and WordPress 7.0 enhancements.

## WordPress 7.0 + WooCommerce Features

1. **AI Integration**
   - Auto-generate product descriptions
   - AI-powered customer service responses
   - Product summary generation
   - Marketing copy assistance

2. **DataViews for Orders**
   - Modern order management interfaces
   - Enhanced filtering and sorting
   - Activity layout for order history

3. **Real-Time Collaboration**
   - Collaborative order editing
   - Team notes and communication
   - Live inventory updates

4. **Admin Refresh**
   - Consistent WooCommerce admin styling
   - View transitions between screens

5. **Abilities API**
   - AI-powered order processing
   - Automated inventory management
   - Smart shipping recommendations

## When to Use This Workflow

Use this workflow when:
- Setting up WooCommerce stores
- Integrating payment gateways
- Configuring shipping methods
- Creating custom product types
- Building subscription products
- Implementing AI-powered features (WP 7.0)

## Workflow Phases

### Phase 1: Store Setup

#### Skills to Invoke
- `app-builder` - Project scaffolding
- `wordpress-penetration-testing` - WordPress patterns

#### Actions
1. Install WooCommerce
2. Run setup wizard
3. Configure store settings
4. Set up tax rules
5. Configure currency
6. Test with WordPress 7.0 admin

#### WordPress 7.0 + WooCommerce Setup
```php
// Minimum requirements for WP 7.0 + WooCommerce
// Add to wp-config.php for collaboration settings
define('WP_COLLABORATION_MAX_USERS', 10);

// AI features are enabled by installing a provider plugin
// Install OpenAI, Anthropic, or Gemini connector from WordPress.org
// Then configure via Settings > Connectors in admin panel
```

#### Copy-Paste Prompts
```
Use @app-builder to set up WooCommerce store
```

### Phase 2: Product Configuration

#### Skills to Invoke
- `wordpress-penetration-testing` - WooCommerce patterns

#### Actions
1. Create product categories
2. Add product attributes
3. Configure product types
4. Set up variable products
5. Add product images

#### AI-Powered Product Descriptions (WP 7.0)
> See [references/details.md](references/details.md) for full code examples.

#### Copy-Paste Prompts
```
Use @wordpress-penetration-testing to configure WooCommerce products
```

### Phase 3: Payment Integration

#### Skills to Invoke
- `payment-integration` - Payment processing
- `stripe-integration` - Stripe
- `paypal-integration` - PayPal

#### Actions
1. Choose payment gateways
2. Configure Stripe
3. Set up PayPal
4. Add offline payments
5. Test payment flows

#### WordPress 7.0 AI for Payments
> See [references/details.md](references/details.md) for full code examples.

#### Copy-Paste Prompts
```
Use @stripe-integration to integrate Stripe payments
```

```
Use @paypal-integration to integrate PayPal
```

### Phase 4: Shipping Configuration

#### Skills to Invoke
- `wordpress-penetration-testing` - WooCommerce shipping

#### Actions
1. Set up shipping zones
2. Configure shipping methods
3. Add flat rate shipping
4. Set up free shipping
5. Integrate carriers

#### AI Shipping Recommendations (WP 7.0)
> See [references/details.md](references/details.md) for full code examples.

#### Copy-Paste Prompts
```
Use @wordpress-penetration-testing to configure shipping
```

### Phase 5: Store Customization

#### Skills to Invoke
- `frontend-developer` - Store customization
- `frontend-design` - Store design

#### Actions
1. Customize product pages
2. Modify cart page
3. Style checkout flow
4. Create custom templates
5. Add custom fields

#### WordPress 7.0 Template Customization
> See [references/details.md](references/details.md) for full code examples.

#### Copy-Paste Prompts
```
Use @frontend-developer to customize WooCommerce templates
```

### Phase 6: Extensions

#### Skills to Invoke
- `wordpress-penetration-testing` - WooCommerce extensions

#### Actions
1. Install required extensions
2. Configure subscriptions
3. Set up bookings
4. Add memberships
5. Integrate marketplace

#### Abilities API for WooCommerce (WP 7.0)
> See [references/details.md](references/details.md) for full code examples.

#### Copy-Paste Prompts
```
Use @wordpress-penetration-testing to configure WooCommerce extensions
> See [references/details.md](references/details.md) for full code examples.
Use @web-performance-optimization to optimize WooCommerce store
// Automated AI testing for fraud detection during checkout
add_action('woocommerce_after_checkout_validation', 'ai_validate_order', 20);

function ai_validate_order($fields, $errors) {
    // Skip if AI is not available
    if (!function_exists('wp_ai_client_prompt')) {
        return;
    }
    
    // Skip for logged-in users (assumed trusted)
    if (is_user_logged_in()) {
        return;
    }
    
    $order_data = [
        'email' => isset($fields['billing_email']) ? $fields['billing_email'] : '',
        'phone' => isset($fields['billing_phone']) ? $fields['billing_phone'] : '',
        'address' => isset($fields['billing_address_1']) ? $fields['billing_address_1'] : '',
    ];
    
    // Skip if insufficient data
    if (empty($order_data['email'])) {
        return;
    }
    
    $prompt = sprintf(
        'This is a checkout validation. Check if these details seem legitimate: email=%s, phone=%s, address=%s. Return only "valid" or "suspicious" without additional text.',
        sanitize_email($order_data['email']),
        sanitize_text_field($order_data['phone']),
        sanitize_text_field($order_data['address'])
    );
    
    $result = wp_ai_client_prompt($prompt);
    
    if (is_wp_error($result)) {
        // Don't block checkout on AI errors
        return;
    }
    
    $result->using_temperature(0.1); // Low temp for consistent classification
    $response = $result->generate_text();
    
    if (is_wp_error($response)) {
        return;
    }
    
    if (strpos($response, 'suspicious') !== false) {
        $errors->add('validation', __('Additional verification may be needed for this order. We will contact you if needed.', 'woocommerce'));
    }
}
```

#### Copy-Paste Prompts
```
Use @playwright-skill to test WooCommerce checkout flow
