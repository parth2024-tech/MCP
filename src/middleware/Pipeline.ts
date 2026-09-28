import type { Container } from '../core/Container';
import { TimeoutError } from '../utils/errors';

const PIPELINE_TIMEOUT_MS = parseInt(process.env.ASE_PIPELINE_TIMEOUT_MS || '45000', 10);

export interface MiddlewareContext {
  container: Container;
  reqId: string;
  name: string;
  args: any;
  result?: any;
  isError?: boolean;
  handled?: boolean;
  extra?: Record<string, any>;
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

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new TimeoutError(context.name, PIPELINE_TIMEOUT_MS, { reqId: context.reqId }));
      }, PIPELINE_TIMEOUT_MS);
    });

    try {
      await Promise.race([dispatch(0), timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    
    if (!context.handled) {
      throw new Error(`Unhandled tool call: ${context.name}`);
    }
    
    return context.result;
  }
}
