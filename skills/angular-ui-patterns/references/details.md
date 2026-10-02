# Angular Ui Patterns — Code Reference

## ### The Golden Rule

```typescript
@Component({
  template: `
    @if (error()) {
      <app-error-state [error]="error()" (retry)="load()" />
    } @else if (loading() && !items().length) {
      <app-skeleton-list />
    } @else if (!items().length) {
      <app-empty-state message="No items found" />
    } @else {
      <app-item-list [items]="items()" />
    }
  `,
})
export class ItemListComponent {
  private store = inject(ItemStore);

  items = this.store.items;
  loading = this.store.loading;
  error = this.store.error;
}
```


## ### Always Show Errors

```typescript
// CORRECT - Error always surfaced to user
@Component({...})
export class CreateItemComponent {
  private store = inject(ItemStore);
  private toast = inject(ToastService);

  async create(data: CreateItemDto) {
    try {
      await this.store.create(data);
      this.toast.success('Item created successfully');
      this.router.navigate(['/items']);
    } catch (error) {
      console.error('createItem failed:', error);
      this.toast.error('Failed to create item. Please try again.');
    }
  }
}

// WRONG - Error silently caught
async create(data: CreateItemDto) {
  try {
    await this.store.create(data);
  } catch (error) {
    console.error(error); // User sees nothing!
  }
}
```


## ### Error State Component Pattern

```typescript
@Component({
  selector: "app-error-state",
  standalone: true,
  imports: [NgOptimizedImage],
  template: `
    <div class="error-state">
      <img ngSrc="/assets/error-icon.svg" width="64" height="64" alt="" />
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      @if (retry.observed) {
        <button (click)="retry.emit()" class="btn-primary">Try Again</button>
      }
    </div>
  `,
})
export class ErrorStateComponent {
  title = input("Something went wrong");
  message = input("An unexpected error occurred");
  retry = output<void>();
}
```


## ### Disable During Operations

```typescript
// CORRECT - Button disabled while loading
@Component({
  template: `
    <button
      [disabled]="saving()"
      (click)="save()"
    >
      @if (saving()) {
        <app-spinner size="sm" /> Saving...
      } @else {
        Save
      }
    </button>
  `
})
export class SaveButtonComponent {
  saving = signal(false);

  async save() {
    this.saving.set(true);
    try {
      await this.service.save();
    } finally {
      this.saving.set(false);
    }
  }
}

// WRONG - User can click multiple times
<button (click)="save()">
  {{ saving() ? 'Saving...' : 'Save' }}
</button>
```


## ### Contextual Empty States

```typescript
@Component({
  selector: "app-empty-state",
  template: `
    <div class="empty-state">
      <span class="icon" [class]="icon()"></span>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
      @if (actionLabel()) {
        <button (click)="action.emit()" class="btn-primary">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  icon = input("inbox");
  title = input.required<string>();
  description = input("");
  actionLabel = input<string | null>(null);
  action = output<void>();
}
```


## ### Form with Loading and Validation

```typescript
@Component({
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="form-field">
        <label for="name">Name</label>
        <input
          id="name"
          formControlName="name"
          [class.error]="isFieldInvalid('name')"
        />
        @if (isFieldInvalid("name")) {
          <span class="error-text">
            {{ getFieldError("name") }}
          </span>
        }
      </div>

      <div class="form-field">
        <label for="email">Email</label>
        <input id="email" type="email" formControlName="email" />
        @if (isFieldInvalid("email")) {
          <span class="error-text">
            {{ getFieldError("email") }}
          </span>
        }
      </div>

      <button type="submit" [disabled]="form.invalid || submitting()">
        @if (submitting()) {
          <app-spinner size="sm" /> Submitting...
        } @else {
          Submit
        }
      </button>
    </form>
  `,
})
export class UserFormComponent {
  private fb = inject(FormBuilder);

  submitting = signal(false);

  form = this.fb.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
    email: ["", [Validators.required, Validators.email]],
  });

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return control ? control.invalid && control.touched : false;
  }

  getFieldError(field: string): string {
    const control = this.form.get(field);
    if (control?.hasError("required")) return "This field is required";
    if (control?.hasError("email")) return "Invalid email format";
    if (control?.hasError("minlength")) return "Too short";
    return "";
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.submitting.set(true);
    try {
      await this.service.submit(this.form.value);
      this.toast.success("Submitted successfully");
    } catch {
      this.toast.error("Submission failed");
    } finally {
      this.submitting.set(false);
    }
  }
}
```


## ### Confirmation Dialog

```typescript
// dialog.service.ts
@Injectable({ providedIn: 'root' })
export class DialogService {
  private dialog = inject(Dialog); // CDK Dialog or custom

  async confirm(options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: options,
    });

    return await firstValueFrom(dialogRef.closed) ?? false;
  }
}

// Usage
async deleteItem(item: Item) {
  const confirmed = await this.dialog.confirm({
    title: 'Delete Item',
    message: `Are you sure you want to delete "${item.name}"?`,
    confirmText: 'Delete',
  });

  if (confirmed) {
    await this.store.delete(item.id);
  }
}
```


## ### Button States

```

---

## UI State Checklist

Before completing any UI component:

### UI States

- [ ] Error state handled and shown to user
- [ ] Loading state shown only when no data exists
- [ ] Empty state provided for collections (`@empty` block)
- [ ] Buttons disabled during async operations
- [ ] Buttons show loading indicator when appropriate

### Data & Mutations

- [ ] All async operations have error handling
- [ ] All user actions have feedback (toast/visual)
- [ ] Optimistic updates rollback on failure

### Accessibility

- [ ] Loading states announced to screen readers
- [ ] Error messages linked to form fields
- [ ] Focus management after state changes

---

## Integration with Other Skills

- **angular-state-management**: Use Signal stores for state
- **angular**: Apply modern patterns (Signals, @defer)
- **testing-patterns**: Test all UI states

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


