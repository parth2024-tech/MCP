"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipeline = void 0;
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
        await dispatch(0);
        if (!context.handled) {
            throw new Error(`Unhandled tool call: ${context.name}`);
        }
        return context.result;
    }
}
exports.Pipeline = Pipeline;
