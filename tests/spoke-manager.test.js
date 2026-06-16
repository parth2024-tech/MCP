import { describe, it, expect, vi, beforeEach } from 'vitest';
import SpokeManager from '../src/services/spoke-manager';

// Removed dummyConfigPath logic

// Mock logger
vi.mock('../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: console.error, debug: vi.fn() }
}));

const mocks = {
  connect: vi.fn(),
  listTools: vi.fn(),
  callTool: vi.fn()
};

describe('SpokeManager', () => {
  let manager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SpokeManager(null, {
      dummy: { command: 'node', args: ['-v'] }
    });
    manager._createClient = vi.fn().mockReturnValue(mocks);
    manager._createTransport = vi.fn().mockReturnValue({ close: vi.fn() });
  });

  it('loads config from spokes.json', () => {
    expect(manager.config).toHaveProperty('dummy');
    expect(manager.config.dummy.command).toBe('node');
  });

  it('initializes and connects to spokes', async () => {
    mocks.connect.mockResolvedValueOnce();
    await manager._startSpoke('dummy', manager.config.dummy);
    expect(manager.spokes.size).toBe(1);
    expect(manager.spokes.get('dummy').status).toBe('connected');
  });

  it('aggregates tools with proper prefixes', async () => {
    mocks.connect.mockResolvedValueOnce();
    mocks.listTools.mockResolvedValueOnce({
      tools: [
        { name: 'read_file', description: 'Reads a file' },
        { name: 'write_file', description: 'Writes a file' }
      ]
    });

    await manager.initialize();
    const tools = await manager.listAggregatedTools();

    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('dummy__read_file');
    expect(tools[0]._originalName).toBe('read_file');
    expect(tools[1].name).toBe('dummy__write_file');
  });

  it('routes callTool to the correct spoke', async () => {
    mocks.connect.mockResolvedValueOnce();
    mocks.callTool.mockResolvedValueOnce({ content: [{ type: 'text', text: 'success' }] });

    await manager.initialize();
    const result = await manager.callTool('dummy__read_file', { path: '/tmp/test' });

    expect(mocks.callTool).toHaveBeenCalledWith({
      name: 'read_file',
      arguments: { path: '/tmp/test' }
    });
    expect(result.content[0].text).toBe('success');
  });

  it('throws error for invalid prefix format', async () => {
    await expect(manager.callTool('invalid_format', {})).rejects.toThrow('Invalid proxy tool name format');
  });

  it('throws error if spoke is not connected', async () => {
    await expect(manager.callTool('offline__read_file', {})).rejects.toThrow('is not connected or doesn\'t exist');
  });
});


