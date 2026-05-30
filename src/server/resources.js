/**
 * src/server/resources.js — MCP Resource Handlers
 *
 * Extracted from ase-mcp-server.js for single-responsibility clarity.
 * Handles: ListResources, ListResourceTemplates, ReadResource
 *
 * Registered resources:
 *   health://status     — Live server health (application/json)
 *   metrics://snapshot  — Raw metrics counters and histograms (application/json)
 *   skill://{name}      — Skill markdown content (text/markdown)
 *
 * Resource templates:
 *   skill://{name}      — Dynamic skill resource template
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../utils/logger');
const metrics = require('../utils/metrics');

// Skills directory: configurable via ASE_SKILLS_DIR env var
const SKILLS_DIR = process.env.ASE_SKILLS_DIR || path.resolve(__dirname, '../../../../../');

/**
 * Registers all resource-related MCP handlers on the given server instance.
 *
 * @param {object} server - MCP Server instance
 * @param {object} embeddingService - For health data
 * @param {object} skillCache - For skill content retrieval
 */
function registerResourceHandlers(server, embeddingService, skillCache) {
  const {
    ListResourcesRequestSchema,
    ListResourceTemplatesRequestSchema,
    ReadResourceRequestSchema
  } = require('@modelcontextprotocol/sdk/types.js');

  // ── List static + dynamic resources ───────────────────────
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [
      {
        uri: 'health://status',
        name: 'Server Health',
        description: 'Live health status: circuit breaker state, DB integrity, skill count, uptime.',
        mimeType: 'application/json'
      },
      {
        uri: 'metrics://snapshot',
        name: 'Metrics Snapshot',
        description: 'Raw in-process metrics: counters and histogram percentiles (p50/p95/p99).',
        mimeType: 'application/json'
      }
    ];

    try {
      const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
      for (const dirent of entries) {
        if (
          dirent.isDirectory() &&
          !dirent.name.startsWith('.') &&
          dirent.name !== 'tools' &&
          dirent.name !== 'docs'
        ) {
          resources.push({
            uri: `skill://${dirent.name}`,
            name: dirent.name,
            description: `Instruction set for the "${dirent.name}" skill.`,
            mimeType: 'text/markdown'
          });
        }
      }
    } catch (err) {
      logger.error('Resources', `Failed to read skills directory: ${err.message}`);
    }

    return { resources };
  });

  // ── Resource Templates (skill://{name} is dynamic) ────────
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
    return {
      resourceTemplates: [
        {
          uriTemplate: 'skill://{name}',
          name: 'Skill Instruction Set',
          description: [
            'Retrieves the full SKILL.md (or README.md) for the named skill folder.',
            'Example: skill://modern-web-guidance',
            'Use list_resources first to discover available skill names.'
          ].join(' '),
          mimeType: 'text/markdown'
        }
      ]
    };
  });

  // ── Read a specific resource by URI ───────────────────────
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    // health://status
    if (uri === 'health://status') {
      const health = embeddingService.healthSnapshot;
      const metricsSnapshot = metrics.snapshot();
      const status = {
        server: 'ase-mcp-server',
        version: '4.1.0',
        uptime_seconds: Math.floor(process.uptime()),
        memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        embedding_circuit: health.embedding_circuit,
        skills_indexed: health.skills_indexed,
        last_sync: health.last_sync,
        db_ok: health.skills_indexed >= 0,
        metrics: metricsSnapshot
      };
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(status, null, 2)
        }]
      };
    }

    // metrics://snapshot — dedicated metrics resource (no health data)
    if (uri === 'metrics://snapshot') {
      const snap = metrics.snapshot();
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({
            captured_at: new Date().toISOString(),
            uptime_seconds: Math.floor(process.uptime()),
            ...snap
          }, null, 2)
        }]
      };
    }

    // skill://{name}
    if (uri.startsWith('skill://')) {
      const name = uri.substring(8);
      if (!name || name.includes('..') || name.includes('/')) {
        throw new Error(`Invalid skill name in URI: ${uri}`);
      }
      const skillData = await skillCache.getSkillContent(name);
      if (!skillData) {
        throw new Error(`Resource not found: ${uri}`);
      }
      return {
        contents: [{
          uri,
          mimeType: 'text/markdown',
          text: skillData.content
        }]
      };
    }

    throw new Error(`Unknown resource URI scheme: ${uri}`);
  });
}

module.exports = { registerResourceHandlers };
