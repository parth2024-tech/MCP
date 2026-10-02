# Radix Ui Design System — Code Reference

## ### Basic Component Pattern

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function MyDialog() {
  return (
    <Dialog.Root>
      {/* Trigger the dialog */}
      <Dialog.Trigger asChild>
        <button className="trigger-styles">Open</button>
      </Dialog.Trigger>

      {/* Portal renders outside DOM hierarchy */}
      <Dialog.Portal>
        {/* Overlay (backdrop) */}
        <Dialog.Overlay className="overlay-styles" />
        
        {/* Content (modal) */}
        <Dialog.Content className="content-styles">
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description>Description</Dialog.Description>
          
          {/* Your content here */}
          
          <Dialog.Close asChild>
            <button>Close</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```


## ### Strategy 2: Tailwind + CVA (Class Variance Authority)

```tsx
// button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

export function Button({ variant, size, children }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }))}>
      {children}
    </button>
  );
}
```


## ### Strategy 3: Stitches (CSS-in-JS)

```tsx
import { styled } from '@stitches/react';
import * as Dialog from '@radix-ui/react-dialog';

const StyledContent = styled(Dialog.Content, {
  backgroundColor: '$surface',
  borderRadius: '$md',
  padding: '$6',
  
  variants: {
    size: {
      small: { width: '300px' },
      medium: { width: '500px' },
      large: { width: '700px' },
    },
  },
  
  defaultVariants: {
    size: 'medium',
  },
});
```


## ### Pattern 1: Compound Components with Context

```tsx
// Select.tsx
import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';

export function CustomSelect({ items, placeholder, onValueChange }) {
  return (
    <Select.Root onValueChange={onValueChange}>
      <Select.Trigger className="select-trigger">
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="select-content">
          <Select.Viewport>
            {items.map((item) => (
              <Select.Item 
                key={item.value} 
                value={item.value}
                className="select-item"
              >
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <CheckIcon />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
```


## ### Pattern 4: Animation with Framer Motion

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';

export function AnimatedDialog({ open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="dialog-overlay"
                />
              </Dialog.Overlay>
              
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="dialog-content"
                >
                  {/* Content */}
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```


## ### Popover

```

---

## Accessibility Checklist

### Every Component Must Have:

- [ ] **Focus Management**: Visible focus indicators on all interactive elements
- [ ] **Keyboard Navigation**: Full keyboard support (Tab, Arrows, Enter, Esc)
- [ ] **ARIA Labels**: Meaningful labels for screen readers
- [ ] **Color Contrast**: WCAG AA minimum (4.5:1 for text, 3:1 for UI)
- [ ] **Error States**: Clear error messages with `aria-invalid` and `aria-describedby`
- [ ] **Loading States**: Proper `aria-busy` during async operations

### Dialog-Specific:
- [ ] `Dialog.Title` is present (required for screen readers)
- [ ] `Dialog.Description` provides context
- [ ] Focus trapped inside modal when open
- [ ] Escape key closes dialog
- [ ] Focus returns to trigger on close

### Dropdown-Specific:
- [ ] Arrow keys navigate items
- [ ] Type-ahead search works
- [ ] First/last item wrapping behavior
- [ ] Selected state indicated visually and with ARIA

---

## Best Practices

### ✅ Do This

1. **Always use `asChild` to avoid wrapper divs**
   ```tsx


## ### Example 1: Command Palette (Combo Dialog)

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Command>
            <Command.Input placeholder="Type a command..." />
            <Command.List>
              <Command.Empty>No results found.</Command.Empty>
              <Command.Group heading="Suggestions">
                <Command.Item>Calendar</Command.Item>
                <Command.Item>Search Emoji</Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```


## ### Example 2: Dropdown Menu with Icons

```tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';

export function ActionsMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="icon-button" aria-label="Actions">
          <DotsHorizontalIcon />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-content" align="end">
          <DropdownMenu.Item className="dropdown-item">
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item">
            Duplicate
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="dropdown-separator" />
          <DropdownMenu.Item className="dropdown-item text-red-500">
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```


## ### Example 3: Form with Radix Select + React Hook Form

```tsx
import * as Select from '@radix-ui/react-select';
import { useForm, Controller } from 'react-hook-form';

interface FormData {
  country: string;
}

export function CountryForm() {
  const { control, handleSubmit } = useForm<FormData>();

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <Controller
        name="country"
        control={control}
        render={({ field }) => (
          <Select.Root onValueChange={field.onChange} value={field.value}>
            <Select.Trigger className="select-trigger">
              <Select.Value placeholder="Select a country" />
              <Select.Icon />
            </Select.Trigger>
            
            <Select.Portal>
              <Select.Content className="select-content">
                <Select.Viewport>
                  <Select.Item value="us">United States</Select.Item>
                  <Select.Item value="ca">Canada</Select.Item>
                  <Select.Item value="uk">United Kingdom</Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```


## ### Radix Themes (Official Styled System)

```

---

## Related Skills

- `@tailwind-design-system` - Tailwind + Radix integration patterns
- `@react-patterns` - React composition patterns
- `@frontend-design` - Overall frontend architecture
- `@accessibility-compliance` - WCAG compliance testing

---

## Resources

### Official Documentation
- [Radix UI Docs](https://www.radix-ui.com/primitives)
- [Radix Colors](https://www.radix-ui.com/colors) - Accessible color system
- [Radix Icons](https://www.radix-ui.com/icons) - Icon library

### Community Resources
- [shadcn/ui](https://ui.shadcn.com) - Component collection
- [Radix UI Discord](https://discord.com/invite/7Xb99uG) - Community support
- [CVA Documentation](https://cva.style/docs) - Variant management

### Examples
- [Radix Playground](https://www.radix-ui.com/primitives/docs/overview/introduction#try-it-out)
- [shadcn/ui Source](https://github.com/shadcn-ui/ui) - Production examples

---

## Quick Reference

### Installation
```bash




---

### Key Props
- `asChild` - Render as child element
- `defaultValue` - Uncontrolled default
- `value` / `onValueChange` - Controlled state
- `open` / `onOpenChange` - Open state
- `side` / `align` - Positioning

---

**Remember**: Radix gives you **behavior**, you give it **beauty**. Accessibility is built-in, customization is unlimited.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
