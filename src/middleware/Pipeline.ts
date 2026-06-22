import type { Container } from '../core/Container';

export interface MiddlewareContext {
  container: Container;
  reqId: string;
  name: string;
  args: any;
  result?: any;
  isError?: boolean;
  handled?: boolean;
}

export interface Middleware {
  handle(context: MiddlewareContext, next: () => Promise<void>): Promise<void>;
}

export class Pipeline {
  private middlewares: Middleware[] = [];

  use(middleware: Middleware) {
    this.middlewares.push(middleware);
    return this;
  }

  async execute(context: MiddlewareContext): Promise<any> {
    let index = -1;
    
    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) throw new Error('next() called multiple times');
      index = i;
      
      if (i === this.middlewares.length) {
        return;
      }

      const middleware = this.middlewares[i];
      await middleware.handle(context, () => dispatch(i + 1));
    };

    await dispatch(0);
    
    if (!context.handled) {
      throw new Error(`Unhandled tool call: ${context.name}`);
    }
    
    return context.result;
  }
}
