# Angular Best Practices — Code Reference

## ## Rule Categories by Priority

| Priority | Category              | Impact     | Focus                           |
| -------- | --------------------- | ---------- | ------------------------------- |
| 1        | Change Detection      | CRITICAL   | Signals, OnPush, Zoneless       |
| 2        | Async Waterfalls      | CRITICAL   | RxJS patterns, SSR preloading   |
| 3        | Bundle Optimization   | CRITICAL   | Lazy loading, tree shaking      |
| 4        | Rendering Performance | HIGH       | @defer, trackBy, virtualization |
| 5        | Server-Side Rendering | HIGH       | Hydration, prerendering         |
| 6        | Template Optimization | MEDIUM     | Control flow, pipes             |
| 7        | State Management      | MEDIUM     | Signal patterns, selectors      |
| 8        | Memory Management     | LOW-MEDIUM | Cleanup, subscriptions          |


## ### Prefer Signals Over Mutable Properties

```typescript
// CORRECT - Signals trigger precise updates
@Component({
  template: `
    <h1>{{ title() }}</h1>
    <p>Count: {{ count() }}</p>
  `,
})
export class DashboardComponent {
  title = signal("Dashboard");
  count = signal(0);
}

// WRONG - Mutable properties require zone.js checks
@Component({
  template: `
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
  `,
})
export class DashboardComponent {
  title = "Dashboard";
  count = 0;
}
```


## ### Eliminate Sequential Data Fetching

```typescript
// WRONG - Nested subscriptions create waterfalls
this.route.params.subscribe((params) => {
  // 1. Wait for params
  this.userService.getUser(params.id).subscribe((user) => {
    // 2. Wait for user
    this.postsService.getPosts(user.id).subscribe((posts) => {
      // 3. Wait for posts
    });
  });
});

// CORRECT - Parallel execution with forkJoin
forkJoin({
  user: this.userService.getUser(id),
  posts: this.postsService.getPosts(id),
}).subscribe((data) => {
  // Fetched in parallel
});

// CORRECT - Flatten dependent calls with switchMap
this.route.params
  .pipe(
    map((p) => p.id),
    switchMap((id) => this.userService.getUser(id)),
  )
  .subscribe();
```


## ### Lazy Load Routes

```typescript
// CORRECT - Lazy load feature routes
export const routes: Routes = [
  {
    path: "admin",
    loadChildren: () =>
      import("./admin/admin.routes").then((m) => m.ADMIN_ROUTES),
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
  },
];

// WRONG - Eager loading everything
import { AdminModule } from "./admin/admin.module";
export const routes: Routes = [
  { path: "admin", component: AdminComponent }, // In main bundle
];
```


## ### Use computed() for Derived Data

```typescript
// CORRECT - Computed, cached until dependencies change
export class ProductStore {
  products = signal<Product[]>([]);
  filter = signal('');

  filteredProducts = computed(() => {
    const f = this.filter().toLowerCase();
    return this.products().filter(p =>
      p.name.toLowerCase().includes(f)
    );
  });
}

// WRONG - Recalculates every access
get filteredProducts() {
  return this.products.filter(p =>
    p.name.toLowerCase().includes(this.filter)
  );
}
```


## ### Use TransferState for SSR Data

```typescript
@Injectable({ providedIn: "root" })
export class DataService {
  private http = inject(HttpClient);
  private transferState = inject(TransferState);
  private platformId = inject(PLATFORM_ID);

  getData(key: string): Observable<Data> {
    const stateKey = makeStateKey<Data>(key);

    if (isPlatformBrowser(this.platformId)) {
      const cached = this.transferState.get(stateKey, null);
      if (cached) {
        this.transferState.remove(stateKey);
        return of(cached);
      }
    }

    return this.http.get<Data>(`/api/${key}`).pipe(
      tap((data) => {
        if (isPlatformServer(this.platformId)) {
          this.transferState.set(stateKey, data);
        }
      }),
    );
  }
}
```


## ### Use Selectors to Prevent Re-renders

```typescript
// CORRECT - Selective subscription
@Component({
  template: `<span>{{ userName() }}</span>`,
})
class HeaderComponent {
  private store = inject(Store);
  // Only re-renders when userName changes
  userName = this.store.selectSignal(selectUserName);
}

// WRONG - Subscribing to entire state
@Component({
  template: `<span>{{ state().user.name }}</span>`,
})
class HeaderComponent {
  private store = inject(Store);
  // Re-renders on ANY state change
  state = toSignal(this.store);
}
```


## ### Use takeUntilDestroyed for Subscriptions

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({...})
export class DataComponent {
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.data$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => this.process(data));
  }
}

// WRONG - Manual subscription management
export class DataComponent implements OnDestroy {
  private subscription!: Subscription;

  ngOnInit() {
    this.subscription = this.data$.subscribe(...);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe(); // Easy to forget
  }
}
```


## ### Prefer Signals Over Subscriptions

```typescript
// CORRECT - No subscription needed
@Component({
  template: `<div>{{ data().name }}</div>`,
})
export class Component {
  data = toSignal(this.service.data$, { initialValue: null });
}

// WRONG - Manual subscription
@Component({
  template: `<div>{{ data?.name }}</div>`,
})
export class Component implements OnInit, OnDestroy {
  data: Data | null = null;
  private sub!: Subscription;

  ngOnInit() {
    this.sub = this.service.data$.subscribe((d) => (this.data = d));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
```


