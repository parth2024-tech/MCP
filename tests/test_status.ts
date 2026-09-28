import CheckOpenHandsStatusTool from '../src/tools/check_openhands_status';
import { Logger } from '../src/utils/logger';

async function run() {
  const tool = new CheckOpenHandsStatusTool();
  const args = {
    job_id: 'd6d6d83a9e56458dbbb7e3424b3c54cc'
  };
  
  const context = {
    reqId: 'test-req',
    container: {
      resolve: (key: string) => {
        if (key === 'logger') return new Logger();
        return null;
      }
    }
  };
  
  try {
    const res = await tool.validateAndExecute(args, context as any);
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e);
  }
}
run();
