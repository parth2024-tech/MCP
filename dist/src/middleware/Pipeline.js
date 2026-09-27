"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipeline = void 0;
const errors_1 = require("../utils/errors");
const PIPELINE_TIMEOUT_MS = parseInt(process.env.ASE_PIPELINE_TIMEOUT_MS || '45000', 10);
class Pipeline {
    middlewares = [];
    use(middleware) {
        this.middlewares.push(middleware);
        return this;
    }
    async execute(context) {
        let index = -1;
        const dispatch = async (i) => {
            if (i <= index)
                throw new Error('next() called multiple times');
            index = i;
            if (i === this.middlewares.length) {
                return;
            }
            const middleware = this.middlewares[i];
            await middleware.handle(context, () => dispatch(i + 1));
        };
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => {
                reject(new errors_1.TimeoutError(context.name, PIPELINE_TIMEOUT_MS, { reqId: context.reqId }));
            }, PIPELINE_TIMEOUT_MS);
        });
        try {
            await Promise.race([dispatch(0), timeoutPromise]);
        }
        finally {
            if (timer)
                clearTimeout(timer);
        }
        if (!context.handled) {
            throw new Error(`Unhandled tool call: ${context.name}`);
        }
        return context.result;
    }
}
exports.Pipeline = Pipeline;
